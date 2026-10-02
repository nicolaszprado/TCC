# SDD — Geração e População do Banco de Dados

**Projeto:** Benchmark ORM vs SQL Puro  
**Autor:** Nicolas Prado  
**Banco:** PostgreSQL  
**Aplicações avaliadas:** SQL puro (`pg`), TypeORM e Prisma  
**Versão:** 1.0

---

## 1. Objetivo

O módulo de geração de dados tem como objetivo criar datasets sintéticos, determinísticos e reproduzíveis para a execução dos experimentos comparativos entre SQL puro, TypeORM e Prisma.

A geração dos dados deve ser independente das três implementações avaliadas.

```text
Generator
    ↓
CSV
    ↓
PostgreSQL
    ↓
┌─────────┬─────────┬─────────┐
│   pg    │ TypeORM │ Prisma  │
└─────────┴─────────┴─────────┘
```

Isso garante que todas as aplicações sejam avaliadas utilizando:

- o mesmo banco;
- o mesmo schema;
- os mesmos registros;
- os mesmos relacionamentos;
- a mesma distribuição de dados.

---

## 2. Requisitos do módulo

O sistema de seed deverá:

1. gerar dados sintéticos;
2. permitir múltiplos tamanhos de dataset;
3. produzir os mesmos dados sempre que utilizada a mesma seed;
4. respeitar todas as foreign keys;
5. gerar arquivos CSV;
6. importar os arquivos no PostgreSQL;
7. permitir limpar e reconstruir o dataset;
8. gerar metadados da execução;
9. não depender de Prisma ou TypeORM;
10. suportar datasets com milhões de registros sem carregar tudo em memória.

---

## 3. Schema utilizado

O módulo trabalhará com seis tabelas:

```text
categories
products
product_details
customers
orders
order_items
```

Relacionamentos:

```text
categories
    1
    │
    N
products
    │
    ├──── 1:1 ─── product_details
    │
    N
order_items
    N
    │
    1
orders
    N
    │
    1
customers
```

Isso permite avaliar os relacionamentos `1:1`, `1:N` e `N:N`.

---

## 4. Estratégia de geração

A população será dividida em duas etapas.

### 4.1 Geração

Uma aplicação Node.js/TypeScript irá gerar:

```text
categories.csv
products.csv
product_details.csv
customers.csv
orders.csv
order_items.csv
```

### 4.2 Importação

Os arquivos serão carregados utilizando o mecanismo `COPY` do PostgreSQL.

Não serão executados milhões de `INSERT`s individualmente.

Fluxo:

```text
TypeScript Generator

       ↓

categories.csv
products.csv
customers.csv
...

       ↓

PostgreSQL COPY

       ↓

Banco populado
```

---

## 5. Escalas do experimento

Inicialmente serão utilizadas três escalas.

### 5.1 SMALL

Utilizada para desenvolvimento, testes funcionais e validação dos relacionamentos.

```text
categories              100
products              10.000
product_details       10.000
customers              2.000
orders                 5.000
order_items          ~20.000
```

### 5.2 MEDIUM

Primeira escala destinada aos benchmarks reais.

```text
categories               100
products              100.000
product_details       100.000
customers              20.000
orders                 50.000
order_items          ~200.000
```

### 5.3 LARGE

Dataset destinado aos testes de maior volume.

```text
categories                 100
products              1.000.000
product_details       1.000.000
customers               200.000
orders                   500.000
order_items           ~2.000.000
```

Os valores poderão ser ajustados após testes preliminares de capacidade do ambiente.

Uma vez iniciados os experimentos oficiais, os tamanhos deverão ser congelados.

---

## 6. Configuração das escalas

Arquivo sugerido:

```text
database/seed/config.ts
```

Exemplo:

```typescript
export const DATASET_CONFIG = {
    small: {
        categories: 100,
        products: 10_000,
        customers: 2_000,
        orders: 5_000,
        minItemsPerOrder: 1,
        maxItemsPerOrder: 8
    },

    medium: {
        categories: 100,
        products: 100_000,
        customers: 20_000,
        orders: 50_000,
        minItemsPerOrder: 1,
        maxItemsPerOrder: 8
    },

    large: {
        categories: 100,
        products: 1_000_000,
        customers: 200_000,
        orders: 500_000,
        minItemsPerOrder: 1,
        maxItemsPerOrder: 8
    }
} as const;
```

---

## 7. Seed determinística

O gerador deverá utilizar uma seed fixa.

Exemplo:

```typescript
const RANDOM_SEED = 12345;
```

Antes da geração:

```typescript
faker.seed(RANDOM_SEED);
```

Consequentemente:

```bash
npm run dataset:small
```

executado duas vezes deverá gerar os mesmos dados, considerando também a mesma versão das dependências.

Isso garante reprodutibilidade do experimento.

---

## 8. Geração das categorias

Categorias devem ser geradas primeiro porque os produtos dependem delas.

Exemplo:

```text
1,Electronics
2,Computers
3,Home
4,Sports
...
```

Uma quantidade fixa, como `100`, é suficiente para o benchmark.

---

## 9. Geração dos produtos

Cada produto deverá possuir:

```text
id
category_id
name
description
price
stock
active
created_at
updated_at
```

Exemplo conceitual:

```typescript
{
    id: 1250,
    categoryId: 34,
    name: "Wireless Mouse",
    description: "...",
    price: 149.90,
    stock: 74,
    active: true
}
```

Faixas sugeridas:

```text
Preço: R$ 10,00 → R$ 5.000,00
Estoque: 0 → 500
```

---

## 10. Distribuição das categorias

Evitar distribuição completamente sequencial.

Não utilizar apenas:

```text
produto 1 → categoria 1
produto 2 → categoria 2
produto 3 → categoria 3
```

Preferir distribuição pseudoaleatória reproduzível:

```typescript
const categoryId = faker.number.int({
    min: 1,
    max: categoryCount
});
```

Como o Faker utilizará uma seed fixa, a distribuição continuará reproduzível.

---

## 11. Product Details

Cada produto inicialmente possuirá um registro em `product_details`, mantendo o relacionamento:

```text
Product 1:1 ProductDetail
```

Campos:

```text
weight_kg
width_cm
height_cm
depth_cm
manufacturer
warranty_months
```

Exemplo:

```typescript
{
    productId: 1250,
    weightKg: 1.82,
    widthCm: 32.5,
    heightCm: 18.2,
    depthCm: 8.4,
    manufacturer: "Manufacturer 17",
    warrantyMonths: 24
}
```

---

## 12. Clientes

Clientes deverão possuir:

```text
id
name
email
created_at
```

Exemplo:

```typescript
{
    id: 523,
    name: "John Smith",
    email: "customer523@example.test"
}
```

Para garantir unicidade, o e-mail deverá ser baseado no ID:

```typescript
const email = `customer${id}@example.test`;
```

---

## 13. Pedidos

Cada pedido deverá apontar para um cliente válido.

Exemplo:

```typescript
{
    id: 100,
    customerId: 523,
    status: "PAID",
    createdAt: "2025-03-10T14:00:00Z"
}
```

Status disponíveis:

```text
PENDING
PAID
SHIPPED
DELIVERED
CANCELLED
```

---

## 14. Datas

As datas não devem depender de:

```typescript
new Date()
```

durante a geração.

Deverá ser utilizada uma janela fixa.

Exemplo:

```text
01/01/2024
até
31/12/2025
```

Implementação:

```typescript
faker.date.between({
    from: new Date("2024-01-01"),
    to: new Date("2025-12-31")
});
```

---

## 15. Itens de pedido

Cada pedido deverá possuir uma quantidade variável de itens.

Configuração inicial:

```text
mínimo: 1
máximo: 8
```

Exemplo:

```text
ORDER 100

product 54  × 2
product 712 × 1
product 99  × 4
```

Campos:

```text
id
order_id
product_id
quantity
unit_price
```

`unit_price` deverá representar o valor do produto no momento em que o pedido foi criado.

Não deverá ser recalculado posteriormente através de `products.price`.

---

## 16. Evitar produto duplicado dentro do mesmo pedido

Como haverá:

```sql
UNIQUE(order_id, product_id)
```

o gerador deverá garantir que um pedido não contenha o mesmo produto em mais de uma linha.

Exemplo incorreto:

```text
produto 50
produto 50
produto 50
```

Exemplo correto:

```text
produto 50
quantity = 3
```

Implementação sugerida:

```typescript
const selectedProducts = new Set<number>();

while (selectedProducts.size < itemCount) {
    selectedProducts.add(
        faker.number.int({
            min: 1,
            max: productCount
        })
    );
}
```

---

## 17. Geração através de streams

Para datasets grandes, não carregar todos os registros em memória.

Evitar:

```typescript
const products = [];

for (...) {
    products.push(...);
}
```

Preferir:

```text
gera registro
    ↓
escreve no CSV
    ↓
gera próximo
```

A escrita deverá utilizar streams.

---

## 18. Estrutura de diretórios

Estrutura sugerida:

```text
database/
│
├── migrations/
│   └── 001_schema.sql
│
├── seed/
│   ├── config.ts
│   ├── generator.ts
│   ├── random.ts
│   │
│   ├── generators/
│   │   ├── categories.generator.ts
│   │   ├── products.generator.ts
│   │   ├── product-details.generator.ts
│   │   ├── customers.generator.ts
│   │   ├── orders.generator.ts
│   │   └── order-items.generator.ts
│   │
│   └── output/
│       ├── categories.csv
│       ├── products.csv
│       ├── product_details.csv
│       ├── customers.csv
│       ├── orders.csv
│       └── order_items.csv
│
├── scripts/
│   ├── load.ts
│   └── reset.sql
│
└── metadata/
    └── dataset.json
```

---

## 19. Metadata do dataset

Depois da geração, o sistema deverá produzir:

```text
database/metadata/dataset.json
```

Exemplo:

```json
{
    "dataset": "medium",
    "seed": 12345,
    "categories": 100,
    "products": 100000,
    "productDetails": 100000,
    "customers": 20000,
    "orders": 50000,
    "orderItems": 201482,
    "dateRange": {
        "from": "2024-01-01",
        "to": "2025-12-31"
    }
}
```

---

## 20. Bibliotecas

### 20.1 Dependências principais

#### TypeScript

```bash
npm install -D typescript
```

#### tsx

```bash
npm install -D tsx
```

Permite executar TypeScript diretamente:

```bash
npx tsx database/seed/generator.ts
```

#### Faker

```bash
npm install @faker-js/faker
```

Responsável pela geração de dados sintéticos e pela seed reproduzível.

Exemplos:

```typescript
faker.person.fullName();
faker.commerce.productName();
faker.number.int();
faker.date.between();
```

#### PostgreSQL driver

```bash
npm install pg
```

#### Tipagens do PostgreSQL

```bash
npm install -D @types/pg
```

#### CSV

```bash
npm install csv-stringify
```

Permite geração de CSV usando streams.

#### PostgreSQL COPY por stream

```bash
npm install pg-copy-streams
```

Permite:

```text
CSV
 ↓
stream
 ↓
COPY FROM STDIN
 ↓
PostgreSQL
```

---

## 21. Instalação recomendada

Dependências:

```bash
npm install @faker-js/faker pg pg-copy-streams csv-stringify
```

Dependências de desenvolvimento:

```bash
npm install -D typescript tsx @types/node @types/pg
```

---

## 22. Bibliotecas opcionais

### dotenv

Caso seja desejado utilizar `.env`:

```bash
npm install dotenv
```

Exemplo:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tcc_orm_benchmark
DB_USER=postgres
DB_PASSWORD=postgres
```

### commander

Caso seja desejada uma CLI mais estruturada:

```bash
npm install commander
```

Exemplo de uso futuro:

```bash
npm run dataset -- --scale medium --seed 12345
```

Não é obrigatória na primeira versão.

---

## 23. Scripts do package.json

Sugestão:

```json
{
    "scripts": {
        "dataset:small": "tsx database/seed/generator.ts small",
        "dataset:medium": "tsx database/seed/generator.ts medium",
        "dataset:large": "tsx database/seed/generator.ts large",
        "db:load": "tsx database/scripts/load.ts",
        "db:reset": "psql -f database/scripts/reset.sql"
    }
}
```

---

## 24. Processo completo

Fluxo operacional:

```text
1. PostgreSQL iniciado

        ↓

2. executar 001_schema.sql

        ↓

3. npm run dataset:small

        ↓

4. CSVs são gerados

        ↓

5. dataset.json é criado

        ↓

6. npm run db:load

        ↓

7. arquivos são carregados com COPY

        ↓

8. validação do dataset

        ↓

9. banco disponível para benchmark
```

---

## 25. Ordem de importação

A ordem de importação deverá respeitar as foreign keys:

```text
1. categories
2. products
3. product_details
4. customers
5. orders
6. order_items
```

---

## 26. Reset do banco

Antes de repetir um experimento:

```sql
TRUNCATE TABLE
    order_items,
    orders,
    product_details,
    products,
    customers,
    categories
RESTART IDENTITY
CASCADE;
```

Depois, executar novamente o processo de carga.

---

## 27. Validação após população

Após o `COPY`, o loader deverá verificar as contagens:

```sql
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_details;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;
```

Exemplo de saída:

```text
Dataset loaded successfully

categories:       100
products:      10,000
details:       10,000
customers:      2,000
orders:         5,000
order_items:   19,842
```

---

## 28. Validação de integridade

Verificação de produtos sem categoria válida:

```sql
SELECT COUNT(*)
FROM products p
LEFT JOIN categories c
    ON c.id = p.category_id
WHERE c.id IS NULL;
```

Resultado esperado:

```text
0
```

Verificação de itens sem produto válido:

```sql
SELECT COUNT(*)
FROM order_items oi
LEFT JOIN products p
    ON p.id = oi.product_id
WHERE p.id IS NULL;
```

Resultado esperado:

```text
0
```

---

## 29. O que não medir

O tempo de geração dos CSVs não faz parte do benchmark entre ORM e SQL puro.

Também não devem fazer parte da comparação:

```text
tempo de seed
tempo do COPY
tempo de criação do schema
```

Essas etapas servem apenas para preparar o ambiente experimental.

As métricas comparativas serão coletadas apenas durante a execução das APIs.

---

## 30. Controle de versão

Devem ser versionados no Git:

```text
001_schema.sql
generator.ts
config.ts
random.ts
generators/*
load.ts
reset.sql
package.json
package-lock.json
```

Os CSVs gerados não deverão ser versionados.

Adicionar ao `.gitignore`:

```gitignore
database/seed/output/*.csv
```

Como os datasets são reproduzíveis, o código do gerador é suficiente para reconstruí-los.

---

## 31. Critérios de aceitação

O módulo estará concluído quando:

- `npm run dataset:small` gerar todos os arquivos;
- executar novamente com a mesma seed produzir o mesmo dataset;
- `npm run db:load` carregar todos os arquivos;
- nenhuma foreign key for violada;
- nenhum `(order_id, product_id)` estiver duplicado;
- todos os clientes tiverem e-mails únicos;
- as contagens corresponderem ao `dataset.json`;
- o processo funcionar sem Prisma;
- o processo funcionar sem TypeORM;
- o dataset puder ser destruído e reconstruído automaticamente.

---

## 32. Stack final do módulo

```text
Node.js
   +
TypeScript
   +
@faker-js/faker
   +
csv-stringify
   +
pg
   +
pg-copy-streams
   ↓
PostgreSQL
```

Prisma e TypeORM não deverão ser utilizados no módulo de geração, pois fazem parte das tecnologias avaliadas no experimento.

---

## 33. Próximas etapas de implementação

Ordem sugerida:

```text
1. database/seed/config.ts
2. database/seed/random.ts
3. categories.generator.ts
4. products.generator.ts
5. product-details.generator.ts
6. customers.generator.ts
7. orders.generator.ts
8. order-items.generator.ts
9. generator.ts
10. load.ts
11. validações
```

A implementação deverá começar pelo dataset `small`. Somente após a validação completa deverão ser gerados os datasets `medium` e `large`.
