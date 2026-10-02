# SPEC-005 — GET /orders/:id

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Consultar um pedido com cliente, itens e produto de cada item. Este é o cenário
de leitura de múltiplos relacionamentos (`N:1` e `1:N`).

```http
GET /orders/:id
```

## 2. Entrada

`id` é um BIGINT positivo e segue as regras de validação da SPEC-001.

## 3. Resposta de sucesso

```json
{
  "id": 501,
  "status": "PAID",
  "createdAt": "2025-03-10T14:00:00.000Z",
  "updatedAt": "2025-03-10T14:05:00.000Z",
  "customer": {
    "id": 20,
    "name": "Ada Lovelace",
    "email": "ada@example.com"
  },
  "items": [
    {
      "id": 900,
      "quantity": 2,
      "unitPrice": "149.90",
      "product": {
        "id": 100,
        "name": "Wireless Mouse"
      }
    }
  ]
}
```

Itens são ordenados por `order_items.id ASC`. `unitPrice` preserva o valor
histórico gravado no pedido e não é recalculado a partir de `products.price`.

## 4. Erros

- ID inválido: `400`, `{ "error": "INVALID_ORDER_ID" }`;
- pedido inexistente: `404`, `{ "error": "ORDER_NOT_FOUND" }`;
- erro inesperado: resposta padrão `500`.

## 5. SQL de referência

Deve ser feita uma consulta parametrizada com joins entre `orders`,
`customers`, `order_items` e `products`. O repository retorna linhas planas e
o mapper agrupa os itens sem executar novas consultas.

```sql
SELECT o.id AS order_id, o.status, o.created_at, o.updated_at,
       c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
       oi.id AS item_id, oi.quantity, oi.unit_price,
       p.id AS product_id, p.name AS product_name
FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.id = $1
ORDER BY oi.id ASC;
```

## 6. Critérios de aceitação

- [ ] executa exatamente uma consulta;
- [ ] não apresenta N+1;
- [ ] agrupa todas as linhas em um único pedido;
- [ ] preserva preço histórico como string;
- [ ] mantém a ordem determinística dos itens.

