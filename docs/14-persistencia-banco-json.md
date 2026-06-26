# Persistência em banco JSON local

## Objetivo

Permitir que os dados alterados no sistema sejam gravados nos arquivos da pasta `data`, mantendo o `localStorage` como fallback quando o servidor local não estiver disponível.

## Como iniciar

Execute `iniciar-banco-json.bat` ou rode:

```text
node json-db-server.js
```

Depois, acesse:

```text
http://127.0.0.1:5500/
```

Abrir os arquivos HTML diretamente continua disponível para consulta e testes, mas nesse modo as alterações ficam somente no navegador.

## Funcionamento

- O servidor disponibiliza as páginas e os arquivos estáticos do sistema.
- A API `/api/data/:colecao` lê e grava as coleções JSON conhecidas.
- Cada gravação também é preservada no `localStorage`.
- As gravações da mesma coleção são executadas em ordem.
- O servidor usa substituição atômica do arquivo para evitar JSON parcialmente escrito.
- Dados operacionais existentes no navegador são migrados uma vez para o banco JSON.
- Se a API ficar indisponível, a aplicação continua usando o `localStorage`.

## Coleções persistidas

- usuários;
- planos;
- pilares;
- unidades;
- diretorias;
- indicadores;
- metas mensais;
- regras de indicadores;
- lançamentos;
- homologações;
- histórico.

## Critérios de aceite

- [x] Servir o sistema em endereço local.
- [x] Ler as coleções pela API.
- [x] Gravar alterações nos arquivos JSON.
- [x] Manter fallback no navegador.
- [x] Serializar gravações concorrentes por coleção.
- [x] Aguardar a persistência antes de concluir ações de negócio.
- [x] Impedir acesso estático fora da pasta do sistema.
