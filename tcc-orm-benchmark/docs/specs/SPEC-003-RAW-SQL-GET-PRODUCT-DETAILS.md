# SPEC-003 — GET /products/:id/details

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Consultar um produto e sua relação `1:1` com `product_details`.

```http
GET /products/:id/details
```

## 2. Entrada

`id` segue integralmente a validação da SPEC-001: somente dígitos, maior que
zero e dentro do intervalo de `BIGINT` do PostgreSQL.

## 3. Resposta de sucesso

```http
HTTP/1.1 200 OK
```

```json
{
  "id": 100,
  "categoryId": 8,
  "name": "Wireless Mouse",
  "description": "Wireless ergonomic mouse",
  "price": "149.90",
  "stock": 35,
  "active": true,
  "createdAt": "2025-03-10T14:00:00.000Z",
  "updatedAt": "2025-03-10T14:00:00.000Z",
  "details": {
    "weightKg": "0.120",
    "widthCm": "6.20",
    "heightCm": "3.90",
    "depthCm": "10.50",
    "manufacturer": "Example",
    "warrantyMonths": 12
  }
}
```

Campos `NUMERIC` são strings. Como a FK não obriga a existência de detalhes,
um produto sem a linha relacionada retorna `"details": null`.

## 4. Erros

- ID inválido: `400`, `{ "error": "INVALID_PRODUCT_ID" }`;
- produto inexistente: `404`, `{ "error": "PRODUCT_NOT_FOUND" }`;
- falha inesperada: `500`, `{ "error": "INTERNAL_SERVER_ERROR" }`.

## 5. SQL de referência

Uma única consulta com `LEFT JOIN` deve distinguir produto inexistente de
produto existente sem detalhes.

```sql
SELECT p.id, p.category_id, p.name, p.description, p.price, p.stock,
       p.active, p.created_at, p.updated_at,
       pd.product_id AS detail_product_id, pd.weight_kg, pd.width_cm,
       pd.height_cm, pd.depth_cm, pd.manufacturer, pd.warranty_months
FROM products p
LEFT JOIN product_details pd ON pd.product_id = p.id
WHERE p.id = $1;
```

## 6. Critérios de aceitação

- [ ] mantém a arquitetura modular da SPEC-001;
- [ ] executa exatamente uma consulta parametrizada;
- [ ] retorna o produto mesmo quando `details` não existe;
- [ ] não consulta categorias, clientes ou pedidos;
- [ ] serializa decimais como strings e datas em ISO 8601.

