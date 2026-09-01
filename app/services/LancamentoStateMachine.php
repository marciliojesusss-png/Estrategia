<?php
declare(strict_types=1);

final class LancamentoStateMachine
{
    const NOT_STARTED = 'Nao iniciado';
    const IN_PROGRESS = 'Em preenchimento';
    const DRAFT = 'Rascunho';
    const SUBMITTED = 'Enviado para homologacao';
    const REOPENED = 'Reaberto';
    const RETURNED = 'Devolvido para ajuste';
    const RECTIFIED = 'Retificado';

    public static function editable($status)
    {
        return in_array(self::normalize($status), array(
            self::NOT_STARTED,
            self::IN_PROGRESS,
            self::DRAFT,
            self::REOPENED,
            self::RETURNED,
            self::RECTIFIED,
        ), true);
    }

    public static function deletable($status)
    {
        return self::normalize($status) === self::DRAFT;
    }

    public static function normalize($status)
    {
        $value = trim((string)$status);
        return strtr($value, array(
            'Não iniciado'=>self::NOT_STARTED,
            'NÃ£o iniciado'=>self::NOT_STARTED,
            'Enviado para homologação'=>self::SUBMITTED,
            'Enviado para homologaÃ§Ã£o'=>self::SUBMITTED,
        ));
    }
}
