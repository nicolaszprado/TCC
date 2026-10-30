# Resultados k6 para análise

Este pacote contém os artefatos mínimos para caracterização dos experimentos, desempenho por endpoint e análise de estabilidade.

- Campanhas aprovadas: 24
- Implementações: Raw SQL, TypeORM e Prisma
- Endpoints: 8
- Perfil oficial identificado: baseline
- Carga: 50 VUs
- Aquecimento: 1 minuto (não incluído nas métricas oficiais)
- Medição: 5 rodadas de 3 minutos por campanha

## Conteúdo

Cada pasta `implementação/endpoint/` contém:

- `campaign.json`: configuração, status e identificação da campanha;
- `round-01-summary.json` a `round-05-summary.json`: métricas das cinco rodadas oficiais;
- `campaign-summary.json`: consolidação das cinco rodadas para uso no TCC.

Também foram incluídos `package-manifest.json`, com o inventário do pacote, e `benchmark-consolidated-results.json`, com o índice das 24 campanhas.

Não foram incluídos logs, fixtures, arquivos de aquecimento, metadados de execução nem campanhas falhas ou incompletas.
