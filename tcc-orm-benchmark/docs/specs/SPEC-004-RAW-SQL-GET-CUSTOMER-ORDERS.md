# SPEC-004 — GET /customers/:id/orders

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Consultar a relação `1:N` entre um cliente e seus pedidos, com paginação.

```http
GET /customers/:id/orders?page=1&limit=50
```

## 2. Entrada

- `id`: BIGINT positivo, conforme a SPEC-001;
- `page`: inteiro positivo, padrão `1`;
- `limit`: inteiro entre `1` e `100`, padrão `50`.

## 3. Resposta de sucesso

```json
{
  "customer": {
    "id": 20,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "createdAt": "2025-01-10T10:00:00.000Z"
  },
  "orders": [
    {
      "id": 501,
      "customerId": 20,
      "status": "PAID",
      "createdAt": "2025-03-10T14:00:00.000Z",
      "updatedAt": "2025-03-10T14:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

Pedidos são ordenados por `created_at DESC, id DESC`. Cliente sem pedidos
retorna `orders: []` e `total: 0`.

## 4. Erros

- ID inválido: `400`, `{ "error": "INVALID_CUSTOMER_ID" }`;
- paginação inválida: `400`, `{ "error": "INVALID_PAGINATION" }`;
- cliente inexistente: `404`, `{ "error": "CUSTOMER_NOT_FOUND" }`;
- erro inesperado: resposta padrão `500`.

## 5. Consultas de referência

Uma requisição válida executa três consultas parametrizadas:

1. cliente por chave primária;
2. `COUNT(*)` de pedidos pelo cliente;
3. página de pedidos com `ORDER BY`, `LIMIT` e `OFFSET`.

Não devem ser carregados itens ou produtos neste endpoint.

## 6. Critérios de aceitação

- [ ] representa corretamente a relação `1:N`;
- [ ] cliente inexistente é diferente de cliente sem pedidos;
- [ ] paginação é determinística;
- [ ] executa três consultas para cliente existente;
- [ ] não apresenta comportamento N+1;
- [ ] segue Route → Controller → Service → Repository → Mapper.

