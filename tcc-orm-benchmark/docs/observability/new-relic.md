# New Relic APM — Raw SQL

## Objetivo

Instrumentar a API Raw SQL sem adicionar chamadas do New Relic aos controllers,
services ou repositories. O agente deve permanecer externo ao código funcional
para que a mesma configuração possa ser repetida nas aplicações TypeORM e
Prisma.

O agente reconhece automaticamente:

- requisições e rotas do Express;
- transações e erros HTTP;
- consultas executadas pelo `pg`;
- spans de PostgreSQL;
- métricas do processo Node.js.

## Configuração

A dependência `newrelic` deve estar instalada na raiz do projeto. As variáveis
ficam em `apps/.env`; use `apps/.env.example` como referência.

Obrigatórias:

```dotenv
NEW_RELIC_APP_NAME=tcc-orm-benchmark-raw-sql
NEW_RELIC_LICENSE_KEY=replace_with_your_license_key
```

A License Key é a chave de ingestão. O agente aceita tanto o formato legado
hexadecimal quanto o formato atual terminado em `NRAL`. Ela é secreta e nunca
deve ser versionada. O arquivo `apps/.env` é ignorado pelo Git.

O projeto usa ES modules e executa TypeScript diretamente. Por isso o comando
APM carrega, nesta ordem lógica:

1. as variáveis de `apps/.env`;
2. o loader ESM do New Relic, registrado por `--import`;
3. o preload do agente;
4. o loader TypeScript do `tsx`;
5. o servidor da aplicação.

## Execução

Valide primeiro se as variáveis obrigatórias foram preenchidas:

```bash
npm run check:new-relic
```

O comando não imprime a chave. Ele apenas rejeita valores ausentes ou que ainda
sejam placeholders.

Como a execução local não ocorre em um provedor de nuvem, o ambiente de exemplo
desabilita as sondagens de metadados de AWS, Azure e GCP. Isso evita avisos de
conexão sem remover as métricas de CPU, memória e processo da máquina local.

Depois inicie a aplicação instrumentada:

```bash
npm run start:raw-sql:apm
```

O comando normal continua disponível para medições sem APM:

```bash
npm run start:raw-sql
```

Depois de iniciar com APM, gere tráfego nas rotas e aguarde alguns minutos para
o primeiro envio de dados:

```bash
curl http://localhost:3001/products/1
curl 'http://localhost:3001/products?page=1&limit=20'
curl http://localhost:3001/orders/1
```

## Consultas NRQL

### Latência por rota

```sql
FROM Transaction
SELECT
  average(duration * 1000) AS 'Média (ms)',
  percentile(duration * 1000, 50, 95, 99) AS 'Percentis (ms)'
WHERE appName = 'tcc-orm-benchmark-raw-sql'
FACET name
SINCE 30 minutes ago
LIMIT MAX
```

### Throughput e erros

```sql
FROM Transaction
SELECT
  rate(count(*), 1 minute) AS 'req/min',
  percentage(count(*), WHERE error IS true) AS 'erros (%)'
WHERE appName = 'tcc-orm-benchmark-raw-sql'
FACET name
TIMESERIES
SINCE 30 minutes ago
```

### Tempo das operações PostgreSQL

```sql
FROM Span
SELECT percentile(duration * 1000, 50, 95, 99) AS 'Percentis (ms)'
WHERE appName = 'tcc-orm-benchmark-raw-sql'
  AND category = 'datastore'
FACET name
SINCE 30 minutes ago
LIMIT MAX
```

### Comparação futura das três implementações

```sql
FROM Transaction
SELECT percentile(duration * 1000, 50, 95, 99) AS 'Percentis (ms)'
WHERE appName IN (
  'tcc-orm-benchmark-raw-sql',
  'tcc-orm-benchmark-typeorm',
  'tcc-orm-benchmark-prisma'
)
FACET appName, name
SINCE 30 minutes ago
LIMIT MAX
```

## Metodologia do benchmark

O APM altera o custo da aplicação. Portanto, separe as execuções:

1. benchmark oficial com `npm run start:raw-sql`, usando o k6 como fonte dos
   resultados comparativos;
2. execução diagnóstica com `npm run start:raw-sql:apm`, usada para localizar o
   tempo gasto na aplicação e no PostgreSQL.

Quando TypeORM e Prisma forem adicionados, cada aplicação deverá ter um nome
próprio no New Relic e exatamente as mesmas opções do agente. Não habilite
`NEW_RELIC_SLOW_SQL_ENABLED` durante o benchmark oficial: a coleta adicional é
destinada a uma rodada diagnóstica separada.

## Diagnóstico

Se a aplicação iniciar mas não aparecer no New Relic:

1. confirme que `NEW_RELIC_LICENSE_KEY` existe em `apps/.env`;
2. confirme que `NEW_RELIC_ENABLED=true`;
3. procure no início do stdout a mensagem de conexão do agente;
4. gere tráfego por alguns minutos;
5. confirme acesso HTTPS de saída na porta 443;
6. verifique se a região da conta e a License Key correspondem.
