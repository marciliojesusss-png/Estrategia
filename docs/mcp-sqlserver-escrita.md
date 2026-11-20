# MCP SQL Server com escrita controlada

## Registro da criação

Em **20/11/2026**, foi criado um acesso exclusivo para o MCP de escrita no SQL Server local.

| Item | Valor |
|---|---|
| Instância | `localhost\SQLEXPRESS01` |
| Banco autorizado | `Estrategia` |
| Login do servidor | `mcp_estrategia_codex` |
| Usuário do banco | `mcp_estrategia_codex` |
| Função do banco | `mcp_estrategia_codex_role` |
| MCP | `@connorbritain/mssql-mcp-server@0.7.0` |

O login foi criado somente para o banco local de desenvolvimento. Ele não recebeu função administrativa no servidor.

## Permissões concedidas

No esquema `dbo` do banco `Estrategia`, a função pode:

- consultar dados (`SELECT`);
- inserir dados (`INSERT`);
- atualizar dados (`UPDATE`);
- excluir dados (`DELETE`).

O login **não pode**:

- atuar como `sysadmin`;
- controlar o banco;
- alterar o esquema `dbo`;
- criar tabelas, views, procedures ou funções;
- assumir propriedade de objetos;
- usar pelo MCP as ferramentas `create_table`, `create_index` e `drop_table`.

Qualquer alteração de estrutura deverá ser analisada e autorizada separadamente.

## Proteção da credencial

A senha foi gerada aleatoriamente e não consta neste documento nem em arquivo versionado.

O projeto utiliza dois arquivos locais ignorados pelo Git:

- `.codex/mssql-mcp-write.credential`: senha cifrada;
- `.codex/mssql-mcp-write.key`: chave local da cifra.

O MCP também mantém:

- confirmação obrigatória para operações de alteração;
- aprovação do Codex para ferramentas de escrita;
- auditoria com ocultação de argumentos sensíveis.

## Arquivos da configuração

- `.codex/config.toml`: registra o servidor `sqlserver_write` no Codex;
- `.codex/start-mssql-mcp-write.ps1`: carrega a credencial e inicia o MCP;
- `.codex/mssql-mcp-write.env`: configuração local da conexão, ignorada pelo Git;
- `.codex/provision-mssql-mcp-write.ps1`: cria ou atualiza o login e rotaciona a senha;
- `storage/logs/mssql-mcp-write-audit.jsonl`: auditoria gerada durante o uso.

## Resultado da validação

Após o provisionamento, o SQL Server retornou:

| Verificação | Resultado |
|---|---:|
| Banco efetivo | `Estrategia` |
| É `sysadmin` | Não |
| Possui `CONTROL` no banco | Não |
| Pode consultar | Sim |
| Pode inserir | Sim |
| Pode atualizar | Sim |
| Pode excluir | Sim |
| Pode alterar o esquema | Não |
| Pode criar tabela | Não |

## Ativação no Codex

Reinicie o Codex ou a extensão da IDE para carregar o servidor `sqlserver_write` definido no projeto.

O script abaixo deve ser executado novamente somente para recriar o acesso ou rotacionar a senha:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\.codex\provision-mssql-mcp-write.ps1
```

Essa execução troca a senha do login e atualiza os arquivos locais de credencial.

## Escopo da alteração

Esta implementação não modificou:

- o LDAP;
- usuários da aplicação;
- tabelas ou dados da aplicação;
- estrutura do banco `Estrategia`.

Foram criados apenas o login, o usuário, a função de acesso e suas permissões controladas.

