# SPEC — k6 para todos os endpoints de sucesso: primeira etapa Raw SQL

## 1. Objetivo e escopo

Especificar a expansão dos testes k6 para todos os endpoints existentes, implementando e validando primeiro contra Raw SQL em `http://localhost:3001`.

Este documento orienta uma implementação futura. Sua criação não significa que os novos scripts ou benchmarks já foram executados.

Criar smoke e load tests dos sete endpoints restantes e preservar a cobertura de `GET /products/:id`. Cobrir somente entradas válidas e respostas de sucesso. Não criar cenários de IDs inexistentes, payloads inválidos, estoque insuficiente ou rotas desconhecidas. Erros inesperados durante a carga devem continuar sendo detectados e registrados.

Os scripts permanecerão independentes da implementação: receberão `BASE_URL` e poderão ser reutilizados posteriormente em TypeORM e Prisma. Nesta etapa, implementar e validar a suíte inteira somente em Raw SQL; não modificar as APIs para facilitar o benchmark.

Esta especificação sucede a restrição de expansão da etapa inicial de `SPEC-K6-BENCHMARK-SETUP.md`. Mantém os princípios de equidade dessa spec e de `SPEC-AUDITORIA-EQUIDADE-ORM-SQL.md`.

## 2. Endpoints e arquivos

Cada nome abaixo terá um arquivo `.js` em `tests/k6/smoke/` e outro em `tests/k6/load/`.

| Método e rota | Status esperado | Nome do script | Situação |
|---|---:|---|---|
| GET `/products/:id` | 200 | `get-product-by-id` | Existente; preservar e adequar checks |
| GET `/products` | 200 | `list-products` | Implementar |
| GET `/products/:id/details` | 200 | `get-product-details` | Implementar |
| GET `/customers/:id/orders` | 200 | `get-customer-orders` | Implementar |
| GET `/orders/:id` | 200 | `get-order-by-id` | Implementar |
| GET `/orders` | 200 | `list-orders` | Implementar |
| POST `/orders` | 201 | `create-order` | Implementar; altera pedidos e estoque |
| PATCH `/products/:id/stock` | 200 | `update-product-stock` | Implementar; altera estoque e data de atualização |

Cada execução mede um endpoint e um perfil. Não misturar os oito endpoints em um único resultado nem executar carga de POST e PATCH simultaneamente.

## 3. Entregáveis da implementação

- Sete novos scripts smoke e sete novos scripts load, conforme a tabela.
- Helpers em `tests/k6/lib/` para configuração, seleção determinística de dados, checks e métricas. Compartilhar a operação HTTP entre smoke/load para evitar contratos divergentes.
- Ferramenta Node em `tests/k6/tools/prepare-fixtures.ts`, executada fora do k6, para preparar e validar dados de benchmark usando a conexão PostgreSQL configurada na raiz.
- Manifesto local `tests/k6/fixtures/benchmark.json`, carregado uma vez com `SharedArray` quando apropriado. Não versionar credenciais nem a lista completa de fixtures geradas; versionar um exemplo do formato.
- Ferramenta de verificação pós-escrita em `tests/k6/tools/verify-writes.ts`.
- README com comandos PowerShell para os oito endpoints, preparação/restauração dos dados e exportação de resultados.
- Resultados e metadados de execução organizados em `tests/k6/results/raw-sql/`.

Ferramentas de preparação podem usar SQL; scripts k6 acessam somente HTTP. Preparação e verificação ficam fora da janela medida.

## 4. Dataset e fixtures

Usar `small` para desenvolvimento e `medium` para a campanha oficial. O medium definido no gerador contém 100.000 produtos, 100.000 detalhes, 20.000 clientes e 50.000 pedidos; a quantidade de itens deve ser lida dos metadados gerados.

`database/metadata/dataset.json` descreve arquivos gerados, mas não prova qual dataset está carregado no PostgreSQL. A preparação deve conferir contagens e IDs reais no banco antes de escrever o manifesto.

O manifesto deverá registrar:

- Dataset, seed, data de preparação, contagens conferidas e hash das fixtures.
- IDs válidos para produtos, produtos com detalhes, clientes com pedidos e pedidos com itens.
- Relação cliente/pedidos e atributos necessários para validar os perfis filtrados.
- Parâmetros e páginas não vazias para cada perfil de listagem.
- Produtos ativos reservados para POST, preços e estoques iniciais.
- Produtos reservados para PATCH e seus estoques iniciais.
- Quantidade máxima de VUs suportada, partições por VU e orçamento de escrita.

Não assumir que todo inteiro entre 1 e uma contagem é um ID existente. Intervalos contínuos só podem ser usados se verificados. Não consultar o banco nem descobrir IDs pela API a cada iteração.

Para leituras, escolher fixtures por uma sequência determinística derivada de `SEED`, ID do VU e número da iteração. Reutilizar o mesmo manifesto e algoritmo em futuras comparações. Execuções por duração podem produzir quantidades diferentes de requisições; isso não implica a mesma sequência global de requisições entre implementações.

Não incluir pedidos criados durante testes anteriores nas fixtures de leitura. Restaurar o dataset antes da preparação se houver resíduos de escrita.

## 5. Parâmetros e validação antecipada

| Parâmetro | Regra |
|---|---|
| `BASE_URL` | Obrigatório; `http://localhost:3001` nesta etapa |
| `FIXTURES_FILE` | Caminho documentado do manifesto; definir resolução relativa ao módulo que chama `open()` |
| `SEED` | Inteiro; padrão 12345 |
| `PRODUCT_ID`, `CUSTOMER_ID`, `ORDER_ID` | Opcionais para smoke/diagnóstico fixo; devem existir nas fixtures |
| `PROFILE` | Perfil permitido pelo endpoint; padrão `baseline` |
| `PAGE`, `LIMIT` | Inteiros positivos; `LIMIT` entre 1 e 100; padrão explícito 20 nos testes |
| `CATEGORY_ID`, `MIN_PRICE`, `MAX_PRICE`, `ACTIVE` | Filtros válidos somente para produtos |
| `STATUS`, `CUSTOMER_ID` | Filtros válidos para listagem de pedidos |
| `ITEMS_PER_ORDER` | 1 ou 3 nesta etapa; padrão 1 |
| `QUANTITY` | Inteiro positivo; padrão 1 |
| `ALLOW_WRITES` | Deve ser `true` para POST/PATCH; ausente em leituras |
| `MAX_ORDERS_PER_VU` | Orçamento explícito de pedidos por VU, validado contra estoque preparado |
| `RUN_ID` | Identificador único de execução, incluído nos artefatos |

Manter compatibilidade dos parâmetros existentes de `get-product-by-id`, validando os limites contra o dataset. Em medições oficiais não usar ID fixo.

Configuração inválida deve interromper a execução antes da carga. Não enviar requests inválidas como forma de validar configuração. Não enviar filtros vazios ou `undefined` na URL.

## 6. Contratos de sucesso

Usar os controllers, mappers e validators de `apps/raw-sql/src/` como fonte do contrato atual. JSON deve ser interpretado com tratamento de erro; resposta inválida deve reprovar checks, sem gerar exceções não tratadas que ocultem a falha.

### 6.1 GET `/products/:id`

HTTP 200; `id` igual ao solicitado; presença de `categoryId`, `name`, `price`, `stock`, `active`, `createdAt` e `updatedAt`. Preço decimal em string e estoque inteiro não negativo.

### 6.2 GET `/products`

Perfis obrigatórios, executados separadamente:

- `baseline`: `page=1&limit=20`.
- `filtered`: categoria existente, `active=true`, preço entre 10.00 e 5000.00 e `limit=20`; escolher categoria com resultados nas fixtures.
- `paginated`: páginas predefinidas e existentes, entre as primeiras dez disponíveis, `limit=20`.

HTTP 200; `data` array; `pagination` com `page`, `limit`, `total` e `totalPages` coerentes; tamanho de `data` não superior ao limite. Nos perfis escolhidos, exigir lista não vazia. Verificar atributos e filtros dos produtos devolvidos. Não exigir tamanho exatamente igual ao limite na última página.

### 6.3 GET `/products/:id/details`

Usar produtos que tenham detalhes nas fixtures. HTTP 200; produto correto; `details` objeto com `weightKg`, `widthCm`, `heightCm`, `depthCm`, `manufacturer` e `warrantyMonths`. Não exigir números JavaScript para valores decimais serializados como strings. O contrato permite `details=null`, mas esse caso não faz parte do perfil de relacionamento desta etapa.

### 6.4 GET `/customers/:id/orders`

Usar clientes com pedidos e `page=1&limit=20`, variando cliente entre as fixtures. HTTP 200; corpo `{ customer, orders, pagination }`, e não `{ data, pagination }`. Conferir `customer.id`, array de pedidos não vazio, vínculo `customerId` dos pedidos e paginação coerente.

### 6.5 GET `/orders/:id`

HTTP 200; `id` correto, status válido, objeto `customer`, datas e array `items` não vazio. Cada item deve ter `id`, quantidade positiva, `unitPrice` decimal em string e `product` com ID/nome. Usar pedidos originais com 1 a 8 itens e registrar a distribuição da amostra.

### 6.6 GET `/orders`

Perfis separados:

- `baseline`: `page=1&limit=20`.
- `filtered`: `status=PENDING` e cliente com pedidos nesse status, conforme fixtures.
- `paginated`: páginas existentes entre as primeiras dez disponíveis, `limit=20`.

HTTP 200; `{ data, pagination }`; lista não vazia; pedidos com cliente/itens e filtros respeitados. A paginação conta pedidos, não linhas do JOIN nem quantidade de itens.

### 6.7 POST `/orders`

Enviar `Content-Type: application/json`. IDs no corpo devem ser números inteiros seguros, não strings: o `parseJsonId` atual exige `Number.isSafeInteger`.

```json
{
  "customerId": 1,
  "items": [
    { "productId": 100, "quantity": 1 }
  ]
}
```

Os IDs acima são ilustrativos; a implementação usará fixtures verificadas. Perfil `baseline`: um item. Perfil `three-items`: três produtos distintos, quantidade 1 por item. Não repetir um produto no mesmo pedido.

HTTP 201; ID criado positivo; status `PENDING`; cliente correto; número de itens igual ao enviado; produtos e quantidades correspondentes ao payload, comparados por ID, sem depender de ordem. Comparar preços com as fixtures por valor decimal, sem presumir formatação idêntica.

Fazer exatamente um POST por iteração. Não adicionar GET de confirmação ou PATCH de reposição na iteração. Não repetir automaticamente um POST após timeout, pois ele pode ter sido confirmado no banco.

### 6.8 PATCH `/products/:id/stock`

Enviar `Content-Type: application/json` e `{ "stock": 100 }`, alternando deterministicamente entre 100 e 101 por VU/iteração para exercitar atualizações reais.

HTTP 200; produto correto; estoque devolvido igual ao enviado; campos do produto presentes. Usar produtos exclusivos por VU para evitar sobrescritas concorrentes no perfil inicial. Contenção intencional em um único produto será um cenário futuro separado.

## 7. Escritas: estoque, isolamento e restauração

Preparar dados antes de executar qualquer smoke/load de escrita:

1. Confirmar que o banco configurado é o ambiente de benchmark e identificar o alvo sem registrar senha.
2. Restaurar o dataset base pelo fluxo explícito de reset/load. `db:reset` apaga as seis tabelas de dados; não recria schema nem gera CSVs. Não executar reset implicitamente ao iniciar k6.
3. Selecionar produtos já ativos e clientes existentes. Reservar conjuntos distintos para POST e PATCH.
4. Para POST, atribuir a cada VU um conjunto exclusivo de produtos, com pelo menos três produtos quando esse perfil for usado. Manter essa partição idêntica entre repetições equivalentes.
5. Preparar estoque por produto suficiente para o orçamento por VU, considerando quantidade por pedido. Exigir `estoque >= MAX_ORDERS_PER_VU * QUANTITY` para cada produto que possa aparecer em todos os pedidos daquele VU; respeitar o limite INTEGER de 2.147.483.647.
6. Antes de ultrapassar o orçamento, abortar e marcar a rodada como incompleta. Não continuar emitindo 409, reutilizar produtos de outros VUs ou executar iterações vazias. Se necessário, recalibrar o orçamento fora da medição e repetir desde a preparação.
7. Registrar contagens de pedidos/itens, estoques e preços iniciais para verificação posterior. Verificar capacidade de disco no piloto: POST contínuo aumenta o banco durante a medição.

O estoque preparado é uma alteração controlada do dataset de escrita e deve constar nos metadados. Não alegar que essa execução usa o estoque original do seed.

Executar warm-up de escrita em uma preparação descartável. Depois restaurar/preparar novamente antes da medição, mantendo o processo da API ativo. Aplicar a mesma rotina em todas as rodadas e registrar que a restauração também afeta o estado do banco; não afirmar equivalência perfeita de caches.

Após POST, verificar fora do k6 que o crescimento de pedidos e itens corresponde aos sucessos registrados e que o consumo de estoque corresponde às quantidades vendidas. Após PATCH, verificar produto, faixa de estoque esperada e o último valor enviado por cada VU, exportado em estado auxiliar por VU. Se houver timeouts ou divergências, preservar evidências e marcar a rodada inválida; não corrigir contagens para forçar aprovação.

Restaurar/preparar antes da próxima repetição de escrita e antes de voltar às leituras. Não executar POST e PATCH em paralelo. O perfil sem disputa entre VUs mede escrita com contenção reduzida; documentar essa condição nas conclusões.

## 8. Smoke, carga e métricas

Smoke de leitura: 1 VU, 10 segundos e `sleep(1)`. Smoke de escrita: 1 VU, 1 iteração para cada perfil, com preparação e verificação posteriores. Cobrir todos os perfis no smoke.

Load: VUs e duração fornecidos pela CLI, preservando o formato atual `--vus ... --duration ...`. Uma requisição de negócio por iteração, sem `sleep`, sem retries HTTP e sem chamadas auxiliares no trecho medido. Medir cada perfil em um processo k6 separado.

Sequência por endpoint: smoke, piloto de 10 VUs/1 minuto, 50 VUs/1 minuto e 100 VUs/1 minuto. Somente depois iniciar medições oficiais de 3 minutos com cinco repetições, precedidas por warm-up de 1 minuto. Um minuto é o protocolo inicial; verificar estabilidade no piloto e registrar qualquer ajuste aplicado uniformemente.

Regras obrigatórias:

- Check do status exato: 200 em GET/PATCH e 201 em POST. HTTP 200 sozinho não comprova equivalência do JSON.
- Checks do contrato descrito na seção 6, com o mesmo custo de validação nas futuras implementações.
- Thresholds `http_req_failed: ['rate==0']` e `checks: ['rate==1']` para esta suíte exclusivamente de sucesso. Uma resposta 4xx/5xx inesperada reprova a rodada; não deve ser configurada como sucesso esperado.
- Não usar limite arbitrário de latência como evidência de superioridade. Registrar latência, inclusive em execuções reprovadas.
- Tags estáveis `name` e `endpoint` com a rota parametrizada, como `GET /orders/:id`; incluir `profile` e fase. Não usar IDs individuais como tags customizadas.
- Pré-validação HTTP, se necessária, ocorre antes do processo medido. Não misturar métricas de preparação, warm-up e medição.
- Exportar quantidade de requisições, req/s, média, mediana/p50, p95, p99, mínimo, máximo, taxa de falhas, checks e iterações interrompidas.

O k6 permite thresholds sobre checks e métricas para determinar aprovação: [documentação oficial](https://grafana.com/docs/k6/latest/using-k6/thresholds/). Esses critérios verificam sucesso funcional; não garantem equivalência entre APIs nem significância estatística.

Não chamar automaticamente 100 VUs de stress ou de carga alta de produção: são níveis experimentais de concorrência. Sem pausa, VUs não representam pessoas navegando. Comparar latência junto com throughput, pois o número de requisições varia com a velocidade de resposta.

## 9. Comandos e artefatos esperados

Os comandos abaixo serão utilizáveis após a implementação dos arquivos definidos nesta spec. Executar na raiz do projeto, após preparar fixtures e iniciar `npm run start:raw-sql`.

Exemplo smoke de leitura:

```powershell
k6 run -e BASE_URL=http://localhost:3001 -e PROFILE=baseline tests/k6/smoke/list-products.js
```

Exemplo piloto:

```powershell
k6 run --vus 10 --duration 1m -e BASE_URL=http://localhost:3001 -e PROFILE=baseline tests/k6/load/get-order-by-id.js
```

Exemplo oficial de leitura, após warm-up:

```powershell
k6 run --vus 10 --duration 3m --summary-trend-stats="avg,med,p(95),p(99),min,max" --summary-export="tests/k6/results/raw-sql/medium-list-products-baseline-10vus-run-01-summary.json" -e BASE_URL=http://localhost:3001 -e PROFILE=baseline -e RUN_ID=medium-list-products-baseline-10vus-run-01 tests/k6/load/list-products.js
```

Exemplo smoke de escrita, após preparação específica:

```powershell
k6 run -e BASE_URL=http://localhost:3001 -e ALLOW_WRITES=true -e MAX_ORDERS_PER_VU=1 -e ITEMS_PER_ORDER=1 tests/k6/smoke/create-order.js
```

O README final deve fornecer comandos completos de preparação, verificação e execução dos oito endpoints, incluindo orçamento de estoque calculado para os testes de POST. Não fornecer comandos oficiais de escrita sem os pré-requisitos correspondentes.

Para cada medição, salvar:

- `{RUN_ID}-summary.json`: resumo k6; compor `RUN_ID` com dataset, endpoint, perfil, VUs e número da rodada, conforme exemplo acima.
- Arquivo de metadados associado: horário, URL, versões k6/Node/PostgreSQL/dependências, revisão Git e estado de alterações locais, hardware, sistema operacional, dataset e hash das fixtures, parâmetros, duração, política de pool/transações, estado de APM/logging e protocolo de warm-up.
- Para escritas: preparação, orçamento, contagens antes/depois e verificação do estoque.

Usar subpastas por campanha ou acrescentar uma data/hora ao `RUN_ID` para garantir nomes únicos; não sobrescrever resultados existentes. Manter resumos de falhas, identificados como inválidos, separados das médias oficiais.

Os JSONs de resultados já são ignorados pelo Git. Documentar backup dos artefatos e manter relatórios Markdown versionáveis.

## 10. Plano de implementação e aceite

1. Implementar configuração, fixtures de leitura, checks e exportação.
2. Adequar o GET por ID existente e implementar os outros cinco endpoints GET, incluindo todos os perfis de sucesso.
3. Validar os seis endpoints de leitura em Raw SQL.
4. Implementar preparação e verificação de escrita; adicionar PATCH e POST.
5. Validar smoke e pilotos dos dois endpoints de escrita, restaurando o banco conforme seção 7.
6. Atualizar README e registrar evidências dos oito endpoints.

Critérios de aceite:

- [ ] Oito pares smoke/load presentes, incluindo o GET por ID existente.
- [ ] Todos os perfis documentados executados contra Raw SQL na porta 3001.
- [ ] Nenhum cenário negativo ou resposta de erro tratada como sucesso.
- [ ] Checks verificam status exato e corpo de resposta, incluindo `orders` no endpoint de cliente.
- [ ] IDs numéricos no POST; clientes existentes, produtos ativos e itens distintos.
- [ ] Fixtures refletem o banco carregado e têm seleção reproduzível.
- [ ] POST não esgota estoque nem inclui reposição dentro da medição.
- [ ] Escritas usam `ALLOW_WRITES`, partição por VU, orçamento e verificação posterior.
- [ ] Pilotos de 10, 50 e 100 VUs por endpoint/perfil concluídos ou registrados como reprovados, sem ocultar falhas.
- [ ] Resultados de preparação/warm-up não entram no resumo oficial.
- [ ] Exportações e metadados permitem reproduzir cada execução.
- [ ] Scripts continuam reutilizáveis por `BASE_URL`, sem variantes exclusivas para um ORM.

A implementação está concluída quando esses critérios forem verificados. A campanha oficial de cinco rodadas é uma execução experimental posterior; não confundir scripts prontos com resultados já coletados. As oito rotas básicas geram 120 medições para Raw SQL (8 × 3 cargas × 5 repetições); perfis adicionais aumentam esse total e devem ser contabilizados no planejamento.
