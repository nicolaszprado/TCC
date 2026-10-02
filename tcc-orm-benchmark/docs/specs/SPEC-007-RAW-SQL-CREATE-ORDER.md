# SPEC-007 — POST /orders

**Projeto:** Benchmark ORM vs SQL Puro  
**Aplicação inicial:** Raw SQL (`pg`)  
**Versão:** 1.0

## 1. Objetivo

Criar um pedido, seus itens e debitar o estoque atomicamente. A operação deve
usar uma transação de banco e gravar em `order_items.unit_price` o preço do
produto no momento da compra.

```http
POST /orders
Content-Type: application/json
```

## 2. Corpo da requisição

```json
{
  "customerId": 20,
  "items": [
    { "productId": 100, "quantity": 2 },
    { "productId": 101, "quantity": 1 }
  ]
}
```

Regras:

- `customerId` e `productId` são inteiros positivos seguros em JSON e válidos
  como BIGINT;
- `items` deve conter entre 1 e 100 elementos;
- `quantity` é inteiro entre 1 e 2.147.483.647;
- um produto não pode aparecer duas vezes;
- propriedades ausentes ou tipos diferentes tornam o payload inválido.

## 3. Resposta de sucesso

```http
HTTP/1.1 201 Created
```

O corpo usa o contrato de pedido completo definido na SPEC-005. O status
inicial é sempre `PENDING`.

## 4. Erros de domínio

| Situação | Status | Corpo |
|---|---:|---|
| payload inválido | `400` | `{ "error": "INVALID_ORDER_PAYLOAD" }` |
| cliente inexistente | `404` | `{ "error": "CUSTOMER_NOT_FOUND" }` |
| produto inexistente ou inativo | `409` | `{ "error": "PRODUCT_NOT_AVAILABLE" }` |
| estoque insuficiente | `409` | `{ "error": "INSUFFICIENT_STOCK" }` |

Em qualquer falha após `BEGIN`, a transação deve executar `ROLLBACK` e não
deixar pedido, item ou alteração de estoque parcial.

## 5. Fluxo transacional

```text
BEGIN
  → verificar cliente
  → carregar e bloquear produtos com SELECT ... FOR UPDATE
  → validar existência, atividade e estoque
  → INSERT orders ... RETURNING
  → INSERT de todos os order_items
  → UPDATE de estoque de todos os produtos
  → carregar o pedido completo ainda na mesma conexão
COMMIT
```

As inserções e atualizações em lote devem evitar uma consulta por item. Os
arrays são passados como parâmetros e expandidos com `UNNEST`.

## 6. Concorrência

Os produtos devem ser bloqueados em ordem de `id` por `FOR UPDATE`, reduzindo
risco de deadlock. Estoque é validado após a aquisição dos locks. Nenhum pedido
pode produzir estoque negativo.

## 7. Critérios de aceitação

- [ ] responde `201` com o pedido completo;
- [ ] persiste preço histórico;
- [ ] reduz estoque exatamente pela quantidade de cada item;
- [ ] usa uma única conexão do pool durante toda a transação;
- [ ] usa operações em lote, não N consultas para N itens;
- [ ] sempre libera o client em `finally`;
- [ ] executa rollback em qualquer falha;
- [ ] rejeita produtos repetidos antes de acessar o banco.

