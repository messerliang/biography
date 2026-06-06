const { SUMMARIZE_CHAR_THRESHOLD } = require("./constants");

function isNodeFilled(node) {
  return !!(node?.date?.trim?.() || node?.title?.trim?.() || node?.description?.trim?.());
}

function parseDateForSort(dateStr) {
  if (!dateStr || !String(dateStr).trim()) return Number.MAX_SAFE_INTEGER;
  const yearMatch = String(dateStr).match(/(\d{4})/);
  if (!yearMatch) return Number.MAX_SAFE_INTEGER;
  const year = parseInt(yearMatch[1], 10);
  const monthMatch = String(dateStr).match(/(\d{1,2})\s*月/);
  const month = monthMatch ? parseInt(monthMatch[1], 10) : 0;
  return year * 100 + month;
}

function sortTimelineNodes(nodes, manualSort) {
  const list = [...(nodes || [])];
  if (manualSort) {
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return list.sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));
}

function buildMaterialFromForm(form) {
  const sections = [
    ["姓名", form?.name],
    ["出生年月", form?.birthYear],
    ["籍贯/家乡", form?.hometown],
    ["童年与家庭", form?.childhood],
    ["求学经历", form?.education],
    ["工作与事业", form?.career],
    ["情感与生活", form?.emotion],
    ["人生感悟", form?.insight],
  ]
    .filter(([, value]) => value && String(value).trim())
    .map(([label, value]) => `【${label}】\n${String(value).trim()}`)
    .join("\n\n");
  return sections || "（用户尚未填写详细信息）";
}

function buildMaterialFromChat(messages) {
  return (messages || [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "用户" : "采访者"}：${m.content}`)
    .join("\n\n");
}

function buildMaterialFromTimeline(data) {
  const nodes = sortTimelineNodes(data?.nodes || [], !!data?.manualSort);
  const events = nodes
    .filter(isNodeFilled)
    .map((node, index) => {
      const parts = [`【节点 ${index + 1}】`];
      if (node.date?.trim()) parts.push(`时间：${node.date.trim()}`);
      if (node.title?.trim()) parts.push(`事件：${node.title.trim()}`);
      if (node.description?.trim()) parts.push(`详情：${node.description.trim()}`);
      return parts.join("\n");
    })
    .join("\n\n");
  return events || "（用户尚未填写事件）";
}

function buildMaterialFromTranscript(text) {
  return String(text || "").trim() || "（无有效转写内容）";
}

function buildRawMaterial(source, data) {
  switch (source) {
    case "form":
      return buildMaterialFromForm(data);
    case "chat":
      return buildMaterialFromChat(data?.messages);
    case "timeline":
      return buildMaterialFromTimeline(data);
    case "video":
    case "audio":
    case "free":
      return buildMaterialFromTranscript(data?.text);
    default:
      return "";
  }
}

function shouldSummarize(material, length) {
  const size = String(material || "").length;
  if (size < SUMMARIZE_CHAR_THRESHOLD) return false;
  return length === "short" || length === "normal" || size >= SUMMARIZE_CHAR_THRESHOLD * 1.5;
}

function validatePayload(source, data) {
  const allowed = ["form", "chat", "timeline", "video", "audio", "free"];
  if (!allowed.includes(source)) {
    return { ok: false, message: "未知的传记来源" };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, message: "素材数据无效" };
  }
  const material = buildRawMaterial(source, data);
  if (!material || material.length < 8) {
    return { ok: false, message: "素材内容过少，请补充后再生成" };
  }
  if (material.length > 120000) {
    return { ok: false, message: "素材过长，请精简后重试" };
  }
  return { ok: true, material };
}

module.exports = {
  buildRawMaterial,
  shouldSummarize,
  validatePayload,
};
