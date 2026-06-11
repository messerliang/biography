const cloud = require("wx-server-sdk");
const { chatCompletion } = require("./common/deepseek");
const { filterInput, filterOutput } = require("./common/contentFilter");
const { checkRateLimit } = require("./common/rateLimit");
const { validatePayload, prepareMaterial } = require("./common/material");
const { BIOGRAPHY_SYSTEM_PROMPT, buildBiographyUserPrompt, normalizeWuxiaTone } = require("./common/prompts");
const { writeAuditLog, sha256 } = require("./common/audit");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const VALID_STYLES = ["narrative", "literary", "wuxia", "classical", "qiongyao"];
const VALID_LENGTHS = ["short", "normal", "adaptive"];
const VALID_PERSONS = ["first", "third"];

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, code: "UNAUTHORIZED", message: "用户未授权" };
  }

  const rate = await checkRateLimit(openid, "biography");
  if (!rate.allowed) {
    return { success: false, code: "RATE_LIMIT", message: rate.message };
  }

  const source = event?.source;
  const data = event?.data;
  const style = VALID_STYLES.includes(event?.style) ? event.style : "narrative";
  const length = VALID_LENGTHS.includes(event?.length) ? event.length : "normal";
  const person = VALID_PERSONS.includes(event?.person) ? event.person : "third";
  const wuxiaTone = style === "wuxia" ? normalizeWuxiaTone(event?.wuxiaTone) : undefined;

  const validation = validatePayload(source, data);
  if (!validation.ok) {
    return { success: false, code: "INVALID_INPUT", message: validation.message };
  }

  const inputCheck = filterInput(validation.material);
  if (!inputCheck.allowed) {
    return { success: false, code: inputCheck.code, message: inputCheck.message };
  }

  const prepared = prepareMaterial(inputCheck.text, length);

  try {
    const biographyRaw = await chatCompletion(
      [
        { role: "system", content: BIOGRAPHY_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildBiographyUserPrompt({
            source,
            material: prepared.text,
            style,
            length,
            person,
            truncated: prepared.truncated,
            wuxiaTone,
          }),
        },
      ],
      { temperature: 0.68, max_tokens: length === "short" ? 900 : 2200 }
    );

    const outputCheck = filterOutput(biographyRaw);
    if (!outputCheck.allowed) {
      return { success: false, code: outputCheck.code, message: outputCheck.message };
    }

    await writeAuditLog({
      openid,
      action: "biography",
      source,
      materialHash: sha256(validation.material),
      summarized: prepared.truncated,
    });

    return {
      success: true,
      content: outputCheck.text,
      meta: {
        source,
        style,
        length,
        person,
        truncated: prepared.truncated,
        wuxiaTone: style === "wuxia" ? wuxiaTone : undefined,
        charCount: outputCheck.text.length,
      },
    };
  } catch (err) {
    console.error("generateBiography failed", err);
    return {
      success: false,
      code: "GENERATION_FAILED",
      message: err.message || "传记生成失败，请稍后重试",
    };
  }
};
