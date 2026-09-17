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
  nome text not null
);
```

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

E configure na Vercel:

- `SUPABASE_URL` — a Project URL do projeto (Project Settings → API Keys).
- `SUPABASE_SECRET_KEY` — a **Secret key** (não a Publishable), já que os
  serviços que usam essas tabelas rodam só no backend e nenhuma delas tem
  RLS habilitado.

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

## Endpoints do backend

- `GET /api/clients` — lista clientes cadastrados (`backend/src/data/clients.json`
  em dev local, ou tabela `clientes` no Supabase em produção).
- `POST /api/clients` — cadastra um cliente (`{ cnpj, nome }`).
- `GET /api/painel?cnpj=...&mes=AAAA-MM&tipo=todos|nfe|nfce` — endpoint
  principal usado pelo front-end: busca os documentos do período (já
  classificados em `entrada`/`saida`) e monta de uma vez as quatro análises
  (documentos integrados, quebra de sequência, cruzamento tributário e
  conformidade com a Reforma Tributária). `tipo` restringe a busca a NFe ou
  NFCe (metade das requisições à SIEG); sem informar, busca os dois.
  Resposta em etapas — ver "Busca por etapas" acima:
  - `{ "status": "buscando", "progresso": "2/4" }` — reconsulte o mesmo
    endpoint (mesmos parâmetros) em alguns segundos; cada chamada avança
    mais um combo.
  - `{ "status": "erro", "erro": "..." }` — a busca falhou.
  - `{ "status": "pronto", "xmls": {...}, "sequence": {...}, "tax": {...},
    "reforma": {...} }` — resultado pronto.
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
