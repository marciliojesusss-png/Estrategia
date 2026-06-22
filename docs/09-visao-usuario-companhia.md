# Visão do Usuário da Companhia

## Objetivo

Registrar a visão de acesso para colaboradores da companhia que não são administradores, unidades responsáveis pelo preenchimento nem diretorias homologadoras.

## Perfil

Nome do perfil:

```text
Usuário Companhia
```

Usuário simulado inicial:

```text
Usuário da Companhia
usuario.companhia@caixaloterias.local
```

## Telas acessíveis

- Dashboard.
- Indicadores.
- Relatórios.

## Telas bloqueadas

- Lançamento Mensal.
- Homologação.
- Administração.

## Permissões

Pode:

- Consultar indicadores estratégicos.
- Visualizar dashboard institucional.
- Aplicar filtros de consulta.
- Consultar relatórios.
- Exportar relatórios em CSV.
- Ver metas, métricas, planos, pilares, unidades e diretorias.

Não pode:

- Preencher lançamento mensal.
- Salvar rascunho.
- Enviar para homologação.
- Homologar lançamento.
- Devolver lançamento para ajuste.
- Editar indicadores.
- Alterar metas.
- Acessar administração.
- Reabrir lançamento homologado.

## Regra de escopo

O Usuário Companhia tem visão institucional geral de consulta, sem vínculo a uma unidade apuradora ou diretoria homologadora específica.

## Observações técnicas

- O perfil foi incluído no arquivo `data/usuarios.json`.
- A autorização foi incluída em `assets/js/auth.js`.
- A camada `DataStore` adiciona o usuário automaticamente se o navegador ainda tiver uma versão antiga de usuários no `localStorage`.
- O perfil também foi incluído na lista de perfis administráveis em `assets/js/admin.js`.
