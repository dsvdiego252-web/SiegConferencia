# Motor de NFS-e/NBS

Conferência de notas fiscais de serviço eletrônicas (NFS-e). Escopo atual:
**só o código de serviço (NBS)** — confere se o código informado no XML
existe na Nomenclatura Brasileira de Serviços 2.0 (`fontes-sp/nbs_2_0.json`,
1237 registros, fornecida pelo usuário) e bate com a descrição oficial.
Mesmo princípio de `validarNcm.js` no motor de ICMS: só confirma
existência/descrição, nunca "adivinha" o código certo a partir da descrição
do XML.

## O que NÃO está coberto ainda

- **Alíquota de ISS**: não verificada. ISS é municipal — cada prefeitura
  tem sua própria lei (dentro dos limites de 2%-5% da LC 116/2003) definindo
  alíquota por serviço. Não há base de nenhum município carregada.
- **Exigibilidade/retenção**: não verificada (quando o ISS deve ser retido
  na fonte pelo tomador, isenções municipais, etc.) — depende da mesma
  legislação municipal ausente acima.
- **Local de incidência**: não verificado (prestador x tomador, comum em
  serviços prestados fora do município do prestador).

## Parser da XML (xmlParser.js `parseNfseXml`)

NFS-e não tem um schema nacional único — cada prefeitura pode ter o seu.
O padrão mais adotado é o ABRASF (v1/v2.04), reconhecido em
`localizarInfNfse()`. **Este parser ainda não foi validado contra nenhum
XML de NFS-e real emitido por um cliente desta contabilidade** — foi
escrito a partir da documentação pública do ABRASF. Assim que o primeiro
documento real aparecer (nos logs da Vercel ou no cache do Supabase),
conferir se os campos batem e ajustar `localizarInfNfse`/os caminhos dentro
de `parseNfseXml` conforme necessário — mesmo processo que já encontrou e
corrigiu os bugs reais do motor de ICMS (CST armazenado como número,
UF ausente, benefício do Anexo II art. 39).

Municípios que não usam ABRASF simplesmente não batem em nenhum caminho
reconhecido e o documento é ignorado (retorna `null`, mesmo padrão de falha
graciosa do `parseNfeXml` — nunca um dado inventado).

## Quando a busca traz NFS-e

`routes/painel.js` só inclui `XmlType.NFSE` na busca "Todos" quando o
cliente tem `atividade` incluindo `'servico'` no cadastro — sem isso, toda
busca de todo cliente gastaria cota extra da SIEG por um tipo de documento
que ele nunca emite. Pode ser forçado via filtro "NFS-e" na tela
independente do cadastro.
