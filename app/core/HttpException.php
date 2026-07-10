<?php
declare(strict_types=1);
final class HttpException extends RuntimeException
{
    private $status;private $errors;
    public function __construct($message,$status=400,array$errors=array()){parent::__construct($message);$this->status=(int)$status;$this->errors=$errors;}
    public function status(){return$this->status;}public function errors(){return$this->errors;}
}
