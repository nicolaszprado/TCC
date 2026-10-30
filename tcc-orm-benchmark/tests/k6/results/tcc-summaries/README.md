# Evidências consolidadas do TCC

Esta pasta reúne apenas resultados finais e rastreáveis. Os dados brutos das campanhas aprovadas permanecem nas pastas `raw-sql/`, `typeorm/` e `prisma/` como evidência primária.

## Estrutura

- `benchmark/index.json`: índice consolidado das 24 campanhas aprovadas.
- `benchmark/<implementação>/<endpoint>/summary.json`: resumo de cada campanha oficial.
- `code-metrics/cyclomatic-complexity/`: relatórios ESLint da complexidade ciclomática.
- `code-metrics/source-lines/`: relatórios SLOC de linhas de código.
- `sql-audit/`: SQLs capturados e formatados de TypeORM e Prisma.

## Escopo da coleta oficial

- 8 endpoints × 3 implementações = 24 campanhas aprovadas.
- 50 VUs, warm-up de 1 minuto e cinco rodadas de 3 minutos.
- Perfil utilizado: `baseline`.

Campanhas falhas ou incompletas e cópias redundantes de resumos foram removidas desta árvore de resultados. A rota N+1 experimental não integra as métricas oficiais.
