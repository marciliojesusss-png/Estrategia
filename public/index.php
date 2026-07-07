<?php
declare(strict_types=1);

require_once __DIR__ . '/../templates/page.php';
Auth::authenticate();
header('Location: ' . Auth::homeForProfile(), true, 302);
