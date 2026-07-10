<?php if (!empty($_SESSION['_flash'])): ?><div class="alert" role="status"><?= e($_SESSION['_flash']) ?></div><?php unset($_SESSION['_flash']); endif; ?>
