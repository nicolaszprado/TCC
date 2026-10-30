# Relatório preliminar — Paciente 0

**Data:** 15 de outubro de 2026  
**Objetivo:** validar a infraestrutura do k6 e obter uma primeira referência de comportamento das implementações Raw SQL, TypeORM e Prisma.

## Configuração do ensaio

- Endpoint: `GET /products/100`
- Script: `tests/k6/load/get-product-by-id.js`
- Carga: 10 VUs constantes
- Duração: 1 minuto por implementação
- Dataset atual: `small`, com 10.000 produtos
- Produto consultado: ID fixo `100`
- Critério funcional: resposta HTTP `200`
- Threshold: taxa de falhas HTTP inferior a 1%
- Ambiente: execução local; aplicação, PostgreSQL e gerador de carga na mesma máquina
- Ordem de execução: Raw SQL, Prisma e TypeORM

## Resultados

| Implementação | Requisições | Throughput | Média | Mediana | p95 | p99 | Máxima | Erros |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Raw SQL | 314.025 | 5.233 req/s | 1,86 ms | 1,66 ms | 2,59 ms | 7,49 ms | 141,84 ms | 0% |
| TypeORM | 207.287 | 3.454 req/s | 2,84 ms | 2,63 ms | 4,29 ms | 6,26 ms | 176,23 ms | 0% |
| Prisma | 97.494 | 1.624 req/s | 6,08 ms | 6,61 ms | 9,66 ms | 11,85 ms | 251,85 ms | 0% |

Todas as implementações responderam corretamente em 100% das verificações e atenderam ao threshold de falhas.

## Leitura inicial

Neste ensaio, Raw SQL apresentou o maior throughput e a menor latência média. O TypeORM ficou em posição intermediária, enquanto o Prisma apresentou o menor throughput e a maior latência. Em relação ao Raw SQL, o TypeORM processou aproximadamente 34% menos requisições por segundo e o Prisma aproximadamente 69% menos.

Esses números demonstram que a infraestrutura de teste está operacional, mas ainda não constituem evidência suficiente para uma conclusão sobre o desempenho relativo das tecnologias.

## Limitações

- Foi realizada apenas uma execução por implementação.
- O mesmo produto foi consultado continuamente, favorecendo cache quente.
- A ordem das implementações não foi alternada.
- Processos em segundo plano e condições de CPU e memória não foram controlados formalmente.
- As demais APIs podem ter permanecido abertas durante as medições.
- Não foi utilizada instrumentação adicional durante o ensaio.
- Os resultados não foram exportados para JSON pelo k6.
- Foi utilizado o dataset pequeno, e não o dataset oficial de 100.000 produtos.

## Conclusão

O “Paciente 0” cumpriu sua finalidade: confirmou que o script k6 funciona nas três APIs, que o contrato HTTP está equivalente para o endpoint testado e que não ocorreram falhas sob 10 VUs. Os valores devem ser tratados somente como referência preliminar. O experimento oficial deverá usar dataset medium, IDs variados, cinco repetições, alternância da ordem de execução e controle uniforme do ambiente.
