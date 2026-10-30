# Auditoria SQL — TypeORM

Auditoria diagnóstica com `SQL_AUDIT=true`, fora do benchmark k6. O SQL abaixo foi normalizado para leitura; o log integral, com todas as colunas e parâmetros capturados, está em [sqls-results-typeorm.raw.log](./sqls-results-typeorm.raw.log).

## GET /products?page=1&limit=20

```sql
SELECT COUNT(1) AS "cnt"
FROM "products" "Product";

SELECT "Product".*
FROM "products" "Product"
ORDER BY "Product"."id" ASC
LIMIT 20 OFFSET 0;
```

## GET /products filtrado

```sql
SELECT "Product".*
FROM "products" "Product"
WHERE "Product"."category_id" = $1
  AND "Product"."price" BETWEEN $2 AND $3
  AND "Product"."active" = $4
ORDER BY "Product"."id" ASC
LIMIT 20 OFFSET 0;

SELECT COUNT(1) AS "cnt"
FROM "products" "Product"
WHERE "Product"."category_id" = $1
  AND "Product"."price" BETWEEN $2 AND $3
  AND "Product"."active" = $4;
```

## GET /products/1000

```sql
SELECT "Product".*
FROM "products" "Product"
WHERE "Product"."id" = $1
LIMIT 1;
```

## GET /products/1000/details

```sql
SELECT "product".*, "details".*
FROM "products" "product"
LEFT JOIN "product_details" "details"
  ON "details"."product_id" = "product"."id"
WHERE "product"."id" = $1;
```

## PATCH /products/1000/stock

```sql
UPDATE "products"
SET "stock" = $1, "updated_at" = $2
WHERE "id" = $3
RETURNING *;
```

## GET /orders?page=1&limit=20

```sql
SELECT COUNT(1) AS "cnt"
FROM "orders" "count_order";

SELECT "ord".*, "customer".*, "item".*, "product".*
FROM "orders" "ord"
INNER JOIN "customers" "customer"
  ON "customer"."id" = "ord"."customer_id"
LEFT JOIN "order_items" "item"
  ON "item"."order_id" = "ord"."id"
LEFT JOIN "products" "product"
  ON "product"."id" = "item"."product_id"
INNER JOIN (
  SELECT "page_order"."id"
  FROM "orders" "page_order"
  ORDER BY "page_order"."created_at" DESC, "page_order"."id" DESC
  LIMIT 20 OFFSET 0
) "page" ON "page"."id" = "ord"."id"
ORDER BY "ord"."created_at" DESC, "ord"."id" DESC, "item"."id" ASC NULLS LAST;
```

## GET /orders/1000

```sql
SELECT "ord".*, "customer".*, "item".*, "product".*
FROM "orders" "ord"
INNER JOIN "customers" "customer"
  ON "customer"."id" = "ord"."customer_id"
LEFT JOIN "order_items" "item"
  ON "item"."order_id" = "ord"."id"
LEFT JOIN "products" "product"
  ON "product"."id" = "item"."product_id"
WHERE "ord"."id" = $1
ORDER BY "item"."id" ASC NULLS LAST;
```

## POST /orders

```sql
START TRANSACTION;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT 1
FROM "customers" "Customer"
WHERE "Customer"."id" = $1;

SELECT "product"."id", "product"."price", "product"."stock", "product"."active"
FROM "products" "product"
WHERE "product"."id" IN ($1)
ORDER BY "product"."id" ASC;

INSERT INTO "orders" ("customer_id", "status", "created_at", "updated_at")
VALUES ($1, $2, DEFAULT, DEFAULT)
RETURNING "id";

INSERT INTO "order_items" ("order_id", "product_id", "quantity", "unit_price")
VALUES ($1, $2, $3, $4)
RETURNING "id";

UPDATE "products"
SET "stock" = "stock" - CASE "id"
  WHEN CAST($1 AS BIGINT) THEN CAST($2 AS INTEGER)
END,
"updated_at" = $3
WHERE "id" IN ($4)
  AND "stock" >= CASE "id" WHEN CAST($1 AS BIGINT) THEN CAST($2 AS INTEGER) END;

-- Em seguida, o TypeORM relê o pedido criado com customer, items e products.
COMMIT;
```

## GET /customers/1/orders?page=1&limit=20

```sql
SELECT "Customer".*
FROM "customers" "Customer"
WHERE "Customer"."id" = $1
LIMIT 1;

SELECT COUNT(1) AS "cnt"
FROM "orders" "Order"
WHERE "Order"."customer_id" = $1;

SELECT "Order".*
FROM "orders" "Order"
WHERE "Order"."customer_id" = $1
ORDER BY "Order"."created_at" DESC, "Order"."id" DESC
LIMIT 20 OFFSET 0;
```

Não foi identificado padrão N+1 nas requisições auditadas. A auditoria de `POST /orders` e `PATCH /products/:id/stock` alterou o banco; antes de nova campanha oficial, execute `npm run db:reset` e `npm run db:load`.
