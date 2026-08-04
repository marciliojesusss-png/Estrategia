# DECISÕES TÉCNICAS PRINCIPAIS

## 1. Não reescrever todo o projeto em PHP solto

O Estrategia continuará com:

```text
app
public
views
api
storage
uploads
```

A semelhança com o Sistema-Expedientes será criada nas integrações com o servidor, e não pela remoção da arquitetura atual.

## 2. Primeiro tentar PDO_SQLSRV

A ordem será:

```text
1. Habilitar ou validar pdo_sqlsrv
2. Usar credenciais SQL explícitas em configuração segura
3. Criar adapter sqlsrv somente se necessário
```

Reescrever todos os repositories diretamente para `sqlsrv_query()` deverá ser a última alternativa.

## 3. Primeiro reutilizar a autenticação corporativa existente

A ordem será:

```text
1. legacy_file
2. native_ldap
```

Isso aproxima o Estrategia do fluxo que já funciona no servidor.

## 4. Não depender exclusivamente do `.env`

O projeto utilizará:

```text
IIS → servidor.local.php → .env → padrão
```

## 5. Publicar preferencialmente pela pasta `public`

A raiz pública deverá continuar isolada dos arquivos internos.

---

