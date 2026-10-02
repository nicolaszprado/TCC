# SPEC-002 — GET /products com filtros e paginação

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Definir a listagem paginada de produtos. A arquitetura e as regras gerais de
equivalência entre Raw SQL, TypeORM e Prisma são as mesmas da SPEC-001.

```http
GET /products
```

O cenário mede leitura de coleção, filtros opcionais, ordenação e contagem.

## 2. Query parameters

| Campo | Tipo | Padrão | Regra |
|---|---|---:|---|
| `page` | inteiro | `1` | mínimo `1` |
| `limit` | inteiro | `50` | entre `1` e `100` |
| `categoryId` | BIGINT positivo | — | mesma validação de ID da SPEC-001 |
| `minPrice` | decimal | — | maior ou igual a zero, no máximo 2 casas |
| `maxPrice` | decimal | — | maior ou igual a `minPrice`, no máximo 2 casas |
| `active` | booleano | — | somente `true` ou `false` |

Parâmetros repetidos, vazios ou inválidos resultam em `400`.

## 3. Ordenação e paginação

A ordenação é sempre `id ASC`. A paginação usa `LIMIT` e `OFFSET`:

```text
offset = (page - 1) * limit
```

O contrato deve continuar determinístico nas três implementações.

## 4. Resposta de sucesso

```http
HTTP/1.1 200 OK
```

```json
{
  "data": [
    {
      "id": 100,
      "categoryId": 8,
      "name": "Wireless Mouse",
      "description": "Wireless ergonomic mouse",
      "price": "149.90",
      "stock": 35,
      "active": true,
      "createdAt": "2025-03-10T14:00:00.000Z",
      "updatedAt": "2025-03-10T14:00:00.000Z"
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

Uma página sem registros retorna `data: []`, mantendo `200` e os metadados.

## 5. Erros

Query string inválida:

```http
HTTP/1.1 400 Bad Request
```

```json
{ "error": "INVALID_PRODUCT_FILTERS" }
```

Erros inesperados seguem a SPEC-001 e retornam
`{ "error": "INTERNAL_SERVER_ERROR" }` com status `500`.

## 6. SQL de referência

Devem ser executadas duas consultas parametrizadas: uma contagem e uma busca.
Os filtros só são incluídos quando informados e devem ser idênticos nas duas.

```sql
SELECT COUNT(*) AS total
FROM products
WHERE ($1::BIGINT IS NULL OR category_id = $1)
  AND ($2::NUMERIC IS NULL OR price >= $2)
  AND ($3::NUMERIC IS NULL OR price <= $3)
  AND ($4::BOOLEAN IS NULL OR active = $4);

SELECT id, category_id, name, description, price, stock, active,
       created_at, updated_at
FROM products
WHERE ($1::BIGINT IS NULL OR category_id = $1)
  AND ($2::NUMERIC IS NULL OR price >= $2)
  AND ($3::NUMERIC IS NULL OR price <= $3)
  AND ($4::BOOLEAN IS NULL OR active = $4)
ORDER BY id ASC
LIMIT $5 OFFSET $6;
```

## 7. Fluxo e responsabilidades

```text
Route → Controller → Validator → Service → Repository → Mapper
```

- O validator normaliza os filtros.
- O repository executa somente SQL parametrizado.
- O mapper reutiliza o contrato de produto da SPEC-001.
- O controller produz o envelope de paginação.

## 8. Critérios de aceitação

- [ ] filtros podem ser combinados;
- [ ] valores padrão são aplicados quando a query é omitida;
- [ ] query inválida retorna `400` sem acessar o banco;
- [ ] a ordem é estável por `id ASC`;
- [ ] são executadas exatamente duas consultas para uma requisição válida;
- [ ] apenas `products` é consultada;
- [ ] todos os valores recebidos são parametrizados.

