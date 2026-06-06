const INPUT_BLOCK_RULES = [
  { pattern: /(?:制作|制造|配方).{0,8}(?:炸弹|炸药|毒品)/i, code: "illegal_content" },
  { pattern: /(?:自杀|自残).{0,6}(?:方法|教程|攻略)/i, code: "self_harm" },
  { pattern: /(?:颠覆|推翻).{0,6}(?:政权|政府)/i, code: "political_extreme" },
  { pattern: /(?:买卖|出售).{0,6}(?:身份证|银行卡|个人信息)/i, code: "privacy_abuse" },
];

const OUTPUT_BLOCK_RULES = [
  { pattern: /(?:制作|制造).{0,8}(?:炸弹|炸药|毒品)/i, code: "illegal_content" },
  { pattern: /(?:详细步骤|具体操作).{0,8}(?:自杀|自残)/i, code: "self_harm" },
];

const OUTPUT_SANITIZE_RULES = [
  { pattern: /习近平|共产党内斗|六四/g, replacement: "" },
];

function runRules(text, rules) {
  const value = String(text || "");
  for (const rule of rules) {
    if (rule.pattern.test(value)) {
      return { blocked: true, code: rule.code };
    }
  }
  return { blocked: false };
}

function filterInput(text) {
  const blocked = runRules(text, INPUT_BLOCK_RULES);
  if (blocked.blocked) {
    return {
      allowed: false,
      code: blocked.code,
      message: "素材包含不适宜内容，请修改后重试",
    };
  }
  return { allowed: true, text: String(text || "").trim() };
}

function filterOutput(text) {
  const blocked = runRules(text, OUTPUT_BLOCK_RULES);
  if (blocked.blocked) {
    return {
      allowed: false,
      code: blocked.code,
      message: "生成内容未通过安全审核，请调整素材后重试",
    };
  }

  let sanitized = String(text || "").trim();
  OUTPUT_SANITIZE_RULES.forEach((rule) => {
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  });
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n").trim();
  return { allowed: true, text: sanitized };
}

module.exports = { filterInput, filterOutput };
