# AJUSTE FINAL DO RESUMO EXECUTIVO — MAPA DE DESEMPENHO DOS INDICADORES

Você está trabalhando no repositório:

`marciliojesusss-png/Estrategia`

## CONTEXTO

Já existe uma implementação do novo bloco **Mapa de Desempenho dos Indicadores**, porém a direção visual final foi redefinida.

A referência correta a partir de agora é a **última imagem aprovada**, que mostra:

- um **mosaico único** de indicadores;
- **sem divisão física por pilar**;
- **sem espaços vazios sobrando no final**;
- **cards com tamanhos diferentes** para melhor ocupação do espaço;
- aparência executiva, moderna e próxima de um **home broker / painel mosaico**.

As tentativas anteriores com **uma coluna fixa para cada pilar** devem ser abandonadas.

---

# OBJETIVO

Transformar o bloco:

## MAPA DE DESEMPENHO DOS INDICADORES

em um **mosaico único, compacto e bem distribuído**, utilizando toda a largura disponível, sem separação física por pilar, sem sobra de espaço no final e com cards visualmente mais orgânicos.

---

# DIREÇÃO VISUAL OBRIGATÓRIA

## 1. USAR COMO REFERÊNCIA A ÚLTIMA IMAGEM APROVADA

A implementação final deve seguir a lógica visual da última imagem aprovada:

- um painel único;
- cards distribuídos em mosaico;
- cards de tamanhos variados;
- sem agrupamento físico por pilar;
- sem sobra de coluna vazia no final;
- uso máximo da largura disponível.

A referência antiga com 6 pilares lado a lado NÃO deve mais ser seguida como layout.

---

# 2. REMOVER A DIVISÃO FÍSICA POR PILAR

O layout NÃO deve mais ser estruturado assim:

- Cliente no Centro
- Eficiência e Rentabilidade
- Tecnologia e Inovação
- Pessoas, Cultura e Agilidade
- Sustentabilidade e Cidadania
- Atuação em Ecossistema

em colunas/blocos separados.

Os pilares continuam existindo nos dados e nos gráficos inferiores, mas **não devem mais organizar fisicamente o mosaico de cards**.

---

# 3. NÃO EXIBIR O PILAR EM CADA CARD

No mosaico principal, os cards NÃO precisam exibir:

- cabeçalho do pilar;
- chip do pilar;
- identificação textual do pilar.

O foco do card deve ser apenas:

1. número + nome resumido do indicador;
2. resultado oficial;
3. percentual de atingimento;
4. variação em p.p.

O pilar pode continuar disponível internamente no dado e em tooltip, mas não precisa aparecer no layout visível do mosaico.

---

# 4. CRIAR UM MOSAICO ÚNICO DE CARDS

Todos os indicadores devem ser renderizados em um único painel, como um mosaico contínuo.

Não usar uma grade rígida com colunas fixas reservadas por grupo.

A distribuição deve usar toda a largura disponível.

---

# 5. PERMITIR CARDS DE TAMANHOS DIFERENTES

Para melhorar a ocupação do espaço, os cards podem ter variações de tamanho.

Exemplo de comportamento desejado:

- alguns cards maiores em largura;
- alguns cards padrão;
- eventualmente algum card ocupando mais destaque horizontal;
- tudo isso sem quebrar a leitura visual do conjunto.

A implementação deve buscar um resultado visual semelhante ao da imagem aprovada.

### Importante
Não exagerar nas diferenças.
A variação de tamanho deve servir para:
- evitar sobra no final;
- melhorar o encaixe visual;
- criar um painel mais agradável.

---

# 6. NÃO DEIXAR SOBRA NO FINAL

Este é um requisito obrigatório.

O mosaico final **não pode deixar um espaço vazio perceptível no fim da última linha ou última coluna**.

A distribuição dos cards deve preencher o bloco de forma natural.

### Estratégias aceitas
Você pode usar a que funcionar melhor no projeto, por exemplo:

- CSS Grid com `grid-auto-flow: dense`;
- combinação de `grid-column: span ...`;
- layout tipo masonry simulado;
- flex layout inteligente;
- qualquer outra solução sem biblioteca externa.

### Resultado esperado
O bloco deve parecer visualmente “fechado”, sem buracos.

---

# 7. HIERARQUIA VISUAL DOS CARDS

Cada card deve ter a seguinte hierarquia:

## topo
- número e nome resumido do indicador

## destaque principal
- resultado oficial

## destaque secundário
- percentual da meta

## rodapé ou canto inferior
- variação em p.p.

O resultado oficial deve ser o dado visualmente mais forte.

---

# 8. REGRAS DE COR

Preservar as regras já definidas:

- **Verde** → meta atingida
- **Amarelo** → atenção
- **Vermelho** → crítico
- **Cinza** → sem dados / sem percentual

Não alterar essa regra.

---

# 9. VARIAÇÃO

Preservar a lógica já implementada:

- ▲ quando o percentual de atingimento melhora em relação à competência anterior;
- ▼ quando piora;
- → quando estável;
- — quando não houver comparação válida.

A comparação deve continuar sendo feita pelo **percentual de atingimento**, e não pelo valor bruto do indicador.

---

# 10. NOMES DOS INDICADORES

Permitir nomes executivos curtos no mosaico.

Criar ou manter uma função de apresentação visual, algo como:

`nomeIndicadorMapa(indicador)`

Essa função pode:
- encurtar nomes longos;
- usar siglas quando fizer sentido;
- remover excessos;
- manter o nome legível no espaço do card.

Exemplos aceitáveis:
- Gross Gaming Revenue → GGR
- Índice de Eficiência Operacional → IEO
- Vendas com Meio de Pagamento PIX → Vendas Pix
- Participação da Rede Lotérica nos Negócios → Participação da Rede Lotérica

O nome completo pode permanecer no tooltip.

---

# 11. COMPACTAÇÃO VISUAL

O mosaico deve ser compacto, mas legível.

Ajustar:
- padding;
- altura;
- tamanho de fonte;
- espaçamento entre cards;
- peso tipográfico;
- contraste.

Evitar:
- fontes minúsculas;
- cards excessivamente altos;
- espaços internos exagerados;
- aparência de tabela.

---

# 12. LEGENDA

Manter no cabeçalho da seção a legenda:

- Verde — Meta atingida
- Amarelo — Atenção
- Vermelho — Crítico
- Cinza — Sem dados

Ela deve continuar discreta, alinhada à direita ou em posição equivalente elegante.

---

# 13. PRESERVAR OS CARDS-RESUMO SUPERIORES

Manter os cards-resumo no topo com:

- quantidade;
- percentual, quando aplicável.

Exemplo:
- Indicadores atingidos
- 13
- 56,5%

O card “Total de indicadores” pode continuar mostrando apenas o total, se essa for a regra já adotada.

---

# 14. PRESERVAR OS GRÁFICOS INFERIORES

Manter:

- **Desempenho por Pilar**
- **Distribuição das Situações**

Esses gráficos continuam sendo o local apropriado para a leitura por pilar.

Portanto, o mosaico não precisa repetir visualmente a separação por pilar.

---

# 15. PRESERVAR A TABELA EXECUTIVA

A Tabela Executiva deve continuar existindo.

Não remover colunas.
Não alterar a lógica principal dela.

---

# 16. CARD CLICÁVEL

Preservar a interação já definida:

Ao clicar em um card do mosaico:

1. selecionar o indicador;
2. filtrar a Tabela Executiva para exibir somente aquele indicador;
3. rolar automaticamente até a tabela;
4. exibir o filtro aplicado;
5. permitir limpar o filtro.

Isso é obrigatório.

---

# 17. CARD SELECIONADO

Manter um destaque visual quando o card estiver selecionado.

Exemplo:
- borda mais forte;
- brilho sutil;
- contorno;
- elevação.

Não mudar a cor-base do card.

---

# 18. REMOVER DEFINITIVAMENTE A ANTIGA SEÇÃO "DESTAQUES DOS INDICADORES"

Não recriar:
- Leitura Rápida
- Destaques dos Indicadores
- carrossel
- botão Pausar/Continuar
- botão Ver todos

Essa área não faz mais parte da solução final.

---

# 19. ESTRUTURA FINAL DA TELA

A organização final da página deve ser, conceitualmente:

```text
Resumo Executivo

[Filtros]

[Cards-resumo]

[Mapa de Desempenho dos Indicadores — mosaico único]

[Desempenho por Pilar]
[Distribuição das Situações]

[Tabela Executiva]

20. NÃO ALTERAR DESNECESSARIAMENTE A LÓGICA DE NEGÓCIO

Não mexer sem necessidade em:

backend;
banco de dados;
autenticação;
homologação;
cálculo de indicadores;
cálculo de percentual;
cálculo de variação;
filtros principais.

Esta tarefa é predominantemente de layout e apresentação, preservando a funcionalidade já implantada.

21. CUIDADO COM OS ARQUIVOS DUPLICADOS DE ASSETS

O projeto possui arquivos em:

assets/...
public/assets/...

Se o projeto exige sincronização, manter as duas versões idênticas.

Priorizar análise e ajuste em:

views/frontend/resumo-executivo.php
assets/js/executiveSummary.js
public/assets/js/executiveSummary.js
assets/css/styles.css
public/assets/css/styles.css
22. TESTES E VALIDAÇÕES

Depois das alterações, validar pelo menos:

Layout
não existe sobra visível no final do mosaico;
cards ocupam bem o espaço;
cards têm tamanhos variados;
não há separação física por pilar;
não há rótulo de pilar visível no card;
a leitura do card está boa.
Funcionalidade
clicar no card filtra a Tabela Executiva;
trocar o card troca o filtro;
limpar o filtro restaura a tabela;
a rolagem até a tabela continua funcionando.
23. RESULTADO ESPERADO

O resultado final deve ficar visualmente próximo da última imagem aprovada, com estas características:

mosaico único;
cards bem distribuídos;
sem espaços vazios sobrando;
tamanhos diferentes de cards;
leitura executiva;
sem identificação visual de pilar dentro do mosaico;
gráficos por pilar abaixo;
tabela executiva integrada ao clique dos cards.
24. ANTES DE FINALIZAR

Ao concluir, informe:

quais arquivos foram alterados;
o que foi ajustado em HTML/CSS/JS;
se a lógica funcional foi preservada;
como foi resolvida a distribuição do mosaico sem sobra no final;
se os cards passaram a ter tamanhos variados;
se a exibição do pilar foi removida do mosaico;
se assets e public/assets ficaram sincronizados;
quais testes/validações foram executados.

Não considere a tarefa concluída se o mosaico ainda estiver:

com sobra de espaço no final;
dividido visualmente por pilar;
com cards todos iguais e mal distribuídos.