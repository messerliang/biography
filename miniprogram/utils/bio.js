const MODEL_CONFIG = {
  modelProvider: "deepseek",
  quickResponseModel: "deepseek-v3.2",
};

const COMMON_STYLES = {
  narrative: {
    label: "纪实叙述",
    desc: "温暖真实，像家人讲述的故事",
    group: "common",
  },
  literary: {
    label: "文学散文",
    desc: "富有诗意，文笔优美",
    group: "common",
  },
};

const SPECIAL_STYLES = {
  wuxia: {
    label: "武侠风",
    desc: "纪实为主 / 纯正武侠 / 娱乐传奇，三档可选",
    group: "special",
  },
  classical: {
    label: "文言文",
    desc: "典雅文言，传承古典韵味",
    group: "special",
  },
  qiongyao: {
    label: "琼瑶体",
    desc: "细腻婉约，情真意切",
    group: "special",
  },
};

const STYLES = { ...COMMON_STYLES, ...SPECIAL_STYLES };

const LEGACY_STYLE_LABELS = {
  timeline: "年谱时间线",
};

const STYLE_GROUP_META = [
  { key: "common", label: "常用风格", styles: COMMON_STYLES },
  { key: "special", label: "特殊风格", styles: SPECIAL_STYLES },
];

const PERSON_OPTIONS = {
  first: {
    key: "first",
    label: "第一人称",
    desc: "以「我」的视角讲述，亲切直述",
  },
  third: {
    key: "third",
    label: "第三人称",
    desc: "以他/她称呼主人公，更具传记感",
  },
};

const LENGTH_OPTIONS = {
  short: {
    key: "short",
    label: "短篇",
    desc: "约 300–500 字",
  },
  normal: {
    key: "normal",
    label: "普通",
    desc: "约 800–1000 字",
  },
  adaptive: {
    key: "adaptive",
    label: "遵照实际填写",
    desc: "按填写内容多少生成适当篇幅",
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
const TIMELINE_DRAFT_KEY = "bio_timeline_draft";
const CHAT_DRAFT_KEY = "bio_chat_draft";
const GENERATE_PAYLOAD_KEY = "bio_generate_payload";
const AI_STREAM_TIMEOUT = 600000;

const MIN_CHAT_USER_MESSAGES = 3;
const MIN_CHAT_USER_CHARS = 200;

const SOURCE_LABELS = {
  form: "分步填写",
  chat: "AI 访谈",
  video: "视频口述",
  audio: "音频导入",
  timeline: "时间轴",
  free: "自由输入",
};

const SAMPLE_BIOGRAPHIES = [
  {
    id: "sample_1",
    isSample: true,
    title: "示例 · 教师的一生",
    style: "narrative",
    source: "timeline",
    createdAt: "2024-01-15T08:00:00.000Z",
    content:
      "她出生在江南一座小城，父亲是木匠，母亲是小学老师。童年最难忘的是母亲每晚在油灯下批改作业，也顺便教她认字。\n\n十八岁那年，她考入师范学院。毕业后回到县城中学任教，一站就是三十五年。学生们叫她「李老师」，她说最骄傲的不是奖状，而是收到学生寄来的结婚请柬。\n\n退休那年，学校为她办了欢送会。她站在讲台上最后说：「教书，就是把温暖传下去。」",
  },
  {
    id: "sample_2",
    isSample: true,
    title: "示例 · 工程师的足迹",
    style: "literary",
    source: "form",
    createdAt: "2024-03-20T08:00:00.000Z",
    content:
      "他的人生像一条缓缓延伸的铁路。少年时在戈壁滩上第一次看见火车，便埋下了远行的种子。\n\n大学毕业后，他参与多条铁路建设。风餐露宿的日子里，他把图纸当诗读，把桥梁当作品。五十岁那年，他带孙子站在大桥上，说：「人这一辈子，总要留下点什么。」",
  },
];

const SYSTEM_PROMPT = `你是一位资深传记作家。请根据用户提供的真实信息撰写个人传记。

写作要求：
1. 使用第三人称叙述，文风温暖、真实、有感染力
2. 严格基于用户提供的信息，不虚构未提及的人物、事件或细节
3. 信息不足的部分可略写，不要编造
4. 段落清晰，适合阅读与分享
5. 严格遵守用户消息中的篇幅要求`;

const INTERVIEW_SYSTEM_PROMPT = `你是一位专业的传记采访记者，正在帮助用户整理人生故事。

采访规则：
1. 语气亲切温和，像老朋友聊天，每次只问 1-2 个问题
2. 按顺序引导话题：童年与家庭 → 求学经历 → 工作与事业 → 情感与生活 → 人生感悟
3. 用户回答后，简短回应（1-2 句）表示理解，再自然过渡到下一个问题
4. 不要一次问太多，给用户充分表达的空间
5. 如果用户想跳过某个话题，尊重并继续下一部分
6. 当信息已经比较充分时，可以问用户是否还有想补充的内容`;

function getStyleInstruction(style) {
  const normalized = normalizeWritingStyle(style);
  const map = {
    narrative: "采用纪实文学风格，按时间线叙述，温暖真实。",
    literary: "采用文学散文风格，注重意境与情感表达，文笔优美但不浮夸。",
    wuxia:
      "采用武侠笔法：适度写意=纪实为主；均衡=章回武侠、事实严谨；传奇江湖=娱乐向、可适度夸张渲染。",
    classical:
      "采用文言文风格撰写，文辞典雅凝练，可适度穿插白话注释或关键词，确保现代读者能读懂大意，不可歪曲事实。",
    qiongyao:
      "采用琼瑶式言情文笔，细腻婉约、情真意切，注重情感描写与内心独白，文风柔美但不俗套，不可歪曲事实。",
  };
  return map[normalized] || map.narrative;
}

function normalizeWritingStyle(style) {
  if (style === "timeline") return "narrative";
  return STYLES[style] ? style : "narrative";
}

const WUXIA_TONE_LEVELS = [20, 50, 80];
const DEFAULT_WUXIA_TONE = WUXIA_TONE_LEVELS[0];

const WUXIA_TONE_META = [
  {
    tone: 20,
    label: "适度写意",
    summary: "纪实为主",
    hint: "以真实经历为骨，偶尔点缀江湖侠气。如家人娓娓道来，自然克制。",
  },
  {
    tone: 50,
    label: "均衡",
    summary: "纯正武侠",
    hint: "人生分章，侠气十足。保留真实脉络，文笔尽显江湖韵味。",
  },
  {
    tone: 80,
    label: "传奇江湖",
    summary: "娱乐传奇",
    hint: "专属江湖人物志。开篇抓人、对话生动、章节个性化，适合分享。",
  },
];

function getWuxiaToneMetaForUI() {
  return WUXIA_TONE_META.map((item) => ({ ...item }));
}

function getWuxiaToneMeta(tone) {
  const idx = wuxiaToneToLevel(tone);
  return WUXIA_TONE_META[idx] || WUXIA_TONE_META[0];
}

function normalizeWuxiaTone(tone) {
  const n = Number(tone);
  if (!Number.isFinite(n)) return DEFAULT_WUXIA_TONE;
  return WUXIA_TONE_LEVELS.reduce(
    (best, level) => (Math.abs(level - n) < Math.abs(best - n) ? level : best),
    WUXIA_TONE_LEVELS[0]
  );
}

function wuxiaToneToLevel(tone) {
  const t = normalizeWuxiaTone(tone);
  const idx = WUXIA_TONE_LEVELS.indexOf(t);
  return idx >= 0 ? idx : 0;
}

function wuxiaLevelToTone(level) {
  const idx = Math.min(WUXIA_TONE_LEVELS.length - 1, Math.max(0, Math.round(Number(level) || 0)));
  return WUXIA_TONE_LEVELS[idx];
}

function getWuxiaToneLabel(tone) {
  return getWuxiaToneMeta(tone).label;
}

function getWuxiaToneHint(tone) {
  return getWuxiaToneMeta(tone).hint;
}

function getStyleGroupsForUI() {
  return STYLE_GROUP_META.map((group) => ({
    key: group.key,
    label: group.label,
    styles: Object.entries(group.styles).map(([key, val]) => ({ key, ...val })),
  }));
}

function getStyleLabel(styleKey, wuxiaTone) {
  const base = STYLES[styleKey]?.label || LEGACY_STYLE_LABELS[styleKey] || STYLES.narrative.label;
  if (styleKey === "wuxia" && wuxiaTone !== undefined && wuxiaTone !== null) {
    return `${base} · ${getWuxiaToneLabel(wuxiaTone)}`;
  }
  return base;
}

function normalizeLength(length) {
  return LENGTH_OPTIONS[length] ? length : "normal";
}

function normalizePerson(person) {
  return PERSON_OPTIONS[person] ? person : "third";
}

function getPersonOptionsForUI() {
  return Object.entries(PERSON_OPTIONS).map(([key, val]) => ({ key, ...val }));
}

function getPersonLabel(personKey) {
  const key = normalizePerson(personKey);
  return PERSON_OPTIONS[key].label;
}

function getLengthOptionsForUI() {
  return Object.entries(LENGTH_OPTIONS).map(([key, val]) => ({ key, ...val }));
}

function getLengthLabel(lengthKey) {
  const key = normalizeLength(lengthKey);
  return LENGTH_OPTIONS[key].label;
}

function getFlatStyleOptions() {
  const list = [];
  STYLE_GROUP_META.forEach((group) => {
    Object.entries(group.styles).forEach(([key, val]) => {
      list.push({ key, label: val.label });
    });
  });
  return list;
}

function getStylePickerRange() {
  return getFlatStyleOptions().map((o) => o.label);
}

function getStylePickerIndex(styleKey) {
  const key = normalizeWritingStyle(styleKey);
  const idx = getFlatStyleOptions().findIndex((o) => o.key === key);
  return idx >= 0 ? idx : 0;
}

function getStyleKeyFromPickerIndex(index) {
  const opts = getFlatStyleOptions();
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= opts.length) return "narrative";
  return opts[i].key;
}

function getLengthPickerRange() {
  return getLengthOptionsForUI().map((o) => o.label);
}

function getLengthPickerIndex(lengthKey) {
  const key = normalizeLength(lengthKey);
  const idx = getLengthOptionsForUI().findIndex((o) => o.key === key);
  return idx >= 0 ? idx : 0;
}

function getLengthKeyFromPickerIndex(index) {
  const opts = getLengthOptionsForUI();
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= opts.length) return "normal";
  return opts[i].key;
}

function getBioPickerState(styleKey, lengthKey) {
  const style = normalizeWritingStyle(styleKey);
  const length = normalizeLength(lengthKey);
  return {
    lengthPickerRange: getLengthPickerRange(),
    lengthPickerIndex: getLengthPickerIndex(length),
    stylePickerRange: getStylePickerRange(),
    stylePickerIndex: getStylePickerIndex(style),
    selectedStyle: style,
    selectedLength: length,
    styleLabel: getStyleLabel(style),
    lengthLabel: getLengthLabel(length),
  };
}

function getLengthInstruction(length) {
  const key = normalizeLength(length);
  if (key === "short") {
    return "篇幅要求：全文控制在 300–500 字，精炼扼要，保留最重要的事实与情感，不要超出上限。";
  }
  if (key === "normal") {
    return "篇幅要求：全文控制在 800–1000 字，结构完整、详略得当，不要明显超出该范围。";
  }
  return "篇幅要求：根据用户提供素材的信息量灵活把握篇幅；素材少则简明扼要（可短至数百字），素材丰富则充分展开；不人为注水或过度压缩，以如实覆盖用户内容为准。";
}

function getWritingRequirements(style, length) {
  return `${getStyleInstruction(style)}\n\n${getLengthInstruction(length)}`;
}

function getSourceLabel(sourceKey) {
  return SOURCE_LABELS[sourceKey] || "传记";
}

function getSampleBiographies() {
  return SAMPLE_BIOGRAPHIES.map((item) => ({ ...item }));
}

function getChatMaterialStats(messages) {
  const userMessages = (messages || []).filter((m) => m.role === "user");
  const userCount = userMessages.length;
  const charCount = userMessages.reduce((sum, m) => sum + String(m.content || "").length, 0);
  const sufficient = userCount >= MIN_CHAT_USER_MESSAGES && charCount >= MIN_CHAT_USER_CHARS;
  let tip = "";
  if (!sufficient) {
    const needMsg = Math.max(0, MIN_CHAT_USER_MESSAGES - userCount);
    const needChar = Math.max(0, MIN_CHAT_USER_CHARS - charCount);
    if (needMsg > 0 && needChar > 0) {
      tip = `建议再聊 ${needMsg} 轮，并补充约 ${needChar} 字回忆`;
    } else if (needMsg > 0) {
      tip = `建议再聊 ${needMsg} 轮后再生成`;
    } else {
      tip = `建议再补充约 ${needChar} 字回忆`;
    }
  }
  return { userCount, charCount, sufficient, tip };
}

function getActiveExampleNodes(nodes) {
  return (nodes || []).filter((n) => n.isExample && isNodeFilled(n));
}

function buildPromptFromForm(form, style, length) {
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

  return `${getWritingRequirements(style, length)}

请根据以下用户信息撰写传记：

${sections || "（用户尚未填写详细信息）"}`;
}

function buildPromptFromChat(messages, style, length) {
  const dialogue = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "用户" : "采访者"}：${m.content}`)
    .join("\n\n");

  return `${getWritingRequirements(style, length)}

以下是通过采访收集的对话记录，请从中提取用户的人生信息，撰写一篇完整的个人传记：

${dialogue}`;
}

function buildPromptFromFree(text, style, length) {
  return `${getWritingRequirements(style, length)}

用户自由输入了以下人生回忆素材，请整理并撰写一篇结构完整的个人传记：

${text.trim()}`;
}

function buildPromptFromVideo(text, style, length) {
  return `${getWritingRequirements(style, length)}

用户导入了一段讲述人生经历的视频，以下是从视频中识别出的语音文字内容。请整理其中的信息，撰写一篇结构完整的个人传记：

${text.trim()}`;
}

function buildPromptFromAudio(text, style, length) {
  return `${getWritingRequirements(style, length)}

用户导入了一段讲述人生经历的音频，以下是从音频中识别出的语音文字内容。请整理其中的信息，撰写一篇结构完整的个人传记：

${text.trim()}`;
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

function sortTimelineNodes(nodes, options = {}) {
  const list = [...nodes];
  if (options.manualSort) {
    return list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return list.sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));
}

function ensureNodeSortOrder(nodes) {
  return nodes.map((node, index) => ({
    ...node,
    sortOrder: node.sortOrder ?? index,
  }));
}

function reorderTimelineNode(nodes, id, direction) {
  const ordered = ensureNodeSortOrder([...nodes]).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
  const index = ordered.findIndex((n) => n.id === id);
  if (index < 0) return nodes;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return nodes;
  const temp = ordered[index].sortOrder;
  ordered[index].sortOrder = ordered[target].sortOrder;
  ordered[target].sortOrder = temp;
  return ordered;
}

function getDefaultTimelineNodes() {
  return [
    {
      id: "node_example_1",
      date: "1965年3月",
      title: "出生",
      description:
        "在山东农村的一个普通农家，我迎来了生命中的第一天。父母给我取名，希望我能健康长大。那时候家里虽然不富裕，但邻里和睦，童年在田野和炊烟中度过。",
      isExample: true,
      sortOrder: 1,
    },
    {
      id: "node_example_2",
      date: "1983年9月",
      title: "求学",
      description:
        "背着行囊走进县一中，这是我第一次离开村子。三年的高中生活紧张而充实，老师们严谨治学，同学们相互扶持，为我后来的道路打下了基础。",
      isExample: true,
      sortOrder: 2,
    },
    {
      id: "node_example_3",
      date: "1990年7月",
      title: "工作",
      description:
        "大学毕业分配到国营工厂，从此开始了职业生涯。从基层做起，虚心向老师傅学习，逐渐独当一面。那段岁月教会我责任与坚持。",
      isExample: true,
      sortOrder: 3,
    },
    {
      id: "node_empty_1",
      date: "",
      title: "",
      description: "",
      isExample: false,
      sortOrder: 4,
    },
    {
      id: "node_empty_2",
      date: "",
      title: "",
      description: "",
      isExample: false,
      sortOrder: 5,
    },
  ];
}

function isNodeFilled(node) {
  return !!(node.date?.trim() || node.title?.trim() || node.description?.trim());
}

function countFilledNodes(nodes) {
  return nodes.filter(isNodeFilled).length;
}

function buildPromptFromTimeline(nodes, style, length) {
  const events = sortTimelineNodes(nodes)
    .filter(isNodeFilled)
    .map((node) => {
      const label = node.title?.trim() || "人生节点";
      const datePart = node.date?.trim() ? `（约 ${node.date.trim()}）` : "";
      const desc = node.description?.trim() || "";
      return desc ? `【${label}】${datePart}\n${desc}` : `【${label}】${datePart}`;
    })
    .join("\n\n");

  return `${getWritingRequirements(style, length)}

用户已通过「时间轴填写」整理了以下关键事件。请严格按事件时间顺序组织叙事，将各节点重述为连贯散文；相邻节点可合并成段，勿机械「一段一节点、段首写年月」：

${events || "（用户尚未填写事件）"}`;
}

function isTimeoutError(err) {
  const msg = String(err?.message || err?.errMsg || err || "").toLowerCase();
  const code = String(err?.errCode || err?.code || "");
  return (
    code === "-504003" ||
    code === "-504002" ||
    code === "504003" ||
    code === "504002" ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("超时") ||
    msg.includes("time_limit_exceeded") ||
    msg.includes("function execution timeout") ||
    msg.includes("errcode\":87014")
  );
}

function getGenerateErrorMessage(err) {
  if (isTimeoutError(err)) {
    return "生成超时（云函数上限 60 秒）。请稍后重试、选「短篇」或精简素材。";
  }
  const msg = String(err?.message || err?.errMsg || "").trim();
  if (msg) return msg;
  return "生成失败，请确认云函数 generateBiography 已部署且 DEEPSEEK_API_KEY 已配置。";
}

function saveGeneratePayload(payload) {
  wx.setStorageSync(GENERATE_PAYLOAD_KEY, payload);
}

function getGeneratePayload() {
  try {
    return wx.getStorageSync(GENERATE_PAYLOAD_KEY) || null;
  } catch (e) {
    return null;
  }
}

function clearGeneratePayload() {
  wx.removeStorageSync(GENERATE_PAYLOAD_KEY);
}

function navigateToGenerate(payload) {
  saveGeneratePayload(payload);
  wx.navigateTo({ url: "/pages/bio/result/result" });
}

async function ensureCloudReady() {
  if (!wx.cloud) {
    throw new Error("请使用 2.2.3 或以上的基础库以使用云能力");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playTypingEffect(fullText, onChunk) {
  if (!onChunk || !fullText) return fullText;
  const step = Math.max(4, Math.floor(fullText.length / 120));
  for (let i = step; i < fullText.length; i += step) {
    onChunk(fullText.slice(0, i), fullText.slice(i - step, i));
    await sleep(28);
  }
  onChunk(fullText, "");
  return fullText;
}

async function callCloudFunction(name, data, options = {}, retryCount = 1) {
  const { timeout = 60000 } = options;
  await ensureCloudReady();
  try {
    const res = await wx.cloud.callFunction({ name, data, timeout });
    return res?.result || {};
  } catch (err) {
    if (retryCount > 0 && isTimeoutError(err)) {
      return callCloudFunction(name, data, options, retryCount - 1);
    }
    throw err;
  }
}

async function streamBiography({
  source,
  data,
  style = "narrative",
  length = "normal",
  person = "third",
  wuxiaTone,
  onChunk,
  onStatus,
  retryCount = 1,
}) {
  const normalizedLength = normalizeLength(length);
  const normalizedPerson = normalizePerson(person);
  const normalizedStyle = normalizeWritingStyle(style);
  const normalizedWuxiaTone =
    normalizedStyle === "wuxia" ? normalizeWuxiaTone(wuxiaTone) : undefined;
  if (onStatus) onStatus("正在安全校验素材…");
  if (onChunk) onChunk("");

  try {
    if (onStatus) onStatus("正在云端撰写传记…");
    const payload = {
      source,
      data,
      style: normalizedStyle,
      length: normalizedLength,
      person: normalizedPerson,
    };
    if (normalizedStyle === "wuxia") {
      payload.wuxiaTone = normalizedWuxiaTone;
    }
    const result = await callCloudFunction("generateBiography", payload, { timeout: 90000 });

    if (!result.success) {
      throw new Error(result.message || "传记生成失败");
    }

    if (onStatus) {
      onStatus(result.meta?.truncated ? "素材已精简，撰写完成" : "撰写完成");
    }

    return await playTypingEffect(result.content || "", onChunk);
  } catch (err) {
    if (retryCount > 0 && isTimeoutError(err)) {
      if (onChunk) onChunk("");
      return streamBiography({
        source,
        data,
        style,
        length: normalizedLength,
        person: normalizedPerson,
        wuxiaTone: normalizedWuxiaTone,
        onChunk,
        onStatus,
        retryCount: retryCount - 1,
      });
    }
    throw err;
  }
}

async function streamChatReply(messages, onChunk, retryCount = 1) {
  const result = await callCloudFunction("chatInterview", { messages }, { timeout: 60000 });
  if (!result.success) {
    throw new Error(result.message || "访谈回复失败");
  }
  const fullText = result.content || "";
  if (onChunk) {
    onChunk(fullText, fullText);
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
    length: normalizeLength(record.length),
    source: record.source || "form",
    createdAt: record.createdAt || new Date().toISOString(),
  };
  if (item.style === "wuxia" && record.wuxiaTone !== undefined) {
    item.wuxiaTone = normalizeWuxiaTone(record.wuxiaTone);
  }
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

function saveTimelineDraft(draft) {
  wx.setStorageSync(TIMELINE_DRAFT_KEY, draft);
}

function getTimelineDraft() {
  try {
    return wx.getStorageSync(TIMELINE_DRAFT_KEY) || null;
  } catch (e) {
    return null;
  }
}

function clearTimelineDraft() {
  wx.removeStorageSync(TIMELINE_DRAFT_KEY);
}

function saveChatDraft(draft) {
  wx.setStorageSync(CHAT_DRAFT_KEY, draft);
}

function getChatDraft() {
  try {
    return wx.getStorageSync(CHAT_DRAFT_KEY) || null;
  } catch (e) {
    return null;
  }
}

function clearChatDraft() {
  wx.removeStorageSync(CHAT_DRAFT_KEY);
}

const WELCOME_MESSAGE =
  "您好，我是您的传记助手。接下来我会像老朋友一样，慢慢听您讲述人生故事。\n\n我们从童年说起吧——您小时候在哪里长大？家里有哪些让您印象深刻的人？";

function getDefaultChatDraft() {
  return {
    messages: [{ role: "assistant", content: WELCOME_MESSAGE }],
    subjectName: "",
    selectedPerson: "third",
    selectedStyle: "narrative",
    selectedLength: "normal",
    wuxiaTone: DEFAULT_WUXIA_TONE,
  };
}

function createTimelineNode() {
  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: "",
    title: "",
    description: "",
    isExample: false,
    sortOrder: Date.now(),
  };
}

function getDefaultTimelineDraft() {
  return {
    nodes: ensureNodeSortOrder(getDefaultTimelineNodes()),
    subjectName: "",
    selectedPerson: "third",
    selectedStyle: "narrative",
    selectedLength: "normal",
    wuxiaTone: DEFAULT_WUXIA_TONE,
    manualSort: false,
  };
}

function shouldUseDefaultTimelineDraft(stored) {
  if (!stored || !Array.isArray(stored.nodes) || stored.nodes.length === 0) {
    return true;
  }
  const hasExamples = stored.nodes.some((n) => n.isExample);
  const filledCount = countFilledNodes(stored.nodes);
  if (!hasExamples && filledCount === 0) {
    return true;
  }
  return false;
}

function resolveTimelineDraft(stored) {
  if (shouldUseDefaultTimelineDraft(stored)) {
    return {
      ...getDefaultTimelineDraft(),
      subjectName: String(stored?.subjectName || "").trim(),
      selectedPerson: normalizePerson(stored?.selectedPerson),
      selectedStyle: normalizeWritingStyle(stored?.selectedStyle),
      selectedLength: normalizeLength(stored?.selectedLength),
      wuxiaTone: normalizeWuxiaTone(stored?.wuxiaTone),
    };
  }
  return {
    nodes: ensureNodeSortOrder(stored.nodes),
    subjectName: String(stored.subjectName || "").trim(),
    selectedPerson: normalizePerson(stored.selectedPerson),
    selectedStyle: normalizeWritingStyle(stored.selectedStyle),
    selectedLength: normalizeLength(stored.selectedLength),
    wuxiaTone: normalizeWuxiaTone(stored?.wuxiaTone),
    manualSort: !!stored.manualSort,
  };
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
  STYLE_GROUP_META,
  LENGTH_OPTIONS,
  PERSON_OPTIONS,
  getPersonOptionsForUI,
  getPersonLabel,
  normalizePerson,
  getStyleGroupsForUI,
  getStyleLabel,
  getLengthOptionsForUI,
  getLengthLabel,
  getLengthPickerRange,
  getLengthPickerIndex,
  getLengthKeyFromPickerIndex,
  getStylePickerRange,
  getStylePickerIndex,
  getStyleKeyFromPickerIndex,
  getBioPickerState,
  normalizeLength,
  normalizeWritingStyle,
  DEFAULT_WUXIA_TONE,
  WUXIA_TONE_LEVELS,
  WUXIA_TONE_META,
  getWuxiaToneMetaForUI,
  getWuxiaToneMeta,
  normalizeWuxiaTone,
  wuxiaToneToLevel,
  wuxiaLevelToTone,
  getWuxiaToneLabel,
  getWuxiaToneHint,
  getSourceLabel,
  getSampleBiographies,
  getChatMaterialStats,
  getActiveExampleNodes,
  MIN_CHAT_USER_MESSAGES,
  MIN_CHAT_USER_CHARS,
  WELCOME_MESSAGE,
  FORM_STEPS,
  SYSTEM_PROMPT,
  INTERVIEW_SYSTEM_PROMPT,
  buildPromptFromForm,
  buildPromptFromChat,
  buildPromptFromVideo,
  streamBiography,
  streamChatReply,
  getGenerateErrorMessage,
  isTimeoutError,
  getBiographyList,
  saveBiography,
  deleteBiography,
  getBiographyById,
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  saveTimelineDraft,
  getTimelineDraft,
  clearTimelineDraft,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  getDefaultChatDraft,
  getDefaultTimelineNodes,
  getDefaultTimelineDraft,
  resolveTimelineDraft,
  shouldUseDefaultTimelineDraft,
  createTimelineNode,
  sortTimelineNodes,
  ensureNodeSortOrder,
  reorderTimelineNode,
  isNodeFilled,
  countFilledNodes,
  buildPromptFromTimeline,
  saveGeneratePayload,
  getGeneratePayload,
  clearGeneratePayload,
  navigateToGenerate,
  getDefaultForm,
};
