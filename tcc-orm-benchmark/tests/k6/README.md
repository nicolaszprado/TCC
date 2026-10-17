# k6 — endpoints de sucesso das três implementações

A suíte cobre as oito rotas equivalentes de Raw SQL, TypeORM e Prisma. Os mesmos
scripts, contratos, fixtures e perfis são usados nas três implementações; o runner
altera somente o alvo HTTP e a pasta de resultados.

| Script | Método e rota | Perfis |
|---|---|---|
| `get-product-by-id` | GET /products/:id | baseline |
| `get-product-details` | GET /products/:id/details | baseline |
| `list-products` | GET /products | baseline, filtered, paginated |
| `get-customer-orders` | GET /customers/:id/orders | baseline |
| `get-order-by-id` | GET /orders/:id | baseline |
| `list-orders` | GET /orders | baseline, filtered, paginated |
| `create-order` | POST /orders | baseline (1 item), three-items (3 itens) |
| `update-product-stock` | PATCH /products/:id/stock | baseline |

Só são enviados dados válidos. Respostas inesperadas, JSON inválido e violações do
contrato reprovam o teste: `http_req_failed == 0` e `checks == 1`.
Cada iteração faz exatamente uma requisição ao endpoint medido, sem retries HTTP.
Load não tem pausa; smoke de leitura usa 1 VU/10s com pausa de 1s.
Smoke de escrita executa 1 VU/1 iteração.

## Pré-requisitos

Execute todos os comandos abaixo na raiz `tcc-orm-benchmark`, em PowerShell.

- Node 22.12 ou superior, dentro da versão 22; dependências instaladas.
- k6 no PATH (`k6 version`). Se necessário, `winget install k6 --source winget`.
- PostgreSQL configurado no `.env` da raiz, com schema, índices e CSVs carregados.
- Uma API iniciada: Raw SQL na porta 3001, TypeORM na 3002 ou Prisma na 3003.
- Para oficiais, New Relic e logging SQL desligados e apenas uma API sob teste.

O k6 é externo às APIs. Não execute os arquivos k6 com Node.
O runner e as ferramentas de preparação usam Node/tsx.

## Selecionar a implementação

Raw SQL continua sendo o padrão. Selecione apenas uma implementação por rodada:

| Implementação | Iniciar API | Flag do runner | URL padrão | Resultados |
|---|---|---|---|---|
| Raw SQL | `npm run start:raw-sql` | `--implementation raw-sql` | `http://localhost:3001` | `results/raw-sql/` |
| TypeORM | `npm run start:typeorm` | `--implementation typeorm` | `http://localhost:3002` | `results/typeorm/` |
| Prisma | `npm run start:prisma` | `--implementation prisma` | `http://localhost:3003` | `results/prisma/` |

Para executar contra TypeORM, inicie a API:

```powershell
npm run start:typeorm
```

Em outro terminal, use a implementação `typeorm`:

```powershell
npm run k6:run -- get-product-by-id smoke --implementation typeorm
npm run k6:run -- get-product-by-id load --implementation typeorm --vus 10 --duration 1m
```

Para executar contra Prisma, inicie a API:

```powershell
npm run start:prisma
```

Em outro terminal, informe `--implementation prisma` em cada execução. Quando
`BASE_URL` não estiver definida, o runner usa automaticamente a porta 3003:

```powershell
npm run k6:run -- get-product-by-id smoke --implementation prisma
npm run k6:run -- get-product-by-id load --implementation prisma --vus 10 --duration 1m
```

Também é possível definir TypeORM uma vez para a sessão:

```powershell
$env:IMPLEMENTATION = "typeorm"
Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue
npm run k6:run -- list-products smoke
```

Use `BASE_URL` apenas para sobrescrever a URL padrão, por exemplo quando a API
estiver em outra porta. Cada implementação possui sua própria pasta de resultados.

## 1. Preparar fixtures de leitura

Com o dataset base carregado:

```powershell
npm run k6:prepare
```

A ferramenta consulta o PostgreSQL e compara as contagens com
`database/metadata/dataset.json`. Gera `tests/k6/fixtures/benchmark.json`
com IDs existentes, relações, preços, filtros e hash. Nenhum dado do banco é
alterado nessa modalidade. Não sobrescreve fixtures existentes.

Não copie `benchmark.example.json`: é apenas uma ilustração de formato.
As fixtures devem corresponder ao banco e ficam fora do Git.

## 2. Smoke dos seis endpoints de leitura

```powershell
$env:PROFILE = "baseline"

npm run k6:run -- get-product-by-id smoke
npm run k6:run -- list-products smoke
npm run k6:run -- get-product-details smoke
npm run k6:run -- get-customer-orders smoke
npm run k6:run -- get-order-by-id smoke
npm run k6:run -- list-orders smoke

$env:PROFILE = "filtered"
npm run k6:run -- list-products smoke
npm run k6:run -- list-orders smoke

$env:PROFILE = "paginated"
npm run k6:run -- list-products smoke
npm run k6:run -- list-orders smoke

$env:PROFILE = "baseline"
```

A listagem filtrada de produtos usa categoria com resultados, ativos e preço entre
10 e 5000. A de pedidos usa um cliente com pedidos PENDING. A paginada varia entre
as primeiras dez páginas existentes. Limite padrão: 20.

## 3. Pilotos e medições

Exemplo de piloto (repita para cada script/perfil):

```powershell
npm run k6:run -- list-products load --vus 10 --duration 1m
npm run k6:run -- list-products load --vus 50 --duration 1m
npm run k6:run -- list-products load --vus 100 --duration 1m
```

O runner salva resumo, console, metadados e exit code em uma pasta exclusiva de
`tests/k6/results/<implementação>/`. Mostra o caminho ao terminar. Exit code diferente
de zero indica reprovação; uma falha não deve ser incluída silenciosamente nas
médias. Nenhum runner executa warm-up automaticamente.

Para a medição oficial, prepare o dataset medium (100 mil produtos), faça warm-up
separado de 1 minuto e então 5 minutos de medição; repita cinco vezes por cenário.
Não use IDs fixos na campanha oficial. VUs representam concorrência, não req/s
fixas nem pessoas navegando.

```powershell
$env:PHASE = "warmup"
npm run k6:run -- list-products load --vus 10 --duration 1m
$env:PHASE = "measurement"
$env:WARMUP_NOTE = "1 minuto, mesmo endpoint/perfil/VUs, imediatamente antes"
npm run k6:run -- list-products load --vus 10 --duration 5m
```

Os artefatos do warm-up ficam separados e não devem entrar nos resultados oficiais.
Amostragem é determinística por seed/VU/iteração; execuções com durações iguais
podem fazer quantidades diferentes de requests.

## 4. Preparar POST e PATCH

Esses testes alteram o banco. Use somente um banco de benchmark.
Cada execução de escrita consome uma preparação: o runner cria o marcador
`benchmark.json.used` e impede reutilização até restaurar/preparar novamente.

Antes de cada smoke, warm-up ou load de escrita:

1. Pare outros testes e arquive o manifesto anterior e seu marcador.
2. Execute reset/load explicitamente para restaurar os dados.
3. Prepare as partições exclusivas e estoque.
4. Execute apenas um endpoint/perfil.
5. Confira a verificação pós-escrita salva pelo runner.

**`db:reset` apaga os dados das seis tabelas do benchmark.** Ele não gera CSVs nem
recria o schema. Use `dataset:small` ou `dataset:medium` antes, se precisar gerar
CSVs, e confira o DB_NAME do `.env`.

Arquivamento (somente se os arquivos existirem):

```powershell
$implementation = if ($env:IMPLEMENTATION) { $env:IMPLEMENTATION } else { "raw-sql" }
$archive = "tests/k6/results/$implementation/fixtures-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff")
New-Item -ItemType Directory -Path $archive
if (Test-Path "tests/k6/fixtures/benchmark.json") {
  Move-Item "tests/k6/fixtures/benchmark.json" $archive
}
if (Test-Path "tests/k6/fixtures/benchmark.json.used") {
  Move-Item "tests/k6/fixtures/benchmark.json.used" $archive
}
```

Preparação (substitua o nome abaixo pelo DB_NAME do seu banco de benchmark):

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
```

São reservados três produtos ativos por VU para POST e outro produto por VU para
PATCH. Para POST, cada produto recebe estoque `MAX_ORDERS_PER_VU × QUANTITY`.
Esse estoque preparado é documentado nas fixtures; não é o estoque original do seed.
A quantidade de pedidos por VU é limitada; ao esgotar o orçamento, o teste aborta,
sem repor estoque durante a medição. Recalibre no piloto se necessário.

Escolha **um** dos comandos, restaurando/preparando antes de cada execução seguinte:

```powershell
npm run k6:run -- create-order smoke
# OU:
npm run k6:run -- update-product-stock smoke
# OU, depois de validar smoke:
npm run k6:run -- create-order load --vus 10 --duration 1m
# OU:
npm run k6:run -- update-product-stock load --vus 10 --duration 1m
```

Para três itens por pedido, use `$env:PROFILE = "three-items"` antes de executar
`create-order`. IDs no JSON são números. PATCH alterna estoque 100/101 por VU;
POST usa produtos distintos entre VUs para reduzir contenção.

Depois de warm-up de escrita, arquive, restaure e prepare novamente antes da
medição. A API pode continuar ativa. Documente que a restauração também altera
o estado do banco. Não execute endpoints de escrita simultaneamente.

O runner verifica automaticamente crescimento de pedidos/itens, consumo de
estoque por VU e último estoque esperado do PATCH. A verificação pode ser repetida
após arquivar o resultado anterior de verificação, usando o mesmo manifesto:

```powershell
npm run k6:verify -- "tests/k6/results/<implementação>/ID-DA-EXECUCAO/summary.json"
```

Ao voltar às leituras, restaure o banco e gere fixtures sem `--writes`.
Não use um banco modificado por POST para comparar listagens com a base original.

## 5. Validação da suíte

```powershell
npm run test:k6
npm run typecheck:k6
```

Esses comandos validam os contratos compartilhados e o código TypeScript das
ferramentas. Para validar a integração, execute os cenários `smoke` desejados
contra a API e o banco que serão usados no benchmark.

## Configuração e evidências

- `K6_BIN`: caminho do executável, se não estiver no PATH.
- `IMPLEMENTATION`: seleciona `raw-sql`, `typeorm` ou `prisma`, define a URL padrão
  correspondente e separa a pasta de resultados. A flag `--implementation` tem
  precedência sobre essa variável.
- `RUN_ID`: identificador opcional; por padrão é gerado com timestamp.
- `FIXTURES_FILE`: no runner, caminho relativo à raiz ou absoluto. Ele o converte
  para absoluto antes de chamar k6. Em k6 direto, caminhos relativos são resolvidos
  a partir de `tests/k6/lib/suite.js`.
- `PROFILE`, `PAGE`, `LIMIT`, `SEED` e filtros: ver spec.
- `PRODUCT_ID`, `ORDER_ID`, `CUSTOMER_ID`: diagnóstico de leitura com ID existente.
- `MIN_PRODUCT_ID`/`MAX_PRODUCT_ID`: compatibilidade do teste de produto; intervalo
  só é aceito se contínuo nas fixtures; PRODUCT_ID tem precedência.
- `API_APM_STATE`, `API_LOGGING_STATE`, `WARMUP_NOTE`: registre o estado que foi
  efetivamente conferido. Por padrão o runner declara “não verificado”.
- `summary.json`: métricas k6, percentis, checks e metadados do cenário.
- `metadata.json`: ambiente, revisão Git, alterações locais, versões e políticas.
- `exit.json`, `console.log`: conclusão/abortos e detalhes da execução.
- `summary-verification.json`: conferência do banco depois de escritas.

Os arquivos JSON/log de resultados são locais e ignorados pelo Git; faça backup.
A trava `fixtures/.run.lock` impede runners concorrentes. Se houver encerramento
forçado e ela permanecer, confira que não há teste ativo antes de remover somente
essa trava. Uma preparação de escrita consumida exige restauração, não apenas
remoção do marcador.

Referência: [spec de endpoints de sucesso](../../docs/specs/SPEC-K6-RAW-SQL-ENDPOINTS-SUCESSO.md).

Validação executada: [relatório Raw SQL](results/validacao-endpoints-raw-sql.md).
O perfil POST com três itens apresentou conflitos de serialização sob carga e
permanece reprovado. Os scripts registram essa falha, sem tratá-la como sucesso.
