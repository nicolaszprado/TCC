# SPEC — Auditoria de Equidade entre Raw SQL, TypeORM e Prisma

## Objetivo

Analisar as três implementações da API:

- Raw SQL (`pg`)
- TypeORM
- Prisma

e verificar se alguma delas está sendo favorecida ou prejudicada por diferenças de implementação que não pertencem ao objeto do benchmark.

O objetivo **não é deixar as três gerarem exatamente o mesmo SQL**, mas garantir que executem a **mesma operação lógica**, com condições experimentais equivalentes.

---

## Escopo da análise

Para cada endpoint existente nas três aplicações, comparar:

```text
Raw SQL
vs
TypeORM
vs
Prisma
```

A análise deve ser feita endpoint por endpoint.

---

## Critérios de equivalência

Verificar se as três versões possuem:

- mesmo método HTTP;
- mesma rota;
- mesmos parâmetros;
- mesmos filtros;
- mesma paginação;
- mesma ordenação;
- mesmo payload de entrada;
- mesmo payload de saída;
- mesmos status HTTP;
- mesmas regras de validação;
- mesma regra de negócio;
- mesmo banco e schema;
- mesmos índices disponíveis;
- mesma quantidade lógica de dados retornados.

---

## Acesso ao banco

Para cada endpoint, verificar:

1. Quantas consultas SQL são executadas por requisição.
2. Quais tabelas são acessadas.
3. Quais colunas são selecionadas.
4. Quais `JOINs` são realizados.
5. Se alguma implementação executa consultas extras desnecessárias.
6. Se existe N+1 em apenas uma das versões.
7. Se alguma versão carrega relações que as outras não carregam.
8. Se alguma versão usa agregações ou subqueries diferentes sem necessidade funcional.
9. Se uma implementação consulta mais dados do que precisa.
10. Se todas retornam semanticamente o mesmo resultado.

Registrar, quando possível, o SQL efetivamente executado por TypeORM e Prisma.

---

## Não considerar como favorecimento

Diferenças de desempenho inerentes à própria tecnologia **não devem ser removidas**.

Exemplos:

- overhead interno do Prisma;
- hidratação de entidades do TypeORM;
- parsing realizado pelo driver;
- SQL diferente gerado naturalmente por cada ORM;
- abstrações próprias da ferramenta.

Essas diferenças fazem parte do objeto estudado.

O agente deve apontar somente diferenças criadas pela implementação que tornem a comparação injusta.

---

## Exemplos de favorecimento indevido

### Raw SQL favorecido

```text
Raw SQL:
SELECT apenas 4 colunas

Prisma/TypeORM:
carregam todas as colunas + relações
```

Isso deve ser marcado como comparação injusta.

### ORM favorecido

```text
Prisma:
usa endpoint com paginação LIMIT 20

Raw SQL:
retorna toda a tabela
```

Também é injusto.

### N+1 artificial

```text
TypeORM:
1 query com JOIN

Prisma:
1 query principal + 100 queries adicionais

Raw SQL:
1 query com JOIN
```

O agente deve verificar se isso ocorre por característica natural/configuração idiomática da ferramenta ou por uma implementação inadequada.

Se for erro de implementação, deve ser corrigido antes do benchmark.

Se for comportamento natural da abordagem escolhida e equivalente ao modo idiomático de uso, deve ser documentado.

---

## Infraestrutura

Verificar também se as aplicações possuem configurações equivalentes de:

- versão do Node.js;
- Express;
- porta/processo isolado;
- pool de conexões;
- número máximo de conexões;
- timeouts;
- keep-alive;
- logging;
- middlewares;
- serialização JSON;
- tratamento de erros.

Nenhuma aplicação deve possuir:

- cache exclusivo;
- middleware extra pesado;
- logging adicional durante o benchmark;
- instrumentação diferente;
- configuração de pool privilegiada.

---

## Pool de conexões

Dar atenção especial ao pool.

Comparar:

```text
pg.Pool
TypeORM DataSource/Pool
Prisma connection pool
```

Verificar se os limites de conexão são equivalentes ou, quando não puderem ser configurados de forma exatamente igual, documentar claramente a diferença.

Não permitir, por exemplo:

```text
Raw SQL = 20 conexões
TypeORM = 10 conexões
Prisma = 5 conexões
```

sem justificativa metodológica.

---

## Arquitetura da aplicação

Verificar se as três versões seguem aproximadamente o mesmo fluxo:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Persistência
```

Não exigir código idêntico, mas detectar casos em que uma versão executa trabalho adicional fora da camada de persistência.

Exemplos:

- transformação pesada exclusiva;
- validações adicionais;
- múltiplos mapeamentos;
- chamadas auxiliares;
- processamento em memória que não existe nas outras versões.

---

## Critério principal

Para cada endpoint, responder:

> Se eu substituir apenas a camada de persistência, as três aplicações continuam realizando essencialmente o mesmo trabalho?

Se a resposta for **não**, explicar a diferença.

---

## Formato do relatório

Para cada endpoint, retornar:

### `METHOD /endpoint`

**Veredito:**

```text
EQUIVALENTE
```

ou

```text
PEQUENO VIÉS
```

ou

```text
COMPARAÇÃO INJUSTA
```

### Raw SQL

- número de queries:
- tabelas acessadas:
- joins:
- observações:

### TypeORM

- número de queries:
- tabelas acessadas:
- joins:
- observações:

### Prisma

- número de queries:
- tabelas acessadas:
- joins:
- observações:

### Diferenças encontradas

Descrever objetivamente as diferenças.

### Implementação favorecida

Indicar:

```text
Nenhuma
```

ou a implementação potencialmente favorecida.

### Correção recomendada

Explicar a menor alteração necessária para tornar o endpoint comparável.

---

## Resumo final

Ao terminar todos os endpoints, gerar uma tabela:

| Endpoint | Raw SQL | TypeORM | Prisma | Veredito | Favorecido |
|---|---|---|---|---|---|
| `GET /products/:id` | OK | OK | OK | Equivalente | Nenhum |
| `GET /orders/:id` | OK | Atenção | OK | Pequeno viés | Raw SQL |
| ... | ... | ... | ... | ... | ... |

Depois apresentar:

### Problemas críticos

Diferenças que precisam ser corrigidas antes dos benchmarks.

### Problemas menores

Diferenças que provavelmente não invalidam o experimento, mas devem ser documentadas.

### Diferenças legítimas

Diferenças decorrentes naturalmente de `pg`, TypeORM ou Prisma e que devem permanecer no experimento.

---

## Regra importante

Não otimizar uma implementação apenas para fazê-la empatar com outra.

O objetivo é garantir **equivalência funcional e metodológica**, não igualdade artificial de desempenho.

As implementações devem utilizar formas razoáveis e idiomáticas de cada tecnologia, mantendo:

```text
mesma operação lógica
+
mesmo contrato HTTP
+
mesmo dataset
+
mesmas condições experimentais
```

A diferença restante de desempenho será justamente o resultado a ser medido.
