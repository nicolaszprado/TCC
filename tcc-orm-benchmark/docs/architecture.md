
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