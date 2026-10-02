# SPEC-001 — GET /products/:id com Express e Arquitetura Modular

**Projeto:** Benchmark ORM vs SQL Puro  
**Autor:** Nicolas Prado  
**Aplicações avaliadas:** SQL puro (`pg`), TypeORM e Prisma  
**Banco de dados:** PostgreSQL  
**Framework HTTP:** Express  
**Versão da SPEC:** 1.0

---

## 1. Objetivo

Definir a implementação do endpoint:

```http
GET /products/:id
```

utilizando **Express** e uma arquitetura modular que possa ser mantida de forma equivalente nas três aplicações experimentais:

- Raw SQL com `pg`;
- TypeORM;
- Prisma.

Esta SPEC cobre apenas o endpoint `GET /products/:id`, porém também define a arquitetura-base que deverá ser reutilizada pelos endpoints futuros.

O objetivo arquitetural é manter o máximo possível da aplicação idêntico entre as três versões, alterando principalmente a camada responsável pelo acesso aos dados.

---

## 2. Princípio experimental

As três aplicações deverão utilizar:

- a mesma versão do Node.js;
- a mesma versão do Express;
- o mesmo schema PostgreSQL;
- o mesmo dataset;
- os mesmos endpoints;
- os mesmos parâmetros;
- os mesmos status HTTP;
- os mesmos payloads;
- a mesma estratégia de validação;
- a mesma estrutura arquitetural;
- a mesma instrumentação de observabilidade;
- configurações equivalentes de conexão.

A principal diferença entre as aplicações deverá estar na camada de persistência:

```text
RAW SQL
Repository
   ↓
pg


TYPEORM
Repository
   ↓
TypeORM


PRISMA
Repository
   ↓
Prisma
```

O Express não deverá variar entre as três implementações.

---

# 3. Arquitetura geral

A aplicação deverá seguir a seguinte separação:

```text
Request
   ↓
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

Responsabilidades:

```text
Route
→ definição da rota HTTP

Controller
→ entrada e saída HTTP

Service
→ regras de aplicação

Repository
→ acesso ao banco de dados

Mapper
→ conversão de modelos internos para o contrato HTTP

Validator
→ validação dos parâmetros recebidos
```

---

# 4. Estrutura de diretórios

Para a aplicação Raw SQL:

```text
apps/
└── raw-sql/
    ├── src/
    │   ├── config/
    │   │   └── database.ts
    │   │
    │   ├── controllers/
    │   │   └── product.controller.ts
    │   │
    │   ├── services/
    │   │   └── product.service.ts
    │   │
    │   ├── repositories/
    │   │   └── product.repository.ts
    │   │
    │   ├── routes/
    │   │   └── product.routes.ts
    │   │
    │   ├── validators/
    │   │   └── product.validator.ts
    │   │
    │   ├── mappers/
    │   │   └── product.mapper.ts
    │   │
    │   ├── types/
    │   │   └── product.ts
    │   │
    │   ├── middlewares/
    │   │   ├── not-found.middleware.ts
    │   │   └── error.middleware.ts
    │   │
    │   ├── app.ts
    │   └── server.ts
    │
    ├── package.json
    ├── tsconfig.json
    └── .env
```

A mesma organização deverá ser utilizada posteriormente nas aplicações:

```text
apps/typeorm/
apps/prisma/
```

---

# 5. Arquitetura futura das três aplicações

A estrutura deverá permanecer equivalente:

```text
apps/
│
├── raw-sql/
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── routes/
│       ├── validators/
│       ├── mappers/
│       ├── types/
│       ├── middlewares/
│       ├── config/
│       ├── app.ts
│       └── server.ts
│
├── typeorm/
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── routes/
│       ├── validators/
│       ├── mappers/
│       ├── types/
│       ├── middlewares/
│       ├── config/
│       ├── entities/
│       ├── app.ts
│       └── server.ts
│
└── prisma/
    └── src/
        ├── controllers/
        ├── services/
        ├── repositories/
        ├── routes/
        ├── validators/
        ├── mappers/
        ├── types/
        ├── middlewares/
        ├── config/
        ├── app.ts
        └── server.ts
```

As diferenças específicas de cada ferramenta deverão ser isoladas principalmente em:

```text
repositories/
config/
```

e, quando necessário:

```text
entities/     → TypeORM
prisma/       → Prisma
```

---

# 6. Dependências da aplicação Raw SQL

Dependências:

```bash
npm install express pg dotenv
```

Dependências de desenvolvimento:

```bash
npm install -D typescript tsx @types/node @types/express @types/pg
```

As versões utilizadas deverão ser fixadas por meio do `package-lock.json`.

As aplicações TypeORM e Prisma deverão utilizar a mesma versão do Express usada pela implementação Raw SQL.

---

# 7. Endpoint

```http
GET /products/:id
```

Exemplo:

```http
GET /products/100
```

---

# 8. Objetivo do endpoint

Recuperar um único produto através de sua chave primária.

Este endpoint representa o cenário baseline do benchmark, pois executa uma consulta simples por `PRIMARY KEY`, sem relacionamentos, agregações ou múltiplas consultas.

---

# 9. Path Parameter

| Campo | Tipo lógico | Obrigatório | Descrição |
|---|---|---:|---|
| `id` | inteiro positivo compatível com PostgreSQL `BIGINT` | Sim | Identificador do produto |

Exemplo válido:

```text
100
```

Exemplos inválidos:

```text
abc
-1
0
1.5
```

---

# 10. Contrato de sucesso

Quando o produto existir:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

Resposta:

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
  "updatedAt": "2025-03-10T14:00:00.000Z"
}
```

---

# 11. Produto inexistente

Quando o identificador for válido, mas nenhum produto existir:

```http
HTTP/1.1 404 Not Found
```

Resposta:

```json
{
  "error": "PRODUCT_NOT_FOUND"
}
```

---

# 12. Identificador inválido

Quando o identificador não for um inteiro positivo válido:

```http
HTTP/1.1 400 Bad Request
```

Resposta:

```json
{
  "error": "INVALID_PRODUCT_ID"
}
```

Exemplos:

```http
GET /products/abc
GET /products/-1
GET /products/0
GET /products/1.5
```

---

# 13. Erro interno

Erros inesperados deverão resultar em:

```http
HTTP/1.1 500 Internal Server Error
```

Resposta:

```json
{
  "error": "INTERNAL_SERVER_ERROR"
}
```

Detalhes técnicos do erro não deverão ser enviados ao cliente.

O erro poderá ser registrado nos logs da aplicação.

---

# 14. SQL de referência

A implementação Raw SQL deverá executar uma única consulta semanticamente equivalente a:

```sql
SELECT
    id,
    category_id,
    name,
    description,
    price,
    stock,
    active,
    created_at,
    updated_at
FROM products
WHERE id = $1;
```

A consulta deverá ser parametrizada.

Não será permitido concatenar diretamente o parâmetro recebido na string SQL.

Exemplo proibido:

```typescript
`SELECT * FROM products WHERE id = ${id}`
```

---

# 15. Número esperado de consultas

Para uma requisição válida:

```text
1 requisição HTTP
        ↓
1 consulta SQL
        ↓
1 resposta HTTP
```

Quantidade esperada:

```text
SQL queries = 1
```

Não deverão existir consultas adicionais para:

```text
categories
product_details
orders
order_items
customers
```

---

# 16. Responsabilidades por módulo

## 16.1 `config/database.ts`

Responsável exclusivamente pela configuração do pool PostgreSQL.

Não deverá:

- conter rotas;
- validar parâmetros;
- gerar respostas HTTP;
- conter regras de negócio.

Exemplo esperado:

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'TCC_STORE_DATABASE',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
});
```

---

## 16.2 `types/product.ts`

Responsável pelos tipos do domínio utilizados nesta implementação.

Exemplo:

```typescript
export type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ProductResponse = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

---

# 17. Validator

Arquivo:

```text
validators/product.validator.ts
```

Responsabilidade:

```text
string recebida pela URL
        ↓
validação
        ↓
ID normalizado
```

Regras:

- deve conter somente dígitos;
- deve ser maior que zero;
- deve caber em `BIGINT` PostgreSQL;
- não deve aceitar decimal;
- não deve aceitar sinal negativo.

Assinatura sugerida:

```typescript
export function parseProductId(
  value: string
): string | null
```

Exemplo:

```typescript
const MAX_BIGINT = 9_223_372_036_854_775_807n;

export function parseProductId(
  value: string,
): string | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  try {
    const id = BigInt(value);

    if (id <= 0n || id > MAX_BIGINT) {
      return null;
    }

    return id.toString();
  } catch {
    return null;
  }
}
```

---

# 18. Repository

Arquivo:

```text
repositories/product.repository.ts
```

O repository deverá ser a principal camada específica da estratégia de persistência.

Responsabilidade:

```text
ProductRepository
        ↓
PostgreSQL
```

Assinatura:

```typescript
findProductById(id: string): Promise<ProductRow | null>
```

Implementação Raw SQL:

```typescript
import { pool } from '../config/database';
import type { ProductRow } from '../types/product';

export async function findProductById(
  id: string,
): Promise<ProductRow | null> {
  const result = await pool.query<ProductRow>(
    `
      SELECT
        id,
        category_id,
        name,
        description,
        price,
        stock,
        active,
        created_at,
        updated_at
      FROM products
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}
```

O repository não deverá:

- receber `Request` ou `Response`;
- definir status HTTP;
- escrever JSON;
- validar parâmetros da URL.

---

# 19. Service

Arquivo:

```text
services/product.service.ts
```

Responsabilidade:

- coordenar a operação da aplicação;
- acessar o repository;
- concentrar futuras regras de negócio.

Para este primeiro endpoint o service será propositalmente simples.

Assinatura sugerida:

```typescript
getProductById(id: string): Promise<ProductRow | null>
```

Exemplo:

```typescript
import { findProductById }
  from '../repositories/product.repository';

export async function getProductById(
  id: string,
) {
  return findProductById(id);
}
```

Apesar de simples neste endpoint, a camada deverá ser mantida para preservar a arquitetura dos endpoints futuros.

---

# 20. Mapper

Arquivo:

```text
mappers/product.mapper.ts
```

Responsável por converter o formato retornado pelo PostgreSQL para o contrato HTTP.

Entrada:

```text
ProductRow
```

Saída:

```text
ProductResponse
```

Exemplo:

```typescript
import type {
  ProductRow,
  ProductResponse,
} from '../types/product';

export function toProductResponse(
  product: ProductRow,
): ProductResponse {
  return {
    id: Number(product.id),
    categoryId: Number(product.category_id),
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    active: product.active,
    createdAt: product.created_at.toISOString(),
    updatedAt: product.updated_at.toISOString(),
  };
}
```

---

# 21. Regra para `BIGINT`

O PostgreSQL utiliza:

```text
BIGINT
```

para os identificadores.

No dataset experimental, os IDs ficarão dentro do intervalo seguro de inteiros JavaScript.

Portanto, a resposta HTTP utilizará:

```json
{
  "id": 100,
  "categoryId": 8
}
```

ou seja:

```text
number
```

A restrição deverá permanecer documentada:

```text
IDs utilizados no benchmark não poderão exceder Number.MAX_SAFE_INTEGER.
```

O valor recebido pela URL poderá permanecer como string até a conclusão da consulta SQL.

---

# 22. Regra para `NUMERIC`

O campo:

```text
products.price
```

é armazenado como:

```sql
NUMERIC(12, 2)
```

Para evitar diferenças de serialização entre `pg`, TypeORM e Prisma, o contrato HTTP utilizará string decimal:

```json
{
  "price": "149.90"
}
```

As três aplicações deverão retornar o mesmo formato.

---

# 23. Controller

Arquivo:

```text
controllers/product.controller.ts
```

O controller será responsável por:

1. receber o parâmetro;
2. validar o ID;
3. chamar o service;
4. decidir o status HTTP;
5. retornar o payload.

Assinatura sugerida:

```typescript
getProductController(
  req: Request,
  res: Response,
  next: NextFunction
)
```

Exemplo:

```typescript
import type {
  Request,
  Response,
  NextFunction,
} from 'express';

import { getProductById }
  from '../services/product.service';

import { parseProductId }
  from '../validators/product.validator';

import { toProductResponse }
  from '../mappers/product.mapper';

export async function getProductController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseProductId(req.params.id);

    if (id === null) {
      res.status(400).json({
        error: 'INVALID_PRODUCT_ID',
      });

      return;
    }

    const product = await getProductById(id);

    if (!product) {
      res.status(404).json({
        error: 'PRODUCT_NOT_FOUND',
      });

      return;
    }

    res.status(200).json(
      toProductResponse(product),
    );
  } catch (error) {
    next(error);
  }
}
```

O controller não deverá conter SQL.

---

# 24. Route

Arquivo:

```text
routes/product.routes.ts
```

Responsabilidade:

- declarar a rota;
- associar a rota ao controller.

Exemplo:

```typescript
import { Router } from 'express';

import { getProductController }
  from '../controllers/product.controller';

export const productRouter = Router();

productRouter.get(
  '/:id',
  getProductController,
);
```

A URL final será definida pelo `app.ts`:

```text
/products/:id
```

---

# 25. Middleware 404

Arquivo:

```text
middlewares/not-found.middleware.ts
```

Rotas inexistentes deverão responder:

```http
404 Not Found
```

```json
{
  "error": "NOT_FOUND"
}
```

Exemplo:

```typescript
import type {
  Request,
  Response,
} from 'express';

export function notFoundMiddleware(
  _req: Request,
  res: Response,
): void {
  res.status(404).json({
    error: 'NOT_FOUND',
  });
}
```

---

# 26. Middleware de erro

Arquivo:

```text
middlewares/error.middleware.ts
```

Erros inesperados deverão ser centralizados nesse middleware.

Exemplo:

```typescript
import type {
  Request,
  Response,
  NextFunction,
} from 'express';

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(error);

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
  });
}
```

Esse comportamento deverá ser replicado nas três APIs.

---

# 27. `app.ts`

Responsável por configurar o Express.

Não deverá iniciar a porta do servidor.

Exemplo:

```typescript
import express from 'express';

import { productRouter }
  from './routes/product.routes';

import { notFoundMiddleware }
  from './middlewares/not-found.middleware';

import { errorMiddleware }
  from './middlewares/error.middleware';

export const app = express();

app.disable('x-powered-by');

app.use(express.json());

app.use(
  '/products',
  productRouter,
);

app.use(notFoundMiddleware);

app.use(errorMiddleware);
```

---

# 28. `server.ts`

Responsável apenas pelo bootstrap da aplicação.

Exemplo:

```typescript
import 'dotenv/config';

import { app } from './app';
import { pool } from './config/database';

const port = Number(
  process.env.PORT ?? 3001,
);

const server = app.listen(
  port,
  () => {
    console.log(
      `Raw SQL API listening on port ${port}`,
    );
  },
);

async function shutdown(): Promise<void> {
  server.close(async () => {
    await pool.end();
  });
}

process.once(
  'SIGINT',
  () => void shutdown(),
);

process.once(
  'SIGTERM',
  () => void shutdown(),
);
```

---

# 29. Fluxo completo da requisição

Para:

```http
GET /products/100
```

o fluxo deverá ser:

```text
Express
   ↓
product.routes.ts
   ↓
getProductController()
   ↓
parseProductId()
   ↓
getProductById()
   ↓
findProductById()
   ↓
pg Pool
   ↓
PostgreSQL
   ↓
ProductRow
   ↓
toProductResponse()
   ↓
HTTP 200
```

---

# 30. O que não poderá ocorrer

O endpoint não poderá:

- utilizar cache;
- carregar `category`;
- carregar `product_details`;
- executar mais de uma consulta;
- utilizar `SELECT *`;
- concatenar parâmetros no SQL;
- executar SQL dentro do controller;
- acessar `req` ou `res` dentro do repository;
- retornar formatos diferentes entre as três APIs;
- possuir lógica exclusiva apenas para melhorar uma das implementações.

---

# 31. Equivalência futura com TypeORM

Quando este mesmo endpoint for implementado com TypeORM, a arquitetura deverá continuar:

```text
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
TypeORM
```

Exemplo conceitual da única região que deverá mudar:

```typescript
repository.findOne({
  where: {
    id
  }
});
```

O controller e o contrato HTTP deverão permanecer semanticamente equivalentes à implementação Raw SQL.

---

# 32. Equivalência futura com Prisma

Quando implementado com Prisma:

```text
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Prisma
```

Exemplo conceitual:

```typescript
prisma.product.findUnique({
  where: {
    id
  }
});
```

Novamente, o contrato HTTP deverá permanecer equivalente.

---

# 33. Estratégia arquitetural para endpoints futuros

Novos recursos deverão seguir o mesmo padrão.

Exemplo:

```text
products
├── product.routes.ts
├── product.controller.ts
├── product.service.ts
├── product.repository.ts
├── product.validator.ts
└── product.mapper.ts
```

Para pedidos:

```text
orders
├── order.routes.ts
├── order.controller.ts
├── order.service.ts
├── order.repository.ts
├── order.validator.ts
└── order.mapper.ts
```

Não será necessário alterar a arquitetura conforme novos endpoints forem adicionados.

---

# 34. Endpoints futuros previstos

A arquitetura deverá suportar posteriormente:

```text
GET /products
```

Filtro e paginação.

```text
GET /products/:id/details
```

Relacionamento `1:1`.

```text
GET /customers/:id/orders
```

Relacionamento `1:N`.

```text
GET /orders/:id
```

Relacionamentos múltiplos.

```text
GET /orders
```

Cenário destinado à investigação de N+1.

```text
POST /orders
```

Operação transacional.

```text
PATCH /products/:id/stock
```

Operação de atualização.

Esses endpoints não fazem parte da implementação desta SPEC.

---

# 35. Critérios de aceitação funcionais

O endpoint será considerado concluído quando:

- [ ] utilizar Express;
- [ ] existir `product.routes.ts`;
- [ ] existir `product.controller.ts`;
- [ ] existir `product.service.ts`;
- [ ] existir `product.repository.ts`;
- [ ] existir `product.validator.ts`;
- [ ] existir `product.mapper.ts`;
- [ ] a conexão PostgreSQL estiver isolada em `config/database.ts`;
- [ ] `app.ts` não inicializar diretamente a porta;
- [ ] `server.ts` ficar responsável pelo bootstrap;
- [ ] existir middleware centralizado de erro;
- [ ] existir middleware de rota não encontrada;
- [ ] produto existente retornar `200`;
- [ ] produto inexistente retornar `404`;
- [ ] ID inválido retornar `400`;
- [ ] erro inesperado retornar `500`;
- [ ] apenas uma consulta SQL ser executada para produto existente;
- [ ] apenas a tabela `products` ser consultada;
- [ ] nenhuma relação ser carregada;
- [ ] o payload respeitar exatamente esta SPEC.

---

# 36. Casos de teste

## 36.1 Produto existente

Entrada:

```http
GET /products/100
```

Esperado:

```http
200 OK
```

---

## 36.2 Produto inexistente

Entrada:

```http
GET /products/999999999999
```

Esperado:

```http
404 Not Found
```

```json
{
  "error": "PRODUCT_NOT_FOUND"
}
```

---

## 36.3 ID textual

Entrada:

```http
GET /products/abc
```

Esperado:

```http
400 Bad Request
```

```json
{
  "error": "INVALID_PRODUCT_ID"
}
```

---

## 36.4 ID negativo

Entrada:

```http
GET /products/-1
```

Esperado:

```http
400 Bad Request
```

---

## 36.5 ID zero

Entrada:

```http
GET /products/0
```

Esperado:

```http
400 Bad Request
```

---

## 36.6 Decimal

Entrada:

```http
GET /products/1.5
```

Esperado:

```http
400 Bad Request
```

---

# 37. Restrições para o benchmark

Durante os experimentos oficiais:

- o Express deverá utilizar a mesma versão nas três APIs;
- o Node.js deverá utilizar a mesma versão;
- o dataset deverá ser idêntico;
- o banco deverá ser o mesmo;
- as configurações relevantes deverão permanecer equivalentes;
- não deverá existir cache de aplicação;
- o endpoint deverá executar a mesma operação lógica;
- as respostas deverão possuir o mesmo formato;
- a instrumentação deverá ser equivalente;
- os testes deverão utilizar o mesmo script do k6;
- nenhuma implementação poderá executar trabalho adicional propositalmente;
- nenhuma implementação poderá remover trabalho necessário apenas para melhorar seus resultados.

---

# 38. Papel experimental deste endpoint

`GET /products/:id` será o **baseline de leitura simples**.

A operação consiste essencialmente em:

```text
HTTP request
      ↓
validação simples
      ↓
consulta por primary key
      ↓
serialização
      ↓
HTTP response
```

Esse cenário permitirá estabelecer uma linha de base antes de avaliar consultas com maior complexidade.

---

# 39. Decisão arquitetural

A arquitetura definida nesta SPEC deverá ser mantida nas três aplicações.

A intenção não é avaliar:

```text
Express vs outro framework HTTP
```

nem:

```text
arquitetura A vs arquitetura B
```

O objeto de comparação deverá permanecer concentrado na estratégia de persistência:

```text
pg
vs
TypeORM
vs
Prisma
```

Por esse motivo, mudanças estruturais realizadas em uma implementação deverão ser avaliadas para verificar se também precisam ser aplicadas às demais.

---

# 40. Definição de concluído

A `SPEC-001` estará concluída quando o seguinte fluxo estiver operacional:

```text
GET /products/:id
       ↓
Express Router
       ↓
Controller
       ↓
Service
       ↓
Repository
       ↓
pg
       ↓
PostgreSQL
```

e todos os casos funcionais definidos neste documento forem atendidos.

Após a validação da implementação Raw SQL, a mesma SPEC deverá servir como contrato para as versões TypeORM e Prisma.
