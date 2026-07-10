<?php
declare(strict_types=1);
final class LancamentoStateMachine
{
    const DRAFT='Rascunho'; const SUBMITTED='Enviado para homologacao'; const REOPENED='Reaberto'; const RETURNED='Devolvido para ajuste'; const RECTIFIED='Retificado';
    public static function editable($status){return in_array(self::normalize($status),array(self::DRAFT,self::REOPENED,self::RETURNED),true);}
    public static function deletable($status){return self::normalize($status)===self::DRAFT;}
    public static function normalize($status){$v=(string)$status;$v=str_replace(array('homologação','homologaÃ§Ã£o'),'homologacao',$v);return $v;}
}
