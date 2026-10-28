<?php
declare(strict_types=1);

final class LancamentosObservacoesDocumentaisRepository
{
    private $db;
    private $tableAvailable;

    public function __construct($db)
    {
        $this->db = $db;
        $this->tableAvailable = null;
    }

    public function decorate(array $launches): array
    {
        if (!$launches || !$this->tableExists()) return $launches;

        $ids = array_values(array_unique(array_filter(array_map(static function ($launch) {
            return isset($launch['id']) ? (string)$launch['id'] : '';
        }, $launches))));
        if (!$ids) return $launches;

        $params = array();
        $placeholders = array();
        foreach ($ids as $index => $id) {
            $placeholder = ':id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $id;
        }

        $sql = 'SELECT d.* FROM dbo.lancamentos_observacoes_documentais d '
            . 'INNER JOIN dbo.lancamentos l ON l.id=d.lancamento_id '
            . 'AND l.indicador_id=d.indicador_id AND l.competencia=d.competencia '
            . 'AND l.ano=d.ano AND l.mes=d.mes '
            . 'AND l.versao_atual=d.versao_lancamento '
            . 'WHERE d.lancamento_id IN (' . implode(',', $placeholders) . ') '
            . "AND d.tipo_observacao=N'OBSERVACAO_AREA_INFORME_TRIMESTRAL' "
            . 'AND NOT EXISTS (SELECT 1 FROM dbo.lancamentos_observacoes_documentais sucessora '
            . 'WHERE sucessora.substitui_observacao_id=d.id)';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $documentsByLaunch = array();
        foreach ($stmt->fetchAll() as $row) {
            $launchId = (string)$row['lancamento_id'];
            if (isset($documentsByLaunch[$launchId])) {
                throw new RuntimeException('Mais de uma observacao documental vigente para o mesmo lancamento e versao.');
            }
            $documentsByLaunch[$launchId] = array(
                'id'=>(string)$row['id'],
                'tipoObservacao'=>(string)$row['tipo_observacao'],
                'observacao'=>(string)$row['observacao'],
                'fonteDocumental'=>(string)$row['fonte_documental'],
                'paginasDocumento'=>(string)$row['paginas_documento'],
                'sha256Observacao'=>(string)$row['sha256_observacao'],
                'sha256DocumentoDeclarado'=>(string)$row['sha256_documento_declarado'],
                'sha256ArquivoFisico'=>(string)$row['sha256_arquivo_fisico'],
                'documentoReferencia'=>(string)$row['documento_referencia'],
                'versaoLancamento'=>(int)$row['versao_lancamento'],
                'criadoEm'=>(string)$row['criado_em'],
                'somenteLeitura'=>true,
            );
        }

        return array_map(static function ($launch) use ($documentsByLaunch) {
            $id = isset($launch['id']) ? (string)$launch['id'] : '';
            if (isset($documentsByLaunch[$id])) {
                $launch['observacaoDocumental'] = $documentsByLaunch[$id];
            }
            return $launch;
        }, $launches);
    }

    public function decorateOne(array $launch): array
    {
        $decorated = $this->decorate(array($launch));
        return $decorated[0];
    }

    private function tableExists(): bool
    {
        if ($this->tableAvailable !== null) return $this->tableAvailable;
        $stmt = $this->db->query(
            "SELECT CASE WHEN OBJECT_ID(N'dbo.lancamentos_observacoes_documentais',N'U') IS NULL THEN 0 ELSE 1 END"
        );
        $this->tableAvailable = (int)$stmt->fetchColumn() === 1;
        return $this->tableAvailable;
    }
}
