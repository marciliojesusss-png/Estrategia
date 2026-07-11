# Relatório de compatibilidade com PHP 7.1.19

Data da análise: 10/07/2026  
Alvo: PHP 7.1.19 NTS x64 em IIS/FastCGI  
Escopo: 127 arquivos PHP em `api/`, `app/`, `public/`, `templates/`, `tests/` e `views/`

## Conclusão executiva

**Resultado: compatibilidade estática favorável, com homologação de runtime pendente.**

Não foram encontradas construções de linguagem nem chamadas nativas conhecidas que exijam PHP 7.2 ou posterior. Os 127 arquivos também passaram no analisador sintático disponível no ambiente de desenvolvimento (PHP 8.3.31), e o teste existente de segurança/publicação passou.

Isso não permite afirmar compatibilidade integral com o servidor ainda: o projeto não foi executado com o binário PHP 7.1.19, e as versões/arquiteturas efetivas de `pdo_sqlsrv`, `sqlsrv`, ODBC, IIS/FastCGI e da integração LDAP não estão disponíveis neste ambiente. Portanto, a publicação deve ser condicionada ao teste descrito em "Homologação obrigatória".

## Evidências

| Verificação | Resultado | Observação |
| --- | --- | --- |
| Inventário de arquivos | 127 PHP | 11 em `api/`, 52 em `app/`, 21 em `public/`, 4 em `templates/`, 11 em `tests/` e 28 em `views/` |
| Análise sintática local | Aprovada em 127/127 | Executada com PHP 8.3.31; detecta erros gerais, mas não substitui o parser 7.1 |
| Recursos posteriores ao PHP 7.1 | Nenhum uso efetivo encontrado | Varredura ampliada para arrow functions, propriedades tipadas, `match`, nullsafe, enums, `readonly`, union/intersection types, trailing comma em chamadas, `??=` e funções nativas posteriores |
| Recursos usados e aceitos pelo alvo | Compatíveis | `declare(strict_types=1)`, tipos escalares, tipos de retorno, `void`, `Throwable`, closures estáticas, arrays curtos e operador `??` são aceitos no PHP 7.1 |
| Dependências Composer | Não aplicável | Não há `composer.json` nem `composer.lock` no repositório |
| Teste interno de publicação | Aprovado | `php tests/security-publication.test.php` |
| Regressão local completa | Aprovada historicamente | Execução registrada antes da remoção do antigo executor em `scripts/`; executada em PHP 8.3.31 |

## Pontos de atenção

### 1. Não houve execução no PHP 7.1.19 — risco médio

O PHP instalado na máquina de análise é 8.3.31. O lint nessa versão não rejeita necessariamente uma construção que só exista em versões novas. A varredura estática adicional reduz esse risco, mas o aceite final requer `php.exe` 7.1.19.

### 2. O teste automático de compatibilidade é incompleto — risco médio

O teste `tests/security-publication.test.php` percorre somente `app/` e procura apenas seis categorias incompatíveis. Ele não cobre `api/`, `public/`, `templates/`, `tests/` e `views/`, nem todas as mudanças introduzidas após o PHP 7.1. A auditoria deste relatório cobriu todos os diretórios, mas essa proteção ainda não ficou automatizada no pipeline.

### 3. Driver SQL Server precisa casar exatamente com o runtime — risco alto de implantação

O projeto exige PDO e `pdo_sqlsrv` em produção. Para PHP 7.1 NTS x64 no Windows, o DLL deve corresponder simultaneamente à versão 7.1, arquitetura x64 e modalidade NTS. A matriz atual da Microsoft registra PHP 7.1 apenas nos drivers legados 5.3, 5.2, 4.3 e 4.0; versões atuais não o suportam. A versão do ODBC também deve ser compatível com a versão escolhida do driver PHP.

Referências: [matriz de suporte dos drivers PHP para SQL Server](https://learn.microsoft.com/en-us/sql/connect/php/microsoft-php-drivers-for-sql-server-support-matrix?view=sql-server-ver17) e [requisitos de sistema](https://learn.microsoft.com/en-us/sql/connect/php/system-requirements-for-the-php-sql-driver?view=sql-server-ver17).

### 4. Extensões e integração externa — risco médio de implantação

Devem estar habilitados e validados no PHP de produção:

- `PDO` e `pdo_sqlsrv` para o SQL Server;
- `fileinfo`, usado na validação MIME de evidências;
- `iconv`, usado na normalização de identidade e autorização;
- `session`, `filter`, `json` e `openssl`/fonte criptográfica adequada para `random_bytes`;
- arquivo corporativo indicado por `LDAP_PATH`, cuja compatibilidade não pode ser aferida porque ele fica fora do repositório.

### 5. PHP 7.1 está sem suporte — risco crítico de segurança

O PHP 7.1 chegou ao fim de vida e não recebe correções oficiais. Mesmo que a aplicação seja sintaticamente compatível, o runtime expõe o ambiente a vulnerabilidades não corrigidas. A recomendação é planejar a atualização do servidor; se isso não for possível agora, registrar formalmente a aceitação do risco e aplicar controles compensatórios.

Referência: [branches PHP sem suporte](https://www.php.net/eol.php).

## Homologação obrigatória antes da publicação

Executar no próprio servidor, usando o mesmo usuário do pool do IIS:

```powershell
php -v
php -i | findstr /I "Thread Safety Architecture extension_dir"
php -m
php -r "var_export(PDO::getAvailableDrivers());"
```

Critérios mínimos:

1. `php -v` deve informar exatamente PHP 7.1.19, NTS e x64.
2. `PDO::getAvailableDrivers()` deve conter `sqlsrv`.
3. Todos os arquivos devem passar em `php -l` usando esse executável 7.1.19.
4. Executar a suíte PHP do repositório no PHP 7.1.19.
5. Realizar teste de conexão, leitura, escrita, transação, paginação e rollback no SQL Server homologado.
6. Validar login LDAP, sessão, upload/download de evidência e logs sob IIS/FastCGI.
7. Confirmar permissões de escrita em `storage/`, `uploads/` e diretórios temporários.

## Parecer final

O código analisado **não apresenta incompatibilidade estática conhecida com PHP 7.1.19**. A liberação para produção, porém, deve permanecer **condicionada** à execução da suíte e dos testes de integração no runtime PHP 7.1.19 NTS x64 real, com o conjunto legado correto de drivers Microsoft. Sem essa etapa, a conclusão não deve ser tratada como certificação de funcionamento em produção.
