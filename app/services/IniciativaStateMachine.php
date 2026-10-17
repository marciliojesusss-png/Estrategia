<?php
declare(strict_types=1);

final class IniciativaStateMachine
{
    const NOT_STARTED = 'NAO_INICIADO';
    const IN_PROGRESS = 'EM_PREENCHIMENTO';
    const SUBMITTED = 'ENVIADO_HOMOLOGACAO';
    const RETURNED = 'DEVOLVIDO_AJUSTE';
    const HOMOLOGATED = 'HOMOLOGADO';
    const REOPENED = 'REABERTO';

    private static $transitions = array(
        self::NOT_STARTED => array(self::IN_PROGRESS,self::SUBMITTED),
        self::IN_PROGRESS => array(self::SUBMITTED),
        self::SUBMITTED => array(self::HOMOLOGATED,self::RETURNED),
        self::RETURNED => array(self::SUBMITTED),
        self::HOMOLOGATED => array(self::REOPENED),
        self::REOPENED => array(self::SUBMITTED),
    );

    public static function canTransition($from,$to)
    {
        return isset(self::$transitions[$from])&&in_array($to,self::$transitions[$from],true);
    }

    public static function assertTransition($from,$to)
    {
        if(!self::canTransition($from,$to))throw new LogicException('Transição de estado não permitida: '.$from.' -> '.$to.'.');
    }

    public static function editable($status)
    {
        return in_array($status,array(self::NOT_STARTED,self::IN_PROGRESS,self::RETURNED,self::REOPENED),true);
    }

    public static function draftStatus($current,$hasProductiveContent)
    {
        if($current===self::NOT_STARTED&&$hasProductiveContent)return self::IN_PROGRESS;
        if(self::editable($current))return$current;
        throw new LogicException('Acompanhamento não está disponível para edição.');
    }
}
