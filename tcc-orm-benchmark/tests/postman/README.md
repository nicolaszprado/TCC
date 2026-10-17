# Postman — TCC ORM Benchmark

Esta pasta contém uma coleção única para testar as três implementações da API:

- Raw SQL: `http://localhost:3001`
- TypeORM: `http://localhost:3002`
- Prisma: `http://localhost:3003`

## Como importar

1. No Postman, clique em **Import**.
2. Importe `tcc-orm-benchmark.postman_collection.json`.
3. Importe os três arquivos da pasta `environments/`.
4. Inicie a API desejada e selecione o ambiente correspondente no Postman.
5. Ajuste as variáveis da coleção (`productId`, `customerId` e `orderId`) caso os IDs do seu dataset sejam diferentes.

As requests incluem testes de status HTTP e do contrato básico de resposta.

## Atenção às mutações

As requests com o prefixo `[MUTATION]` alteram o banco:

- `Update product stock` redefine o estoque do produto.
- `Create order` cria um pedido e reduz o estoque.

Para comparações reproduzíveis entre as três APIs, execute o reset/seed do banco antes de testar cada implementação.
