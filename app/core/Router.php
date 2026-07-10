<?php
declare(strict_types=1);

require_once __DIR__ . '/ErrorHandler.php';

final class Router
{
    private $routes = array();

    public function get($path, $handler) { $this->add('GET', $path, $handler); }
    public function post($path, $handler) { $this->add('POST', $path, $handler); }
    public function any($path, $handler) { $this->add('*', $path, $handler); }

    public function add($method, $path, $handler)
    {
        $normalized = $this->normalize($path);
        $names = array();
        $parts = explode('/', trim($normalized, '/'));
        $regexParts = array();
        foreach ($parts as $part) {
            if (preg_match('/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/', $part, $match)) {
                $names[] = $match[1]; $regexParts[] = '([^/]+)';
            } else $regexParts[] = preg_quote($part, '#');
        }
        $regex = $normalized === '/' ? '#^/$#' : '#^/' . implode('/', $regexParts) . '$#';
        $this->routes[] = array('method' => strtoupper($method), 'path' => $normalized, 'regex' => $regex, 'names' => $names, 'handler' => $handler);
    }

    public function dispatch($method, $path)
    {
        $method = strtoupper($method);
        $path = $this->normalize($path);
        foreach ($this->routes as $route) {
            if (($route['method'] === '*' || $route['method'] === $method) && preg_match($route['regex'], $path, $matches)) {
                array_shift($matches);
                $arguments = array_map('urldecode', $matches);
                call_user_func_array($route['handler'], $arguments);
                return;
            }
        }
        ErrorHandler::renderError(404);
    }

    private function normalize($path)
    {
        $path = '/' . trim((string) $path, '/');
        return $path === '/' ? '/' : rtrim($path, '/');
    }
}
