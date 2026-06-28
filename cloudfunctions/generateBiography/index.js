const cloud = require("wx-server-sdk");
const { chatCompletion } = require("./common/deepseek");
const { filterInput, filterOutput } = require("./common/contentFilter");
const { checkRateLimit } = require("./common/rateLimit");
const { validatePayload, prepareMaterial } = require("./common/material");
const { buildBiographyUserPrompt, getBiographySystemPrompt, normalizeWuxiaTone, normalizeYanqingTone, isYanqingMelodrama, isFeaturedBiographyStyle } = require("./common/prompts");
const { writeAuditLog, sha256 } = require("./common/audit");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const VALID_STYLES = ["narrative", "literary", "wuxia", "classical", "yanqing", "qiongyao", "xuanhuan"];

function resolveStyle(raw) {
  if (raw === "qiongyao") return "yanqing";
  return VALID_STYLES.includes(raw) ? raw : "narrative";
}
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
  const style = resolveStyle(event?.style);
  const length = VALID_LENGTHS.includes(event?.length) ? event.length : "normal";
  const person = VALID_PERSONS.includes(event?.person) ? event.person : "third";
  const wuxiaTone = style === "wuxia" ? normalizeWuxiaTone(event?.wuxiaTone) : undefined;
  const yanqingTone = style === "yanqing" ? normalizeYanqingTone(event?.yanqingTone) : undefined;

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
    const isFeaturedMode = isFeaturedBiographyStyle(style, wuxiaTone, yanqingTone);
    const isXuanhuan = style === "xuanhuan";
    const isClassical = style === "classical";
    const isYanqingMelodramaMode = style === "yanqing" && isYanqingMelodrama(yanqingTone);
    const biographyRaw = await chatCompletion(
      [
        { role: "system", content: getBiographySystemPrompt(style, wuxiaTone, yanqingTone) },
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
            yanqingTone,
          }),
        },
      ],
      {
        temperature: isXuanhuan
          ? 0.86
          : isClassical
            ? 0.75
            : isYanqingMelodramaMode
              ? 0.88
              : isFeaturedMode
                ? 0.82
                : 0.68,
        max_tokens: isFeaturedMode
          ? length === "short"
            ? 1000
            : 2200
          : length === "short"
            ? 900
            : 2200,
      }
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
        yanqingTone: style === "yanqing" ? yanqingTone : undefined,
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
