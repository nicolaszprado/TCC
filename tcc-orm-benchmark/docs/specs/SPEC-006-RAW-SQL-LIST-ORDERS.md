# SPEC-006 — GET /orders

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Listar pedidos completos com cliente, itens e produtos. O endpoint é o cenário
destinado a observar e evitar o problema N+1 em cada estratégia de persistência.

```http
GET /orders?page=1&limit=20&status=PAID&customerId=20
```

## 2. Query parameters

| Campo | Tipo | Padrão | Regra |
|---|---|---:|---|
| `page` | inteiro | `1` | mínimo `1` |
| `limit` | inteiro | `20` | entre `1` e `100` |
| `status` | enum | — | `PENDING`, `PAID`, `SHIPPED`, `DELIVERED` ou `CANCELLED` |
| `customerId` | BIGINT positivo | — | mesma regra de ID da SPEC-001 |

## 3. Resposta

```json
{
  "data": [
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
      "items": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Cada elemento de `data` usa exatamente o contrato da SPEC-005. Pedidos são
ordenados por `created_at DESC, id DESC`; itens, por `id ASC`.

## 4. Erros

Filtros inválidos retornam `400` com
`{ "error": "INVALID_ORDER_FILTERS" }`. Falhas inesperadas retornam `500`.

## 5. Estratégia de consulta

Uma requisição executa exatamente duas consultas:

1. contagem dos pedidos filtrados;
2. uma consulta que pagina primeiro os pedidos em uma CTE e então carrega, por
   joins, clientes, itens e produtos de toda a página.

```sql
WITH paginated_orders AS (
  SELECT id
  FROM orders
  WHERE ($1::VARCHAR IS NULL OR status = $1)
    AND ($2::BIGINT IS NULL OR customer_id = $2)
  ORDER BY created_at DESC, id DESC
  LIMIT $3 OFFSET $4
)
SELECT ...
FROM paginated_orders po
JOIN orders o ON o.id = po.id
JOIN customers c ON c.id = o.customer_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
ORDER BY o.created_at DESC, o.id DESC, oi.id ASC;
```

Não é permitido consultar itens separadamente para cada pedido.

## 6. Critérios de aceitação

- [ ] filtros opcionais podem ser combinados;
- [ ] pagina antes dos joins para que itens não alterem o tamanho da página;
- [ ] executa duas consultas, independentemente da quantidade de pedidos;
- [ ] payload não duplica pedidos;
- [ ] página vazia retorna `200` e `data: []`;
- [ ] todos os parâmetros são validados e parametrizados.

