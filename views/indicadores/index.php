<section class="page-heading"><div><p class="eyebrow">Cadastro e consulta</p><h1>Indicadores</h1><p>Catálogo dos indicadores estratégicos.</p></div><?php if ($canManage): ?><a class="primary-action" href="/indicadores/novo">Novo indicador</a><?php endif; ?></section>
<form method="get" action="/indicadores" class="filters">
  <label>Pesquisar <input name="q" value="<?= e(isset($filters['q']) ? $filters['q'] : '') ?>"></label>
  <label>Plano <input name="plano" value="<?= e(isset($filters['plano']) ? $filters['plano'] : '') ?>"></label>
  <label>Pilar <input name="pilar" value="<?= e(isset($filters['pilar']) ? $filters['pilar'] : '') ?>"></label>
  <label>Situação <select name="ativo"><option value="">Todos</option><option value="1" <?= isset($filters['ativo']) && (string)$filters['ativo']==='1'?'selected':'' ?>>Ativos</option><option value="0" <?= isset($filters['ativo']) && (string)$filters['ativo']==='0'?'selected':'' ?>>Inativos</option></select></label>
  <button type="submit">Filtrar</button><a href="/indicadores">Limpar</a><a href="/indicadores/exportar?<?= e(http_build_query($filters)) ?>">Exportar CSV</a>
</form>
<section class="panel"><p><?= e($result['pagination']['total']) ?> indicador(es).</p><div class="table-wrap"><table><thead><tr><th>Nº</th><th>Indicador</th><th>Plano</th><th>Pilar</th><th>Unidade</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
<?php if (!$result['items']): ?><tr><td colspan="7">Nenhum indicador encontrado.</td></tr><?php endif; ?>
<?php foreach ($result['items'] as $item): ?><tr><td><?= e($item['numero']) ?></td><td><?= e($item['nome']) ?></td><td><?= e($item['plano']) ?></td><td><?= e($item['pilar']) ?></td><td><?= e($item['unidadeApuradora']) ?></td><td><?= $item['ativo']?'Ativo':'Inativo' ?></td><td><a href="/indicadores/<?= e(rawurlencode((string)$item['id'])) ?>">Detalhes</a><?php if ($canManage): ?> · <a href="/indicadores/<?= e(rawurlencode((string)$item['id'])) ?>/editar">Editar</a><?php endif; ?></td></tr><?php endforeach; ?>
</tbody></table></div>
<?php if ($result['pagination']['pages'] > 1): ?><nav aria-label="Paginação"><?php for ($p=1;$p<=$result['pagination']['pages'];$p++): ?><a href="?<?= e(http_build_query(array_merge($filters,array('page'=>$p)))) ?>" <?= $p===$result['pagination']['page']?'aria-current="page"':'' ?>><?= $p ?></a> <?php endfor; ?></nav><?php endif; ?></section>
