Quero que você faça uma auditoria e padronização pré-benchmark das três implementações da minha API:

- Raw SQL com `pg`
- TypeORM
- Prisma

Contexto:
Este projeto faz parte de um TCC que compara desempenho, complexidade e qualidade das consultas entre SQL puro, TypeORM e Prisma em aplicações Node.js.

As três APIs já possuem os mesmos endpoints e usam:
- Node.js
- Express
- PostgreSQL
- mesma arquitetura modular:
  Route → Controller → Service → Repository
- mesmos contratos HTTP
- mesmo banco/schema/dataset

Ainda NÃO quero executar o benchmark oficial.
Primeiro quero garantir que nenhuma implementação esteja sendo favorecida ou prejudicada por diferenças artificiais de configuração ou implementação.

Seu objetivo é analisar o código das três aplicações, corrigir apenas o que for necessário para garantir equivalência metodológica e gerar um relatório final das alterações realizadas.

==================================================
1. NÃO ALTERAR O OBJETO DO EXPERIMENTO
==================================================

A comparação deve continuar sendo:

pg
vs
TypeORM
vs
Prisma

Não tente fazer as três ferramentas gerarem exatamente o mesmo SQL.

Diferenças inerentes às tecnologias devem permanecer, por exemplo:

- overhead do ORM;
- hidratação de entidades;
- quantidade de queries gerada naturalmente pela ferramenta;
- abstrações internas;
- estratégia idiomática de acesso aos relacionamentos.

Corrija apenas diferenças causadas pela implementação ou configuração que tornem a comparação injusta.

==================================================
2. DEPENDÊNCIAS
==================================================

Verifique os `package.json` e instale/corrija as dependências necessárias para que as três APIs compilem e executem.

Foi identificado que podem estar ausentes módulos como:

- typeorm
- reflect-metadata
- prisma
- @prisma/client
- @prisma/adapter-pg

Execute o typecheck das três aplicações.

Objetivo esperado:

Raw SQL:
- typecheck OK

TypeORM:
- typecheck OK

Prisma:
- typecheck OK

Não atualize bibliotecas desnecessariamente.

Mantenha versões fixadas no lockfile.

==================================================
3. POOL DE CONEXÕES
==================================================

Verifique a configuração do pool nas três APIs.

Atualmente há risco de:

Raw SQL:
- usar default de `pg`

TypeORM:
- `max: 10`

Prisma:
- limite não explicitamente garantido

Padronize o pool para:

max connections = 10

nas três aplicações, sempre que tecnicamente possível.

Também compare e padronize, se aplicável:

- connection timeout
- idle timeout
- keep alive
- parâmetros relevantes do `pg.Pool`

Como o Prisma utiliza `@prisma/adapter-pg`, prefira configurar explicitamente um `pg.Pool` equivalente ao Raw SQL e ao TypeORM.

Se algum parâmetro não puder ser tornado exatamente equivalente, NÃO invente solução.
Documente a diferença.

==================================================
4. PATCH /products/:id/stock
==================================================

Foi encontrado o seguinte viés:

Prisma:
- utiliza `new Date()` da aplicação

Raw SQL / TypeORM:
- utilizam `CURRENT_TIMESTAMP` do PostgreSQL

Padronize essa operação.

Preferência:
deixe o PostgreSQL ser responsável por `updated_at`.

A solução deve fazer com que as três aplicações tenham comportamento equivalente.

Pode ser:

- `CURRENT_TIMESTAMP` no SQL;
- trigger de banco;
- outra solução comum e centralizada.

Escolha a solução que gere menor diferença entre as três implementações.

Depois confirme:

PATCH /products/:id/stock

possui:
- mesma regra;
- mesmo número lógico de operações;
- mesmo payload;
- mesmo status HTTP;
- mesma atualização de `updated_at`.

==================================================
5. POST /orders — ITEM MAIS CRÍTICO
==================================================

Este endpoint atualmente NÃO está metodologicamente equivalente.

Foi identificado:

Prisma:
- transação `SERIALIZABLE`
- retries
- `updateMany` por item

Raw SQL / TypeORM:
- isolamento padrão
- lock pessimista
- atualização em lote

Isso altera:
- concorrência;
- número de queries;
- custo da operação;
- possibilidade de retry;
- contenção no banco.

Esse endpoint precisa ser normalizado antes do benchmark.

Escolha UMA estratégia transacional comum às três.

Preferência inicial:

SERIALIZABLE

com a mesma política de retry.

Exemplo:

- máximo de 3 tentativas;
- retry somente para erro de serialização/deadlock;
- mesma política de backoff;
- mesma regra funcional.

As três implementações devem executar semanticamente:

1. validar cliente;
2. validar produtos;
3. validar estoque;
4. criar pedido;
5. criar itens;
6. atualizar estoque;
7. commit.

Não obrigue as três a gerar exatamente o mesmo SQL.

Se Prisma naturalmente executar mais queries usando sua API idiomática, isso pode permanecer.

Mas não aceite diferenças como:

Prisma:
SERIALIZABLE + retry

Raw:
READ COMMITTED sem retry

TypeORM:
lock pessimista diferente

Isso precisa ser uniformizado.

Ao final, documente:

- nível de isolamento;
- política de retry;
- número aproximado de queries por pedido;
- estratégia de atualização de estoque;
- locks utilizados;
- diferenças inevitáveis entre as três ferramentas.

==================================================
6. ENDPOINTS COM RELACIONAMENTOS
==================================================

Analise em runtime:

GET /products/:id/details

GET /orders

GET /orders/:id

Para cada implementação:

Raw SQL
TypeORM
Prisma

registre:

- quantidade de queries;
- SQL executado;
- tabelas acessadas;
- joins;
- carregamento de relações;
- possíveis N+1;
- dados extras carregados.

IMPORTANTE:

Não marque automaticamente Prisma como "errado" se ele executar mais de uma query.

Primeiro determine se:

a) é comportamento idiomático/natural da ferramenta;

ou

b) é erro de implementação.

Considere injusto apenas quando uma aplicação realiza trabalho funcional adicional que as outras não fazem.

Exemplo injusto:

Raw SQL:
order + items + products

TypeORM:
order + items + products

Prisma:
order + items + products + categories + customer + productDetails

Mas isto pode ser aceitável:

Raw:
1 JOIN

Prisma:
2 queries

desde que o resultado lógico seja equivalente e essa seja uma estratégia natural da ferramenta.

==================================================
7. TESTE DE EQUIVALÊNCIA FUNCIONAL
==================================================

Crie ou execute testes integrados comparando as três APIs.

As três podem rodar, por exemplo:

Raw SQL:
localhost:3001

TypeORM:
localhost:3002

Prisma:
localhost:3003

Para cada endpoint, envie a mesma entrada e compare:

- status HTTP;
- JSON;
- quantidade de registros;
- paginação;
- erros;
- validação;
- ordenação.

Exemplo:

GET /products/100

Raw SQL:
200 + payload A

TypeORM:
200 + payload A

Prisma:
200 + payload A

Resultado:
PASS

Faça também casos inválidos:

- ID inexistente;
- ID inválido;
- payload incorreto;
- estoque insuficiente;
- cliente inexistente;
- produto inexistente.

Não compare campos que sejam legitimamente não determinísticos sem antes justificar.

==================================================
8. LOGGING
==================================================

Identifique e padronize:

- console logs;
- SQL logs;
- debug logs;
- ORM logging.

Para benchmark oficial, deve ser possível desligar logging detalhado.

Não deixe:

Raw SQL:
sem logs

TypeORM:
logando cada query

Prisma:
logando queries e eventos

Isso distorceria os resultados.

Crie, se necessário, configuração por ambiente:

NODE_ENV=benchmark

ou equivalente.

Nesse modo:

- logs de debug OFF;
- SQL logging OFF;
- apenas erros críticos.

==================================================
10. ARQUITETURA
==================================================

Confirme que as três seguem aproximadamente:

Route
↓
Controller
↓
Service
↓
Repository
↓
Persistência

Não precisa ser código idêntico.

Mas detecte se alguma aplicação executa trabalho adicional fora da persistência, como:

- transformações extras;
- mapeamentos duplicados;
- validações extras;
- chamadas adicionais;
- processamento em memória desnecessário.

A pergunta principal é:

"Se eu substituir apenas a camada de persistência, as três aplicações continuam fazendo essencialmente o mesmo trabalho?"

Se não, explique por quê.

==================================================
11. NÃO FAZER AINDA
==================================================

Não rode benchmark oficial com k6.

Não tire conclusão de desempenho.

Não altere os endpoints apenas para melhorar resultados.

Não otimize uma tecnologia de maneira exclusiva.

Não introduza cache.

Não altere o schema.

Não altere índices sem justificar.

Não altere o dataset.

==================================================
12. GATE PRÉ-BENCHMARK
==================================================

No final, valide este checklist:

[ ] Raw SQL compila
[ ] TypeORM compila
[ ] Prisma compila

[ ] Dependências instaladas
[ ] Lockfiles atualizados

[ ] Pool equivalente
[ ] Node equivalente
[ ] Express equivalente

[ ] Contratos HTTP equivalentes

[ ] PATCH stock normalizado

[ ] POST /orders normalizado

[ ] SQL runtime dos endpoints relacionais analisado

[ ] N+1 verificado

[ ] Logging simétrico

[ ] Testes integrados passam

[ ] Nenhum cache exclusivo

[ ] Nenhuma aplicação realiza trabalho funcional adicional injustificado

==================================================
13. FORMATO DA RESPOSTA FINAL
==================================================

Ao terminar, retorne:

# 1. Resumo

Informe se o projeto está:

- PRONTO PARA BENCHMARK

ou

- AINDA NÃO PRONTO PARA BENCHMARK

# 2. Alterações realizadas

Liste cada arquivo alterado e explique resumidamente o motivo.

# 3. Configuração final

Mostre:

Raw SQL
- pool:
- isolation:
- retry:
- logging:

TypeORM
- pool:
- isolation:
- retry:
- logging:

Prisma
- pool:
- isolation:
- retry:
- logging:

# 4. Auditoria por endpoint

Use tabela:

| Endpoint | Raw SQL | TypeORM | Prisma | Veredito |
|---|---|---|---|---|

Vereditos possíveis:

- Equivalente
- Pequeno viés aceitável
- Precisa corrigir

# 5. Diferenças legítimas restantes

Liste diferenças decorrentes naturalmente das tecnologias e que devem permanecer no benchmark.

# 6. Problemas restantes

Liste qualquer problema que ainda impeça os testes oficiais.

# 7. Gate final

Repita o checklist pré-benchmark preenchido.

==================================================
REGRA FINAL
==================================================

Priorize validade experimental.

Não tente fazer pg, TypeORM e Prisma parecerem iguais internamente.

Garanta apenas que:

mesma operação lógica
+
mesmo contrato HTTP
+
mesmo dataset
+
mesmas condições experimentais
+
mesma política de concorrência quando aplicável

sejam mantidos.

A diferença de desempenho restante será justamente o objeto do benchmark.
