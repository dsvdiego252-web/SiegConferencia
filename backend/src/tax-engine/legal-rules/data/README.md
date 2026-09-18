# RTC Motor Modular v4.34

Pacote modular derivado do `Base_Motor_RTC_v4_34.json` e das regras reaproveitáveis enviadas.

## Objetivo

Separar dados, regras, validações e fluxos para integração em outro projeto sem manter um JSON monolítico.

## Estrutura

- `core/` — metadados, motor compartilhado, estados e status.
- `classification/` — anexos/módulos, tratamentos, precedência, base legal, regras, termos e auditoria semântica.
- `validation/` — validações externas, campos, alertas, revisão manual e validação em lote.
- `legal/` — fontes, páginas legais, controle e referência.
- `tax/` — Imposto Seletivo e contexto da operação.
- `flows/` — serviços, vendas, Simples Nacional, viabilidade híbrida e cadastro de produtos.
- `financial/` — impacto financeiro e estimativas por vendas.
- `reusable/` — configuração e regras reaproveitáveis validadas.
- `rtc_xml/` — conferência dos campos IBS/CBS/IS no XML.
- `integration/` — perfil da empresa, roteamento e saída de auditoria.

## Ordem recomendada

1. Carregar `core/meta.json`.
2. Carregar o perfil da empresa (`integration/company_profile_schema.json`).
3. Executar `integration/router.json`.
4. Para produtos, usar `classification/*`.
5. Para serviços, usar `flows/service_consultation.json`.
6. Aplicar `tax/operation_context.json` quando a operação depender do adquirente.
7. Aplicar as regras reaproveitáveis depois da auditoria automática e antes do status final, preservando o resultado original.
8. Aplicar `rtc_xml/*` para conferir os campos da Reforma no XML.
9. Gerar o resultado usando `integration/audit_output_schema.json`.

## Princípio

**Primeiro descobrir como deveria estar tributado. Depois comparar com o que veio no documento.**

## Compatibilidade

`rtc-rule-repository.js` é um loader opcional para Node.js. As regras tributárias continuam fora do código, em JSON.

## Importante

Os arquivos que representam chaves existentes no motor original foram separados sem reescrever o conteúdo.
Os módulos `integration/*` e `rtc_xml/*` foram acrescentados para a arquitetura de integração definida posteriormente.
