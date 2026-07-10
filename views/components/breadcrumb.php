<?php $breadcrumbs = isset($breadcrumbs) && is_array($breadcrumbs) ? $breadcrumbs : array(); ?>
<?php if ($breadcrumbs): ?><nav aria-label="Caminho de navegação"><ol class="breadcrumb"><?php foreach ($breadcrumbs as $label => $url): ?><li><?php if ($url): ?><a href="<?= e($url) ?>"><?= e($label) ?></a><?php else: ?><?= e($label) ?><?php endif; ?></li><?php endforeach; ?></ol></nav><?php endif; ?>
