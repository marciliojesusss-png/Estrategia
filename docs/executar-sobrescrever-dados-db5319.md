# Sobrescrever os dados do DB5319

## O que será feito

O script usa o backup:

```text
Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak
```

para substituir os dados funcionais do banco:

```text
DB5319_IndicadoresEstrategicos
```

O script preserva e confere:

- proprietário do banco;
- SID de `dbo`;
- SID do usuário `s531902`;
- logins, usuários SQL, roles e permissões do destino.

> **Atenção:** os dados funcionais atuais do banco serão substituídos. Antes da
> carga, o próprio script cria um backup de segurança do destino.

## Ambiente Caixa

- Servidor SQL Server: `DF7436SR439`
- Versão identificada: SQL Server 2016 (`13.0.5026.0`)
- Autenticação: integrada do Windows
- Usuário: `CORPCAIXA\c118119`
- Banco de destino: `DB5319_IndicadoresEstrategicos`

## Antes de executar

1. Coloque o backup neste caminho do servidor SQL:

   ```text
   D:\SQLBackups\Estrategia_HOMOLOGACAO_INICIATIVAS_20261111_110041.bak
   ```

2. Confirme com a equipe responsável se `D:\SQLBackups` e `D:\SQLData` existem
   no servidor `DF7436SR439` e são acessíveis pelo serviço SQL Server. Caso não
   existam, ajuste as variáveis no início de `sobrescrever-dados-db5319.sql`.

3. Pare a aplicação e feche as conexões do SSMS com
   `DB5319_IndicadoresEstrategicos`.

4. Confirme que `CORPCAIXA\c118119` possui permissão para criar o backup de
   segurança, restaurar o banco temporário e alterar o banco de destino.

   A consulta mostrada anteriormente retornou permissões iguais a zero para o
   banco de teste `DB5319_Estrategia_TESTE_OWNER`. Isso não confirma as
   permissões no banco definitivo. Solicite a validação no
   `DB5319_IndicadoresEstrategicos` antes da execução.

## Executar

Abra o PowerShell na raiz do projeto e entre na pasta do script:

```powershell
Set-Location '.\database\sqlserver'
```

Depois, execute:

```powershell
sqlcmd -S "DF7436SR439" -E -b -f 65001 -i ".\sobrescrever-dados-db5319.sql"
```

O parâmetro `-E` utiliza a autenticação integrada do usuário Windows conectado.

## Confirmar o resultado

Quando tudo der certo, aparecerá:

```text
CARGA CONCLUIDA. O banco destino manteve owner_sid, dbo e s531902.
Valide a aplicacao antes de reabrir o acesso dos usuarios.
```

Depois:

1. Inicie a aplicação.
2. Teste o login.
3. Confira o dashboard e os indicadores.
4. Confira as iniciativas com o filtro `Homologado`.
5. Confira os relatórios e os usuários de acesso.

## Se ocorrer erro

- Não execute novamente antes de identificar a causa.
- Leia a última mensagem apresentada pelo `sqlcmd`.
- Confira conexões abertas, caminhos, permissões e espaço em disco.
- Preserve o backup de segurança criado pelo script.
- O banco temporário será mantido para diagnóstico.

