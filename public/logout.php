<?php
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/core/Session.php';

Session::destroy();
Response::redirect('/');
