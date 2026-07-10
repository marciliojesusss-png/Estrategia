<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';require_once __DIR__.'/../app/controllers/HomologacaoApiController.php';(new HomologacaoApiController())->handle(isset($_GET['id'])?$_GET['id']:null,isset($_GET['action'])?$_GET['action']:null);
