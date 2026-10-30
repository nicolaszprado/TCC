# Auditoria SQL — Prisma

Auditoria diagnóstica com `SQL_AUDIT=true`, fora do benchmark k6. O SQL abaixo foi normalizado para leitura. O log capturado integralmente está em [sql-results-prisma.raw.log](./sql-results-prisma.raw.log).

## GET /products?page=1&limit=20

```sql
SELECT "products".*
FROM "public"."products"
WHERE 1 = 1
ORDER BY "id" ASC
LIMIT $1 OFFSET $2;

SELECT COUNT(*)
FROM (
  SELECT "id" FROM "public"."products"
  WHERE 1 = 1 OFFSET $1
) AS "sub";
```

## GET /products filtrado

```sql
SELECT "products".*
FROM "public"."products"
WHERE "category_id" = $1
  AND "price" >= $2
  AND "price" <= $3
  AND "active" = $4
ORDER BY "id" ASC
LIMIT $5 OFFSET $6;

SELECT COUNT(*)
FROM (
  SELECT "id" FROM "public"."products"
  WHERE "category_id" = $1
    AND "price" >= $2
    AND "price" <= $3
    AND "active" = $4
  OFFSET $5
) AS "sub";
```

## GET /products/:id

```sql
SELECT "products".*
FROM "public"."products"
WHERE "id" = $1 AND 1 = 1
LIMIT $2 OFFSET $3;
```

## GET /products/:id/details

```sql
SELECT "products".*
FROM "public"."products"
WHERE "id" = $1 AND 1 = 1
LIMIT $2 OFFSET $3;

SELECT "product_details".*
FROM "public"."product_details"
WHERE "product_id" = $1
OFFSET $2;
```

O Prisma executa duas queries fixas para carregar produto e detalhes, em vez do `LEFT JOIN` único usado pelo TypeORM.

## PATCH /products/:id/stock

```sql
UPDATE "public"."products"
SET "stock" = $1, "updated_at" = $2
WHERE "id" = $3 AND 1 = 1
RETURNING "products".*;
```

## GET /orders?page=1&limit=20

```sql
SELECT "orders".*
FROM "public"."orders"
WHERE 1 = 1
ORDER BY "created_at" DESC, "id" DESC
LIMIT $1 OFFSET $2;

SELECT COUNT(*) FROM (
  SELECT "id" FROM "public"."orders" WHERE 1 = 1 OFFSET $1
) AS "sub";

SELECT "customers"."id", "customers"."name", "customers"."email"
FROM "public"."customers"
WHERE "id" IN ($1, ..., $20);

SELECT "order_items".*
FROM "public"."order_items"
WHERE "order_id" IN ($1, ..., $20)
ORDER BY "id" ASC;

SELECT "products"."id", "products"."name"
FROM "public"."products"
WHERE "id" IN ($1, ..., $75);
```

São cinco queries fixas: página, contagem e três carregamentos em lote. Os `IN (...)` evitam uma query por pedido, item ou produto.

## GET /orders/:id

```sql
SELECT "orders".*
FROM "public"."orders"
WHERE "id" = $1 AND 1 = 1
LIMIT $2 OFFSET $3;

SELECT "customers"."id", "customers"."name", "customers"."email"
FROM "public"."customers"
WHERE "id" = $1;

SELECT "order_items".*
FROM "public"."order_items"
WHERE "order_id" = $1
ORDER BY "id" ASC;

SELECT "products"."id", "products"."name"
FROM "public"."products"
WHERE "id" IN ($1, $2);
```

## POST /orders

```sql
SELECT "id" FROM "public"."customers"
WHERE "id" = $1 AND 1 = 1
LIMIT $2 OFFSET $3;

SELECT "id", "price", "stock", "active"
FROM "public"."products"
WHERE "id" IN ($1)
ORDER BY "id" ASC;

INSERT INTO "public"."orders" ("customer_id", "status", "created_at", "updated_at")
VALUES ($1, $2, $3, $4)
RETURNING "id";

INSERT INTO "public"."order_items" ("order_id", "product_id", "quantity", "unit_price")
VALUES ($1, $2, $3, $4)
RETURNING "id";

-- Prisma relê pedido, cliente, itens e produtos em quatro queries em lote.

UPDATE "public"."products"
SET "stock" = "stock" - $1, "updated_at" = $2
WHERE "id" = $3
  AND "active" = $4
  AND "stock" >= $5;

COMMIT;
```

O log capturado mostra `COMMIT`, mas não exibe o comando de início. Isso é comportamento do logging do Prisma Adapter; a implementação executa o fluxo dentro de uma transação `Serializable`.

## GET /customers/:id/orders?page=1&limit=20

```sql
SELECT "customers".*
FROM "public"."customers"
WHERE "id" = $1 AND 1 = 1
LIMIT $2 OFFSET $3;

SELECT COUNT(*) FROM (
  SELECT "id" FROM "public"."orders"
  WHERE "customer_id" = $1
  OFFSET $2
) AS "sub";

SELECT "orders".*
FROM "public"."orders"
WHERE "customer_id" = $1
ORDER BY "created_at" DESC, "id" DESC
LIMIT $2 OFFSET $3;
```

## Conclusão

Não há evidência de N+1 nas requisições auditadas. O Prisma prefere múltiplas consultas fixas e carregamentos em lote com `IN (...)`, enquanto TypeORM e Raw SQL usam mais `JOIN`s. A auditoria de `POST /orders` e `PATCH /products/:id/stock` alterou o banco; antes de nova campanha oficial, execute `npm run db:reset` e `npm run db:load`.
