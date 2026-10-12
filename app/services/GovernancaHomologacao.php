<?php
declare(strict_types=1);

/**
 * Regras puras de governanca da homologacao e do fechamento para o CA.
 * Nao acessa banco nem confia em dados enviados pelo navegador.
 */
final class GovernancaHomologacao
{
    const CLOSURES_KEY = 'fechamentosConselhoAdministracao';

    public static function normalizeProfile($profile)
    {
        $value = self::normalizeText($profile);
        if (in_array($value, array('administrador', 'admin', 'administrador_sistema'), true)) return 'administrador';
        if (in_array($value, array('homologador', 'diretoria_homologadora'), true)) return 'homologador';
        if (in_array($value, array('consultor_diretoria', 'consultor_da_diretoria'), true)) return 'consultor_diretoria';
        if ($value === 'unidade_apuradora') return 'unidade_apuradora';
        return 'usuario_companhia';
    }

    public static function profileLabel($profile)
    {
        $labels = array(
            'administrador' => 'Administrador',
            'homologador' => 'Diretoria Homologadora',
            'consultor_diretoria' => 'Consultor da Diretoria',
            'unidade_apuradora' => 'Unidade Apuradora',
            'usuario_companhia' => 'Usuario Companhia',
        );
        $profile = self::normalizeProfile($profile);
        return $labels[$profile];
    }

    public static function isDirectoryProfile($profile)
    {
        return in_array(self::normalizeProfile($profile), array('homologador', 'consultor_diretoria'), true);
    }

    public static function assertIndependentReviewer(array $launch, $submissionUser, array $user)
    {
        $reviewer = isset($user['matricula']) ? $user['matricula'] : '';
        $responsible = isset($launch['usuarioResponsavel'])
            ? $launch['usuarioResponsavel']
            : (isset($launch['usuario_responsavel']) ? $launch['usuario_responsavel'] : '');
        if (self::sameIdentity($reviewer, $responsible) || self::sameIdentity($reviewer, $submissionUser)) {
            throw new UnexpectedValueException(
                'Homologação não permitida. Este lançamento foi preenchido ou enviado por você e deve ser homologado por outro usuário autorizado.'
            );
        }
    }

    public static function validateClosures(array $items)
    {
        $normalized = array();
        $activeCompetences = array();
        foreach ($items as $position => $item) {
            if (!is_array($item)) {
                throw new DomainException('Configuração de fechamento inválida na posição ' . ($position + 1) . '.');
            }
            $period = trim(isset($item['periodo']) ? (string) $item['periodo'] : '');
            $meeting = trim(isset($item['dataReuniao']) ? (string) $item['dataReuniao'] : '');
            $closing = trim(isset($item['dataFechamento']) ? (string) $item['dataFechamento'] : '');
            $active = self::booleanValue(isset($item['ativo']) ? $item['ativo'] : false);
            if ($period === '') throw new DomainException('Informe o período do Conselho de Administração.');
            if (!self::validDate($meeting) || !self::validDate($closing)) {
                throw new DomainException('Informe datas válidas no formato AAAA-MM-DD.');
            }
            if (strcmp($closing, $meeting) >= 0) {
                throw new DomainException('A data de fechamento deve ser anterior à data da reunião do Conselho de Administração.');
            }
            $competences = isset($item['competencias']) && is_array($item['competencias']) ? $item['competencias'] : array();
            $competences = array_values(array_unique(array_map(array(__CLASS__, 'normalizeCompetence'), $competences)));
            if (in_array('', $competences, true) || count($competences) === 0) {
                throw new DomainException('Informe ao menos uma competência válida no formato AAAA-MM.');
            }
            if ($active) {
                foreach ($competences as $competence) {
                    if (isset($activeCompetences[$competence])) {
                        throw new LogicException(
                            'Já existe um fechamento ativo conflitante para a competência ' . $competence . '.'
                        );
                    }
                    $activeCompetences[$competence] = true;
                }
            }
            $id = trim(isset($item['id']) ? (string) $item['id'] : '');
            if ($id === '') $id = uniqid('fechamento-ca-', true);
            $normalized[] = array(
                'id' => $id,
                'periodo' => $period,
                'competencias' => $competences,
                'dataReuniao' => $meeting,
                'dataFechamento' => $closing,
                'ativo' => $active,
            );
        }
        return $normalized;
    }

    public static function reopenPolicy(array $launch, array $user, array $closures, $today = null)
    {
        $profile = self::normalizeProfile(isset($user['perfil']) ? $user['perfil'] : '');
        $today = $today === null ? date('Y-m-d') : (string) $today;
        $competence = self::launchCompetence($launch);
        $closure = self::closureForCompetence($closures, $competence);
        $base = array(
            'permitida' => false,
            'excepcional' => false,
            'competencia' => $competence,
            'periodo' => $closure ? $closure['periodo'] : '',
            'dataFechamento' => $closure ? $closure['dataFechamento'] : '',
            'dataReuniao' => $closure ? $closure['dataReuniao'] : '',
            'mensagem' => '',
        );

        if ($profile === 'administrador') {
            $base['permitida'] = true;
            if ($closure && strcmp($today, $closure['dataFechamento']) >= 0) {
                $base['excepcional'] = true;
                $base['mensagem'] = 'Este período já foi fechado para apresentação ao Conselho de Administração. A reabertura poderá gerar divergência em relação aos dados oficialmente encaminhados.';
            } elseif ($closure) {
                $base['mensagem'] = 'Reabertura administrativa disponível. Fechamento previsto para ' . self::formatDate($closure['dataFechamento']) . '.';
            } else {
                $base['mensagem'] = 'Reabertura administrativa disponível. Não há fechamento ativo configurado para esta competência.';
            }
            return $base;
        }

        if (!self::isDirectoryProfile($profile)) {
            $base['mensagem'] = 'Seu perfil não possui permissão para reabrir diretamente lançamentos homologados.';
            return $base;
        }
        if (!self::sameScope(self::launchDirectory($launch), isset($user['diretoria_responsavel']) ? $user['diretoria_responsavel'] : '')) {
            $base['mensagem'] = 'Lançamento fora da diretoria autorizada para o usuário autenticado.';
            return $base;
        }
        if (!$closure) {
            $base['mensagem'] = 'Não há data de fechamento para o Conselho de Administração configurada para esta competência. A reabertura está bloqueada até a regularização pelo Administrador.';
            return $base;
        }
        if (strcmp($today, $closure['dataFechamento']) >= 0) {
            $base['mensagem'] = 'Reabertura indisponível. O período ' . $closure['periodo']
                . ' foi fechado para envio ao Conselho de Administração em '
                . self::formatDate($closure['dataFechamento'])
                . '. Para alteração excepcional, procure o Administrador do sistema.';
            return $base;
        }
        $base['permitida'] = true;
        $base['mensagem'] = 'Reabertura disponível até ' . self::formatDate($closure['dataFechamento']) . '.';
        return $base;
    }

    public static function launchCompetence(array $launch)
    {
        $competence = isset($launch['competencia']) ? self::normalizeCompetence($launch['competencia']) : '';
        if ($competence !== '') return $competence;
        $year = isset($launch['ano']) ? (int) $launch['ano'] : 0;
        $month = isset($launch['mes']) ? (int) $launch['mes'] : 0;
        return $year > 0 && $month >= 1 && $month <= 12 ? sprintf('%04d-%02d', $year, $month) : '';
    }

    private static function closureForCompetence(array $closures, $competence)
    {
        foreach ($closures as $closure) {
            if (!is_array($closure) || !self::booleanValue(isset($closure['ativo']) ? $closure['ativo'] : false)) continue;
            $competences = isset($closure['competencias']) && is_array($closure['competencias']) ? $closure['competencias'] : array();
            if (in_array($competence, array_map(array(__CLASS__, 'normalizeCompetence'), $competences), true)) return $closure;
        }
        return null;
    }

    private static function launchDirectory(array $launch)
    {
        return isset($launch['diretoriaResponsavel'])
            ? $launch['diretoriaResponsavel']
            : (isset($launch['diretoria_responsavel']) ? $launch['diretoria_responsavel'] : '');
    }

    private static function normalizeCompetence($value)
    {
        $value = trim((string) $value);
        return preg_match('/^(20\d{2})-(0[1-9]|1[0-2])$/', $value) ? $value : '';
    }

    private static function validDate($value)
    {
        $date = DateTime::createFromFormat('!Y-m-d', (string) $value);
        return $date !== false && $date->format('Y-m-d') === (string) $value;
    }

    private static function formatDate($value)
    {
        $date = DateTime::createFromFormat('!Y-m-d', (string) $value);
        return $date ? $date->format('d/m/Y') : (string) $value;
    }

    private static function booleanValue($value)
    {
        if (is_bool($value)) return $value;
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private static function sameIdentity($left, $right)
    {
        $left = self::normalizeIdentity($left);
        $right = self::normalizeIdentity($right);
        return $left !== '' && $right !== '' && $left === $right;
    }

    private static function normalizeIdentity($value)
    {
        $value = strtoupper(trim((string) $value));
        $parts = preg_split('/[\\\\\/]/', $value);
        return $parts ? (string) end($parts) : $value;
    }

    private static function sameScope($left, $right)
    {
        return self::normalizeScope($left) !== '' && self::normalizeScope($left) === self::normalizeScope($right);
    }

    private static function normalizeScope($value)
    {
        return strtoupper(trim((string) $value));
    }

    private static function normalizeText($value)
    {
        $value = trim((string) $value);
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $value = strtolower($converted === false ? $value : $converted);
        return trim(preg_replace('/[^a-z0-9]+/', '_', $value), '_');
    }
}
