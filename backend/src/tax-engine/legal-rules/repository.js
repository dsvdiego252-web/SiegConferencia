// Loader ES module para a base de regras "RTC Motor Modular v4.34"
// (backend/src/tax-engine/legal-rules/data/), fornecida pelo usuário.
// Equivalente em espírito ao rtc-rule-repository.js original (que fica
// preservado, intacto, em data/rtc-rule-repository.js como referência) —
// aqui apenas adaptado para import/export ES module e ao layout de pastas
// já commitado neste projeto. Não contém nenhuma regra tributária: só lê
// e faz cache dos JSONs.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

const cache = new Map();

function carregar(caminhoRelativo) {
  if (cache.has(caminhoRelativo)) return cache.get(caminhoRelativo);
  const caminhoCompleto = path.join(DATA_DIR, caminhoRelativo);
  const valor = JSON.parse(readFileSync(caminhoCompleto, 'utf8'));
  cache.set(caminhoRelativo, valor);
  return valor;
}

export function getCore() {
  return {
    meta: carregar('core/meta.json'),
    sharedEngine: carregar('core/shared_engine.json'),
    stateIsolation: carregar('core/state_isolation.json'),
    statusRules: carregar('core/status_rules.json'),
  };
}

export function getClassification() {
  return {
    moduleCatalog: carregar('classification/module_catalog.json'),
    treatments: carregar('classification/treatments.json'),
    precedence: carregar('classification/precedence.json'),
    legalRows: carregar('classification/legal_rows.json'),
    ruleRows: carregar('classification/rule_rows.json'),
    termRows: carregar('classification/term_rows.json'),
    descriptionMapping: carregar('classification/description_mapping.json'),
    semanticAudit: carregar('classification/semantic_audit.json'),
    medicationClassification: carregar('classification/medication_classification.json'),
    ncm9619Semantic: carregar('classification/ncm_9619_semantic.json'),
    ncmSemanticOverrides: carregar('classification/ncm_semantic_overrides.json'),
    productSemanticValidation: carregar('classification/product_semantic_validation.json'),
  };
}

export function getValidation() {
  return {
    alerts: carregar('validation/alerts.json'),
    bulkValidation: carregar('validation/bulk_validation.json'),
    externalValidations: carregar('validation/external_validations.json'),
    generalRule: carregar('validation/general_rule.json'),
    inputFields: carregar('validation/input_fields.json'),
    manualValidation: carregar('validation/manual_validation.json'),
    validationConditions: carregar('validation/validation_conditions.json'),
    validationModal: carregar('validation/validation_modal_v2.json'),
  };
}

export function getLegal() {
  return {
    control: carregar('legal/control.json'),
    officialReference: carregar('legal/official_reference.json'),
    pageMap: carregar('legal/page_map.json'),
    referenceSummary: carregar('legal/reference_summary.json'),
    sources: carregar('legal/sources.json'),
  };
}

export function getTax() {
  return {
    operationContext: carregar('tax/operation_context.json'),
    selectiveTax: carregar('tax/selective_tax.json'),
    selectiveTaxRules: carregar('tax/selective_tax_rules.json'),
  };
}

export function getFlows() {
  return {
    implementedImprovements: carregar('flows/implemented_improvements.json'),
    productImprovements: carregar('flows/product_improvements_v47.json'),
    productRegistrationSummary: carregar('flows/product_registration_summary.json'),
    salesValidation: carregar('flows/sales_validation.json'),
    serviceConsultation: carregar('flows/service_consultation.json'),
    simpleHybridViability: carregar('flows/simple_hybrid_viability.json'),
    simpleNationalValidation: carregar('flows/simple_national_validation.json'),
  };
}

export function getFinancial() {
  return {
    financialImpact: carregar('financial/financial_impact_v434.json'),
    salesValidationFinancialSummary: carregar('financial/sales_validation_financial_summary.json'),
  };
}

export function getReusableRules() {
  return {
    engineConfig: carregar('reusable/engine_config.json'),
    validatedRules: carregar('reusable/validated_rules_v4_33.json'),
  };
}

export function getRTCXmlValidator() {
  return {
    fields: carregar('rtc_xml/field_catalog.json'),
    conditionalGroups: carregar('rtc_xml/conditional_groups.json'),
    rules: carregar('rtc_xml/validation_rules.json'),
    statuses: carregar('rtc_xml/statuses.json'),
    outputSchema: carregar('rtc_xml/output_schema.json'),
  };
}

export function getIntegration() {
  return {
    companyProfileSchema: carregar('integration/company_profile_schema.json'),
    router: carregar('integration/router.json'),
    auditOutputSchema: carregar('integration/audit_output_schema.json'),
  };
}
