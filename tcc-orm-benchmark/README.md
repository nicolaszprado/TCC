# TCC ORM Benchmark

Projeto experimental para comparar três formas de acesso ao PostgreSQL usando a
mesma API Express, o mesmo schema, os mesmos dados e os mesmos testes:

- SQL manual com `pg`;
- TypeORM;
- Prisma.

O projeto inclui geração determinística de datasets, oito endpoints equivalentes,
testes de contrato, coleção Postman, observabilidade opcional e benchmarks com k6.

> Execute todos os comandos deste documento na raiz `tcc-orm-benchmark`.
> Os exemplos usam PowerShell. No Bash, substitua a quebra de linha com crase
> pelo caractere `\` e adapte a declaração de variáveis de ambiente.

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Preparação do banco](#preparação-do-banco)
- [Geração e carga dos datasets](#geração-e-carga-dos-datasets)
- [Execução das APIs](#execução-das-apis)
- [Endpoints](#endpoints)
- [Testes automatizados](#testes-automatizados)
- [Postman](#postman)
- [k6](#k6)
- [Campanhas oficiais](#campanhas-oficiais)
- [Testes de escrita](#testes-de-escrita)
- [Auditoria das consultas SQL](#auditoria-das-consultas-sql)
- [Referência de comandos npm](#referência-de-comandos-npm)
- [Documentação adicional](#documentação-adicional)

## Pré-requisitos

- Node.js `22.12.0` ou superior dentro da versão 22;
- npm;
- PostgreSQL acessível localmente ou pela rede;
- cliente `psql` para criar o schema;
- k6 para executar benchmarks;
- Postman, opcional, para testes manuais.

Confira as versões instaladas:

```powershell
node --version
npm --version
psql --version
k6 version
```

No Windows, o k6 pode ser instalado pelo Winget:

```powershell
winget install k6 --source winget
```

O arquivo `docker-compose.yml` está vazio no estado atual do projeto. Portanto,
`docker compose up` ainda não é um fluxo suportado. Use uma instalação existente
do PostgreSQL até que uma configuração Docker seja adicionada.

## Instalação

Instale todas as dependências:

```powershell
npm install
```

Além de instalar os pacotes, o `postinstall` executa automaticamente a geração do
cliente Prisma. Para gerar novamente de forma explícita:

```powershell
npm run prisma:generate
```

Esse comando lê `apps/prisma/prisma/schema.prisma` e atualiza o cliente gerado em
`apps/prisma/src/generated/prisma/`. A pasta gerada não é versionada.

## Configuração do ambiente

Crie um arquivo `.env` na raiz:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=TCC_STORE_DATABASE
DB_USER=postgres
DB_PASSWORD=postgres
```

Variáveis disponíveis:

| Variável | Finalidade | Padrão no código |
|---|---|---|
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_NAME` | Nome do banco | `TCC_STORE_DATABASE` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | `postgres` |
| `PORT` | Sobrescreve a porta da API iniciada | depende da implementação |
| `SQL_AUDIT` | Habilita impressão das consultas SQL | `false` |

O `.env` contém credenciais locais e está ignorado pelo Git. Não o envie ao
repositório. Evite definir `PORT` no `.env` se quiser iniciar as três APIs ao mesmo
tempo, pois todas herdariam a mesma porta.

## Preparação do banco

### 1. Criar o banco

Execute uma única vez, substituindo usuário, host, porta e nome se necessário:

```powershell
createdb -h localhost -p 5432 -U postgres TCC_STORE_DATABASE
```

Alternativamente, pelo `psql`:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres `
  -c 'CREATE DATABASE "TCC_STORE_DATABASE";'
```

### 2. Criar tabelas

Execute somente em um banco novo, porque o SQL usa `CREATE TABLE` sem
`IF NOT EXISTS`:

```powershell
psql -h localhost -p 5432 -U postgres `
  -d TCC_STORE_DATABASE `
  -f database/migrations/001_schema.sql
```

### 3. Criar índices

Execute depois do schema:

```powershell
psql -h localhost -p 5432 -U postgres `
  -d TCC_STORE_DATABASE `
  -f database/migrations/indexes.sql
```

Os índices são compartilhados pelas três implementações. Não crie índices
exclusivos para apenas um ORM durante a comparação oficial.

### Reset do banco

```powershell
npm run db:reset
```

Esse comando executa `TRUNCATE ... RESTART IDENTITY CASCADE` nas seis tabelas:

- `categories`;
- `products`;
- `product_details`;
- `customers`;
- `orders`;
- `order_items`.

> **Atenção:** `db:reset` apaga os dados do banco configurado no `.env`. Ele não
> recria o banco, as tabelas ou os índices.

## Geração e carga dos datasets

Os datasets são determinísticos e usam a seed `12345`.

| Escala | Categorias | Produtos | Clientes | Pedidos |
|---|---:|---:|---:|---:|
| `small` | 100 | 10.000 | 2.000 | 5.000 |
| `medium` | 100 | 100.000 | 20.000 | 50.000 |
| `large` | 100 | 1.000.000 | 200.000 | 500.000 |

### Dataset pequeno

```powershell
npm run dataset:small
```

Recomendado para desenvolvimento rápido e validação funcional.

### Dataset médio

```powershell
npm run dataset:medium
```

É a escala definida para a campanha oficial do TCC.

### Dataset grande

```powershell
npm run dataset:large
```

Use somente quando houver memória, disco e tempo suficientes. A geração e a carga
podem ser significativamente mais demoradas.

### Comando genérico

```powershell
npm run dataset -- medium
```

Aceita `small`, `medium` ou `large` e é equivalente aos atalhos anteriores.

Os comandos geram:

- CSVs em `database/seed/output/`;
- metadados em `database/metadata/dataset.json`.

Esses artefatos são locais e ignorados pelo Git.

### Carregar o dataset

Em um banco vazio:

```powershell
npm run db:load
```

O loader usa `COPY FROM STDIN`, confere as contagens do metadata, ajusta as
sequences e valida referências básicas. Para substituir dados existentes:

```powershell
npm run db:reset
npm run db:load
```

Fluxo completo recomendado para a base oficial:

```powershell
npm run dataset:medium
npm run db:reset
npm run db:load
```

## Execução das APIs

Cada implementação expõe exatamente as mesmas rotas.

| Implementação | Comando | Porta padrão | URL |
|---|---|---:|---|
| Raw SQL | `npm run start:raw-sql` | 3001 | `http://localhost:3001` |
| TypeORM | `npm run start:typeorm` | 3002 | `http://localhost:3002` |
| Prisma | `npm run start:prisma` | 3003 | `http://localhost:3003` |

### Raw SQL

```powershell
npm run start:raw-sql
```

Usa diretamente o driver `pg` e consultas SQL escritas manualmente.

### TypeORM

```powershell
npm run start:typeorm
```

Inicializa o `DataSource` do TypeORM antes de abrir a porta HTTP.

### Prisma

```powershell
npm run start:prisma
```

Usa Prisma Client com o adapter PostgreSQL.

Para testes manuais, as três APIs podem permanecer abertas simultaneamente. Para
benchmark oficial, deixe somente a implementação medida em execução.

Interrompa qualquer API com `Ctrl+C`.

## Endpoints

As rotas abaixo existem nas três implementações:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/products/:id` | Busca um produto pelo ID |
| `GET` | `/products` | Lista produtos com filtros e paginação |
| `GET` | `/products/:id/details` | Busca produto e detalhes físicos |
| `PATCH` | `/products/:id/stock` | Atualiza o estoque |
| `GET` | `/customers/:id/orders` | Lista os pedidos de um cliente |
| `GET` | `/orders/:id` | Busca pedido, cliente e itens |
| `GET` | `/orders` | Lista pedidos com filtros e paginação |
| `POST` | `/orders` | Cria pedido e reduz estoque |

Exemplos no PowerShell:

```powershell
Invoke-RestMethod http://localhost:3001/products/100
Invoke-RestMethod "http://localhost:3001/products?page=1&limit=20"
Invoke-RestMethod http://localhost:3001/products/100/details
Invoke-RestMethod "http://localhost:3001/orders?page=1&limit=20"
Invoke-RestMethod http://localhost:3001/orders/1
Invoke-RestMethod "http://localhost:3001/customers/1/orders?page=1&limit=20"
```

Atualização de estoque:

```powershell
Invoke-RestMethod http://localhost:3001/products/100/stock `
  -Method Patch `
  -ContentType "application/json" `
  -Body '{"stock":100}'
```

Criação de pedido:

```powershell
Invoke-RestMethod http://localhost:3001/orders `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"customerId":1,"items":[{"productId":100,"quantity":1}]}'
```

PATCH e POST alteram o banco. Restaure o dataset antes de comparações formais.

## Testes automatizados

### Todos os testes unitários

```powershell
npm test
```

Executa, em sequência, os testes compartilhados, Raw SQL, TypeORM e Prisma.

### Testes por módulo

```powershell
npm run test:shared
npm run test:raw-sql
npm run test:typeorm
npm run test:prisma
```

- `test:shared`: políticas comuns de transação;
- `test:raw-sql`: validadores e mapeadores Raw SQL;
- `test:typeorm`: validadores e mapeadores TypeORM;
- `test:prisma`: validadores e mapeadores Prisma.

### Typecheck geral

```powershell
npm run typecheck
```

Valida TypeScript sem gerar arquivos JavaScript.

### Equivalência HTTP entre as três APIs

Inicie Raw SQL, TypeORM e Prisma em terminais separados e execute:

```powershell
npm run test:integration:equivalence
```

Esse teste envia os mesmos casos para as três URLs e exige respostas idênticas.
Ele depende de um banco carregado e das portas 3001, 3002 e 3003 disponíveis.

As URLs podem ser sobrescritas:

```powershell
$env:RAW_SQL_URL = "http://localhost:3001"
$env:TYPEORM_URL = "http://localhost:3002"
$env:PRISMA_URL = "http://localhost:3003"
npm run test:integration:equivalence
```

## Postman

Arquivos disponíveis:

- `tests/postman/tcc-orm-benchmark.postman_collection.json`;
- `tests/postman/environments/raw-sql.postman_environment.json`;
- `tests/postman/environments/typeorm.postman_environment.json`;
- `tests/postman/environments/prisma.postman_environment.json`.

No Postman:

1. Clique em **Import**.
2. Importe a coleção.
3. Importe os três environments.
4. Inicie a API desejada.
5. Selecione o environment correspondente.
6. Ajuste `productId`, `customerId` e `orderId` se necessário.

As requisições marcadas com `[MUTATION]` alteram estoque ou pedidos.

Consulte também [tests/postman/README.md](tests/postman/README.md).

## k6

### Validar a implementação da suíte

```powershell
npm run test:k6
npm run typecheck:k6
```

O primeiro comando testa seleção determinística, configuração e contratos. O
segundo verifica as ferramentas TypeScript usadas fora do processo k6.

### Preparar fixtures de leitura

Com banco e metadata correspondentes:

```powershell
npm run k6:prepare
```

Esse comando consulta IDs e relações reais e cria
`tests/k6/fixtures/benchmark.json`. Ele não altera o banco e não sobrescreve uma
fixture existente.

Se precisar preparar novamente, arquive os arquivos anteriores:

```powershell
$archive = "tests/k6/results/fixtures-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff")
New-Item -ItemType Directory -Path $archive

if (Test-Path "tests/k6/fixtures/benchmark.json") {
  Move-Item "tests/k6/fixtures/benchmark.json" $archive
}

if (Test-Path "tests/k6/fixtures/benchmark.json.used") {
  Move-Item "tests/k6/fixtures/benchmark.json.used" $archive
}

npm run k6:prepare
```

### Selecionar a implementação

| Valor | URL padrão | Pasta de resultados |
|---|---|---|
| `raw-sql` | `http://localhost:3001` | `tests/k6/results/raw-sql/` |
| `typeorm` | `http://localhost:3002` | `tests/k6/results/typeorm/` |
| `prisma` | `http://localhost:3003` | `tests/k6/results/prisma/` |

Você pode informar a implementação em cada comando:

```powershell
npm run k6:run -- get-product-by-id smoke --implementation raw-sql
```

Ou defini-la para a sessão:

```powershell
$env:IMPLEMENTATION = "raw-sql"
Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
```

Use `BASE_URL` somente quando precisar sobrescrever a URL padrão:

```powershell
$env:BASE_URL = "http://localhost:3101"
```

### Smoke tests

Smoke de leitura usa 1 VU durante 10 segundos. Smoke de escrita usa 1 VU e uma
iteração.

```powershell
npm run k6:run -- get-product-by-id smoke --implementation raw-sql
npm run k6:run -- list-products smoke --implementation raw-sql
npm run k6:run -- get-product-details smoke --implementation raw-sql
npm run k6:run -- get-customer-orders smoke --implementation raw-sql
npm run k6:run -- get-order-by-id smoke --implementation raw-sql
npm run k6:run -- list-orders smoke --implementation raw-sql
```

Perfis das listagens:

```powershell
$env:PROFILE = "filtered"
npm run k6:run -- list-products smoke --implementation raw-sql
npm run k6:run -- list-orders smoke --implementation raw-sql

$env:PROFILE = "paginated"
npm run k6:run -- list-products smoke --implementation raw-sql
npm run k6:run -- list-orders smoke --implementation raw-sql

$env:PROFILE = "baseline"
```

### Load test individual

```powershell
npm run k6:run -- get-product-by-id load `
  --implementation raw-sql `
  --vus 10 `
  --duration 1m
```

Opções:

- `--implementation`: `raw-sql`, `typeorm` ou `prisma`;
- `--vus`: concorrência entre 1 e 100;
- `--duration`: duração como `30s`, `1m` ou `3m`;
- `PROFILE`: `baseline`, `filtered`, `paginated` ou `three-items`, conforme endpoint.

## Campanhas oficiais

O protocolo padrão automatizado é:

```text
1 minuto de warm-up
5 rodadas de 3 minutos
```

Isso representa aproximadamente 16 minutos por combinação de implementação,
endpoint, perfil e quantidade de VUs.

### Conferir sem executar

```powershell
npm run k6:campaign -- get-product-by-id `
  --implementation raw-sql `
  --vus 10 `
  --dry-run
```

O dry-run não acessa API, banco ou k6.

### Executar cinco rodadas

```powershell
npm run k6:campaign -- get-product-by-id `
  --implementation raw-sql `
  --vus 10
```

### Rodar 10, 50 e 100 VUs

```powershell
foreach ($vus in 10, 50, 100) {
  npm run k6:campaign -- get-product-by-id `
    --implementation raw-sql `
    --vus $vus

  if ($LASTEXITCODE -ne 0) {
    throw "Campanha com $vus VUs falhou."
  }
}
```

As três campanhas levam aproximadamente 48 minutos no total: 45 minutos de
medição e 3 minutos de aquecimento, além da preparação e da inicialização.

### Alterar opções da campanha

```powershell
npm run k6:campaign -- list-products `
  --implementation typeorm `
  --profile filtered `
  --vus 50 `
  --warmup 1m `
  --duration 3m `
  --repetitions 5
```

Opções disponíveis:

| Opção | Padrão | Explicação |
|---|---|---|
| `--implementation` | `raw-sql` | API medida |
| `--profile` | `baseline` | Perfil válido para o endpoint |
| `--vus` | `10` | Concorrência, máximo 100 |
| `--warmup` | `1m` | Aquecimento não oficial |
| `--duration` | `3m` | Duração de cada medição |
| `--repetitions` | `5` | Quantidade de medições, máximo 20 |
| `--reset-writes` | desativado | Autoriza reset automático em POST/PATCH |
| `--dry-run` | desativado | Apenas imprime o plano |
| `--help` | — | Exibe ajuda |

O script interrompe na primeira falha. O relatório consolidado é salvo em:

```text
tests/k6/results/<implementação>/campaign-*/campaign.json
```

O warm-up e cada rodada também produzem `summary.json`, `metadata.json`,
`exit.json` e `console.log` em pastas próprias.

## Testes de escrita

Os endpoints `create-order` e `update-product-stock` alteram o banco. Uma
preparação de escrita só pode ser utilizada uma vez.

### Execução individual

```powershell
npm run db:reset
npm run db:load

$env:ALLOW_WRITES = "true"
$env:BENCHMARK_DB_CONFIRM = "TCC_STORE_DATABASE"
$env:MAX_VUS = "100"
$env:MAX_ORDERS_PER_VU = "100000"
$env:QUANTITY = "1"
$env:PROFILE = "baseline"

npm run k6:prepare -- --writes
npm run k6:run -- create-order load `
  --implementation raw-sql `
  --vus 10 `
  --duration 1m
```

`BENCHMARK_DB_CONFIRM` deve ser exatamente igual ao `DB_NAME`. O runner cria o
marcador `benchmark.json.used` para impedir reutilização acidental.

Para PATCH, restaure e prepare novamente:

```powershell
npm run db:reset
npm run db:load
npm run k6:prepare -- --writes
npm run k6:run -- update-product-stock load `
  --implementation raw-sql `
  --vus 10 `
  --duration 1m
```

### Campanha de escrita

```powershell
$env:ALLOW_WRITES = "true"
$env:BENCHMARK_DB_CONFIRM = "TCC_STORE_DATABASE"
$env:MAX_ORDERS_PER_VU = "100000"
$env:QUANTITY = "1"

npm run k6:campaign -- create-order `
  --implementation raw-sql `
  --profile baseline `
  --vus 10 `
  --reset-writes
```

A campanha restaura e carrega o banco antes do warm-up e antes de cada uma das
cinco medições: seis resets no total. Os CSVs e o metadata precisam existir. O
banco permanece no estado da última rodada ao final.

Perfil com três itens:

```powershell
npm run k6:campaign -- create-order `
  --implementation raw-sql `
  --profile three-items `
  --vus 10 `
  --reset-writes
```

Esse perfil já apresentou conflitos de serialização sob concorrência e deve ser
tratado como diagnóstico até que a política de contenção seja validada.

### Verificação pós-escrita

O `k6:run` verifica automaticamente pedidos, itens e estoques. Para repetir
manualmente a verificação de uma execução individual:

```powershell
npm run k6:verify -- `
  "tests/k6/results/raw-sql/ID-DA-EXECUCAO/summary.json"
```

Mantenha disponível a mesma fixture utilizada pela execução.

## Auditoria das consultas SQL

Para imprimir as consultas de uma implementação:

```powershell
$env:SQL_AUDIT = "true"
npm run start:typeorm
```

Faça requisições individuais e analise quantidade de queries, JOINs e possível
N+1. Depois desative:

```powershell
$env:SQL_AUDIT = "false"
```

Não habilite `SQL_AUDIT` durante medições oficiais, pois logging altera o custo.

## Referência de comandos npm

| Comando | Explicação |
|---|---|
| `npm install` | Instala dependências e gera o Prisma Client |
| `npm run prisma:generate` | Gera novamente o Prisma Client |
| `npm run dataset:small` | Gera CSVs do dataset pequeno |
| `npm run dataset:medium` | Gera CSVs do dataset oficial médio |
| `npm run dataset:large` | Gera CSVs do dataset grande |
| `npm run dataset -- medium` | Executa o gerador genérico para uma escala |
| `npm run db:reset` | Apaga dados das seis tabelas e reinicia IDs |
| `npm run db:load` | Carrega e valida os CSVs no PostgreSQL |
| `npm run start:raw-sql` | Inicia Raw SQL na porta 3001 |
| `npm run start:typeorm` | Inicia TypeORM na porta 3002 |
| `npm run start:prisma` | Inicia Prisma na porta 3003 |
| `npm test` | Executa todos os testes unitários |
| `npm run test:shared` | Testa políticas compartilhadas |
| `npm run test:raw-sql` | Testa Raw SQL |
| `npm run test:typeorm` | Testa TypeORM |
| `npm run test:prisma` | Testa Prisma |
| `npm run test:integration:equivalence` | Compara respostas das três APIs |
| `npm run typecheck` | Valida TypeScript do projeto principal |
| `npm run test:k6` | Testa configuração e contratos k6 |
| `npm run typecheck:k6` | Valida ferramentas TypeScript do k6 |
| `npm run k6:prepare` | Gera fixtures de leitura do banco atual |
| `npm run k6:prepare -- --writes` | Gera fixtures e estoque para escrita |
| `npm run k6:run -- ...` | Executa um cenário smoke ou load |
| `npm run k6:campaign -- ...` | Executa warm-up e várias medições |
| `npm run k6:verify -- ...` | Repete verificação pós-escrita |

## Fluxo rápido completo

Preparação inicial:

```powershell
npm install

psql -h localhost -p 5432 -U postgres `
  -d TCC_STORE_DATABASE `
  -f database/migrations/001_schema.sql

psql -h localhost -p 5432 -U postgres `
  -d TCC_STORE_DATABASE `
  -f database/migrations/indexes.sql

npm run dataset:medium
npm run db:reset
npm run db:load

npm test
npm run typecheck
npm run test:k6
npm run typecheck:k6

npm run k6:prepare
```

Em outro terminal, inicie uma API:

```powershell
npm run start:raw-sql
```

Valide e execute uma campanha:

```powershell
npm run k6:run -- get-product-by-id smoke --implementation raw-sql

npm run k6:campaign -- get-product-by-id `
  --implementation raw-sql `
  --vus 10 `
  --dry-run

npm run k6:campaign -- get-product-by-id `
  --implementation raw-sql `
  --vus 10
```

Repita com `typeorm` e `prisma`, sempre usando o mesmo dataset, perfil, quantidade
de VUs, duração, warm-up e número de repetições.

## Documentação adicional

- [Arquitetura](docs/architecture.md)
- [Auditoria pré-benchmark](docs/audits/PRE-BENCHMARK-AUDIT.md)
- [Equidade entre ORM e SQL](docs/specs/SPEC-AUDITORIA-EQUIDADE-ORM-SQL.md)
- [Setup do k6](docs/specs/SPEC-K6-BENCHMARK-SETUP.md)
- [Endpoints de sucesso no k6](docs/specs/SPEC-K6-RAW-SQL-ENDPOINTS-SUCESSO.md)
- [Guia detalhado do k6](tests/k6/README.md)
- [Geradores de dados](docs/specs/specs-generators.md)
- [Postman](tests/postman/README.md)

## Cuidados para o benchmark oficial

- use o dataset `medium` nas três implementações;
- execute apenas uma API por vez;
- desative `SQL_AUDIT` e logs detalhados;
- use a mesma máquina e o mesmo PostgreSQL;
- faça warm-up de 1 minuto;
- execute cinco rodadas de 3 minutos;
- teste 10, 50 e 100 VUs separadamente;
- restaure o banco antes de cada execução de escrita;
- não misture warm-up com medições oficiais;
- preserve resultados reprovados em vez de descartá-los silenciosamente;
- registre versão do código, dataset, hardware e ambiente.
