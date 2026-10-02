# SPEC-008 — PATCH /products/:id/stock

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Atualizar o estoque absoluto de um produto e retornar o produto atualizado.

```http
PATCH /products/:id/stock
Content-Type: application/json
```

## 2. Entrada

O path parameter `id` segue a SPEC-001. O corpo deve ser:

```json
{ "stock": 40 }
```

`stock` é obrigatório, deve ser inteiro entre `0` e `2.147.483.647`, e não
aceita coerção de strings ou decimais.

## 3. Resposta de sucesso

```http
HTTP/1.1 200 OK
```

O corpo é um `ProductResponse` da SPEC-001, com `stock` atualizado e
`updatedAt` definido pelo banco no momento da alteração.

## 4. Erros

- ID inválido: `400`, `{ "error": "INVALID_PRODUCT_ID" }`;
- corpo inválido: `400`, `{ "error": "INVALID_STOCK" }`;
- produto inexistente: `404`, `{ "error": "PRODUCT_NOT_FOUND" }`;
- erro inesperado: resposta padrão `500`.

## 5. SQL de referência

```sql
UPDATE products
SET stock = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, category_id, name, description, price, stock, active,
          created_at, updated_at;
```

A consulta é parametrizada e atômica. Não se deve executar um `SELECT` antes
do `UPDATE`.

## 6. Critérios de aceitação

- [ ] valida ID e corpo antes de acessar o banco;
- [ ] permite estoque zero;
- [ ] executa exatamente uma consulta;
- [ ] atualiza `updated_at` no banco;
- [ ] retorna o mesmo contrato de produto da SPEC-001;
- [ ] diferencia produto inexistente de payload inválido.

