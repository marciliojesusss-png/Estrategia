# Fase 3 - Consulta e cadastro de indicadores

## Objetivo

Evoluir a tela de Indicadores para consulta completa dos dados importados da planilha e permitir edição administrativa dos campos cadastrais, com persistência local temporária.

## Descrição técnica

A fase 3 transforma a listagem inicial de indicadores em uma tela de consulta e cadastro. A tabela passa a ter ações de visualização e, para o perfil Administrador, edição. Ao selecionar um indicador, o sistema exibe um painel de detalhe com plano, pilar, periodicidade, unidade apuradora, diretoria responsável, tipo de cálculo, meta anual e métrica/fórmula.

Quando o Administrador edita um cadastro, os dados são salvos no `localStorage` pela camada `DataStore`, preservando os JSON originais como base inicial. A alteração também registra histórico local com usuário, data/hora, ação, entidade, registro alterado, valor anterior e valor novo.

## Arquivos envolvidos

- `indicadores.html`
- `assets/js/indicators.js`
- `assets/js/dataStore.js`
- `assets/css/styles.css`
- `docs/00-plano-de-fases.md`
- `docs/03-fase-consulta-cadastro-indicadores.md`

## Regras de negócio

- Todos os perfis autorizados podem consultar indicadores dentro do seu escopo.
- Administrador visualiza todos os indicadores.
- Unidade Apuradora visualiza apenas indicadores vinculados à sua unidade.
- Diretoria Homologadora visualiza apenas indicadores vinculados à sua diretoria.
- Consulta/Gestão visualiza indicadores sem permissão de edição.
- Apenas Administrador pode editar cadastro de indicador.
- Demais perfis não visualizam ação de edição.
- Número do indicador não pode duplicar outro indicador existente.
- Métrica/fórmula é campo cadastral administrativo, não campo de preenchimento pela unidade apuradora.
- Alterações administrativas devem ser persistidas localmente.
- Alterações administrativas devem registrar histórico.

## Checklist de ações

- [x] Adicionar coluna de ações à tabela de indicadores.
- [x] Criar ação de visualização de detalhe.
- [x] Exibir painel de detalhe do indicador.
- [x] Exibir meta anual e métrica/fórmula no detalhe.
- [x] Criar formulário de edição administrativa.
- [x] Bloquear edição para perfis não administradores.
- [x] Carregar listas de plano, pilar, unidade, diretoria, tipo de cálculo e unidade de medida.
- [x] Validar duplicidade de número do indicador.
- [x] Salvar alterações de indicador no `localStorage`.
- [x] Registrar histórico de alteração cadastral.
- [x] Permitir restauração dos indicadores originais da planilha.

## Critérios de aceite

- [x] Tela de Indicadores lista os registros conforme o escopo do usuário.
- [x] Filtros por plano, pilar, unidade e diretoria permanecem funcionais.
- [x] Cada indicador pode ser aberto para consulta detalhada.
- [x] Perfis não administradores não veem botão de edição.
- [x] Administrador vê botão de edição.
- [x] Administrador consegue alterar campos cadastrais do indicador.
- [x] Alteração fica disponível após recarregar a página por meio do `localStorage`.
- [x] Histórico local recebe registro de alteração.
- [x] JSON original continua sendo a base de restauração.

## Observações técnicas

- Esta fase não implementa criação de novos indicadores, pois a base do sistema exige os 23 indicadores da aba `PEI_PN`. A criação de novos cadastros pode ser adicionada depois, se a área de negócio confirmar essa necessidade.
- A restauração remove apenas as alterações locais de indicadores e recarrega a base original do arquivo JSON.
- A edição é uma simulação front-end, compatível com a premissa de não haver backend nem banco de dados.
- As regras de lançamento mensal e homologação continuam reservadas para as fases 4 e 5.
