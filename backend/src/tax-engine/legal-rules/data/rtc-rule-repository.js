/**
 * RTC Motor Modular v4.34
 * Loader simples para Node.js. Não contém regra tributária hardcoded.
 * As regras permanecem nos JSONs.
 */
const fs = require('fs');
const path = require('path');

class RTCRuleRepository {
  constructor(baseDir) {
    this.baseDir = baseDir || __dirname;
    this.cache = new Map();
  }

  load(relativePath) {
    if (this.cache.has(relativePath)) return this.cache.get(relativePath);
    const full = path.join(this.baseDir, relativePath);
    const value = JSON.parse(fs.readFileSync(full, 'utf8'));
    this.cache.set(relativePath, value);
    return value;
  }

  getCore() {
    return {
      meta: this.load('core/meta.json'),
      sharedEngine: this.load('core/shared_engine.json'),
      statusRules: this.load('core/status_rules.json')
    };
  }

  getClassification() {
    return {
      modules: this.load('classification/module_catalog.json'),
      treatments: this.load('classification/treatments.json'),
      precedence: this.load('classification/precedence.json'),
      legalRows: this.load('classification/legal_rows.json'),
      ruleRows: this.load('classification/rule_rows.json'),
      termRows: this.load('classification/term_rows.json')
    };
  }

  getRTCXmlValidator() {
    return {
      fields: this.load('rtc_xml/field_catalog.json'),
      conditionalGroups: this.load('rtc_xml/conditional_groups.json'),
      rules: this.load('rtc_xml/validation_rules.json'),
      statuses: this.load('rtc_xml/statuses.json'),
      outputSchema: this.load('rtc_xml/output_schema.json')
    };
  }

  getReusableRules() {
    return this.load('reusable/validated_rules_v4_33.json');
  }
}

module.exports = { RTCRuleRepository };
