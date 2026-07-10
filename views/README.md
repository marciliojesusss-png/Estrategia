# Organização das views

- `frontend/`: páginas visuais completas, inicializadas pelos módulos JavaScript e servidas por `templates/frontend.php`.
- `auth/`: autenticação local controlada pela sessão PHP.
- `components/` e `layouts/`: composição compartilhada das views server-side.
- `indicadores/`, `lancamentos/`, `homologacoes/` e `administracao/`: formulários, detalhes e auditoria.
- `erros/`: respostas HTML para 403, 404 e 500.

Os controllers fornecem às views apenas os dados de cada ação. A extração usa `EXTR_SKIP`, impedindo que chaves dos dados sobrescrevam variáveis internas do layout.
