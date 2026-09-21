# Motor de ICMS/CFOP/CST/PIS-COFINS (sistema atual, pré-Reforma) — São Paulo

Pipeline de conferência fiscal para SP, construído inteiramente a partir de bases oficiais
fornecidas pelo usuário (`fontes-sp/`, cada arquivo rastreável até a fonte declarada no
próprio `meta`) — nenhuma regra tributária foi inventada aqui. Mesmo princípio de todo o
motor tributário deste projeto: **primeiro descobrir como deveria estar tributado, depois
comparar com o que veio no documento** — e nunca confirmar uma divergência sem uma base real
por trás.

## Estrutura

- `fontes-sp/` — os JSONs originais, exatamente como fornecidos (dados + specs de coleta).
- `repository.js` — loader (só lê e cacheia os JSONs, sem lógica tributária).
- `pipeline/` — um módulo por estágio da conferência, cada um isolado e protegido contra
  exceção:
  - `validarNcm.js` — existência da NCM na TIPI (10.515 códigos) + situação de IPI + Ex.
  - `validarCfop.js` — existência do CFOP (619 códigos, IT 2023.002) + consistência de
    movimento (entrada/saída) e âmbito (dentro/fora do estado, quando a UF está disponível).
  - `validarPisCofins.js` — CST/alíquota de PIS/COFINS contra as tabelas SPED 4.3.10
    (monofásico/pauta) e 4.3.13 (alíquota zero), por NCM e vigência.
  - `validarAliquotaIcms.js` — alíquota de ICMS esperada (RICMS/SP arts. 52-56C: 18% interna,
    exceções por NCM dos arts. 54-A/55-A, 7%/12% interestadual por região).
  - `validarCbenef.js` — compatibilidade cBenef × CST (Tabela CST x cBenef oficial de SP,
    313 regras).
  - `verificarSt.js` — ICMS-ST (CAT 68/2019 + MVA/IVA por segmento) — ver limitação abaixo.
  - `verificarBeneficiosAnexos.js` — Anexos I (isenções) e II (reduções) do RICMS/SP — ver
    limitação abaixo.
- `conferirIcms.js` — orquestrador: roda os 7 estágios em sequência sobre cada item e
  combina o resultado num veredito só (`conferirIcmsItem`/`conferirIcmsDocumento`).

## Limitações conhecidas (documentadas, não escondidas)

1. **ICMS-ST por item**: a CAT 68/2019 chegou completa no nível de segmento (22 anexos, com
   vigência) e a base de MVA/IVA-ST por segmento também (296 regras) — mas o vínculo item a
   item (qual CEST/NCM pertence a qual item de cada anexo) nunca foi fornecido. Sem essa
   peça, `verificarSt.js` nunca confirma nem descarta ST — só sinaliza REVISAO_MANUAL quando
   o próprio XML já traz um CEST preenchido (indício de que o emissor considerou o item
   sujeito a ST). Ver `fontes-sp/cat68_sp_motor_coletor_v1.json` pro schema esperado do
   arquivo que resolveria isso (`icms_st_sp_cat68_itens.json`).

2. **Anexos I/II (isenções/reduções)**: só 13 dos 265 artigos catalogados têm o texto oficial
   validado — os outros 252 são só título de índice, nunca usados pra confirmar benefício
   (a própria fonte é explícita: "nunca confirmar isenção/redução usando apenas o título").
   Dos 13 validados, só 2 têm critério de NCM verificável automaticamente (Anexo I art. 36 —
   hortifrutigranjeiros; Anexo II art. 39 — produtos alimentícios); os demais dependem de
   condições só textuais (remetente específico, dependência externa tipo Convênio ICMS
   52/91) que este motor não confere sozinho.

3. **Alíquota de ICMS — arts. 53-A/54/55**: dependem de "o produto constar no artigo" sem
   lista de NCM na fonte fornecida — por isso uma alíquota que não bate com a regra geral
   (18% interna) vira REVISAO_MANUAL, não DIVERGENTE automático (pode ser um produto nomeado
   nesses artigos que este motor não tem como conferir).

4. **Origem da mercadoria (importado)**: o parser ainda não extrai o campo `orig` do grupo
   ICMS do XML — a alíquota interestadual de 4% (mercadoria importada com conteúdo de
   importação > 40%, art. 52 §2º) fica sempre em REVISAO_MANUAL, nunca confirmada nem
   rejeitada.

5. **FECOP (art. 56-C)**: adicional de 2% pra NCM 2203/capítulo 24 a consumidor final SP —
   não conferido ainda (depende de extrair `vFCP`/`pFCP` do grupo ICMS, que o parser não
   captura).

6. **UF de emitente/destinatário**: extraída do XML em buscas ao vivo (`xmlParser.js`), mas
   **não persistida no cache permanente** (exigiria migração de schema no Supabase, não feita
   sem pedido explícito). Documentos já cacheados antes desta mudança, ou lidos só do cache
   (painel consolidado, auditoria fiscal agregada), não têm UF — os estágios que dependem
   dela (alíquota interestadual, âmbito do CFOP) caem em REVISAO_MANUAL nesses casos.

## Onde isso aparece no sistema

- Modal de detalhe do documento (aba "Divergências"): mostra as divergências reais por item,
  cada uma já citando a fonte (tabela, artigo, fundamento legal).
- Aba "Auditoria Fiscal": contagem agregada de divergências de ICMS/CFOP/CST por cliente,
  ao lado da Validação Matemática e da Reforma Tributária.
