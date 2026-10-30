# SPEC — Integração e Uso do k6 no Benchmark

## 1. Objetivo

Adicionar o **k6** ao projeto como ferramenta externa de teste de carga para comparar as três implementações da API:

- Raw SQL (`pg`)
- TypeORM
- Prisma

O k6 deverá utilizar os **mesmos scripts, parâmetros e cenários** para as três aplicações.

O k6 não deverá ser instalado como dependência interna das APIs.

---

## 2. Princípio experimental

A comparação deverá seguir:

```text
mesmo script k6
+
mesma carga
+
mesma duração
+
mesmo dataset
+
mesmo endpoint
+
mesmas condições experimentais
```

Variando apenas a implementação alvo:

```text
Raw SQL
TypeORM
Prisma
```

---

## 3. Instalação do k6

No Windows:

```powershell
winget install k6 --source winget
```

Validar instalação:

```powershell
k6 version
```

O k6 deve estar disponível globalmente no terminal.

---

## 4. Estrutura de diretórios

Criar:

```text
tests/
└── k6/
    ├── smoke/
    │   └── get-product-by-id.js
    │
    ├── load/
    │   └── get-product-by-id.js
    │
    ├── stress/
    │
    ├── results/
    │   ├── raw-sql/
    │   ├── typeorm/
    │   └── prisma/
    │
    └── README.md
```

O k6 deve ficar fora das três aplicações.

Não criar scripts diferentes para Raw SQL, TypeORM e Prisma.

---

## 5. Aplicações alvo

Configuração inicial:

```text
Raw SQL  → http://localhost:3001
TypeORM  → http://localhost:3002
Prisma   → http://localhost:3003
```

O endereço deve ser recebido por variável de ambiente:

```text
BASE_URL
```

Exemplo:

```powershell
-e BASE_URL=http://localhost:3001
```

---

## 6. Primeiro endpoint

O primeiro endpoint utilizado para validar a infraestrutura do k6 será:

```http
GET /products/:id
```

Esse endpoint será utilizado inicialmente por ser uma consulta simples por chave primária.

---

## 7. Script de Smoke Test

Arquivo:

```text
tests/k6/smoke/get-product-by-id.js
```

Implementação:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const PRODUCT_ID = __ENV.PRODUCT_ID || '100';

export const options = {
  vus: 1,
  duration: '10s',

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/products/${PRODUCT_ID}`,
    {
      tags: {
        endpoint: 'GET /products/:id',
      },
    },
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

---

## 8. Execução do Smoke Test

### Raw SQL

```powershell
k6 run `
  -e BASE_URL=http://localhost:3001 `
  -e PRODUCT_ID=100 `
  tests/k6/smoke/get-product-by-id.js
```

### TypeORM

```powershell
k6 run `
  -e BASE_URL=http://localhost:3002 `
  -e PRODUCT_ID=100 `
  tests/k6/smoke/get-product-by-id.js
```

### Prisma

```powershell
k6 run `
  -e BASE_URL=http://localhost:3003 `
  -e PRODUCT_ID=100 `
  tests/k6/smoke/get-product-by-id.js
```

---

## 9. Critério do Smoke Test

O smoke test serve apenas para validar:

- rota funcionando;
- API acessível;
- status HTTP correto;
- ausência de erros;
- script k6 funcionando;
- configuração do ambiente correta.

Não utilizar os resultados do smoke test como conclusão de desempenho.

---

## 10. Script de Load Test

Arquivo:

```text
tests/k6/load/get-product-by-id.js
```

Implementação:

```javascript
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const PRODUCT_ID = __ENV.PRODUCT_ID || '100';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/products/${PRODUCT_ID}`,
    {
      tags: {
        endpoint: 'GET /products/:id',
      },
    },
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
```

A carga deverá ser controlada pela linha de comando.

---

## 11. Cenários iniciais de carga

Executar inicialmente:

```text
10 VUs
50 VUs
100 VUs
```

Exemplo com 10 VUs:

```powershell
k6 run `
  --vus 10 `
  --duration 1m `
  -e BASE_URL=http://localhost:3001 `
  -e PRODUCT_ID=100 `
  tests/k6/load/get-product-by-id.js
```

Exemplo com 50 VUs:

```powershell
k6 run `
  --vus 50 `
  --duration 1m `
  -e BASE_URL=http://localhost:3001 `
  -e PRODUCT_ID=100 `
  tests/k6/load/get-product-by-id.js
```

Exemplo com 100 VUs:

```powershell
k6 run `
  --vus 100 `
  --duration 1m `
  -e BASE_URL=http://localhost:3001 `
  -e PRODUCT_ID=100 `
  tests/k6/load/get-product-by-id.js
```

Os mesmos comandos deverão ser executados para TypeORM e Prisma, alterando somente `BASE_URL`.

---

## 12. Métricas obrigatórias

As métricas principais a serem observadas serão:

```text
throughput
p50
p95
p99
error rate
```

No k6:

```text
http_reqs
http_req_duration
http_req_failed
```

Para exibir os percentis desejados:

```powershell
--summary-trend-stats="avg,med,p(95),p(99),min,max"
```

Observação:

```text
med = p50
```

---

## 13. IDs utilizados nas requisições

Para o smoke test pode ser utilizado um ID fixo.

Exemplo:

```text
PRODUCT_ID=100
```

Para os benchmarks oficiais, evitar consultar sempre o mesmo produto.

O script deverá suportar:

```text
MIN_PRODUCT_ID
MAX_PRODUCT_ID
```

Exemplo:

```javascript
const MIN_PRODUCT_ID = Number(__ENV.MIN_PRODUCT_ID || 1);
const MAX_PRODUCT_ID = Number(__ENV.MAX_PRODUCT_ID || 100000);

const productId =
  Math.floor(
    Math.random() *
      (MAX_PRODUCT_ID - MIN_PRODUCT_ID + 1),
  ) + MIN_PRODUCT_ID;
```

Só utilizar essa estratégia quando for garantido que os IDs dentro do intervalo existem no dataset.

---

## 14. Resultado dos testes

Criar estrutura:

```text
tests/k6/results/
├── raw-sql/
├── typeorm/
└── prisma/
```

Os resultados devem ser separados por:

- implementação;
- endpoint;
- quantidade de VUs;
- rodada.

Exemplo:

```text
tests/k6/results/raw-sql/get-product-by-id-50vus-run-01.json
```

---

## 15. Exportação do resumo

Exemplo:

```powershell
k6 run `
  --vus 50 `
  --duration 3m `
  --summary-trend-stats="avg,med,p(95),p(99),min,max" `
  --summary-export="tests/k6/results/raw-sql/get-product-by-id-50vus-run-01.json" `
  -e BASE_URL=http://localhost:3001 `
  -e PRODUCT_ID=100 `
  tests/k6/load/get-product-by-id.js
```

---

## 16. Repetições

Cada cenário oficial deverá ser executado mais de uma vez.

Recomendação:

```text
5 execuções por cenário
```

Exemplo:

```text
GET /products/:id
50 VUs

Raw SQL:
run-01
run-02
run-03
run-04
run-05

TypeORM:
run-01
run-02
run-03
run-04
run-05

Prisma:
run-01
run-02
run-03
run-04
run-05
```

---

## 17. Ordem das execuções

Não executar sempre:

```text
Raw SQL
TypeORM
Prisma
```

Alternar a ordem entre as rodadas.

Exemplo:

```text
Rodada 1:
Raw SQL → TypeORM → Prisma

Rodada 2:
Prisma → Raw SQL → TypeORM

Rodada 3:
TypeORM → Prisma → Raw SQL
```

Isso reduz o risco de favorecer uma implementação por efeitos de cache ou aquecimento do ambiente.

---

## 18. Warm-up

Os testes oficiais deverão considerar uma fase de aquecimento antes da coleta definitiva.

Objetivo:

- inicializar pools;
- permitir JIT do Node.js/V8;
- estabilizar conexões;
- reduzir efeito de cold start.

O warm-up não deverá ser considerado como resultado oficial.

Uma estratégia inicial poderá utilizar:

```text
1 minuto de warm-up
+
3 minutos de medição
```

Essa configuração poderá ser refinada posteriormente.

---

## 19. Stress Test

Depois da validação dos load tests, criar cenários de stress.

Objetivo:

determinar em qual ponto cada aplicação começa a apresentar:

- aumento acentuado de p95/p99;
- queda de throughput;
- erros;
- timeout;
- saturação de CPU;
- saturação do pool.

O stress test não deve ser criado antes da validação dos cenários de carga normal.

---

## 20. Logging

Durante benchmark oficial:

```text
SQL logging = OFF
debug logging = OFF
verbose logging = OFF
```

As três aplicações deverão possuir configuração equivalente.

Erros críticos podem permanecer registrados.

---

## 22. Ordem de implementação do k6

Executar nesta sequência:

```text
1. instalar k6
2. validar `k6 version`
3. criar estrutura tests/k6
4. criar smoke/get-product-by-id.js
5. testar Raw SQL
6. testar TypeORM
7. testar Prisma
8. corrigir eventuais problemas
9. criar load/get-product-by-id.js
10. validar 10 VUs
11. validar 50 VUs
12. validar 100 VUs
13. configurar exportação dos resultados
14. somente depois criar scripts dos demais endpoints
```

---

## 23. Não fazer nesta etapa

Ainda não:

- criar todos os scripts dos endpoints de uma vez;
- executar stress pesado;
- tirar conclusões de desempenho;
- comparar resultados enquanto a auditoria de equidade não estiver concluída;
- modificar código das APIs baseado em quem foi mais rápido;
- ativar otimizações exclusivas para alguma implementação.

---

## 24. Critérios de aceitação

A integração inicial do k6 será considerada concluída quando:

- [ ] `k6 version` funcionar;
- [ ] existir `tests/k6/`;
- [ ] existir script de smoke test;
- [ ] o mesmo script funcionar nas três APIs;
- [ ] Raw SQL responder sem erros;
- [ ] TypeORM responder sem erros;
- [ ] Prisma responder sem erros;
- [ ] o status HTTP for validado com `check`;
- [ ] o script receber `BASE_URL` por variável;
- [ ] o script receber `PRODUCT_ID` por variável;
- [ ] os resultados puderem ser exportados para JSON;
- [ ] os arquivos de resultado forem organizados por implementação;
- [ ] nenhuma API necessitar de um script k6 exclusivo.

---

## 25. Definição de pronto

A infraestrutura k6 estará pronta para expansão quando o seguinte fluxo estiver operacional:

```text
k6
 │
 ├── Raw SQL
 │
 ├── TypeORM
 │
 └── Prisma
```

utilizando:

```text
mesmo script
+
mesmos parâmetros
+
mesma carga
+
mesma duração
```

Após essa validação, novos endpoints poderão receber seus próprios scripts de teste mantendo a mesma metodologia.
