<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../app/controllers/IndicadorApiController.php';

$id = isset($_GET['id']) ? (string) $_GET['id'] : (isset($_GET['indicadorId']) ? (string) $_GET['indicadorId'] : null);
(new IndicadorApiController())->handle($id === '' ? null : $id);
