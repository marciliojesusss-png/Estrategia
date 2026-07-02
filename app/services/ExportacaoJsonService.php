<?php
declare(strict_types=1);

require_once __DIR__ . '/BaseDadosService.php';

final class ExportacaoJsonService
{
    public function __construct(private BaseDadosService $base = new BaseDadosService())
    {
    }

    public function exportarBaseCompleta(): array
    {
        $data = $this->base->all();
        return [
            'metadata' => [
                'sistema' => 'Central de Indicadores Estratégicos',
                'empresa' => 'CAIXA Loterias',
                'modo' => 'php_sqlite_local',
                'banco' => 'SQLite',
                'dataExportacao' => date('c'),
                'anoReferencia' => 2026,
            ],
            'indicadores' => $data['indicadores'],
            'lancamentos' => $data['lancamentos'],
            'homologacoes' => $data['homologacoes'],
            'retificacoes' => [],
            'evidencias' => [],
            'auditoria' => $data['historico'],
            'configuracoes' => [
                'planos' => $data['planos'],
                'pilares' => $data['pilares'],
                'unidades' => $data['unidades'],
                'diretorias' => $data['diretorias'],
                'metas' => $data['metas'],
                'regrasIndicadores' => $data['regrasIndicadores'],
            ],
            'usuariosValidacao' => $data['usuarios'],
        ];
    }
}
