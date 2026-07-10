<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';require_once __DIR__.'/../app/controllers/AdministracaoApiController.php';(new AdministracaoApiController())->handle('usuarios',isset($_GET['id'])?$_GET['id']:null);
