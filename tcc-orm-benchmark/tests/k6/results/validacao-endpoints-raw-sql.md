# Validação da suíte K6 — Raw SQL

Data: 16/10/2026 (America/Sao_Paulo).

Implementados oito pares de scripts smoke/load, cobrindo todos os endpoints de
sucesso. Há 13 perfis ao incluir filtros, paginação e pedidos com três itens.
Os testes unitários de configuração/contratos (8 casos) e a checagem TypeScript
das ferramentas passaram.

## Execução real

Campanha: `k6_validation_1792120182479_e98af5`.

- Raw SQL iniciada temporariamente na porta 3101.
- Banco temporário exclusivo, carregado com os CSVs do dataset small.
- Node 22.14.0, k6 2.2.0, Windows; SQL_AUDIT=false e sem instrumentação adicional.
- Smoke de leitura: 1 VU/10s. Smoke de escrita: 1 VU/1 iteração.
- Carga de validação: 10 VUs/10s por perfil, sem warm-up oficial.
- 26 execuções: 25 aprovadas e 1 reprovada.

| Endpoint / perfil | Smoke | Carga curta | Requests na carga |
|---|---|---|---:|
| GET produto por ID | Aprovado | Aprovado | 48.066 |
| GET detalhes do produto | Aprovado | Aprovado | 45.487 |
| GET pedido por ID | Aprovado | Aprovado | 38.668 |
| GET pedidos do cliente | Aprovado | Aprovado | 28.609 |
| GET produtos — baseline | Aprovado | Aprovado | 12.024 |
| GET produtos — filtered | Aprovado | Aprovado | 11.611 |
| GET produtos — paginated | Aprovado | Aprovado | 12.013 |
| GET pedidos — baseline | Aprovado | Aprovado | 8.204 |
| GET pedidos — filtered | Aprovado | Aprovado | 34.817 |
| GET pedidos — paginated | Aprovado | Aprovado | 13.787 |
| PATCH estoque | Aprovado | Aprovado | 45.567 |
| POST pedido — 1 item | Aprovado | Aprovado | 20.038 |
| POST pedido — 3 itens | Aprovado | Reprovado | 15.832 |

Nos testes aprovados, todos os checks passaram e a taxa de falhas HTTP foi zero.
O verificador pós-escrita confirmou pedidos, itens e estoques das rodadas aprovadas.

## Falha observada na API

O perfil de três itens enviou payloads válidos, com clientes existentes,
produtos ativos exclusivos por VU e estoque suficiente. Houve 15.537 sucessos
e 295 falhas HTTP (1,8633%). Os logs da API registraram código PostgreSQL `40001`
(conflitos de serialização), propagado como HTTP 500 após a política de retry
existente. A política atual usa SERIALIZABLE e até três tentativas.

Os thresholds `checks == 1` e `http_req_failed == 0` reprovaram corretamente a
execução. A verificação pós-escrita também a marcou como inválida. Contagens
finais corresponderam a 15.537 pedidos criados e 46.611 novos itens; o relatório
não apontou divergência de estoque dos pedidos confirmados.

Evidências locais:

- [Resumo do perfil reprovado](raw-sql/k6_validation_1792120182479_e98af5-26-load-create-order-three-items/summary.json).
- [Verificação pós-escrita](raw-sql/k6_validation_1792120182479_e98af5-26-load-create-order-three-items/summary-verification.json).
- [Log da API](raw-sql/k6_validation_1792120182479_e98af5/api.log).

Não foi alterado o isolamento, retry ou código das APIs para fazer o teste passar.
Esse comportamento precisa ser analisado antes de considerar a criação de pedidos
com três itens aprovada sob carga. Não é um cenário negativo deliberado.

## Limites e limpeza

Essa execução valida os scripts e expõe falhas da aplicação; não é uma campanha
oficial de desempenho. Os pilotos completos de 1 minuto com 10/50/100 VUs e as
cinco repetições oficiais ainda não foram executados nesta implementação.

Os bancos temporários e a API temporária foram encerrados/removidos. Os dados
descartados eram exclusivos da validação e podem ser recriados a partir dos CSVs.
Uma conferência posterior confirmou que as contagens e os estoques do banco
original permaneceram iguais aos registrados antes da validação.

Uma primeira tentativa encontrou erro de inicialização em objeto imutável do
SharedArray; foi corrigido antes da campanha acima. Seus artefatos ficaram
preservados com identificador `k6_validation_1792120137901_144a2f`.

JSONs e logs são ignorados pelo Git. Este relatório é versionável; faça backup
dos artefatos antes de usar os dados em análises.
