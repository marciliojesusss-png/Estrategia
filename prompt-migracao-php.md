# Prompt para Reconstrução do Sistema de Gestão de Indicadores Estratégicos

## 1. Papel e especialização

Atue como um **Arquiteto de Software Sênior e Desenvolvedor Full-Stack**, especialista nas seguintes tecnologias:

* PHP 7.1.19 puro;
* SQL Server;
* IIS;
* Windows Server 2012 R2;
* PDO com driver SQL Server;
* HTML5;
* CSS3;
* JavaScript;
* Bootstrap 5;
* Chart.js;
* DataTables;
* Font Awesome;
* Sistemas corporativos;
* Arquitetura em camadas;
* Segurança de aplicações web.

O objetivo é reconstruir completamente um sistema corporativo denominado **Sistema de Gestão de Indicadores Estratégicos**.

---

# 2. Requisito principal: PHP puro

Todo o sistema deverá ser desenvolvido em **PHP puro**, sem utilização de frameworks PHP.

## Não utilizar

* Laravel;
* Symfony;
* CodeIgniter;
* Yii;
* CakePHP;
* Slim;
* Laminas;
* WordPress;
* Drupal;
* Qualquer outro framework ou CMS PHP;
* ORM;
* Migrations de frameworks;
* Engines de template;
* Dependências que exijam versões superiores ao PHP 7.1.19.

O projeto poderá utilizar uma organização inspirada em MVC e arquitetura em camadas, mas essa estrutura deverá ser implementada manualmente em PHP puro.

O sistema não deverá depender do Composer para funcionar em produção. Caso alguma biblioteca externa seja realmente necessária, ela deverá ser compatível com PHP 7.1.19, incorporada ao projeto e devidamente documentada.

---

# 3. Compatibilidade obrigatória

O sistema deverá ser totalmente compatível com:

* PHP 7.1.19;
* IIS;
* Windows Server 2012 R2;
* SQL Server;
* PDO SQL Server;
* Driver `pdo_sqlsrv`;
* Ambiente corporativo Windows.

Todo o código deverá funcionar em PHP 7.1.19 sem qualquer alteração.

Antes de gerar qualquer código, considere todas as limitações dessa versão do PHP.

## Recursos que não podem ser utilizados

Não utilizar recursos introduzidos após o PHP 7.1, incluindo:

```php
match()
fn()
spread operator em arrays
private PDO $db
typed properties
nullable types
named arguments
enum
attributes
union types
arrow functions
nullsafe operator
```

Também não utilizar:

```php
?PDO
?string
string|int
#[Attribute]
```

Evitar tipos de retorno obrigatórios, como:

```php
: string
: array
: void
```

Os exemplos acima são apenas ilustrativos e não representam uma lista exaustiva.

Sempre verificar se cada recurso utilizado é compatível com o PHP 7.1.19.

---

# 4. Ambiente de banco de dados

## Banco de dados

```text
DB5319_IndicadoresEstrategicos
```

## Servidor

```text
DF7436SR439
```

## Tecnologia de conexão

Utilizar:

* PDO;
* Driver PDO SQL Server;
* Prepared Statements;
* Tratamento de exceções;
* Codificação UTF-8;
* Configuração centralizada da conexão.

Exemplo de driver esperado:

```text
sqlsrv
```

As credenciais não deverão ficar escritas diretamente nos arquivos públicos do sistema.

Criar um arquivo central de configuração, protegido do acesso direto pelo navegador, para armazenar:

* Servidor;
* Nome do banco;
* Usuário;
* Senha;
* Porta, se necessária;
* Configurações do ambiente.

---

# 5. Tabelas existentes

Utilizar prioritariamente as tabelas já existentes:

```text
dbo.acessos_log
dbo.auditoria
dbo.backups_importacao
dbo.configuracoes
dbo.evidencias
dbo.homologacoes
dbo.indicadores
dbo.lancamentos
dbo.retificacoes
dbo.solicitacoes_reabertura
dbo.usuarios_acesso
dbo.usuarios_validacao
```

## Regras para o banco de dados

* Não criar novas tabelas sem necessidade comprovada.
* Não modificar a estrutura existente sem apresentar justificativa.
* Não inventar colunas que não existam no banco.
* Antes de implementar os módulos, analisar os relacionamentos entre as tabelas.
* Preservar dados existentes.
* Utilizar transações nas operações que envolvam múltiplas tabelas.
* Utilizar consultas parametrizadas.
* Não concatenar valores recebidos do usuário diretamente em comandos SQL.
* Criar scripts SQL somente quando forem necessários para índices, ajustes, consultas, procedures ou configurações complementares.

Caso alguma funcionalidade não possa ser implementada com as tabelas existentes, apresentar primeiro:

1. A limitação encontrada;
2. A tabela afetada;
3. A alteração proposta;
4. A justificativa técnica;
5. O impacto da alteração.

---

# 6. Arquitetura do projeto

Organizar o sistema em uma arquitetura em camadas, implementada manualmente em PHP puro.

Estrutura sugerida:

```text
indicadores-estrategicos/
│
├── app/
│   ├── auth/
│   ├── config/
│   ├── controllers/
│   ├── core/
│   ├── helpers/
│   ├── repositories/
│   ├── services/
│   ├── validators/
│   └── middleware/
│
├── api/
│   ├── indicadores/
│   ├── lancamentos/
│   ├── homologacoes/
│   ├── usuarios/
│   └── dashboard/
│
├── assets/
│   ├── css/
│   ├── js/
│   ├── img/
│   ├── fonts/
│   └── vendor/
│
├── views/
│   ├── layouts/
│   ├── components/
│   ├── dashboard/
│   ├── indicadores/
│   ├── lancamentos/
│   ├── homologacoes/
│   ├── administracao/
│   ├── auditoria/
│   ├── autenticacao/
│   └── erros/
│
├── uploads/
│   └── evidencias/
│
├── storage/
│   ├── logs/
│   ├── backups/
│   └── temporarios/
│
├── database/
│   └── scripts/
│
├── docs/
│   ├── instalacao/
│   ├── arquitetura/
│   ├── manuais/
│   └── diagramas/
│
├── index.php
├── web.config
└── README.md
```

## Responsabilidade das camadas

### Controllers

Responsáveis por:

* Receber requisições;
* Validar permissões;
* Acionar os serviços;
* Preparar dados para as views;
* Retornar respostas HTML ou JSON.

### Services

Responsáveis por:

* Regras de negócio;
* Fluxos de aprovação;
* Homologações;
* Retificações;
* Reaberturas;
* Auditoria;
* Validações corporativas.

### Repositories

Responsáveis por:

* Acesso ao banco de dados;
* Consultas SQL;
* Inclusões;
* Atualizações;
* Exclusões;
* Paginação;
* Filtros.

### Views

Responsáveis apenas pela apresentação dos dados.

Não incluir consultas SQL diretamente nas views.

### Core

Deverá conter recursos compartilhados, como:

* Conexão com o banco;
* Gerenciamento de sessão;
* Roteamento;
* Respostas JSON;
* Tratamento de erros;
* Controle de acesso;
* Proteção CSRF;
* Upload de arquivos;
* Logs.

---

# 7. Roteamento

Criar um sistema simples de rotas em PHP puro.

As rotas deverão ser compatíveis com IIS e configuradas por meio do arquivo:

```text
web.config
```

As URLs deverão ser amigáveis, por exemplo:

```text
/dashboard
/indicadores
/indicadores/novo
/indicadores/editar/15
/lancamentos
/homologacoes
/administracao/usuarios
/auditoria
```

Caso o módulo URL Rewrite do IIS não esteja disponível, o sistema deverá possuir uma alternativa utilizando parâmetros tradicionais:

```text
index.php?rota=indicadores
```

---

# 8. Autenticação e controle de acesso

Utilizar a tabela:

```text
dbo.usuarios_acesso
```

## Campos informados

```text
id
matricula
nome
perfil
sg_unidade
no_unidade
ativo
```

Não inventar campos adicionais sem validar previamente a estrutura real da tabela.

## Perfis de acesso

O sistema deverá trabalhar com os seguintes perfis:

```text
administrador
homologador
unidade_apuradora
usuario_companhia
```

## Permissões gerais

### Administrador

Poderá:

* Acessar todos os módulos;
* Gerenciar usuários;
* Gerenciar configurações;
* Cadastrar e editar indicadores;
* Consultar auditoria;
* Consultar lançamentos de todas as unidades;
* Homologar, reabrir ou retificar informações, conforme as regras do sistema.

### Homologador

Poderá:

* Consultar lançamentos encaminhados para sua homologação;
* Aprovar lançamentos;
* Rejeitar lançamentos;
* Registrar justificativas;
* Consultar o histórico das homologações.

### Unidade apuradora

Poderá:

* Consultar indicadores vinculados à sua unidade;
* Criar lançamentos;
* Editar rascunhos;
* Anexar evidências;
* Submeter lançamentos para homologação;
* Solicitar reabertura ou retificação.

### Usuário da companhia

Poderá:

* Consultar informações liberadas;
* Visualizar dashboards;
* Visualizar indicadores conforme o nível de acesso definido.

## Regras de autenticação

Implementar:

* Controle de sessão;
* Regeneração do identificador da sessão após autenticação;
* Validação do usuário ativo;
* Encerramento de sessão;
* Tempo máximo de inatividade;
* Proteção contra acesso direto às páginas internas;
* Verificação de perfil em todas as rotas protegidas;
* Registro de acessos na tabela `acessos_log`.

A autenticação deverá respeitar a estrutura corporativa já existente. Não criar mecanismo de senha, integração externa ou novos campos sem confirmar a forma de autenticação adotada pelo ambiente.

---

# 9. Módulos e telas

## 9.1. Dashboard Executivo

Criar um dashboard executivo com visão consolidada do sistema.

### Exibir

* Quantidade total de indicadores;
* Indicadores ativos;
* Indicadores inativos;
* Lançamentos pendentes;
* Lançamentos em rascunho;
* Lançamentos submetidos;
* Homologações pendentes;
* Homologações aprovadas;
* Homologações rejeitadas;
* Status geral;
* Últimas atualizações;
* Indicadores por plano;
* Indicadores por pilar;
* Indicadores por diretoria;
* Evolução dos resultados;
* Percentual de atingimento das metas.

### Recursos visuais

Utilizar Chart.js para:

* Gráficos de barras;
* Gráficos de linhas;
* Gráficos de rosca;
* Indicadores percentuais;
* Evolução mensal;
* Distribuição por status.

O dashboard deverá permitir filtros por:

* Ano;
* Mês;
* Plano;
* Pilar;
* Diretoria;
* Unidade apuradora;
* Status.

---

## 9.2. Gestão de Indicadores

Criar um módulo completo de gestão de indicadores.

### Funcionalidades

* Listar;
* Consultar;
* Cadastrar;
* Editar;
* Ativar;
* Inativar;
* Visualizar detalhes;
* Pesquisar;
* Filtrar;
* Paginar;
* Exportar dados, caso tecnicamente viável.

### Campos principais

* Número;
* Nome do indicador;
* Plano;
* Pilar;
* Objetivo;
* Diretoria;
* Unidade apuradora;
* Situação;
* Ativo.

A implementação deverá utilizar os campos reais existentes na tabela `dbo.indicadores`.

Não realizar exclusão física de indicadores que já possuam lançamentos associados. Nesses casos, utilizar inativação.

---

## 9.3. Lançamentos

Criar um módulo completo para os lançamentos dos indicadores.

### Funcionalidades

* Inserir lançamento;
* Editar lançamento;
* Excluir rascunho;
* Salvar como rascunho;
* Consultar lançamento;
* Anexar evidências;
* Remover evidências, quando permitido;
* Submeter para homologação;
* Consultar histórico;
* Solicitar reabertura;
* Solicitar retificação.

### Regras gerais

* Um lançamento submetido não poderá ser alterado livremente.
* Após a submissão, alterações deverão ocorrer por reabertura ou retificação.
* Somente usuários autorizados poderão editar lançamentos.
* A unidade apuradora deverá visualizar apenas os indicadores sob sua responsabilidade.
* Toda alteração deverá ser registrada em auditoria.
* Exclusões deverão respeitar as regras de integridade dos dados.

Utilizar as tabelas relacionadas:

```text
dbo.lancamentos
dbo.evidencias
dbo.retificacoes
dbo.solicitacoes_reabertura
```

---

## 9.4. Homologações

Criar um módulo de homologação com os seguintes status:

```text
Pendente
Aprovado
Rejeitado
```

### Fluxo básico

1. A unidade apuradora cria o lançamento.
2. O lançamento é salvo como rascunho.
3. A unidade apuradora submete o lançamento.
4. O sistema encaminha o lançamento para homologação.
5. O homologador analisa os dados e evidências.
6. O homologador aprova ou rejeita.
7. O sistema registra a decisão.
8. O sistema atualiza o status do lançamento.
9. O sistema registra a operação na auditoria.

### Funcionalidades

* Listar homologações pendentes;
* Visualizar detalhes do lançamento;
* Visualizar evidências;
* Aprovar;
* Rejeitar;
* Informar justificativa;
* Consultar histórico;
* Filtrar por período, indicador, unidade e status.

Utilizar a tabela:

```text
dbo.homologacoes
```

Toda decisão deverá possuir:

* Usuário responsável;
* Data e hora;
* Status anterior;
* Novo status;
* Justificativa, quando aplicável;
* Referência ao lançamento.

---

## 9.5. Administração

Criar um módulo administrativo para gerenciamento de:

* Usuários;
* Perfis;
* Permissões;
* Unidades;
* Configurações;
* Parâmetros do sistema.

Utilizar prioritariamente:

```text
dbo.usuarios_acesso
dbo.usuarios_validacao
dbo.configuracoes
```

### Funcionalidades

* Listar usuários;
* Cadastrar usuário, caso permitido pela estrutura;
* Editar usuário;
* Ativar usuário;
* Inativar usuário;
* Alterar perfil;
* Vincular unidade;
* Consultar usuários de validação;
* Gerenciar configurações existentes.

Não permitir que um usuário remova o próprio acesso administrativo sem uma confirmação e validação adequada.

---

## 9.6. Auditoria

Criar um módulo para consulta dos registros existentes em:

```text
dbo.acessos_log
dbo.auditoria
```

### Filtros

* Data inicial;
* Data final;
* Usuário;
* Matrícula;
* Unidade;
* Operação;
* Módulo;
* Tipo de ação;
* Registro afetado.

### Informações exibidas

* Data e hora;
* Usuário;
* Matrícula;
* Endereço IP;
* Módulo;
* Operação;
* Registro afetado;
* Valor anterior;
* Novo valor;
* Resultado da operação.

Exibir somente os campos que realmente existirem nas tabelas.

---

# 10. API REST em PHP puro

Criar endpoints REST em PHP puro para os principais módulos.

## Formato

Utilizar JSON para entrada e saída.

Exemplos de endpoints:

```text
GET    /api/indicadores
GET    /api/indicadores/{id}
POST   /api/indicadores
PUT    /api/indicadores/{id}
DELETE /api/indicadores/{id}

GET    /api/lancamentos
GET    /api/lancamentos/{id}
POST   /api/lancamentos
PUT    /api/lancamentos/{id}
DELETE /api/lancamentos/{id}

GET    /api/homologacoes
POST   /api/homologacoes/{id}/aprovar
POST   /api/homologacoes/{id}/rejeitar

GET    /api/dashboard/resumo
GET    /api/dashboard/graficos
```

## Requisitos da API

* Autenticação por sessão corporativa;
* Verificação de perfil;
* Respostas JSON padronizadas;
* Códigos HTTP adequados;
* Validação de parâmetros;
* Tratamento de exceções;
* Registro de auditoria;
* Proteção contra acesso não autorizado.

Exemplo de resposta:

```json
{
  "sucesso": true,
  "mensagem": "Operação realizada com sucesso.",
  "dados": []
}
```

Exemplo de erro:

```json
{
  "sucesso": false,
  "mensagem": "Não foi possível realizar a operação.",
  "erros": []
}
```

---

# 11. Interface visual

Utilizar:

* Bootstrap 5;
* DataTables;
* Font Awesome;
* Chart.js;
* HTML5;
* CSS3;
* JavaScript.

Preferencialmente, armazenar as bibliotecas no diretório local `assets/vendor`, evitando dependência obrigatória de CDN no ambiente corporativo.

## Referência visual

O layout deverá possuir aparência corporativa moderna, inspirada em:

* Power BI Service;
* Portais corporativos;
* Identidade visual institucional da CAIXA.

A referência deverá ser utilizada apenas como inspiração visual. Não copiar marcas, componentes proprietários ou interfaces protegidas.

## Características do design

* Clean;
* Responsivo;
* Moderno;
* Corporativo;
* Alta legibilidade;
* Navegação simples;
* Hierarquia visual clara;
* Compatível com desktop e notebook;
* Adaptável a tablets e dispositivos móveis.

## Paleta principal

* Azul institucional;
* Branco;
* Cinza claro;
* Cores de apoio para status.

Sugestão de uso dos status:

* Verde para aprovado ou atingido;
* Amarelo para pendente ou atenção;
* Vermelho para rejeitado ou crítico;
* Cinza para rascunho ou inativo.

## Componentes principais

* Menu lateral;
* Cabeçalho superior;
* Breadcrumb;
* Cards de resumo;
* Tabelas responsivas;
* Modais;
* Alertas;
* Badges de status;
* Filtros;
* Paginação;
* Gráficos;
* Formulários com validação;
* Mensagens de sucesso e erro;
* Tela de carregamento.

---

# 12. Segurança

Implementar obrigatoriamente:

* PDO;
* Prepared Statements;
* Validação de entradas;
* Sanitização de saídas;
* Controle de sessão;
* Controle de acesso baseado em perfil;
* Proteção CSRF em formulários;
* Proteção contra SQL Injection;
* Proteção contra XSS;
* Validação de upload;
* Restrição de extensões;
* Restrição de tamanho dos arquivos;
* Renomeação segura de arquivos enviados;
* Bloqueio de execução de arquivos na pasta de uploads;
* Registro de operações;
* Registro de acessos;
* Tratamento seguro de erros;
* Páginas de erro sem exposição de informações técnicas;
* Logs armazenados fora das páginas públicas;
* Cabeçalhos HTTP de segurança compatíveis com IIS.

## Upload de evidências

Permitir somente formatos previamente autorizados, como:

```text
PDF
JPG
JPEG
PNG
XLS
XLSX
DOC
DOCX
```

Os formatos finais deverão ser definidos nas configurações do sistema.

Não confiar apenas na extensão do arquivo. Verificar também:

* MIME type;
* Tamanho;
* Nome;
* Integridade;
* Permissão do usuário.

---

# 13. Tratamento de erros

Criar tratamento centralizado de erros e exceções.

O sistema deverá:

* Registrar erros técnicos em arquivo de log;
* Apresentar mensagens amigáveis ao usuário;
* Não exibir senhas;
* Não exibir dados de conexão;
* Não exibir consultas SQL completas;
* Não exibir caminhos internos do servidor;
* Possuir páginas para erros 403, 404 e 500;
* Registrar falhas críticas para análise técnica.

---

# 14. Padrões de desenvolvimento

Todo código deverá:

* Ser compatível com PHP 7.1.19;
* Utilizar PHP puro;
* Possuir nomes claros;
* Possuir comentários apenas onde agreguem valor;
* Evitar duplicação;
* Separar regras de negócio das views;
* Separar consultas SQL dos controllers;
* Utilizar funções e classes reutilizáveis;
* Utilizar convenções consistentes;
* Utilizar UTF-8;
* Ser organizado por módulos;
* Possuir tratamento de falhas;
* Ser entregue completo, sem trechos omitidos.

Não entregar código com comentários como:

```text
// restante do código
// implementar depois
// adicionar lógica aqui
// exemplo simplificado
```

Não utilizar pseudocódigo no lugar da implementação.

Quando um arquivo for apresentado, informar seu caminho completo no projeto.

Exemplo:

```text
app/repositories/IndicadorRepository.php
```

Em seguida, apresentar o conteúdo integral do arquivo.

---

# 15. Entregáveis

Gerar os seguintes itens:

## 15.1. Estrutura completa do projeto

Apresentar:

* Diretórios;
* Arquivos;
* Responsabilidade de cada componente;
* Ordem recomendada de implementação.

## 15.2. Backend PHP

Entregar:

* Classes de conexão;
* Roteador;
* Controllers;
* Services;
* Repositories;
* Validações;
* Autenticação;
* Controle de sessão;
* Controle de acesso;
* Auditoria;
* Uploads;
* APIs.

Todo o backend deverá ser compatível com PHP 7.1.19.

## 15.3. Frontend responsivo

Entregar:

* Layout principal;
* Menu;
* Cabeçalho;
* Dashboard;
* Formulários;
* Tabelas;
* Gráficos;
* Modais;
* Alertas;
* Páginas de erro;
* Telas dos módulos.

## 15.4. APIs REST

Entregar:

* Endpoints;
* Controllers;
* Validações;
* Autorização;
* Respostas JSON;
* Documentação de utilização.

## 15.5. Scripts SQL

Entregar somente os scripts necessários, incluindo:

* Consultas;
* Índices recomendados;
* Ajustes justificados;
* Procedures, caso sejam realmente necessárias;
* Scripts de verificação da estrutura;
* Scripts de validação dos relacionamentos.

## 15.6. Manual de instalação no IIS

O manual deverá explicar:

1. Instalação e configuração do PHP 7.1.19;
2. Configuração do FastCGI;
3. Configuração do IIS;
4. Instalação do URL Rewrite, quando utilizado;
5. Instalação dos drivers SQL Server;
6. Ativação do `pdo_sqlsrv`;
7. Configuração do `php.ini`;
8. Criação do site ou aplicação no IIS;
9. Configuração do Application Pool;
10. Permissões das pastas;
11. Configuração do `web.config`;
12. Configuração da conexão;
13. Teste de acesso ao banco;
14. Teste do sistema;
15. Diagnóstico de erros comuns.

## 15.7. Manual técnico

Documentar:

* Arquitetura;
* Estrutura de pastas;
* Fluxo das requisições;
* Camadas;
* Classes;
* Banco de dados;
* APIs;
* Segurança;
* Auditoria;
* Logs;
* Configurações;
* Manutenção.

## 15.8. Manual do administrador

Documentar:

* Acesso administrativo;
* Cadastro de usuários;
* Alteração de perfis;
* Ativação e inativação;
* Configurações;
* Consulta da auditoria;
* Gestão dos indicadores;
* Acompanhamento das homologações;
* Tratamento de solicitações de reabertura.

## 15.9. Diagrama de arquitetura

Criar um diagrama contendo:

* Navegador;
* IIS;
* PHP 7.1.19;
* Camada de apresentação;
* Controllers;
* Services;
* Repositories;
* PDO SQL Server;
* Banco de dados;
* Armazenamento de evidências;
* Logs;
* APIs.

O diagrama poderá ser fornecido em Mermaid e em formato textual.

## 15.10. Fluxograma das funcionalidades

Criar fluxogramas para:

* Autenticação;
* Cadastro de indicador;
* Criação de lançamento;
* Submissão;
* Homologação;
* Rejeição;
* Reabertura;
* Retificação;
* Auditoria.

---

# 16. Forma de execução do projeto

O desenvolvimento deverá ser apresentado por etapas, evitando gerar todo o sistema em um único bloco sem organização.

## Etapa 1 — Diagnóstico e planejamento

Apresentar:

* Entendimento do sistema;
* Análise das tabelas;
* Relacionamentos identificados;
* Regras de negócio;
* Riscos técnicos;
* Arquitetura proposta;
* Estrutura de diretórios.

## Etapa 2 — Fundação técnica

Criar:

* Estrutura de pastas;
* Configuração;
* Conexão PDO;
* Roteamento;
* Sessão;
* Tratamento de erros;
* Layout base;
* Configuração do IIS.

## Etapa 3 — Autenticação e autorização

Criar:

* Autenticação;
* Sessão;
* Perfis;
* Permissões;
* Controle de rotas;
* Registro de acessos.

## Etapa 4 — Indicadores

Criar:

* Repository;
* Service;
* Controller;
* Views;
* Validações;
* Rotas;
* API.

## Etapa 5 — Lançamentos e evidências

Criar:

* CRUD;
* Rascunho;
* Upload;
* Submissão;
* Histórico;
* Reabertura;
* Retificação.

## Etapa 6 — Homologações

Criar:

* Fila de homologações;
* Aprovação;
* Rejeição;
* Justificativas;
* Histórico;
* Auditoria.

## Etapa 7 — Dashboard

Criar:

* Consultas consolidadas;
* Cards;
* Filtros;
* Gráficos;
* Atualizações recentes.

## Etapa 8 — Administração e auditoria

Criar:

* Usuários;
* Perfis;
* Configurações;
* Logs;
* Filtros;
* Histórico.

## Etapa 9 — APIs e integrações

Criar:

* Endpoints;
* Respostas JSON;
* Controle de acesso;
* Validações;
* Documentação.

## Etapa 10 — Testes e publicação

Realizar:

* Testes funcionais;
* Testes de segurança;
* Testes de permissões;
* Testes de upload;
* Testes de homologação;
* Testes no IIS;
* Revisão de compatibilidade com PHP 7.1.19;
* Preparação dos manuais;
* Preparação para publicação.

Ao final de cada etapa, apresentar um checklist com:

```markdown
- [x] Item concluído
- [ ] Item pendente
```

---

# 17. Regras para geração das respostas

Ao gerar o projeto:

1. Não utilizar frameworks PHP.
2. Não utilizar recursos posteriores ao PHP 7.1.
3. Não inventar tabelas ou campos.
4. Não omitir partes essenciais do código.
5. Informar o caminho de cada arquivo.
6. Entregar arquivos completos.
7. Explicar as principais decisões técnicas.
8. Manter separação entre apresentação, regra de negócio e banco de dados.
9. Utilizar Prepared Statements em todas as consultas.
10. Implementar controle de acesso em todas as funcionalidades protegidas.
11. Registrar operações relevantes em auditoria.
12. Gerar código preparado para publicação no IIS.
13. Validar a compatibilidade de cada arquivo com PHP 7.1.19.
14. Utilizar nomes de classes, métodos, variáveis e arquivos em português ou em um padrão único e consistente.
15. Não prosseguir com alterações estruturais no banco sem apresentar justificativa.

---

# 18. Resultado esperado

Ao final, o sistema deverá estar:

* Desenvolvido integralmente em PHP puro;
* Compatível com PHP 7.1.19;
* Compatível com IIS;
* Compatível com Windows Server 2012 R2;
* Integrado ao SQL Server;
* Organizado em arquitetura em camadas;
* Seguro;
* Responsivo;
* Documentado;
* Auditável;
* Preparado para manutenção;
* Pronto para publicação no ambiente corporativo.

Todo o código deverá ser entregue completo, funcional e sem dependência de frameworks PHP.
