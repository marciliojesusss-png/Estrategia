<?php
declare(strict_types=1);

final class Dotenv
{
    public static function load($path)
    {
        if (!is_file($path) || !is_readable($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }
            if (strpos($line, 'export ') === 0) {
                $line = trim(substr($line, 7));
            }

            $separator = strpos($line, '=');
            if ($separator === false) {
                continue;
            }

            $name = trim(substr($line, 0, $separator));
            if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name) || getenv($name) !== false) {
                continue;
            }

            $value = self::parseValue(substr($line, $separator + 1));
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
            if (!isset($_SERVER[$name])) {
                $_SERVER[$name] = $value;
            }
        }
    }

    private static function parseValue($value)
    {
        $value = trim($value);
        $length = strlen($value);
        if ($length >= 2 && (($value[0] === '"' && $value[$length - 1] === '"') || ($value[0] === "'" && $value[$length - 1] === "'"))) {
            $quote = $value[0];
            $value = substr($value, 1, -1);
            if ($quote === '"') {
                $value = str_replace(array('\\n', '\\r', '\\"', '\\\\'), array("\n", "\r", '"', '\\'), $value);
            }
            return $value;
        }

        return preg_replace('/\s+#.*$/', '', $value);
    }
}