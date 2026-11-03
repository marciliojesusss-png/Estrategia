<?php
declare(strict_types=1);

/**
 * Projeta a cobertura administrativa atual sem persistir posições ou designações.
 *
 * A autorização continua sendo determinada por usuarios_acesso e AccessPolicy.
 * Esta classe apenas organiza, em memória, acessos ativos e catálogos existentes.
 */
final class MatrizCoberturaAcessos
{
    private const ADMINISTRADORES_ESPERADOS = 3;
    private const PREENCHEDORES_POR_UNIDADE = 2;
    private const HOMOLOGADORES_POR_DIRETORIA = 1;
    private const CONSULTORES_POR_DIRETORIA = 1;

    public static function build(array $users, array $units, array $directories, array $indicators): array
    {
        $activeUsers = array_values(array_filter($users, static function ($user) {
            return is_array($user) && (int)($user['ativo'] ?? 0) === 1;
        }));
        $activeUnits = self::activeCatalog($units);
        $activeDirectories = self::activeCatalog($directories);
        $unitDirectory = self::unitDirectoryMap($activeUnits, $activeDirectories, $indicators);

        $rows = array();
        $rows[] = self::row(
            'administracao-geral-administrador',
            'Administração',
            'Geral',
            'Administrador',
            'administrador',
            self::ADMINISTRADORES_ESPERADOS,
            self::usersFor($activeUsers, 'administrador')
        );

        $unitRows = array();
        foreach ($activeUnits as $unit) {
            $unitCode = self::catalogCode($unit);
            $directoryCode = $unitDirectory[$unitCode] ?? '';
            $unitRows[$unitCode] = self::row(
                'unidade-' . strtolower($unitCode) . '-preenchedor',
                $directoryCode !== '' ? $directoryCode : 'Não identificada',
                $unitCode,
                'Preenchedor',
                'unidade_apuradora',
                self::PREENCHEDORES_POR_UNIDADE,
                self::usersFor($activeUsers, 'unidade_apuradora', $unitCode)
            );
        }

        $directoryRows = array();
        foreach ($activeDirectories as $directory) {
            $directoryCode = self::catalogCode($directory);
            foreach ($activeUnits as $unit) {
                $unitCode = self::catalogCode($unit);
                if (($unitDirectory[$unitCode] ?? '') === $directoryCode) {
                    $rows[] = $unitRows[$unitCode];
                    unset($unitRows[$unitCode]);
                }
            }

            $homologators = self::row(
                'diretoria-' . strtolower($directoryCode) . '-homologador',
                $directoryCode,
                'Diretoria',
                'Diretor/Homologador',
                'homologador',
                self::HOMOLOGADORES_POR_DIRETORIA,
                self::usersFor($activeUsers, 'homologador', $directoryCode)
            );
            $consultants = self::row(
                'diretoria-' . strtolower($directoryCode) . '-consultor',
                $directoryCode,
                'Diretoria',
                'Consultor',
                'consultor_diretoria',
                self::CONSULTORES_POR_DIRETORIA,
                self::usersFor($activeUsers, 'consultor_diretoria', $directoryCode)
            );
            $rows[] = $homologators;
            $rows[] = $consultants;
            $directoryRows[$directoryCode] = array($homologators, $consultants);
        }

        foreach ($unitRows as $unmappedRow) {
            $rows[] = $unmappedRow;
        }

        $unitComplete = 0;
        foreach ($rows as $row) {
            if ($row['perfil'] === 'unidade_apuradora' && $row['cobertura'] === 'Completa') {
                $unitComplete++;
            }
        }

        $directoryComplete = 0;
        foreach ($directoryRows as $directoryCoverage) {
            if ($directoryCoverage[0]['cobertura'] === 'Completa' && $directoryCoverage[1]['cobertura'] === 'Completa') {
                $directoryComplete++;
            }
        }

        $pending = 0;
        foreach ($rows as $row) {
            $pending += max(0, (int)$row['esperado'] - (int)$row['ativos']);
        }

        $administratorRow = $rows[0];
        return array(
            'cards' => array(
                'administradores' => array(
                    'ativos' => $administratorRow['ativos'],
                    'esperado' => $administratorRow['esperado'],
                    'cobertura' => $administratorRow['cobertura'],
                ),
                'unidadesCompletas' => array('atuais' => $unitComplete, 'total' => count($activeUnits)),
                'diretoriasCompletas' => array('atuais' => $directoryComplete, 'total' => count($activeDirectories)),
                'posicoesPendentes' => $pending,
            ),
            'linhas' => $rows,
            'filtros' => array(
                'diretorias' => array_values(array_map(array(self::class, 'catalogCode'), $activeDirectories)),
                'unidades' => array_values(array_map(array(self::class, 'catalogCode'), $activeUnits)),
                'funcoes' => array('Administrador', 'Preenchedor', 'Diretor/Homologador', 'Consultor'),
                'coberturas' => array('Completa', 'Reduzida', 'Sem cobertura'),
            ),
            'fontes' => array(
                'acessos' => 'usuarios_acesso — somente registros ativos',
                'catalogos' => 'configuracoes — unidades e diretorias ativas',
                'relacaoOrganizacional' => 'indicadores ativos — unidade_apuradora e diretoria_responsavel',
            ),
        );
    }

    private static function activeCatalog(array $items): array
    {
        $active = array_values(array_filter($items, static function ($item) {
            return is_array($item) && (!array_key_exists('ativo', $item) || filter_var($item['ativo'], FILTER_VALIDATE_BOOLEAN));
        }));
        usort($active, static function ($left, $right) {
            return strcmp(self::catalogCode($left), self::catalogCode($right));
        });
        return $active;
    }

    public static function catalogCode(array $item): string
    {
        return self::scope($item['sigla'] ?? $item['id'] ?? '');
    }

    private static function unitDirectoryMap(array $units, array $directories, array $indicators): array
    {
        $validUnits = array();
        foreach ($units as $unit) {
            $validUnits[self::catalogCode($unit)] = true;
        }
        $validDirectories = array();
        foreach ($directories as $directory) {
            $validDirectories[self::catalogCode($directory)] = true;
        }

        $map = array();
        foreach ($indicators as $indicator) {
            if (!is_array($indicator) || (array_key_exists('ativo', $indicator) && !filter_var($indicator['ativo'], FILTER_VALIDATE_BOOLEAN))) {
                continue;
            }
            $unit = self::scope($indicator['unidadeApuradora'] ?? $indicator['unidade_apuradora'] ?? '');
            $directory = self::scope($indicator['diretoriaResponsavel'] ?? $indicator['diretoria_responsavel'] ?? '');
            if ($unit === '' || $directory === '' || !isset($validUnits[$unit]) || !isset($validDirectories[$directory])) {
                continue;
            }
            if (isset($map[$unit]) && $map[$unit] !== $directory) {
                throw new LogicException('Relação organizacional inconsistente para a unidade ' . $unit . '.');
            }
            $map[$unit] = $directory;
        }
        return $map;
    }

    private static function usersFor(array $users, string $profile, string $scope = ''): array
    {
        $matches = array();
        foreach ($users as $user) {
            if (strtolower(trim((string)($user['perfil'] ?? ''))) !== $profile) {
                continue;
            }
            if ($profile === 'unidade_apuradora') {
                $userScope = self::scope($user['unidade_apuradora'] ?? $user['unidadeApuradora'] ?? '');
                if ($userScope !== $scope) continue;
            }
            if (in_array($profile, array('homologador', 'consultor_diretoria'), true)) {
                $userScope = self::scope($user['diretoria_responsavel'] ?? $user['diretoriaResponsavel'] ?? '');
                if ($userScope !== $scope) continue;
            }
            $matches[] = array(
                'matricula' => trim((string)($user['matricula'] ?? '')),
                'nome' => trim((string)($user['nome'] ?? '')),
            );
        }
        usort($matches, static function ($left, $right) {
            $byName = strcasecmp($left['nome'], $right['nome']);
            return $byName !== 0 ? $byName : strcasecmp($left['matricula'], $right['matricula']);
        });
        return $matches;
    }

    private static function row(
        string $id,
        string $directory,
        string $scope,
        string $function,
        string $profile,
        int $expected,
        array $users
    ): array {
        $active = count($users);
        return array(
            'id' => $id,
            'diretoria' => $directory,
            'unidadeEscopo' => $scope,
            'funcao' => $function,
            'perfil' => $profile,
            'esperado' => $expected,
            'ativos' => $active,
            'cobertura' => self::coverage($active, $expected),
            'usuarios' => $users,
        );
    }

    private static function coverage(int $active, int $expected): string
    {
        if ($active >= $expected) return 'Completa';
        if ($active > 0) return 'Reduzida';
        return 'Sem cobertura';
    }

    private static function scope($value): string
    {
        return strtoupper(trim((string)$value));
    }
}
