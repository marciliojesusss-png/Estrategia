# PROMPT PARA O CODEX — Sistema de Acompanhamento de Indicadores CAIXA Loterias

Atue como um desenvolvedor front-end sênior especialista em HTML5, CSS3 e JavaScript puro.

Preciso desenvolver um sistema web corporativo para acompanhamento dos indicadores estratégicos da CAIXA Loterias.

O sistema deve ser desenvolvido utilizando apenas:

* HTML5;
* CSS3;
* JavaScript puro;
* arquivos JSON para simulação dos dados;
* localStorage para persistência local temporária;
* Chart.js para criação dos gráficos.

Não utilizar PHP, Laravel, Node.js, banco de dados, backend próprio, frameworks CSS ou bibliotecas como Bootstrap.

O sistema deve ser desenvolvido de forma progressiva, organizado por fases. O próprio Codex deverá propor as fases mais adequadas para o desenvolvimento do projeto.

Para cada fase, o Codex deve criar um arquivo Markdown separado contendo:

* nome da fase;
* objetivo da fase;
* descrição técnica;
* arquivos que serão criados ou alterados;
* regras de negócio envolvidas;
* checklist de ações;
* critérios de aceite;
* observações técnicas.

Cada checklist deve usar o seguinte formato:

```markdown
- [ ] Ação a ser realizada
- [ ] Ação a ser realizada
- [ ] Ação a ser realizada
```

---

# 1. Contexto do sistema

A CAIXA Loterias possui 23 indicadores estratégicos, distribuídos em 2 planos:

* PEI;
* PN.

Os indicadores também estão distribuídos em 6 pilares estratégicos:

* Cliente no Centro;
* Eficiência e Rentabilidade;
* Tecnologia e Inovação;
* Pessoas, Cultura e Agilidade;
* Sustentabilidade e Cidadania;
* Atuação em Ecossistema.

Cada indicador possui:

* número do indicador;
* pilar estratégico;
* nome do indicador;
* periodicidade;
* plano, podendo ser PEI ou PN;
* unidade apuradora;
* diretoria responsável;
* meta anual;
* meta mensal;
* realizado mensal;
* percentual atingido mensal;
* resultado acumulado anual;
* percentual atingido anual;
* métrica/fórmula de referência;
* tipo de cálculo;
* status de preenchimento;
* status de homologação;
* justificativa;
* observação da área;
* observação da diretoria.

A aba de referência da planilha original é chamada `PEI_PN`.

---

# 2. Regra principal do sistema

O sistema deve seguir esta lógica:

```text
Indicador → Unidade Apuradora → Preenchimento
Indicador → Diretoria Responsável → Homologação
```

A unidade apuradora é responsável por preencher os resultados mensais dos indicadores sob sua responsabilidade.

A diretoria responsável é responsável por homologar ou devolver para ajuste os lançamentos feitos pela unidade apuradora.

---

# 3. Objetivo do sistema

O sistema deve permitir:

* consultar os 23 indicadores;
* filtrar indicadores por plano;
* filtrar indicadores por pilar;
* filtrar indicadores por unidade apuradora;
* filtrar indicadores por diretoria responsável;
* lançar resultado mensal;
* calcular automaticamente o percentual atingido;
* calcular automaticamente o acumulado anual;
* enviar lançamento para homologação;
* homologar lançamento;
* devolver lançamento para ajuste;
* bloquear edição após homologação;
* visualizar dashboard com gráficos;
* gerar relatórios;
* exportar relatórios em CSV;
* registrar histórico das alterações.

---

# 4. Premissa sobre fórmulas e percentuais

A unidade apuradora não deve preencher a fórmula.

A unidade apuradora também não deve preencher diretamente o percentual atingido, salvo em indicadores classificados como manuais.

A regra geral deve ser:

```text
A unidade apuradora preenche o realizado mensal.
O sistema busca a meta mensal cadastrada.
O sistema aplica o tipo de cálculo configurado para o indicador.
O sistema calcula automaticamente o percentual atingido mensal.
O sistema calcula o resultado acumulado anual.
O sistema calcula o percentual atingido anual.
```

A fórmula/métrica da planilha deve ser exibida na tela apenas como referência explicativa, em campo não editável para a unidade apuradora.

---

# 5. Tipos de cálculo necessários

Criar um arquivo JavaScript específico para o motor de cálculos.

O sistema deve suportar os seguintes tipos de cálculo:

```javascript
percentual_direto
percentual_inverso
valor_acumulado
media_percentual
projeto_percentual
projeto_binario
manual_homologado
qualitativo
personalizado
```

## percentual_direto

Usado quando quanto maior o realizado, melhor.

```javascript
percentual = realizado / meta;
```

## percentual_inverso

Usado quando quanto menor o realizado, melhor.

```javascript
percentual = meta / realizado;
```

Ou aplicar regra equivalente que preserve a lógica de desempenho superior quando o realizado for menor que a meta.

## valor_acumulado

Usado para indicadores cujo resultado anual depende da soma dos realizados mensais contra a soma das metas mensais.

```javascript
percentualAcumulado = somaRealizados / somaMetas;
```

## media_percentual

Usado quando o resultado anual deve ser a média dos percentuais mensais.

```javascript
percentualAnual = media(percentuaisMensais);
```

## projeto_percentual

Usado para indicadores de execução de projeto.

```javascript
percentual = percentualDeExecucao;
```

## projeto_binario

Usado para indicadores de entrega.

```javascript
0 = não entregue
1 = entregue
```

## manual_homologado

Usado em indicadores excepcionais em que a área informa o percentual ou resultado manualmente.

Nesse caso:

* a justificativa deve ser obrigatória;
* a observação deve ser obrigatória;
* o lançamento deve ser destacado na tela de homologação;
* o sistema deve registrar que o percentual foi informado manualmente.

## qualitativo

Usado quando a meta for textual ou depender de avaliação institucional.

## personalizado

Usado para regras específicas que precisarão ser implementadas individualmente.

---

# 6. Perfis de acesso simulados

Como a primeira versão será somente front-end, o controle de acesso será simulado em JavaScript e JSON.

Criar os seguintes perfis:

1. Administrador;
2. Unidade Apuradora;
3. Diretoria Homologadora;
4. Consulta/Gestão.

## Administrador

Pode:

* visualizar todos os indicadores;
* cadastrar e editar indicadores;
* cadastrar metas;
* alterar tipo de cálculo;
* reabrir lançamento homologado;
* visualizar histórico;
* acessar todos os dashboards;
* acessar relatórios.

## Unidade Apuradora

Pode:

* visualizar apenas os indicadores vinculados à sua unidade;
* preencher realizado mensal;
* salvar rascunho;
* enviar para homologação;
* corrigir lançamento devolvido;
* visualizar status dos seus indicadores.

Não pode:

* alterar fórmula;
* alterar métrica;
* alterar diretoria responsável;
* homologar;
* editar lançamento homologado.

## Diretoria Homologadora

Pode:

* visualizar os lançamentos vinculados à sua diretoria;
* homologar lançamento;
* devolver lançamento para ajuste;
* registrar observação da diretoria.

Não pode:

* alterar fórmula;
* alterar métrica;
* alterar meta;
* alterar realizado da unidade apuradora.

## Consulta/Gestão

Pode:

* visualizar dashboards;
* filtrar por plano, pilar, unidade, diretoria, mês e ano;
* exportar relatórios.

Não pode:

* editar lançamentos;
* homologar;
* alterar cadastros.

---

# 7. Status dos lançamentos

Cada lançamento mensal deve possuir um status.

Usar os seguintes status:

```text
Não iniciado
Em preenchimento
Enviado para homologação
Homologado
Devolvido para ajuste
Reaberto
```

## Regras de status

* Ao criar o lançamento, o status deve ser `Não iniciado`.
* Ao salvar dados pela primeira vez, o status deve ser `Em preenchimento`.
* Ao clicar em enviar para homologação, o status deve ser `Enviado para homologação`.
* Ao homologar, o status deve ser `Homologado`.
* Ao devolver, o status deve ser `Devolvido para ajuste`.
* Ao administrador reabrir, o status deve ser `Reaberto`.

Lançamento homologado deve ficar bloqueado para edição.

---

# 8. Estrutura esperada do projeto

O Codex deve propor e criar uma estrutura organizada de pastas e arquivos para o projeto.

A estrutura deve conter, no mínimo:

* arquivos HTML para as telas principais;
* pasta para arquivos CSS;
* pasta para arquivos JavaScript;
* pasta para arquivos JSON;
* pasta para documentação em Markdown;
* arquivo principal de estilos;
* arquivo principal de inicialização;
* arquivo para motor de cálculos;
* arquivo para manipulação de dados;
* arquivo para autenticação simulada;
* arquivo para dashboard;
* arquivo para lançamentos;
* arquivo para homologação;
* arquivo para relatórios;
* arquivo para administração.

O Codex deve decidir a melhor nomenclatura dos arquivos, desde que mantenha clareza, organização e separação de responsabilidades.

---

# 9. Dados simulados

Criar arquivos JSON para simular os dados do sistema.

Os dados simulados devem contemplar:

* usuários;
* planos;
* pilares;
* unidades apuradoras;
* diretorias responsáveis;
* indicadores;
* metas mensais;
* lançamentos mensais;
* homologações;
* histórico de alterações.

O arquivo de indicadores deve conter os 23 indicadores da aba `PEI_PN`.

Cada indicador deve ter estrutura semelhante a:

```json
{
  "id": 1,
  "numero": 1,
  "pilar": "Cliente no Centro",
  "indicador": "Índice de Ofertas Personalizadas aos Clientes Ativos",
  "periodicidade": "Trimestral",
  "plano": "PEI",
  "unidadeApuradora": "SUCOL",
  "diretoriaResponsavel": "DICOT",
  "metaAnualDescricao": "≥ 10% da base de clientes ativos recebe ofertas personalizadas",
  "metrica": "(Número de clientes com interações personalizadas em canais eletrônicos) / (Total de clientes ativos identificáveis em canais eletrônicos) x 100",
  "tipoCalculo": "percentual_direto",
  "unidadeMedida": "percentual",
  "ativo": true
}
```

Cada lançamento mensal deve ter estrutura semelhante a:

```json
{
  "id": 1,
  "indicadorId": 1,
  "ano": 2026,
  "mes": 1,
  "nomeMes": "Janeiro",
  "metaMensal": 0.10,
  "realizadoMensal": 0.2567,
  "percentualAtingido": 2.567,
  "resultadoAcumulado": 0.2567,
  "percentualAtingidoAcumulado": 2.567,
  "status": "Homologado",
  "justificativa": "",
  "observacaoArea": "",
  "observacaoDiretoria": "",
  "preenchidoPor": "usuario.simulado",
  "dataPreenchimento": "2026-01-31",
  "homologadoPor": "diretoria.simulada",
  "dataHomologacao": "2026-02-05"
}
```

---

# 10. Telas necessárias

O sistema deve conter, no mínimo, as seguintes telas:

## Tela de Login Simulado

Deve permitir simular o acesso de usuários com diferentes perfis.

Campos sugeridos:

* usuário;
* perfil;
* unidade apuradora;
* diretoria responsável.

Após o login, salvar os dados do usuário no `localStorage`.

---

## Dashboard

Deve exibir visão geral dos indicadores.

Cards sugeridos:

* total de indicadores;
* quantidade de indicadores PEI;
* quantidade de indicadores PN;
* indicadores homologados;
* indicadores pendentes;
* indicadores devolvidos;
* percentual médio de atingimento.

Filtros:

* ano;
* mês;
* plano;
* pilar;
* unidade apuradora;
* diretoria responsável;
* status.

Gráficos:

* indicadores por plano;
* indicadores por pilar;
* desempenho médio por pilar;
* evolução mensal do percentual atingido;
* status dos lançamentos;
* ranking dos indicadores com maior atingimento;
* ranking dos indicadores com menor atingimento.

---

## Consulta e Cadastro de Indicadores

Deve listar todos os indicadores.

Campos exibidos:

* número;
* indicador;
* plano;
* pilar;
* periodicidade;
* unidade apuradora;
* diretoria responsável;
* meta anual;
* métrica;
* tipo de cálculo;
* status ativo/inativo.

Administrador pode editar campos de cadastro.

Demais perfis apenas consultam.

---

## Lançamento Mensal

A tela deve permitir que a unidade apuradora preencha os indicadores sob sua responsabilidade.

Campos visíveis:

* indicador;
* plano;
* pilar;
* periodicidade;
* meta anual;
* métrica;
* meta mensal;
* realizado mensal;
* percentual atingido calculado;
* resultado acumulado;
* percentual acumulado;
* justificativa;
* observação da área;
* status.

Botões:

* salvar rascunho;
* enviar para homologação;
* limpar;
* voltar.

Regras:

* unidade apuradora só vê seus indicadores;
* percentual atingido deve ser calculado automaticamente;
* fórmula/métrica não pode ser editada;
* lançamento homologado deve ficar bloqueado;
* indicadores com tipo `manual_homologado` devem permitir percentual manual, mas exigir justificativa.

---

## Homologação

A tela deve listar os lançamentos enviados para homologação.

A diretoria só deve visualizar lançamentos vinculados à sua diretoria.

Campos exibidos:

* indicador;
* plano;
* pilar;
* unidade apuradora;
* mês;
* ano;
* meta mensal;
* realizado mensal;
* percentual atingido;
* resultado acumulado;
* justificativa;
* observação da área;
* campo para observação da diretoria.

Ações:

* homologar;
* devolver para ajuste.

Regras:

* ao homologar, status muda para `Homologado`;
* ao devolver, status muda para `Devolvido para ajuste`;
* toda devolução exige observação da diretoria;
* toda homologação deve registrar data e usuário;
* lançamento homologado fica bloqueado.

---

## Relatórios

Criar relatórios com filtros por:

* ano;
* mês;
* plano;
* pilar;
* unidade apuradora;
* diretoria responsável;
* status;
* indicador.

Relatórios necessários:

* relatório geral dos indicadores;
* relatório por plano;
* relatório por pilar;
* relatório por unidade apuradora;
* relatório por diretoria responsável;
* relatório de pendências;
* relatório de homologações;
* relatório de devoluções;
* relatório acumulado anual.

Permitir exportação para CSV.

---

## Administração

Criar área administrativa para:

* usuários simulados;
* planos;
* pilares;
* unidades apuradoras;
* diretorias responsáveis;
* indicadores;
* metas;
* tipos de cálculo;
* reabertura de lançamento.

Apenas o perfil Administrador deve acessar essa área.

---

# 11. Motor de cálculos

Criar funções reutilizáveis para cálculo dos indicadores.

Funções necessárias:

```javascript
calcularPercentual(indicador, meta, realizado)
calcularAcumulado(indicador, lancamentos)
calcularStatusDesempenho(percentual)
formatarPercentual(valor)
formatarValor(valor, unidadeMedida)
```

O motor deve:

* evitar divisão por zero;
* tratar valores nulos;
* tratar indicadores manuais;
* tratar indicadores qualitativos;
* retornar status de cálculo;
* registrar quando o cálculo não for aplicável.

Exemplo de retorno:

```javascript
{
  percentual: 1.25,
  percentualFormatado: "125%",
  statusCalculo: "calculado",
  mensagem: "Cálculo realizado com sucesso"
}
```

---

# 12. Histórico de alterações

Toda alteração relevante deve ser registrada no histórico.

Registrar:

* usuário;
* data e hora;
* ação;
* entidade alterada;
* ID do registro;
* valor anterior;
* valor novo.

Ações importantes:

* criação de lançamento;
* alteração de realizado;
* envio para homologação;
* homologação;
* devolução;
* reabertura;
* alteração de meta;
* alteração de tipo de cálculo.

---

# 13. Requisitos de interface

A interface deve ser limpa, responsiva e profissional.

Não utilizar frameworks CSS.

Criar o CSS manualmente.

A interface deve conter:

* menu de navegação;
* cabeçalho;
* identificação do usuário logado;
* cards de resumo;
* tabelas responsivas;
* filtros;
* badges de status;
* botões de ação;
* gráficos;
* modais ou caixas de confirmação;
* mensagens de sucesso;
* mensagens de alerta;
* mensagens de erro.

Usar visual corporativo discreto, com boa legibilidade e organização.

---

# 14. Requisitos de desenvolvimento em fases

O Codex deve propor a divisão do projeto em fases.

Para cada fase, criar um arquivo Markdown dentro da pasta de documentação.

Cada arquivo Markdown deve conter:

```markdown
# Nome da fase

## Objetivo

## Descrição técnica

## Arquivos envolvidos

## Regras de negócio

## Checklist de ações

- [ ] Ação 1
- [ ] Ação 2
- [ ] Ação 3

## Critérios de aceite

- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## Observações técnicas
```

O Codex deve começar criando a fase inicial do projeto, com estrutura de pastas, arquivos base, documentação inicial e dados simulados mínimos.

Após concluir uma fase, deve aguardar validação antes de avançar para a próxima.

---

# 15. Critérios gerais de aceite do sistema

O sistema será considerado funcional quando:

* carregar os 23 indicadores;
* permitir login simulado por perfil;
* filtrar indicadores por unidade apuradora;
* filtrar homologações por diretoria responsável;
* permitir lançamento mensal;
* calcular percentual automaticamente;
* permitir envio para homologação;
* permitir homologação;
* permitir devolução para ajuste;
* bloquear edição após homologação;
* exibir dashboard com cards e gráficos;
* exportar relatórios em CSV;
* registrar histórico de alterações;
* funcionar sem backend;
* funcionar com HTML, CSS e JavaScript puro;
* manter os arquivos organizados;
* possuir documentação em Markdown;
* possuir checklists por fase.

---

# 16. Primeira ação esperada do Codex

Comece propondo a estrutura de fases do projeto.

Depois, implemente apenas a primeira fase.

Na primeira fase, crie:

* estrutura inicial de pastas;
* arquivos HTML principais;
* arquivo CSS principal;
* arquivos JavaScript principais;
* arquivos JSON iniciais;
* pasta de documentação;
* primeiro arquivo Markdown da fase inicial;
* checklist da fase inicial.

Não implemente o sistema inteiro de uma vez.

O desenvolvimento deve ser progressivo, controlado e validado fase por fase.
