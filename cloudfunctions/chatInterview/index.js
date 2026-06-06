const cloud = require("wx-server-sdk");
const { chatCompletion } = require("./common/deepseek");
const { filterInput, filterOutput } = require("./common/contentFilter");
const { checkRateLimit } = require("./common/rateLimit");
const { INTERVIEW_SYSTEM_PROMPT } = require("./common/prompts");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 50000;

function trimMessages(messages) {
  const list = (messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));

  const totalChars = list.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error("对话过长，请先生成传记或清空部分对话");
  }
  return list;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, code: "UNAUTHORIZED", message: "用户未授权" };
  }

  const rate = await checkRateLimit(openid, "chat");
  if (!rate.allowed) {
    return { success: false, code: "RATE_LIMIT", message: rate.message };
  }

  let messages;
  try {
    messages = trimMessages(event?.messages);
  } catch (err) {
    return { success: false, code: "INVALID_INPUT", message: err.message };
  }

  if (!messages.length) {
    return { success: false, code: "INVALID_INPUT", message: "对话内容为空" };
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const inputCheck = filterInput(lastUser?.content || "");
  if (!inputCheck.allowed) {
    return { success: false, code: inputCheck.code, message: inputCheck.message };
  }

  try {
    const replyRaw = await chatCompletion(
      [{ role: "system", content: INTERVIEW_SYSTEM_PROMPT }, ...messages],
      { temperature: 0.75, max_tokens: 600 }
    );

    const outputCheck = filterOutput(replyRaw);
    if (!outputCheck.allowed) {
      return { success: false, code: outputCheck.code, message: outputCheck.message };
    }

    return { success: true, content: outputCheck.text };
  } catch (err) {
    console.error("chatInterview failed", err);
    return {
      success: false,
      code: "CHAT_FAILED",
      message: err.message || "访谈回复失败，请稍后重试",
    };
  }
};
