# Sistema de Indicadores CAIXA Loterias

Pacote estático gerado para distribuição.

## Como executar

Execute um servidor estático dentro desta pasta:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Depois acesse:

```text
http://127.0.0.1:8080/
```

## Observações

- Não há backend, banco de dados ou etapa de build com Node.js.
- Os dados iniciais ficam na pasta `data`.
- Alterações feitas no sistema são persistidas no `localStorage` do navegador.
- Chart.js é carregado por CDN.
