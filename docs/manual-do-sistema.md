# Manual do Sistema de Indicadores Estratégicos

**CAIXA Loterias — versão 1.0.0**  
**Atualizado em:** 24/11/2026

## 1. Objetivo deste manual

Este manual apresenta o passo a passo para utilizar o Sistema de Indicadores
Estratégicos. Ele é destinado aos seguintes perfis:

- Administrador;
- Unidade Apuradora (preenchedor);
- Diretoria Homologadora;
- Consultor da Diretoria;
- Usuário da Companhia;
- Auditor CAIXA.

As opções exibidas no menu dependem do perfil e do escopo de acesso de cada
usuário. Por isso, algumas telas deste manual podem não aparecer para todos.

> Este documento trata da utilização do sistema. Instalação, SQL Server, LDAP,
> backups e publicação são assuntos técnicos documentados separadamente.

## 2. Visão rápida dos processos

### 2.1 Indicadores

```text
Administrador configura indicador, meta e prazo
                    ↓
Unidade Apuradora preenche o resultado
                    ↓
Salva como rascunho e anexa a documentação aplicável
                    ↓
Envia para homologação
                    ↓
Diretoria homologa ou devolve para ajuste
                    ↓
Resultado homologado aparece nos painéis e relatórios oficiais
```

### 2.2 Iniciativas

```text
Administrador cadastra a iniciativa
                    ↓
Administrador gera os acompanhamentos trimestrais
                    ↓
Unidade responsável registra o andamento
                    ↓
Salva como rascunho e envia para homologação
                    ↓
Diretoria homologa ou devolve para ajuste
                    ↓
Administrador pode consolidar o acompanhamento para o CA
```

## 3. Perfis e responsabilidades

| Perfil | Responsabilidade principal |
|---|---|
| Administrador | Configurar o sistema, administrar acessos e acompanhar todo o processo. |
| Unidade Apuradora | Preencher indicadores e iniciativas dentro do seu escopo. |
| Diretoria Homologadora | Analisar, homologar, devolver e reabrir registros da diretoria. |
| Consultor da Diretoria | Atua no mesmo escopo de análise da diretoria, sem preencher lançamentos. |
| Usuário da Companhia | Consultar o Resumo Executivo institucional. |
| Auditor CAIXA | Consultar dados, documentos e trilhas durante uma concessão temporária. |

Toda ação permanece associada à matrícula autenticada. O compartilhamento de
um grupo de preenchimento não altera a autoria do lançamento, do envio ou do
anexo.

## 4. Acesso e navegação

### 4.1 Entrar no sistema

1. Acesse o endereço informado para o ambiente da CAIXA Loterias.
2. Faça a autenticação corporativa, quando solicitada.
3. Confira no cabeçalho seu nome, perfil e escopo.
4. Caso o perfil ou o escopo estejam incorretos, não realize lançamentos e
   solicite a conferência do cadastro ao administrador.

O sistema não armazena a senha corporativa. A identificação é feita pelo LDAP,
e a autorização de uso é consultada no cadastro de acessos do sistema.

### 4.2 Cabeçalho

No cabeçalho são apresentados:

- nome do usuário;
- perfil em uso;
- escopo de atuação;
- seletor **Visualizar como**, exclusivo do administrador;
- seletor de tema;
- botão **Sair**.

### 4.3 Temas

O seletor de tema oferece:

- **Azul Noturno:** tema escuro institucional;
- **Claro Institucional:** conteúdo em fundo claro, preservando o cabeçalho
  institucional azul;
- **Automático:** acompanha a preferência clara ou escura configurada no
  sistema operacional ou navegador.

A escolha é apenas visual e não modifica dados ou permissões.

### 4.4 Visualizar como

O administrador pode usar **Visualizar como** para conferir como uma tela é
apresentada a outro perfil ou grupo.

Essa função:

- não troca a matrícula autenticada;
- não cria um novo acesso;
- não substitui o teste final com um usuário real;
- mantém as ações registradas em nome do administrador.

Para voltar à visão completa, selecione **Administrador**.

### 4.5 Menus principais

| Menu | Finalidade |
|---|---|
| Resumo Executivo | Posição consolidada, cards e gráficos dos indicadores. |
| Visão Trimestral | Resultado consolidado por trimestre. |
| Indicadores | Catálogo, detalhes e evolução dos indicadores. |
| Lançamentos | Preenchimento ou consulta das competências. |
| Iniciativas Estratégicas | Cadastro e acompanhamento trimestral das iniciativas. |
| Homologação | Análise dos lançamentos de indicadores. |
| Homologação de Iniciativas | Análise dos acompanhamentos trimestrais. |
| Consolidação CA | Consolidação executiva das iniciativas homologadas. |
| Relatórios | Relatórios consolidados, detalhados e de governança. |
| Configurações | Cadastros e controles administrativos. |
| Auditoria | Histórico de operações e acessos. |

## 5. Manual do administrador

### 5.1 Conferência inicial recomendada

Ao iniciar um novo ciclo:

1. Acesse **Configurações > Matriz de Cobertura**.
2. Verifique se os grupos, unidades e diretorias estão cobertos.
3. Confira os usuários ativos em **Configurações > Acessos**.
4. Confira indicadores, metas e prazos do período.
5. Confira se os acompanhamentos trimestrais das iniciativas foram gerados.
6. Verifique as pendências nos menus de homologação.

### 5.2 Cadastrar ou editar um acesso corporativo

1. Acesse **Configurações**.
2. Selecione **Acessos**.
3. Clique em **Novo registro** para cadastrar ou em **Editar** para alterar.
4. Informe a matrícula e o nome exatamente como identificados no ambiente
   corporativo.
5. Selecione o perfil.
6. Preencha o escopo correspondente ao perfil.
7. Selecione **Ativo**.
8. Clique em **Salvar acesso**.
9. Confirme se o registro aparece na lista.

Em produção, utilize **Acessos corporativos**. O módulo **Usuários simulados** é
destinado a cenários controlados de desenvolvimento e demonstração.

### 5.3 Cadastrar um preenchedor por grupo

1. Em **Configurações > Acessos**, clique em **Novo registro**.
2. Selecione o perfil **Unidade Apuradora**.
3. Escolha o grupo de preenchimento.
4. Preencha os demais dados do empregado.
5. Salve e consulte a **Matriz de Cobertura**.

Grupos atualmente configurados:

| Grupo | Limite de acessos | Escopo compartilhado |
|---|---:|---|
| DICOT | 6 | Indicadores da DICOT e iniciativas de SUCOL, SULOT, GENOL e SUNEG. |
| DILOT | 2 | Indicadores da DILOT, incluindo os anteriormente vinculados à GERIN. |
| SURCI | 2 | Indicadores e iniciativas da SURCI. |
| SUCTF | 2 | Indicadores da SUCTF e iniciativa da GELOF no escopo DIFIR. |

O sistema bloqueia o cadastro quando o limite de vagas do grupo é atingido.

### 5.4 Conceder acesso temporário a um auditor

1. Acesse **Configurações > Acessos**.
2. Clique em **Novo registro**.
3. Selecione **Auditor CAIXA (somente leitura)**.
4. Informe matrícula e nome.
5. Preencha início e fim da concessão.
6. Informe protocolo, matrícula do aprovador e justificativa.
7. Mantenha a concessão como ativa.
8. Clique em **Salvar acesso**.

O acesso somente funciona dentro do período autorizado. O auditor não pode
preencher, editar, homologar, reabrir, consolidar ou administrar registros.

### 5.5 Conferir a Matriz de Cobertura

1. Acesse **Configurações > Matriz de Cobertura**.
2. Observe os cards de resumo.
3. Utilize os filtros para localizar grupos, unidades ou diretorias.
4. Identifique linhas sem cobertura ou com vagas incompletas.
5. Corrija o cadastro em **Acessos** e consulte novamente a matriz.

### 5.6 Manter cadastros básicos

Em **Configurações**, o administrador pode consultar ou manter:

- planos;
- pilares estratégicos;
- unidades apuradoras;
- diretorias responsáveis;
- indicadores;
- metas por competência;
- tipos de cálculo.

Antes de inativar ou alterar um cadastro utilizado, confira o impacto nos
lançamentos e relatórios. Registros históricos devem permanecer associados à
estrutura válida na época em que foram produzidos.

### 5.7 Cadastrar um indicador

1. Acesse **Indicadores** ou **Configurações > Indicadores**.
2. Inicie um novo cadastro.
3. Informe número, nome, plano e pilar.
4. Informe periodicidade, unidade apuradora e diretoria responsável.
5. Selecione tipo de cálculo e unidade de medida.
6. Informe a meta anual e a métrica ou fórmula de referência.
7. Revise o status e salve.
8. Cadastre as metas aplicáveis em **Configurações > Metas**.
9. Confira o indicador no catálogo e na tela de lançamentos do seu escopo.

### 5.8 Cadastrar metas

1. Acesse **Configurações > Metas**.
2. Clique em **Novo registro**.
3. Selecione o indicador e a competência.
4. Informe a meta conforme a unidade de medida do indicador.
5. Salve e confira a competência na listagem.

Não altere retroativamente uma meta já utilizada sem validar o impacto no
cálculo, na homologação e nos relatórios oficiais.

### 5.9 Configurar prazos de apuração

1. Acesse **Configurações > Prazos de Apuração**.
2. Clique em **Novo registro** ou edite a competência desejada.
3. Informe a competência.
4. Informe o prazo para preenchimento.
5. Informe o prazo para homologação, que não pode ser anterior ao prazo de
   preenchimento.
6. Defina o registro como ativo ou inativo.
7. Clique em **Salvar prazo**.

Use **Reiniciar lançamentos** somente quando houver necessidade operacional
confirmada. A ação não deve ser usada como forma rotineira de corrigir um único
registro.

### 5.10 Cadastrar uma iniciativa

1. Acesse **Iniciativas Estratégicas**.
2. Clique em **Nova iniciativa**.
3. Preencha plano, pilar e título executivo.
4. Informe a descrição oficial e o objetivo.
5. Informe unidade e diretoria responsáveis.
6. Defina ano e trimestre de início.
7. Informe a previsão de conclusão, quando disponível.
8. Marque **Exige evidência** somente quando o anexo for obrigatório para o
   envio.
9. Clique em **Salvar cadastro**.

O botão **Cadastro** altera o registro mestre. O botão **Abrir** acessa o
acompanhamento de um trimestre específico.

### 5.11 Gerar acompanhamentos trimestrais

1. Acesse **Iniciativas Estratégicas** como administrador.
2. Em **Gerar acompanhamentos do ano**, informe o exercício desejado.
3. Clique em **Gerar**.
4. Confira a quantidade apresentada na mensagem de confirmação.
5. Filtre cada trimestre para validar os registros criados.

Regras da geração:

- acompanhamentos existentes não são alterados nem duplicados;
- são criados somente os períodos ausentes;
- novos acompanhamentos começam como **Não iniciado**;
- iniciativas concluídas ou canceladas em posição homologada são ignoradas;
- o campo sugere inicialmente o próximo ano, mas pode ser substituído pelo ano
  que precisa ser completado.

Exemplo: ao informar `2026` depois de já existirem 1TRI, 2TRI e 3TRI, o sistema
cria somente os acompanhamentos ausentes do 4TRI.

### 5.12 Homologar como administrador

O administrador possui visão geral e pode realizar homologações durante a fase
de operação e estabilização. Sempre que possível, mantenha a segregação de
funções e utilize outro administrador ou o responsável da diretoria para a
decisão.

Para indicadores, utilize **Homologação**. Para iniciativas, utilize
**Homologação de Iniciativas**. O procedimento de análise é apresentado nas
seções 7 e 8 deste manual.

### 5.13 Consolidar iniciativas para o CA

1. Acesse **Consolidação CA**.
2. Localize um acompanhamento homologado.
3. Clique em **Consolidar**.
4. Revise o andamento homologado.
5. Informe a síntese executiva.
6. Selecione os marcos ou próximos passos que devem receber destaque.
7. Salve a consolidação.

### 5.14 Fechamento e reabertura

O administrador controla em **Configurações**:

- fechamento para o Conselho de Administração;
- reabertura de lançamento;
- solicitações de reabertura;
- histórico das alterações.

Após o fechamento do período para o CA, a reabertura administrativa é
excepcional, exige justificativa e fica registrada na auditoria. Não utilize
reabertura para modificar diretamente um histórico já encerrado sem a devida
justificativa.

### 5.15 Auditoria

1. Acesse **Auditoria**.
2. Informe data inicial e data final.
3. Opcionalmente, informe usuário ou ação.
4. Clique em **Filtrar**.
5. Consulte separadamente **Operações** e **Acessos**.
6. Use **Anterior** e **Próxima** para navegar entre as páginas.

## 6. Manual do preenchedor — indicadores

### 6.1 Localizar um lançamento

1. Acesse **Lançamentos**.
2. Utilize os filtros de mês, status ou indicador.
3. Localize a competência desejada.
4. Clique na ação apresentada na última coluna.

O sistema apresenta somente os registros permitidos para o escopo do usuário.
Nos grupos compartilhados, todos os preenchedores do grupo enxergam o mesmo
conjunto autorizado.

### 6.2 Preencher e salvar um rascunho

1. Abra o lançamento.
2. Confira indicador, competência, meta e regra de cálculo.
3. Preencha os campos de entrada apresentados.
4. Informe a **Observação da área**, quando necessária.
5. Revise os resultados calculados pelo sistema.
6. Clique em **Salvar rascunho**.
7. Aguarde a mensagem de confirmação.

Os campos variam conforme o tipo de indicador. Não tente substituir a memória
de cálculo utilizando apenas a observação textual.

### 6.3 Anexar uma evidência

1. No lançamento aberto, localize **Documentação comprobatória**.
2. Informe uma referência ou link, quando existir.
3. Selecione o arquivo.
4. Informe uma descrição que permita identificar o documento.
5. Clique em **Adicionar arquivo**, ou salve o lançamento quando o sistema
   informar que o arquivo selecionado será anexado ao salvar.
6. Confirme se o documento aparece em **Arquivos da versão atual**.

Formatos aceitos: PDF, JPG, JPEG, PNG, XLS, XLSX, DOC e DOCX.

Quando a evidência for obrigatória, o sistema impede o envio para homologação
até que exista um arquivo válido na versão atual. Evidências de versões
anteriores permanecem no histórico, mas não comprovam automaticamente a nova
versão.

### 6.4 Enviar para homologação

1. Revise todos os dados e documentos.
2. Clique em **Enviar para homologação**.
3. Aguarde a confirmação.
4. Confira se o status mudou para **Enviado para homologação**.

Depois do envio, o lançamento deixa de ser editável até que seja homologado,
devolvido ou reaberto conforme a governança do período.

### 6.5 Corrigir um lançamento devolvido

1. Filtre os lançamentos com status **Devolvido para ajuste**.
2. Abra o registro.
3. Leia a observação da diretoria e confira a documentação.
4. Faça as correções.
5. Salve o rascunho.
6. Clique em **Reenviar para homologação**.

### 6.6 Solicitar reabertura

Quando um lançamento homologado precisar de correção:

1. Abra o lançamento homologado.
2. Clique em **Solicitar reabertura**, quando a opção estiver disponível.
3. Informe uma justificativa objetiva.
4. Envie a solicitação.
5. Aguarde a decisão administrativa.

## 7. Manual do preenchedor — iniciativas

### 7.1 Localizar o acompanhamento

1. Acesse **Iniciativas Estratégicas**.
2. Selecione ano e trimestre.
3. Utilize os demais filtros, se necessário.
4. Clique em **Filtrar**.
5. Na iniciativa desejada, clique em **Abrir**.

Cada iniciativa possui um acompanhamento independente por trimestre. O
cadastro mestre da iniciativa não substitui o preenchimento trimestral.

### 7.2 Preencher o acompanhamento

1. Selecione o **Status da iniciativa**.
2. Descreva o **Andamento da Unidade**.
3. Informe a referência documental ou o link, quando aplicável.
4. Atualize os blocos:
   - Marcos e Entregas;
   - Próximos Passos;
   - Frentes, Projetos ou Ações.
5. Em cada item, informe título, descrição e status.
6. Utilize as setas para ordenar os itens.
7. Clique em **Salvar rascunho**.

### 7.3 Evidências de iniciativas

O anexo é opcional quando o cadastro da iniciativa não estiver marcado como
**Exige evidência**. Mesmo quando opcional, ele pode ser utilizado para melhorar
a rastreabilidade.

Para anexar:

1. Selecione o arquivo.
2. Informe a descrição.
3. Clique em **Adicionar arquivo**.
4. Confirme o documento na lista de evidências.

### 7.4 Enviar para homologação

1. Revise o status, o andamento e os itens.
2. Clique em **Enviar para homologação**.
3. Confira a mudança de status.

Se o acompanhamento for devolvido, abra-o novamente, corrija o conteúdo e faça
um novo envio.

## 8. Manual do homologador e do consultor

### 8.1 Homologar um indicador

1. Acesse **Homologação**.
2. Filtre por mês, status ou indicador.
3. Abra o lançamento pendente.
4. Confira:
   - meta e realizado;
   - percentual e situação;
   - observação da área;
   - referência documental;
   - anexos da versão atual;
   - aviso de consistência apresentado pelo sistema.
5. Registre a observação da diretoria.
6. Escolha uma ação:
   - **Homologar**, quando o lançamento estiver correto;
   - **Devolver para ajuste**, quando houver correção a realizar;
   - **Reabrir para edição**, quando um registro homologado precisar voltar ao
     fluxo, respeitando as regras de fechamento.

O sistema preserva o histórico das decisões. Fora da exceção administrativa
prevista para a fase de estabilização, quem produziu ou enviou um lançamento
não deve homologar o mesmo registro.

### 8.2 Homologar uma iniciativa

1. Acesse **Homologação de Iniciativas**.
2. Localize o acompanhamento pendente.
3. Clique em **Analisar**.
4. Confira o andamento, os itens, as referências e os anexos.
5. Informe a justificativa da decisão quando solicitada.
6. Clique em **Homologar** ou **Devolver para ajuste**.

Um acompanhamento homologado pode ser reaberto apenas por perfil autorizado,
com justificativa registrada.

### 8.3 Consulta pela Unidade Apuradora

Quando uma Unidade Apuradora acessa **Homologação**, a tela funciona como
histórico de acompanhamento. Os botões de decisão não ficam disponíveis.

## 9. Manual do Usuário da Companhia

O Usuário da Companhia possui consulta institucional do **Resumo Executivo**.

1. Acesse **Resumo Executivo**.
2. Utilize os filtros disponíveis.
3. Consulte os cards de situação.
4. Analise o mapa de desempenho.
5. Consulte os gráficos por pilar e a evolução Meta x Realizado.
6. Clique em um indicador quando houver acesso ao detalhe institucional.

Esse perfil não preenche, homologa ou altera dados. Os resultados exibidos
devem utilizar a posição oficial disponível para a consulta institucional.

## 10. Manual do Auditor CAIXA

O acesso do auditor é nominal, temporário e somente leitura.

### 10.1 Conferir a concessão

Ao entrar, confira no cabeçalho:

- nome;
- perfil **Auditor CAIXA**;
- escopo geral.

Se a concessão estiver ausente, inativa ou vencida, o sistema negará o acesso.

### 10.2 Consultas disponíveis

O auditor pode consultar:

- Resumo Executivo;
- Visão Trimestral;
- catálogo e detalhes dos indicadores;
- lançamentos em modo de consulta;
- iniciativas e seus acompanhamentos;
- **Dossiê de Auditoria**, no menu de relatórios;
- **Trilha de Auditoria**, no menu de auditoria;
- evidências e históricos permitidos.

Downloads de evidências ficam registrados na auditoria.

### 10.3 Consultar a trilha

1. Acesse **Trilha de Auditoria**.
2. Informe o período.
3. Opcionalmente, filtre por usuário ou ação.
4. Clique em **Filtrar**.
5. Consulte o histórico de operações e os registros de acesso.
6. Navegue pelas páginas quando houver muitos resultados.

## 11. Painéis e relatórios

### 11.1 Resumo Executivo

Os cards apresentam o total de indicadores e sua distribuição, incluindo:

- atingidos;
- abaixo da meta;
- em acompanhamento;
- sem dados;
- homologados;
- pendentes de homologação.

As cores representam a situação do indicador. Utilize os filtros do topo antes
de comparar os números de perfis diferentes.

### 11.2 Visão Trimestral

1. Acesse **Visão Trimestral**.
2. Selecione ano e trimestre.
3. Utilize filtros de plano, pilar, unidade, diretoria ou status.
4. Consulte a consolidação calculada para o período.

### 11.3 Evolução Meta x Realizado

No detalhe de um indicador:

1. Selecione o ano.
2. Observe as colunas do realizado.
3. Compare com a linha da meta.
4. Passe o cursor sobre os pontos para consultar valores.

### 11.4 Relatórios de indicadores

Em **Relatórios**, o usuário autorizado pode:

- selecionar exercício e posição oficial;
- consultar por competência ou trimestre;
- filtrar plano, indicador, diretoria, unidade e situação;
- abrir o relatório detalhado de um indicador;
- consultar relatório de governança;
- imprimir o relatório exibido.

Antes de imprimir, confirme os filtros e o contexto informado no cabeçalho do
relatório.

### 11.5 Relatório de iniciativas

No módulo de relatórios, acesse a consulta de iniciativas e:

1. selecione ano e trimestre;
2. filtre pilar, unidade, diretoria ou status;
3. consulte os cards de resumo;
4. expanda a iniciativa para ler o andamento e os itens sem usar rolagem
   horizontal;
5. imprima ou registre a posição necessária.

## 12. Situações e estados mais comuns

### 12.1 Indicadores

| Status | Significado |
|---|---|
| Não iniciado | Ainda não houve preenchimento. |
| Em preenchimento / Rascunho | Dados iniciados e ainda editáveis. |
| Enviado para homologação | Aguardando decisão da diretoria. |
| Devolvido para ajuste | Deve ser corrigido e reenviado. |
| Homologado | Posição oficial aprovada. |
| Reaberto | Nova versão liberada para correção. |

### 12.2 Iniciativas

O acompanhamento possui dois estados diferentes:

- **Status da iniciativa:** Não iniciada, Em andamento, Concluída, Suspensa ou
  Cancelada;
- **Status do acompanhamento:** Não iniciado, Em preenchimento, Enviado para
  homologação, Devolvido para ajuste, Homologado ou Reaberto.

Uma iniciativa pode estar **Em andamento** e, ao mesmo tempo, ter o seu
acompanhamento trimestral **Homologado**.

## 13. Problemas comuns

### O perfil correto não aparece

- confirme se o acesso está ativo;
- confira o grupo, a unidade ou a diretoria cadastrada;
- saia e entre novamente;
- solicite ao administrador a conferência em **Configurações > Acessos**.

### O indicador não aparece para preenchimento

- confira a competência e os filtros;
- confirme se o indicador está ativo;
- confira se existe meta ou lançamento para o período;
- valide a cobertura do grupo na Matriz de Cobertura.

### Não é possível enviar para homologação

- confira os campos obrigatórios;
- verifique a consistência do cálculo;
- anexe evidência quando ela for obrigatória;
- confira se o prazo está aberto;
- leia a mensagem apresentada pelo sistema.

### A iniciativa não aparece no trimestre

- confira o ano e o trimestre do filtro;
- verifique se o administrador gerou os acompanhamentos do exercício;
- confirme se a iniciativa está ativa e dentro do escopo do usuário.

### O relatório não apresenta registros

- limpe os filtros;
- confira o ano, a posição e o status;
- confirme se o registro foi homologado quando a consulta exige posição
  oficial;
- verifique se o perfil possui acesso ao escopo pesquisado.

### O auditor recebe acesso não autorizado

- confira início e fim da concessão;
- confirme se o acesso e a concessão estão ativos;
- confira matrícula e perfil;
- saia e entre novamente depois de corrigir o cadastro.

### A tela informa erro da API

1. Não repita várias vezes a mesma operação.
2. Registre a mensagem, data, horário e tela.
3. Se possível, faça uma captura da tela.
4. Encaminhe ao administrador ou à equipe de suporte.

## 14. Boas práticas

- Sempre confira o perfil e o escopo antes de atuar.
- Use **Salvar rascunho** durante o preenchimento.
- Revise números, unidade de medida e competência antes do envio.
- Dê nomes claros aos arquivos de evidência.
- Registre justificativas objetivas em devoluções e reaberturas.
- Não compartilhe credenciais ou utilize a matrícula de outro empregado.
- Não altere cadastros históricos apenas para corrigir a visualização de um
  relatório.
- Encerre a sessão pelo botão **Sair**.

## 15. Roteiros rápidos

### Preencher um indicador

```text
Lançamentos → filtrar → abrir → preencher → revisar cálculo
→ anexar evidência aplicável → salvar rascunho → enviar para homologação
```

### Homologar um indicador

```text
Homologação → filtrar pendentes → abrir → conferir dados e documentos
→ registrar observação → homologar ou devolver
```

### Preencher uma iniciativa

```text
Iniciativas Estratégicas → selecionar ano/trimestre → abrir
→ atualizar andamento e itens → salvar rascunho → enviar para homologação
```

### Homologar uma iniciativa

```text
Homologação de Iniciativas → analisar → conferir andamento e documentos
→ homologar ou devolver
```

### Cadastrar um acesso

```text
Configurações → Acessos → Novo registro → preencher perfil e escopo
→ salvar → conferir na Matriz de Cobertura
```

## 16. Documentos complementares

- [Guia rápido do sistema](guia-rapido-do-sistema.md)
- [Governança de acessos](governanca-acessos.md)
- [Grupos de preenchimento e Auditor CAIXA](grupos-preenchimento-e-auditor-caixa.md)
- [Prazos de apuração](prazos-apuracao.md)
- [Evidências](evidencias.md)

