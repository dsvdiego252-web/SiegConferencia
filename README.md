# SIEG Conferência Fiscal

Painel para o escritório acompanhar, por cliente e por mês, os XMLs de
entrada e saída integrados via API da SIEG: quantidade de documentos,
quebras de sequência numérica nas notas de saída, cruzamento da
tributação (ICMS/PIS/COFINS) de produtos entre entrada e saída, e
conferência dos valores lançados no Domínio contra os XMLs da SIEG (hoje
feita manualmente por uma pessoa antes do cálculo do DAS do Simples
Nacional).

## Arquitetura

```
frontend/   HTML/CSS/JS puro (sem build). Fala apenas com o backend local.
backend/    Node.js + Express: guarda a API key da SIEG, faz o proxy das
            chamadas, baixa e decodifica os XMLs, faz o parsing de NFe e
            roda as análises (sequência / tributos).
```

O front-end **não** chama a SIEG diretamente — isso exigiria expor a API
key no navegador e provavelmente esbarraria em CORS. O backend guarda a
chave em `.env` e expõe endpoints já normalizados para o front consumir.

## Como rodar

```bash
cd backend
cp .env.example .env      # edite SIEG_API_KEY se for usar dados reais
npm install
npm start                 # sobe em http://localhost:3001
```

Em outro terminal, sirva o front-end como arquivos estáticos (qualquer
servidor HTTP simples serve):

```bash
cd frontend
python3 -m http.server 8080
```

Abra `http://localhost:8080`. No campo "Backend" já vem preenchido
`http://localhost:3001` — ajuste se o backend estiver em outra porta/host.

### Modo mock (padrão)

Com `MOCK_MODE=true` (valor padrão do `.env.example`) o backend **não**
chama a SIEG — ele usa os XMLs de exemplo em
`backend/src/data/fixtures/`. Isso já demonstra o fluxo completo: um
cliente fictício (`11222333000181`) com uma quebra de sequência proposital
em julho/2026 (nota 1003 faltando) e sem quebra em agosto/2026, além de
compras e vendas dos mesmos produtos para exercitar o cruzamento
tributário. É o jeito mais rápido de ver o painel funcionando sem ter uma
chave da SIEG em mãos.

Para usar dados reais, defina `SIEG_API_KEY` (gerada em *Minha Conta >>
Integrações API SIEG*, usuário administrador) e `MOCK_MODE=false`.

## Endpoints do backend

- `GET /api/clients` — lista clientes cadastrados (`backend/src/data/clients.json`).
- `POST /api/clients` — cadastra um cliente (`{ cnpj, nome }`).
- `GET /api/xmls?cnpj=...&mes=AAAA-MM` — documentos integrados no mês, já
  classificados como `entrada`/`saida` (comparando o CNPJ do cliente com
  emitente/destinatário de cada NFe).
- `GET /api/analysis/sequence?cnpj=...&mes=AAAA-MM` — agrupa as notas de
  saída por (emitente, série) e aponta números faltantes na sequência.
- `GET /api/analysis/tax?cnpj=...&mes=AAAA-MM` — agrega, por mês e por
  produto (NCM), quanto entrou e saiu em valor de produto, ICMS, PIS e
  COFINS.

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

- **Somente NFe por enquanto.** O parser (`xmlParser.js`) lê o layout de
  NFe (`nfeProc`/`infNFe`). CTe e NFSe têm layouts próprios e ainda não
  são interpretados — a SIEG já retorna esses tipos via `XmlType`
  (`CTE=2`, `NFSE=3`, `NFCE=4`, `CFE=5`), falta escrever o parser
  equivalente para cada um se o escritório precisar deles.
- **Resposta da SIEG confirmada apenas pela documentação pública.** Validei
  o formato do endpoint (`POST /BaixarXmls?api_key=...`, paginação
  `Take`/`Skip` de até 50, array de XMLs em base64 na resposta, limite de
  30 requisições/minuto) via a base de conhecimento da SIEG, mas não testei
  contra uma chave real — vale confirmar os primeiros retornos reais
  assim que houver uma API key disponível, especialmente casos de erro e
  o comportamento de `Downloadevent`.
- **Quebra de sequência ainda não busca eventos de cancelamento à parte.**
  O parser já reconhece `cStat 101/151` (nota cancelada) quando o evento
  vem embutido no XML consultado, mas não faz uma segunda chamada para
  buscar eventos de cancelamento separadamente — se a SIEG só retornar o
  cancelamento como um XML de evento à parte, isso ainda precisa ser
  encadeado.
- **Sem persistência real.** Cada requisição busca de novo na SIEG (ou nas
  fixtures). Para um volume maior de clientes/período vale cachear os XMLs
  já baixados (há uma pasta `backend/src/data/cache/` reservada para isso)
  para não estourar o limite de 30 req/min.
- **Sem autenticação no painel.** Hoje qualquer um que acesse o front-end
  consegue consultar qualquer cliente cadastrado — ok para uso interno
  local, mas precisa de login antes de expor isso na rede.
