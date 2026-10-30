# Auditoria de queries

Pacote com evidências de SQL para a análise qualitativa das abordagens de persistência.

## Conteúdo

- `n-plus-one/query_n1.txt`: saída SQL capturada da rota experimental TypeORM `GET /orders/n-plus-one`.
- `typeorm/`: SQL bruto, versão estruturada em JSON e versão legível em Markdown da auditoria TypeORM.
- `prisma/`: SQL bruto e versão legível em Markdown da auditoria Prisma.
- `raw-sql/`: repositórios TypeScript com as consultas SQL parametrizadas da implementação Raw SQL.

A rota N+1 é exclusivamente demonstrativa e não integrou os benchmarks oficiais nem as métricas comparativas de código.
