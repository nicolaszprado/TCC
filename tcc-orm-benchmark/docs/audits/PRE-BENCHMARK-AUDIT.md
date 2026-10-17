# Auditoria pré-benchmark

Data: 2026-10-13

## 1. Resumo

**AINDA NÃO PRONTO PARA BENCHMARK.**

A equivalência determinável por inspeção de código foi normalizada. O projeto
compila com Node 22.12.0 e todos os testes unitários passam. O PostgreSQL
configurado não estava acessível durante a auditoria (`ECONNREFUSED` em
`127.0.0.1:5432`), portanto ainda faltam a captura SQL em runtime e a execução
dos testes integrados de equivalência.

O Node padrão do ambiente também era 18.19.1. As validações foram executadas
com um Node 22.12.0 temporário, correspondente ao `.nvmrc` e ao campo `engines`.

## 2. Alterações realizadas

| Arquivo | Motivo |
|---|---|
| `apps/shared/database-policy.ts` | Centraliza os parâmetros equivalentes dos três pools. |
| `apps/shared/transaction-policy.ts` | Centraliza isolamento, tentativas e backoff de transações. |
| `apps/shared/transaction-policy.test.ts` | Verifica a política comum de retry. |
| `apps/raw-sql/src/config/database.ts` | Aplica o pool comum e logging SQL somente quando `SQL_AUDIT=true`. |
| `apps/typeorm/src/config/database.ts` | Aplica o pool comum e mantém logging SQL condicional. |
| `apps/prisma/src/config/database.ts` | Passa um `pg.Pool` explícito e equivalente ao adapter Prisma. |
| `apps/prisma/src/server.ts` | Encerra explicitamente o pool externo no shutdown. |
| `apps/*/src/services/product.service.ts` | Gera o mesmo timestamp de aplicação para atualização de estoque. |
| `apps/*/src/repositories/product.repository.ts` | Recebe o timestamp comum e mantém uma operação de atualização. |
| `apps/*/src/repositories/order.repository.ts` | Normaliza `SERIALIZABLE`, retry, backoff, sequência e atualização condicional de estoque. |
| `apps/.env.example` | Define opções New Relic equivalentes sem incluir segredo. |
| `tests/equivalence/api-equivalence.mjs` | Compara contratos HTTP das três APIs usando casos seguros. |
| `package.json` | Adiciona testes compartilhados/integrados e torna o comando APM Raw SQL simétrico. |
| `package-lock.json` | Registra a instalação reproduzível das dependências declaradas. |
| `docs/observability/new-relic.md` | Documenta simetria do APM e separação do logging SQL diagnóstico. |

O timestamp de `PATCH /products/:id/stock` ficou sob responsabilidade da
aplicação nas três versões. Usar `CURRENT_TIMESTAMP` de forma idiomática no
Prisma exigiria uma query extra, SQL bruto exclusivo ou alteração de schema por
trigger. A opção escolhida mantém uma única operação e não descaracteriza uma
das ferramentas.

## 3. Configuração final

### Raw SQL

- pool: máximo 10; connect timeout 5 s; idle timeout 10 s; keep-alive ativo;
- isolation: `SERIALIZABLE` em `POST /orders`;
- retry: máximo 3 tentativas, apenas `40001`/`40P01`, backoff linear de 10 ms;
- locks: nenhum lock pessimista explícito; updates adquirem os locks normais do PostgreSQL;
- logging: SQL desligado; `SQL_AUDIT=true` habilita diagnóstico;
- New Relic: agente e opções comuns; nome `tcc-orm-benchmark-raw-sql`.

### TypeORM

- pool: mesmos parâmetros, enviados ao `pg.Pool` via `extra`;
- isolation: `SERIALIZABLE` em `POST /orders`;
- retry: máximo 3 tentativas, apenas `40001`/`40P01`, mesmo backoff;
- locks: nenhum lock pessimista explícito; updates adquirem os locks normais do PostgreSQL;
- logging: `false`; queries apenas com `SQL_AUDIT=true`;
- New Relic: agente e opções comuns; nome `tcc-orm-benchmark-typeorm`.

### Prisma

- pool: `pg.Pool` explícito com os mesmos parâmetros, passado ao `PrismaPg`;
- isolation: `Serializable` em `POST /orders`;
- retry: máximo 3 tentativas para `P2034`, mesmo backoff;
- locks: nenhum lock pessimista explícito; `updateMany` condicional por item;
- logging: desligado; queries apenas com `SQL_AUDIT=true`;
- New Relic: agente e opções comuns; nome `tcc-orm-benchmark-prisma`.

### POST /orders

As três versões executam a mesma sequência lógica:

1. validar cliente;
2. ler e validar produtos;
3. validar estoque;
4. criar pedido;
5. criar itens;
6. atualizar estoque condicionalmente;
7. commit.

Raw SQL e TypeORM realizam aproximadamente seis instruções funcionais, além de
`BEGIN` e `COMMIT`. Prisma mantém a operação idiomática: criação aninhada e um
`updateMany` por item. O número exato de instruções Prisma depende do adapter e
deve ser confirmado pela auditoria runtime. Essa diferença natural não deve ser
eliminada com SQL bruto exclusivo.

## 4. Auditoria por endpoint

| Endpoint | Raw SQL | TypeORM | Prisma | Veredito |
|---|---|---|---|---|
| `GET /products/:id` | 1 leitura de `products` | 1 leitura de `products` | 1 leitura de `products` | Equivalente |
| `GET /products` | count + página | count + página | count + página | Equivalente |
| `GET /products/:id/details` | `LEFT JOIN` | `LEFT JOIN` via QueryBuilder | relação selecionada explicitamente | Pequeno viés aceitável, pendente runtime |
| `PATCH /products/:id/stock` | 1 update | 1 update | 1 update | Equivalente |
| `GET /orders/:id` | joins necessários | joins necessários | relações necessárias selecionadas | Pequeno viés aceitável, pendente runtime |
| `GET /orders` | count + página com joins | count + página com joins | count + relações necessárias | Pequeno viés aceitável, pendente runtime |
| `POST /orders` | política comum | política comum | política comum, updates por item | Equivalente metodologicamente; diferença idiomática documentada |
| `GET /customers/:id/orders` | cliente + count + página | cliente + count + página | cliente + count + página | Equivalente |

Nenhuma implementação seleciona relações fora do contrato por intenção do
código. A confirmação de query count, SQL efetivo e ausência de N+1 depende da
execução com `SQL_AUDIT=true`.

## 5. Diferenças legítimas restantes

- hidratação de entidades pelo TypeORM;
- tipos `Decimal` e `BigInt` do Prisma antes do mapper HTTP;
- SQL gerado naturalmente pelos ORMs;
- estratégia de carregamento de relações do Prisma;
- criação aninhada de pedido/itens no Prisma;
- uma atualização condicional por item no Prisma, pois quantidades distintas
  não possuem uma operação ORM idiomática equivalente ao `CASE`/`UNNEST`;
- parsing e abstrações internas de cada biblioteca.

## 6. Problemas restantes

1. Iniciar PostgreSQL em `127.0.0.1:5432` com o schema e dataset experimental.
2. Usar Node 22.12.0 no ambiente real do benchmark; o Node padrão detectado era 18.19.1.
3. Iniciar as três APIs com `SQL_AUDIT=true` e registrar o SQL dos três endpoints relacionais.
4. Executar `npm run test:integration:equivalence` com as três APIs ativas.
5. Validar a conexão New Relic com uma License Key real em rodada diagnóstica separada.

Não foi executado benchmark k6 e nenhuma conclusão de desempenho foi produzida.

## 7. Gate final

- [x] Raw SQL compila
- [x] TypeORM compila
- [x] Prisma compila
- [x] Dependências instaladas
- [x] Lockfile atualizado
- [x] Pool equivalente
- [ ] Node equivalente no ambiente real
- [x] Express equivalente
- [x] Contratos HTTP equivalentes por inspeção e testes unitários
- [x] `PATCH /products/:id/stock` normalizado
- [x] `POST /orders` normalizado
- [ ] SQL runtime dos endpoints relacionais analisado
- [ ] N+1 verificado em runtime
- [x] New Relic configurado simetricamente
- [x] Logging configurado simetricamente
- [ ] Testes integrados executados com as três APIs
- [x] Nenhum cache exclusivo
- [x] Nenhum trabalho funcional adicional injustificado identificado por inspeção
