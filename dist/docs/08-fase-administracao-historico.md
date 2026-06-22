# Fase 8 - Administração e histórico

## Objetivo

Finalizar a área administrativa do sistema, permitindo manutenção local dos cadastros de apoio, edição de metas, consulta de indicadores, reabertura de lançamentos homologados e visualização do histórico de alterações.

## Descrição técnica

A fase 8 transforma a tela `Administração` em um painel modular exclusivo para o perfil Administrador. A área administrativa passa a exibir cards de resumo e módulos para usuários simulados, planos, pilares, unidades apuradoras, diretorias responsáveis, indicadores, metas mensais, tipos de cálculo, reabertura de lançamentos e histórico.

As alterações são persistidas em `localStorage`, mantendo os arquivos JSON como carga inicial. A cada alteração administrativa relevante, o sistema grava um registro no histórico com usuário, data/hora, ação, entidade, registro alterado, valor anterior e valor novo.

## Arquivos envolvidos

- `administracao.html`
- `assets/js/admin.js`
- `assets/js/dataStore.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/08-fase-administracao-historico.md`

## Regras de negócio

- Apenas Administrador acessa a tela Administração.
- Administrador pode criar e editar usuários simulados.
- Administrador pode criar e editar planos.
- Administrador pode criar e editar pilares estratégicos.
- Administrador pode criar e editar unidades apuradoras.
- Administrador pode criar e editar diretorias responsáveis.
- Administrador pode consultar indicadores na área administrativa.
- Edição detalhada dos indicadores permanece disponível na tela Indicadores, conforme fase 3.
- Administrador pode criar e editar metas mensais.
- Tipos de cálculo ficam disponíveis como catálogo de referência.
- Administrador pode reabrir lançamento homologado.
- Lançamento reaberto recebe status `Reaberto`.
- Reabertura remove data e usuário de homologação do lançamento.
- Toda criação, alteração de cadastro, alteração de meta e reabertura deve registrar histórico.
- Histórico deve ser consultável na Administração.

## Checklist de ações

- [x] Criar painel modular da Administração.
- [x] Exibir cards de resumo administrativo.
- [x] Criar módulo de usuários simulados.
- [x] Criar módulo de planos.
- [x] Criar módulo de pilares estratégicos.
- [x] Criar módulo de unidades apuradoras.
- [x] Criar módulo de diretorias responsáveis.
- [x] Criar módulo de consulta de indicadores.
- [x] Criar módulo de metas mensais.
- [x] Criar catálogo de tipos de cálculo.
- [x] Criar módulo de reabertura de lançamentos homologados.
- [x] Criar módulo de histórico.
- [x] Persistir alterações administrativas em `localStorage`.
- [x] Registrar histórico de alterações administrativas.
- [x] Registrar histórico de reabertura de lançamento.

## Critérios de aceite

- [x] Administração carrega somente para Administrador.
- [x] Cards administrativos exibem totais dos principais dados.
- [x] Cadastros simples podem ser criados e editados localmente.
- [x] Metas mensais podem ser criadas e editadas localmente.
- [x] Indicadores podem ser consultados pela área administrativa.
- [x] Tipos de cálculo são exibidos com descrição.
- [x] Lançamentos homologados podem ser reabertos.
- [x] Reabertura altera status para `Reaberto`.
- [x] Histórico lista os registros de auditoria local.
- [x] Alterações persistem após recarregar a página.

## Observações técnicas

- A área administrativa segue a premissa de front-end puro e usa `localStorage` como persistência temporária.
- Os arquivos JSON permanecem como carga inicial e fonte de restauração manual.
- O módulo de indicadores na Administração é consultivo porque a edição cadastral completa foi implementada na fase 3.
- A gestão de tipos de cálculo foi tratada como catálogo controlado, evitando alterar regras do motor sem validação técnica adicional.
