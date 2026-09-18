# SIEG Conferência Fiscal

Painel para o escritório acompanhar, por cliente e por mês, os XMLs de
entrada e saída (NFe e NFCe) integrados via API da SIEG: quantidade de
documentos, quebras de sequência numérica nas notas de saída, cruzamento
da tributação (ICMS/PIS/COFINS) de produtos entre entrada e saída,
conformidade dos documentos com a Reforma Tributária (IBS/CBS), e
conferência dos valores lançados no Domínio contra os XMLs da SIEG (hoje
feita manualmente por uma pessoa antes do cálculo do DAS do Simples
Nacional).

## Arquitetura

```
frontend/     HTML/CSS/JS puro (sem build).
backend/src/  Node.js + Express: guarda as credenciais da SIEG, faz o
              proxy das chamadas, baixa/descompacta os XMLs, faz o
              parsing de NFe/NFCe e roda as análises.
api/index.js  Ponto de entrada para a Vercel (reexporta o app do Express
              como função serverless).
```

O backend serve o front-end como arquivos estáticos (`express.static`) e
expõe a API — tudo pela mesma porta/domínio, tanto localmente quanto na
Vercel. O front-end nunca chama a SIEG diretamente nem guarda nenhuma
credencial.

## Como rodar localmente

```bash
cd backend
cp .env.example .env      # edite as credenciais se for usar dados reais
npm install
npm start                 # sobe tudo (front + API) em http://localhost:3001
```

Abra `http://localhost:3001` — é a mesma porta pro painel e pra API. Sem
`ADMIN_USER`/`ADMIN_PASSWORD` no `.env`, o painel fica aberto (sem login),
o que é conveniente em dev local.

### Modo mock (padrão)

Com `MOCK_MODE=true` (valor padrão do `.env.example`) o backend **não**
chama a SIEG — ele usa os XMLs de exemplo em
`backend/src/data/fixtures/`. Isso já demonstra o fluxo completo: um
cliente fictício (`11222333000181`) com uma quebra de sequência proposital
em julho/2026 (nota 1003 faltando) e sem quebra em agosto/2026, além de
compras e vendas dos mesmos produtos para exercitar o cruzamento
tributário. É o jeito mais rápido de ver o painel funcionando sem ter uma
chave da SIEG em mãos.

### Usando dados reais

A API da SIEG exige **duas credenciais diferentes usadas juntas** — isso não
está claro na documentação pública/artigos de terceiros, só na documentação
oficial em integracoes.sieg.com:

1. **`SIEG_CLIENT_ID` e `SIEG_SECRET_KEY`** — vêm do "Cadastro de sistema
   externo" (API SIEG para Clientes SIEG → Cadastro → Formulário). Depois de
   aprovado, a SIEG manda um e-mail com um link que mostra essas duas
   credenciais **uma única vez**. Guarde-as assim que aparecerem.
2. **`SIEG_API_KEY`** — a chave "de sempre", gerada em Minha Conta →
   Integrações API SIEG.

O backend usa `CLIENT_ID`/`SECRET_KEY` pra gerar um JWT (válido 24h, renovado
automaticamente) e manda esse JWT **junto com** a API Key em toda chamada.
Só a API Key sozinha (o jeito documentado publicamente) retorna
`401 - Erro ao obter dados de usuário` — foi preciso achar esse fluxo raiz
por tentativa e erro direto na doc oficial.

Com as três variáveis no `.env` e `MOCK_MODE=false`, o painel já busca dados
reais.

## Publicando na Vercel

O projeto está pronto pra rodar como um deploy único na Vercel (`api/index.js`
expõe o Express inteiro — front + API — como uma função serverless; o
`vercel.json` na raiz redireciona todas as rotas pra ela).

**Antes de publicar (ou logo depois do primeiro deploy), configure em
Project Settings → Environment Variables:**

- `SIEG_CLIENT_ID`, `SIEG_SECRET_KEY`, `SIEG_API_KEY` — as credenciais reais
  (ver seção acima).
- `MOCK_MODE=false`.
- `ADMIN_USER` e `ADMIN_PASSWORD` — **login do painel**. Sem essas duas
  variáveis, o painel fica aberto na internet para qualquer um com o link.
  A Vercel Hobby (gratuita) não tem proteção por senha nativa da
  plataforma — por isso o backend implementa a própria (HTTP Basic Auth,
  em `backend/src/app.js`).

**Também é preciso um projeto Supabase** para persistir a lista de clientes
cadastrados pelo painel — sem isso, o cadastro de cliente não sobrevive entre
deploys/invocações na Vercel (o sistema de arquivos lá é somente leitura fora
de `/tmp`). Crie um projeto em supabase.com, rode no SQL Editor:

```sql
create table clientes (
  cnpj text primary key,
  nome text not null,
  regime_tributario text
);
```

(Se a tabela já existir sem a coluna `regime_tributario`, rode `alter table
clientes add column if not exists regime_tributario text;`.) O regime
tributário (`simples_nacional`, `mei`, `lucro_presumido` ou `lucro_real`) é
editável no painel (botão "✎ Editar cliente") e define o prazo usado na
checagem da Reforma Tributária: Simples Nacional/MEI só são obrigados a
partir de 01/2027; os demais regimes (ou sem regime definido), 01/2026.

Rode também esta segunda tabela — cache/progresso do painel (ver "Busca por
etapas" abaixo):

```sql
create table painel_cache (
  cnpj text not null,
  data_inicio date not null,
  data_fim date not null,
  tipo text not null default 'todos',
  status text not null default 'buscando',
  dados jsonb,
  erro_mensagem text,
  combos_concluidos jsonb not null default '[]'::jsonb,
  docs_parciais jsonb not null default '[]'::jsonb,
  combo_parcial jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (cnpj, data_inicio, data_fim, tipo)
);
```

(Se você já criou essa tabela numa versão anterior, rode em vez disso —
não apaga nada que já existe:
```sql
alter table painel_cache
  add column if not exists combos_concluidos jsonb not null default '[]'::jsonb,
  add column if not exists docs_parciais jsonb not null default '[]'::jsonb,
  add column if not exists combo_parcial jsonb;
```
)

Rode também esta terceira tabela — controle do intervalo entre chamadas de
download à SIEG entre invocações da função (ver "Rate limit persistido"
abaixo):

```sql
create table sieg_rate_limit (
  chave text primary key,
  ultima_chamada timestamptz not null
);
```

E mais estas duas — cache permanente de documentos, pra não rebaixar da SIEG
o que já foi buscado antes (ver "Cache permanente de documentos" abaixo):

```sql
create table documentos_fiscais (
  chave text primary key,
  tipo_documento text not null,
  numero integer,
  serie integer,
  data_emissao text,
  data_emissao_dia date not null,
  natureza_operacao text,
  cancelada boolean not null default false,
  emit_cnpj text not null,
  emit_nome text,
  dest_cnpj text,
  dest_nome text,
  valor_total numeric not null default 0,
  valor_icms_total numeric not null default 0,
  valor_produtos_total numeric not null default 0,
  valor_pis_total numeric not null default 0,
  valor_cofins_total numeric not null default 0,
  itens jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);
create index if not exists documentos_fiscais_emit_idx on documentos_fiscais (emit_cnpj, data_emissao_dia);
create index if not exists documentos_fiscais_dest_idx on documentos_fiscais (dest_cnpj, data_emissao_dia);

create table sieg_sync_dias (
  cnpj_cliente text not null,
  xml_type integer not null,
  direcao text not null,
  dia date not null,
  sincronizado_em timestamptz not null default now(),
  primary key (cnpj_cliente, xml_type, direcao, dia)
);
```

E esta última — estado da sincronização noturna (ver "Sincronização noturna"
abaixo):

```sql
create table sync_noturno_estado (
  id integer primary key default 1,
  data_alvo date,
  offset_inicial integer not null default 0,
  visitados integer not null default 0,
  status text not null default 'concluido',
  iniciado_em timestamptz,
  invocacoes integer not null default 0,
  atualizado_em timestamptz not null default now(),
  constraint sync_noturno_estado_linha_unica check (id = 1)
);
```

E configure na Vercel:

- `SUPABASE_URL` — a Project URL do projeto (Project Settings → API Keys).
- `SUPABASE_SECRET_KEY` — a **Secret key** (não a Publishable), já que os
  serviços que usam essas tabelas rodam só no backend e nenhuma delas tem
  RLS habilitado.
- `CRON_SECRET` — uma string aleatória qualquer (ex.: gerada com
  `openssl rand -hex 32`). Protege o endpoint `/api/cron/sincronizar-noturno`
  — sem essa variável configurada, o endpoint fica **inacessível** (não
  "aberto"), então não esqueça de configurá-la pra sincronização noturna
  funcionar. A Vercel manda esse valor automaticamente no cabeçalho
  `Authorization` das chamadas que ela mesma agenda (Cron Jobs), então não
  precisa configurar nada além da variável de ambiente.

Depois de configurar as variáveis, faça um redeploy pra elas valerem.

### Busca por etapas (por que `/api/painel` responde "buscando")

A SIEG limita `/baixar-xmls` a **2 requisições por minuto** de verdade, e o
painel pode precisar de até 4 combos (NFe/NFCe × entrada/saída) — cada um
podendo precisar de várias páginas de até 50 documentos se o cliente tiver
volume. Na pior das hipóteses isso passa dos 60 segundos, o teto de
execução de uma função na Vercel (mesmo configurando `maxDuration: 60` em
`vercel.json`, o máximo do plano Hobby). Por isso `/api/painel` busca **aos
poucos, com pausa tanto entre combos quanto no meio da paginação de um
combo só**: antes de esperar o rate limit liberar uma próxima página,
`siegClient.js` verifica se essa espera cabe no tempo restante da
requisição atual — se não couber, para ali, guarda o que já baixou
(`combos_concluidos`/`docs_parciais`/`combo_parcial`) na tabela
`painel_cache`, e responde `{ "status": "buscando", "progresso": "2/4" }`.
O front-end reconsulta o mesmo endpoint (com o mesmo `cnpj`/`mes`/`tipo`) a
cada 2 segundos, retomando de onde parou, até sair `{ "status": "pronto",
... }`. Essa abordagem não depende de nenhum mecanismo de "rodar em segundo
plano" (como `waitUntil`) — cada requisição só faz o trabalho que cabe
dentro do próprio tempo de resposta. Resultados prontos ficam em cache por
10 minutos; depois disso, a próxima consulta recomeça a busca (por etapas
de novo) em vez de usar o dado velho. Sem
`SUPABASE_URL`/`SUPABASE_SECRET_KEY` configurados (dev local), esse cache
fica desligado e a busca volta a ser síncrona (todos os combos de uma vez)
— ok para o modo mock, que é instantâneo.

Use o filtro **"Tipo de documento"** (Todos/NFe/NFCe) pra reduzir de 4 para
2 combos quando não precisar dos dois tipos — corta o tempo total pela
metade.

### Rate limit persistido (por que a tabela `sieg_rate_limit`)

Na Vercel, cada requisição a `/api/painel` pode ser atendida por uma
instância de função diferente (ou por uma instância reiniciada depois de
ficar ociosa) — instâncias de função não compartilham memória entre si.
Um limitador de taxa guardado só na memória do processo (como o usado pra
`/contar-xmls`) não é suficiente pra `/baixar-xmls`: uma instância "nova"
não sabe que outra já fez uma chamada há poucos segundos, e pode disparar
antes da hora, estourando o limite real da SIEG (erro 429) — foi
exatamente isso que aconteceu numa busca de alto volume. Por isso a data/
hora da última chamada de download fica persistida na tabela
`sieg_rate_limit`, e toda nova chamada verifica esse valor antes de
prosseguir. Sem `SUPABASE_URL`/`SUPABASE_SECRET_KEY` (dev local), cai de
volta no limitador em memória — só existe um processo.

Mesmo assim, um 429 isolado ainda pode acontecer (rajada real, outra
integração usando a mesma API Key, etc.) — nesse caso a busca não é mais
marcada como erro permanente: o progresso já feito fica salvo e a próxima
tentativa (poll do front-end) tenta de novo sozinha, com uma pausa
transitória visível na mensagem de status.

### Cache permanente de documentos (`documentos_fiscais` / `sieg_sync_dias`)

O limite de 2 requisições/minuto da SIEG é fixo — nenhuma mudança no código
baixa mais rápido. O que dá pra evitar é rebaixar o que **já foi baixado
antes**: cada documento (por chave de acesso, nunca duplicado) fica guardado
permanentemente em `documentos_fiscais`, e `sieg_sync_dias` registra, por
cliente + tipo + direção, quais dias já foram totalmente sincronizados. Numa
busca nova, se todo o período pedido já está coberto, os documentos vêm
direto do Supabase — nenhuma chamada à SIEG.

O cancelamento de NFe/NFCe tem prazo real de 24h a partir da emissão — uma
nota emitida às 23h59 de um dia só pode ser cancelada até 23h59 do dia
seguinte. Por isso um dia só é considerado **definitivamente** sincronizado
(cache pra sempre) a partir de 2 dias depois (1 dia de folga sobre o prazo
real). "Hoje" nunca é considerado cacheado. Só isso já ajuda bastante: numa
busca de um período que vai até hoje, tudo que for de 3+ dias atrás já sai
cacheado pra sempre a partir da primeira vez que for buscado — não precisa
de nenhuma sincronização automática pra esse ganho acontecer.

Só que isso sozinho não ajuda ontem/anteontem — que é justamente onde entra
a **sincronização noturna** (ver seção abaixo): enquanto um dia ainda não é
"definitivo", ele pode ficar num cache **provisório** por até 30h contadas
da última vez que foi buscado, tempo suficiente pra cobrir o intervalo até a
próxima rodada noturna. Ou seja: se a sincronização noturna buscou "ontem"
de madrugada, consultar "ontem" durante o dia é instantâneo — o dado só
volta a ser buscado ao vivo se passar mais de 30h sem uma nova
sincronização (nesse caso o próximo uso do painel busca ao vivo de novo,
sem intervenção manual).

Sem `SUPABASE_URL`/`SUPABASE_SECRET_KEY` (dev local), esse cache fica
desligado e toda busca é ao vivo, como sempre foi. Falhas ao ler/gravar esse
cache (ex.: instabilidade pontual do Supabase) nunca derrubam uma busca — o
pior caso é simplesmente buscar ao vivo daquela vez, como se o cache não
existisse.

Limitação conhecida da primeira versão: o cache só é usado quando o
**período inteiro** pedido já está coberto — um período que mistura dias já
cacheados com dias novos ainda busca tudo ao vivo (não reaproveita a parte
que já teria cache). Isso cobre o caso mais comum na prática (reconsultar um
mês já fechado, ou um período que a sincronização noturna já deixou pronto)
sem a complexidade de calcular "buracos" dentro de um período misto.

### Sincronização noturna (`GET /api/cron/sincronizar-noturno`)

Endpoint agendado por Cron Job da Vercel (`vercel.json`, todo dia às 22h de
Brasília) que mantém "ontem" e "anteontem" pré-buscados pra todos os
clientes cadastrados, sem ninguém precisar esperar ao vivo — é o que faz o
cache provisório da seção acima valer a pena logo no dia seguinte a uma
busca, mesmo sem ninguém ter consultado aquele cliente antes.

Restrições reais que moldam como isso funciona:

- **A cota da SIEG (2 req/min) é compartilhada** entre a sincronização
  noturna e qualquer busca ao vivo de alguém usando o painel. Por isso ela
  só roda **fora do horário comercial** (22h–6h, horário de Brasília fixo —
  o Brasil não observa mais horário de verão): fora dessa janela, ela pausa
  sozinha e retoma na próxima noite de onde parou.
- **O plano Hobby da Vercel só permite Cron Jobs uma vez por dia**, e cada
  execução tem no máximo 60s — não dá pra processar todos os clientes numa
  chamada só. Por isso o endpoint **encadeia a si mesmo** (chama a própria
  URL de novo ao terminar seu pedaço de trabalho) até esgotar a janela
  noturna ou terminar todo mundo, retomando de onde parou a cada chamada
  (estado salvo em `sync_noturno_estado`).
- **Nem toda noite necessariamente dá tempo de passar por todos os
  clientes** (depende de quantos têm volume alto, como qualquer busca ao
  vivo). Pra não deixar sempre os mesmos clientes de fora numa noite
  incompleta, o ponto de partida da lista gira um pouco a cada dia — ao
  longo de várias noites, todo mundo acaba coberto de forma razoavelmente
  justa, mesmo que uma noite isolada não feche o ciclo inteiro.
- Uma falha pontual num cliente/combo específico (ex.: um 429 isolado) só
  pula aquele item e segue pros outros — não derruba a rodada inteira.

Sem `SUPABASE_URL`/`SUPABASE_SECRET_KEY`/`CRON_SECRET` configurados, o
endpoint responde `{"status":"ignorado"}` (ou fica inacessível, sem
`CRON_SECRET`) e não faz nada — nunca falha nem afeta o resto do sistema.

## Motor tributário (`backend/src/tax-engine/`)

Início de uma arquitetura maior — um motor central de auditoria fiscal com
módulos desacoplados por responsabilidade (mercadorias, serviços, Simples
Nacional, Reforma Tributária, validação matemática, central de auditoria),
substituindo aos poucos as análises soltas que existiam antes
(`reformaTributariaAnalyzer.js`, `taxAnalyzer.js`). Princípio central de
todo o motor: **primeiro determinar qual deveria ser a tributação correta,
depois comparar com o que o XML informou** — nunca o contrário, e nunca
"inventar" uma classificação fiscal (NCM, benefício, CST) sem uma fonte de
regra confiável carregada no sistema.

### Motor de Validação Matemática (`tax-engine/math-validation/`)

Primeiro módulo implementado — de propósito, o mais simples de todos: não
decide qual É a tributação correta (isso depende de tabelas fiscais
oficiais — NCM×CEST, CST×cClassTrib etc. — que ainda não estão carregadas
no sistema), só recalcula valores a partir dos próprios campos do XML
(quantidade × valor unitário, base × alíquota) e confere se a aritmética do
documento fecha. Por não depender de nenhuma regra fiscal externa, o
resultado é 100% confiável desde já.

Por item, recalcula e compara com o valor informado:
- **Produto**: quantidade × valor unitário × valor do produto.
- **ICMS / PIS / COFINS**: base de cálculo × alíquota × valor do imposto
  (só quando o item tem base e alíquota informadas — itens isentos, com
  substituição tributária etc. não têm como ser recalculados assim, e
  ficam de fora do resultado em vez de gerar falso positivo comparando
  contra zero).

No documento inteiro, também confere se a soma dos itens reconcilia com os
totais do cabeçalho (`vProd`, `vICMS`, `vPIS`, `vCOFINS`). Não reconcilia o
valor final da nota (`vNF`) — a fórmula envolve frete/seguro/desconto/IPI
em combinações que variam por documento, e fica pra quando isso for
implementado com confirmação exata do leiaute.

Classifica cada comparação em `CORRETO`, `DIVERGENCIA_ARREDONDAMENTO`
(diferença pequena, dentro da tolerância configurável) ou
`DIVERGENCIA_CALCULO`. O resultado (`validacaoMatematica`) já vem em cada
documento de `/api/painel`, com um resumo (`totalDivergenciaCalculo`) e o
card "Divergências de cálculo" no painel — clicável, como os cards da
Reforma Tributária.

**Próximos módulos planejados** (ainda não implementados): Motor de
Mercadorias e de Serviços (determinar o tratamento correto por
NCM/CFOP/descrição ou por código de serviço/NBS), Motor do Simples
Nacional, evolução do Motor da Reforma Tributária para validar o *cálculo*
do IBS/CBS (não só a presença dos campos), e a Central de Auditoria
consolidando tudo por cliente. Esses módulos dependem de tabelas fiscais
oficiais versionadas (CST×cClassTrib, NCM/CEST, listas de produtos
monofásicos etc.) que ainda precisam ser carregadas no sistema — sem elas,
o motor não deve "adivinhar" uma classificação fiscal.

## Endpoints do backend

- `GET /api/clients` — lista clientes cadastrados (`backend/src/data/clients.json`
  em dev local, ou tabela `clientes` no Supabase em produção).
- `POST /api/clients` — cadastra um cliente (`{ cnpj, nome, regimeTributario }`).
- `PATCH /api/clients/:cnpj` — atualiza nome/regime tributário de um cliente
  existente (`{ nome, regimeTributario }`).
- `GET /api/painel?cnpj=...&mes=AAAA-MM&tipo=todos|nfe|nfce` — endpoint
  principal usado pelo front-end: busca os documentos do período (já
  classificados em `entrada`/`saida`) e monta de uma vez as quatro análises
  (documentos integrados, quebra de sequência, cruzamento tributário e
  conformidade com a Reforma Tributária). `tipo` restringe a busca a NFe ou
  NFCe (metade das requisições à SIEG); sem informar, busca os dois.
  Resposta em etapas — ver "Busca por etapas" acima:
  - `{ "status": "buscando", "progresso": "2/4", "documentosNoComboAtual":
    120, "dataMaisRecenteBaixada": "2026-09-10" }` — reconsulte o mesmo
    endpoint (mesmos parâmetros) em alguns segundos; cada chamada avança
    mais um combo (ou mais uma página dentro do combo em andamento, daí os
    dois últimos campos — úteis pro front-end mostrar progresso real num
    combo de bastante volume, que pode levar minutos pra fechar "1/2").
    `dataMaisRecenteBaixada` é uma estimativa (maior `dataEmissao` já
    baixada no combo em andamento) — a SIEG não documenta a ordem de
    retorno das páginas.
  - `{ "status": "erro", "erro": "..." }` — a busca falhou.
  - `{ "status": "pronto", "xmls": {...}, "valores": {...}, "sequence":
    {...}, "tax": {...}, "reforma": {...} }` — resultado pronto. Cada item
    de `xmls.documentos` inclui `itens` (produtos/impostos completos, pro
    front-end mostrar o detalhamento sem nova chamada) e `situacao`
    (`ok`/`inconsistente`/`cancelada` — inconsistente = desde a vigência da
    Reforma Tributária mas sem os campos de IBS/CBS completos). `valores`
    traz os totais de entrada/saída (valor, ICMS, PIS+COFINS) do período.
  Passe `forcar=1` pra ignorar o cache e recomeçar a busca do zero.
- `GET /api/xmls`, `GET /api/analysis/sequence`, `GET /api/analysis/tax`,
  `GET /api/analysis/reforma-tributaria` (todos com `cnpj=...&mes=AAAA-MM`)
  — os mesmos dados de `/api/painel`, mas cada um buscando a SIEG de novo
  por conta própria, tudo de uma vez (sem cache/etapas — arrisca timeout
  com volume real). Mantidos por compatibilidade; o front-end usa só
  `/api/painel`.

Todos aceitam `inicio=AAAA-MM-DD&fim=AAAA-MM-DD` como alternativa ao atalho
`mes=`.

- `POST /api/reconciliation` (multipart) — cruza os documentos da SIEG
  (via API real, ou fixtures em modo mock) com uma planilha exportada do
  Domínio. Campos: `cnpj`, `mes` (ou `inicio`/`fim`), e o arquivo em
  `dominioFile` (`.xlsx` ou `.csv`). Aponta: notas que a SIEG já tem mas
  ainda não foram lançadas no Domínio, lançamentos no Domínio sem XML
  correspondente na SIEG, documentos com valor/ICMS divergente entre os
  dois lados, e o resumo de receita (entrada/saída) por mês nas duas
  fontes — a base para conferir antes de calcular o DAS do Simples
  Nacional.

### Conferência Domínio x SIEG (não depende da API liberada)

Essa parte do painel funciona **hoje**, mesmo com a API de download da
SIEG ainda não liberada pelo suporte: como o escritório já baixa os XMLs
manualmente (ou usa os do modo mock), basta exportar do Domínio a
planilha de notas do período (XLSX ou CSV) e enviar na seção "Conferência
Domínio x SIEG" do painel.

O importador (`backend/src/services/dominioImportService.js`) tenta
reconhecer automaticamente os cabeçalhos mais comuns (`Número`, `CNPJ
Emitente`, `Valor Total`, `Valor ICMS`, `CFOP`, `Data Emissão` etc.,
com ou sem acento) — se a planilha do Domínio usar nomes muito diferentes
disso, ele retorna um erro listando as colunas encontradas para ajustar o
cabeçalho. O pareamento entre os dois lados usa a chave de acesso quando
disponível; sem ela, cai para (número, série, operação), então evite
reaproveitar números de nota entre séries diferentes na mesma planilha.

Tem uma planilha de exemplo com divergências propositais em
`backend/src/data/fixtures/dominio-exemplo.csv` (mesmo cliente fictício
do modo mock) para testar sem precisar de uma exportação real do Domínio.

## Limitações conhecidas / próximos passos

- **NFe e NFCe suportados; CTe e NFSe ainda não.** O parser (`xmlParser.js`)
  lê o layout compartilhado por NFe/NFCe (`nfeProc`/`infNFe`, distinguidos
  pelo campo `mod`: 55=NFe, 65=NFCe). CTe e NFSe têm layouts próprios e
  ainda não são interpretados — a SIEG já retorna esses tipos via
  `TipoXml` (`CTE=2`, `NFSE=3`, `CFE=5`), falta escrever o parser
  equivalente para cada um se o escritório precisar deles.
- **Conformidade com a Reforma Tributária checa presença, não o cálculo.**
  `reformaTributariaAnalyzer.js` verifica se o grupo `IBSCBS` (CST,
  `cClassTrib`) existe e está preenchido em cada item, a partir de
  01/01/2026 — isso aponta clientes cujo emissor ainda não foi adequado,
  mas não confere se os valores de IBS/CBS calculados estão corretos (a
  própria SEFAZ já valida isso no schema na hora da emissão). A posição
  exata do campo `cBenef` no layout da Nota Técnica 2025.002 não está
  100% documentada nas fontes públicas consultadas — o parser busca esse
  campo recursivamente dentro do grupo de impostos do item para não
  depender de um caminho fixo que pode variar.
- **A API real é bem diferente da documentação pública/artigos de
  terceiros.** O endpoint que funciona de verdade é `POST
  /api/v1/baixar-xmls` (não o `/BaixarXmls` legado citado em blogs e KBs),
  autenticado com JWT (gerado a partir de `SIEG_CLIENT_ID`/`SIEG_SECRET_KEY`)
  **+** a API Key, nos headers `Authorization: Bearer` e `X-Api-Key`. O
  campo do tipo de documento se chama `TipoXml` (não `XmlType`), e a
  resposta é um **arquivo ZIP binário** com um `.xml` por documento — não
  um array de base64. O limite de intervalo de datas também é menor do que
  o documentado publicamente: **2 meses** para `/baixar-xmls` (contra 3
  meses em `/contar-xmls`), e o rate limit real é de **2 requisições por
  minuto** por API Key (bem mais restritivo que os "30/min" citados em
  outros lugares). Tudo isso já está implementado em `siegClient.js` e foi
  validado com uma conta e cliente reais.
- **Quebra de sequência ainda não busca eventos de cancelamento à parte.**
  O parser já reconhece `cStat 101/151` (nota cancelada) quando o evento
  vem embutido no XML consultado, mas não faz uma segunda chamada para
  buscar eventos de cancelamento separadamente — se a SIEG só retornar o
  cancelamento como um XML de evento à parte, isso ainda precisa ser
  encadeado.
- **Sem persistência real — e agora isso importa mais.** Cada requisição
  busca de novo na SIEG (ou nas fixtures). Com o rate limit real de
  `/baixar-xmls` sendo só 2 requisições/minuto (100 XMLs/min), buscar um mês
  inteiro de um cliente com muito volume pode demorar minutos. Vale cachear
  os XMLs já baixados (há uma pasta `backend/src/data/cache/` reservada
  para isso) tanto por performance quanto para não reconsumir a cota à toa.
- **Autenticação é só um usuário/senha compartilhado (HTTP Basic).** Protege
  contra acesso aberto na internet, mas não distingue usuários nem tem
  controle por cliente/permissão — todo mundo com a senha vê todos os
  clientes cadastrados. Suficiente para um escritório pequeno com poucas
  pessoas acessando; para mais controle, precisaria de login individual.
