const MODEL_CONFIG = {
  modelProvider: "deepseek",
  quickResponseModel: "deepseek-v3.2",
};

const STYLES = {
  narrative: {
    label: "纪实叙述",
    desc: "温暖真实，像家人讲述的故事",
  },
  literary: {
    label: "文学散文",
    desc: "富有诗意，文笔优美",
  },
  timeline: {
    label: "年谱时间线",
    desc: "按年月梳理人生轨迹",
  },
};

const FORM_STEPS = [
  { key: "basic", title: "基本信息", subtitle: "让我们从最基本的信息开始" },
  { key: "childhood", title: "童年与家庭", subtitle: "回忆您的成长环境与家人" },
  { key: "education", title: "求学经历", subtitle: "那些影响您一生的校园时光" },
  { key: "career", title: "工作与事业", subtitle: "您的职业道路与成就" },
  { key: "life", title: "情感与感悟", subtitle: "生活中的爱与人生思考" },
];

const STORAGE_KEY = "biographies";
const DRAFT_KEY = "bio_form_draft";

const SYSTEM_PROMPT = `你是一位资深传记作家。请根据用户提供的真实信息撰写个人传记。

写作要求：
1. 使用第三人称叙述，文风温暖、真实、有感染力
2. 严格基于用户提供的信息，不虚构未提及的人物、事件或细节
3. 信息不足的部分可略写，不要编造
4. 段落清晰，适合阅读与分享
5. 字数控制在 1500-2500 字`;

const INTERVIEW_SYSTEM_PROMPT = `你是一位专业的传记采访记者，正在帮助用户整理人生故事。

采访规则：
1. 语气亲切温和，像老朋友聊天，每次只问 1-2 个问题
2. 按顺序引导话题：童年与家庭 → 求学经历 → 工作与事业 → 情感与生活 → 人生感悟
3. 用户回答后，简短回应（1-2 句）表示理解，再自然过渡到下一个问题
4. 不要一次问太多，给用户充分表达的空间
5. 如果用户想跳过某个话题，尊重并继续下一部分
6. 当信息已经比较充分时，可以问用户是否还有想补充的内容`;

function getStyleInstruction(style) {
  const map = {
    narrative: "采用纪实文学风格，按时间线叙述，温暖真实。",
    literary: "采用文学散文风格，注重意境与情感表达，文笔优美但不浮夸。",
    timeline: "采用年谱式结构，以时间节点为主线，每个阶段附简短叙述。",
  };
  return map[style] || map.narrative;
}

function buildPromptFromForm(form, style) {
  const sections = [
    ["姓名", form.name],
    ["出生年月", form.birthYear],
    ["籍贯/家乡", form.hometown],
    ["童年与家庭", form.childhood],
    ["求学经历", form.education],
    ["工作与事业", form.career],
    ["情感与生活", form.emotion],
    ["人生感悟", form.insight],
  ]
    .filter(([, value]) => value && String(value).trim())
    .map(([label, value]) => `【${label}】\n${String(value).trim()}`)
    .join("\n\n");

  return `${getStyleInstruction(style)}

请根据以下用户信息撰写传记：

${sections || "（用户尚未填写详细信息）"}`;
}

function buildPromptFromChat(messages, style) {
  const dialogue = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "用户" : "采访者"}：${m.content}`)
    .join("\n\n");

  return `${getStyleInstruction(style)}

以下是通过采访收集的对话记录，请从中提取用户的人生信息，撰写一篇完整的个人传记：

${dialogue}`;
}

function buildPromptFromFree(text, style) {
  return `${getStyleInstruction(style)}

用户自由输入了以下人生回忆素材，请整理并撰写一篇结构完整的个人传记：

${text.trim()}`;
}

function buildPromptFromVideo(text, style) {
  return `${getStyleInstruction(style)}

用户导入了一段讲述人生经历的视频，以下是从视频中识别出的语音文字内容。请整理其中的信息，撰写一篇结构完整的个人传记：

${text.trim()}`;
}

async function streamBiography({ source, data, style = "narrative", onChunk }) {
  let userPrompt = "";
  if (source === "form") {
    userPrompt = buildPromptFromForm(data, style);
  } else if (source === "chat") {
    userPrompt = buildPromptFromChat(data.messages, style);
  } else if (source === "free") {
    userPrompt = buildPromptFromFree(data.text, style);
  } else if (source === "video") {
    userPrompt = buildPromptFromVideo(data.text, style);
  } else {
    throw new Error("未知的传记来源");
  }

  const ai = wx.cloud.extend.AI;
  const aiModel = ai.createModel(MODEL_CONFIG.modelProvider);
  const res = await aiModel.streamText({
    data: {
      model: MODEL_CONFIG.quickResponseModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    },
  });

  let fullText = "";
  for await (const event of res.eventStream) {
    const { data: eventData } = event;
    try {
      const dataJson = JSON.parse(eventData);
      const { choices = [] } = dataJson || {};
      const { delta, finish_reason } = choices[0] || {};
      if (finish_reason === "stop") break;
      const chunk = delta?.content || "";
      if (chunk) {
        fullText += chunk;
        if (onChunk) onChunk(fullText, chunk);
      }
    } catch (e) {
      break;
    }
  }
  return fullText;
}

async function streamChatReply(messages) {
  const ai = wx.cloud.extend.AI;
  const aiModel = ai.createModel(MODEL_CONFIG.modelProvider);
  const res = await aiModel.streamText({
    data: {
      model: MODEL_CONFIG.quickResponseModel,
      messages: [{ role: "system", content: INTERVIEW_SYSTEM_PROMPT }, ...messages],
    },
  });

  let fullText = "";
  for await (const event of res.eventStream) {
    const { data: eventData } = event;
    try {
      const dataJson = JSON.parse(eventData);
      const { choices = [] } = dataJson || {};
      const { delta, finish_reason } = choices[0] || {};
      if (finish_reason === "stop") break;
      const chunk = delta?.content || "";
      if (chunk) fullText += chunk;
    } catch (e) {
      break;
    }
  }
  return fullText;
}

function getBiographyList() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveBiography(record) {
  const list = getBiographyList();
  const item = {
    id: record.id || `bio_${Date.now()}`,
    title: record.title || "我的人生传记",
    content: record.content,
    style: record.style || "narrative",
    source: record.source || "form",
    createdAt: record.createdAt || new Date().toISOString(),
  };
  list.unshift(item);
  wx.setStorageSync(STORAGE_KEY, list.slice(0, 50));
  return item;
}

function deleteBiography(id) {
  const list = getBiographyList().filter((item) => item.id !== id);
  wx.setStorageSync(STORAGE_KEY, list);
}

function getBiographyById(id) {
  return getBiographyList().find((item) => item.id === id);
}

function saveFormDraft(form) {
  wx.setStorageSync(DRAFT_KEY, form);
}

function getFormDraft() {
  try {
    return wx.getStorageSync(DRAFT_KEY) || null;
  } catch (e) {
    return null;
  }
}

function clearFormDraft() {
  wx.removeStorageSync(DRAFT_KEY);
}

function getDefaultForm() {
  return {
    name: "",
    birthYear: "",
    hometown: "",
    childhood: "",
    education: "",
    career: "",
    emotion: "",
    insight: "",
  };
}

module.exports = {
  MODEL_CONFIG,
  STYLES,
  FORM_STEPS,
  SYSTEM_PROMPT,
  INTERVIEW_SYSTEM_PROMPT,
  buildPromptFromForm,
  buildPromptFromChat,
  buildPromptFromVideo,
  streamBiography,
  streamChatReply,
  getBiographyList,
  saveBiography,
  deleteBiography,
  getBiographyById,
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  getDefaultForm,
};
