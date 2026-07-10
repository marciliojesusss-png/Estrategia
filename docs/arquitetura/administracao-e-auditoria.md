# Administração e auditoria

O módulo administrativo usa somente `id`, `matricula`, `nome`, `perfil`, `sg_unidade`, `no_unidade` e `ativo` de `usuarios_acesso`. Campos adicionais do script local não são usados pelo novo fluxo até confirmação do esquema corporativo.

Regras implementadas:

- apenas os quatro perfis oficiais são aceitos;
- matrícula é única e validada;
- alteração do próprio perfil administrativo ou inativação exige confirmação explícita;
- o último administrador ativo não pode perder o perfil nem ser inativado;
- todas as alterações de usuários e configurações são transacionais e auditadas;
- configurações sensíveis são mascaradas e não podem ser alteradas pela interface;
- apenas chaves de configuração já existentes podem ser atualizadas;
- usuários de validação são somente consultados nesta etapa;
- acessos e auditoria possuem filtros e limite máximo de 100 registros por página.

Chaves contendo `senha`, `password`, `secret`, `token`, `credencial` ou `connection_string` são tratadas como sensíveis. O mascaramento também é aplicado ao histórico de auditoria dessas chaves.

Rotas: `/administracao`, `/auditoria` e `/api/administracao/{usuarios|validacao|configuracoes|auditoria|acessos}`. Todas exigem administrador no servidor.
