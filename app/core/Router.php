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
        $this->routes[] = array('method' => strtoupper($method), 'path' => $this->normalize($path), 'handler' => $handler);
    }

    public function dispatch($method, $path)
    {
        $method = strtoupper($method);
        $path = $this->normalize($path);
        foreach ($this->routes as $route) {
            if (($route['method'] === '*' || $route['method'] === $method) && $route['path'] === $path) {
                call_user_func($route['handler']);
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
