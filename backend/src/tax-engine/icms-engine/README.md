# Motor de ICMS/CFOP/CST (sistema atual, pré-Reforma)

Estrutura irmã do `tax-engine/goods-engine` (Reforma Tributária/IBS-CBS), mas para o sistema
**hoje em vigor**: ICMS, CFOP e CST/CSOSN. É um domínio de regras completamente diferente da
Reforma (varia por estado, por regime tributário do emitente, por Substituição Tributária) e
**nenhuma regra tributária foi inventada aqui** — os três arquivos em `data/` estão vazios
(`[]`) até você fornecer a base real, no mesmo espírito de `legal-rules/data/` (que veio
pronta do "RTC Motor Modular v4.34" enviado por você).

Enquanto os arquivos estiverem vazios, `conferirIcmsItem`/`conferirIcmsDocumento` sempre
devolvem `status: 'SEM_BASE_CARREGADA'` — nunca inventam um CFOP/CST/alíquota "provável". Assim
que você popular os JSONs abaixo (mesmo que parcialmente — só CFOP, por exemplo), a conferência
correspondente passa a rodar de verdade, sem precisar mexer no código do motor.

## Arquivos esperados em `data/`

### `cfop_rules.json`

Determina o CFOP esperado a partir do contexto da operação (não do NCM). Cada regra:

```json
{
  "condicoes": { "tipoOperacao": "venda", "mesmoEstado": true, "consumidorFinal": false },
  "cfopEsperado": "5102",
  "descricao": "Venda de mercadoria adquirida ou recebida de terceiros, dentro do estado"
}
```

- `tipoOperacao`: `"venda"` (documento de saída) ou `"compra"` (documento de entrada) — hoje é
  tudo que o sistema classifica; devolução/transferência podem ser adicionados depois se
  precisar.
- `mesmoEstado`: `true`/`false`/omitido (`omitido` = regra vale pros dois casos). Comparação
  entre UF do emitente e UF do destinatário — **ainda não persistimos UF no cache** (ver
  "Limitação atual" abaixo), então por enquanto toda regra que depende disso cai em
  `REVISAO_MANUAL` em vez de comparar.
- `consumidorFinal`: `true`/`false`/omitido. Aproximado hoje como `true` sempre que o documento
  é NFCe (venda presencial ao consumidor); para NFe fica `null` (desconhecido) até você indicar
  outra forma de inferir.
- A primeira regra cujas condições batem "vence" — a ordem no array importa.

### `cst_icms_rules.json`

Determina o CST (Regime Normal) ou CSOSN (Simples Nacional/MEI) esperado a partir do regime
tributário do cliente e da situação da operação. Cada regra:

```json
{
  "condicoes": { "regimeTributario": "lucro_presumido", "beneficio": "nenhum" },
  "cstEsperado": "00",
  "descricao": "Tributação integral, sem benefício"
}
```

- `regimeTributario`: os mesmos valores já usados no cadastro de cliente
  (`simples_nacional`, `mei`, `lucro_presumido`, `lucro_real`) ou omitido (vale pra todos).
- `beneficio`: rótulo livre que você definir (ex.: `"nenhum"`, `"substituicao_tributaria"`,
  `"reducao_base"`, `"isencao"`) — o motor não tem hoje como inferir isso sozinho a partir do
  XML; enquanto não houver uma forma de derivar `beneficio` automaticamente, essas regras só
  disparam quando a condição não depender dele (omitida).

### `icms_aliquota_por_ncm.json`

Tabela de alíquota de ICMS por faixa de NCM e par de UF (interna x interestadual). Cada linha:

```json
{
  "ncmPrefixo": "3004",
  "ufOrigem": "SP",
  "ufDestino": "SP",
  "aliquotaInterna": 18,
  "aliquotaInterestadual": 12,
  "observacao": "Medicamentos — alíquota interna SP"
}
```

- `ncmPrefixo`: prefixo do NCM (mesma lógica de prefixo do `goods-engine` — quanto mais dígitos,
  mais específico; a primeira linha cujo prefixo bate "vence").
- `ufOrigem`/`ufDestino`: opcionais — omitir os dois faz a linha valer pra qualquer par de
  estados (útil se você só tiver a alíquota interna padrão de um estado, sem diferenciar
  origem/destino).
- `aliquotaInterna`: usada quando emitente e destinatário estão no mesmo estado.
- `aliquotaInterestadual`: usada quando estão em estados diferentes; se omitida, cai de volta
  pra `aliquotaInterna`.

## Limitação atual: UF do emitente/destinatário

O XML já traz a UF de quem emite e de quem recebe (`enderEmit`/`enderDest`), mas o parser
(`xmlParser.js`) ainda não extrai esse campo, e o cache permanente (`documentos_fiscais` no
Supabase) não tem colunas pra guardá-lo — adicionar isso é uma migração de schema (nova coluna),
que não fizemos aqui pra não alterar sua tabela em produção sem você pedir. Enquanto isso não
existir, qualquer regra de CFOP/alíquota que dependa de UF (`mesmoEstado`, `ufOrigem`/
`ufDestino`) fica em `REVISAO_MANUAL` em vez de arriscar uma comparação errada. Regras de CST
que não dependem de UF (só de regime tributário) já funcionam hoje.

## Onde isso aparece no sistema

- Modal de detalhe do documento (aba "Divergências"): mostra a comparação item a item quando a
  base já tiver dado suficiente pra aquele item.
- Aba "Auditoria Fiscal": relatório agregado (`GET /api/cron/auditoria-icms-cfop-cst`), no mesmo
  formato do relatório do motor de Validação Matemática/Reforma já existente.
