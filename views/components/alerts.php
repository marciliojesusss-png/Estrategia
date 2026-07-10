<?php
$flashMessage = !empty($_SESSION['_flash']) ? (string) $_SESSION['_flash'] : '';
unset($_SESSION['_flash']);
?>
<?php if ($flashMessage !== ''): ?>
  <div class="notice info" role="status"><?= e($flashMessage) ?></div>
<?php endif; ?>
