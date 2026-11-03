# Governança de acessos e prerrogativa administrativa

## Decisão vigente

Durante a fase atual de produção e estabilização, a capacidade de um usuário
cujo `perfil_original` é `administrador` homologar lançamento do qual tenha
participado é uma **exceção administrativa aceita e controlada**. Ela é
deliberada e destinada à continuidade operacional; não representa permissão
dos demais perfis para contornar a segregação de funções.

O Administrador original continua autorizado a preencher, editar, submeter,
homologar, devolver, reabrir e executar as demais funções corporativas previstas
na matriz de acesso. A exceção alcança somente a verificação de independência
entre autoria/participação e homologação. Permanecem obrigatórios o estado
correto do lançamento, a competência elegível, as evidências exigidas, as regras
de fechamento, o controle de concorrência, a transação e a auditoria.

Quando outro Administrador estiver disponível, a boa prática de governança é
que ele realize a homologação. Essa preferência não é um bloqueio técnico: em
contingência, indisponibilidade ou necessidade operacional, o próprio
Administrador participante permanece autorizado.

## Cobertura administrativa

A cobertura operacional desejada é de **3 Administradores ativos**, todos com:

- matrícula individual e autenticação corporativa própria;
- o mesmo perfil técnico `Administrador`;
- trilha de auditoria individual;
- nenhuma conta compartilhada.

As designações principal, substituto e contingência são papéis organizacionais,
não novos perfis técnicos. A unicidade de `usuarios_acesso.matricula` impede
duplicidade da mesma identidade, mas não limita a quantidade de matrículas com
perfil `administrador`. O sistema impede a inativação ou descaracterização do
último Administrador ativo.

## Visualizar como

`Visualizar como` altera o perfil e o escopo operacionais da sessão, sem alterar
a matrícula real nem o perfil original mantido pelo servidor. A prerrogativa
excepcional depende exclusivamente de `perfil_original = administrador`, obtido
da sessão autenticada; dados enviados pelo navegador não concedem essa condição.
A troca de visão e as ações subsequentes permanecem associadas à matrícula real.

## Demais perfis

Unidade Apuradora, Diretoria Homologadora e Consultor da Diretoria continuam
sujeitos à segregação por matrícula, responsável atual, autor da submissão e
participantes históricos. Mudança posterior de perfil não apaga a participação.
Usuário Companhia não possui atribuições operacionais.

## Usuário operacional inativo

`Inativo` em Acessos significa ausência de perfil operacional especial ativo,
não bloqueio da identidade corporativa. Se o empregado continuar autenticável
pelo LDAP, ele poderá acessar a camada institucional como `Usuário Companhia`.
Sem identidade corporativa válida, a autenticação é recusada pelo mecanismo
corporativo.

## Auditoria

As ações usam a matrícula real e registram, conforme o fluxo, usuário, data/hora,
ação, lançamento, perfil/contexto operacional, transição de status,
justificativa/observação e versão ou snapshot. A existência de três
Administradores não altera a estrutura: cada ação continua atribuída à matrícula
individual que a executou.

