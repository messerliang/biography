const { filterOutput } = require("./contentFilter");

const FIGURE_MATCH_SYSTEM_APPEND = `【知音匹配·输出协议】
本篇须一次性完成两部分，且严格分阶段：
1）先撰写完整传记正文 biography：只依据用户素材与文风要求，不得参考、不得提及即将匹配的历史人物或武侠角色。
2）传记写完后，再撰写 figureMatch：仅根据 user prompt 末尾「原始素材/素材」中的事实选择一位呼应人物。

figureMatch 与 biography 的隔离（硬性）：
- 匹配依据只能是用户提供的原始素材（时间轴节点、访谈、表单等），不得依据 biography 的文风、修辞、标题、意象或「像哪位作家」来选人。
- 即使 biography 写成家传、史传、小品或哲思体，也不得因此选用对应文体代表作家；不得因正文语气像某古人就选该古人。
- reasons 每条须能在原始素材中找到对应事实；禁止引用 biography 中的文学化描写作为匹配理由。

输出必须是合法 JSON，且仅包含两个顶层键：biography、figureMatch。
biography 为纯文本传记正文（格式与常规要求一致，禁止在 biography 内出现 figureMatch 或 JSON）。
figureMatch 须含：kind、name、alias（可空字符串）、era、tagline、reasons（3条字符串数组）、story、bridge、matchScore、disclaimer。

figureMatch 硬性规则：
- reasons 必须 3 条，每条须指向原始素材中的具体事实（职业、经历、时代处境、性格作为等），禁止空泛「都很努力」。
- story 150–250 字，原创概括，禁止大段抄录史书或金庸原文。
- bridge 80–120 字，写主人公与该人物的气质呼应，禁止写「您就是某某转世」。
- 禁止匹配汉奸、奸臣、以暴虐著称者；禁止戏谑用户人生悲剧。
- **禁止**匹配文风模板代表作家（归有光、司马迁、袁宏道、张岱、韩愈、柳宗元等），即使 biography 写成其文体；须从素材事实另选他人。
- 语气尊重、温厚、有趣味，非学术鉴定、非心理测试。`;

const HISTORICAL_STYLE_AUTHOR_BLOCKLIST = [
  "归有光",
  "司马迁",
  "袁宏道",
  "张岱",
  "韩愈",
  "柳宗元",
];

const HISTORICAL_USER_APPEND_BASE = `【本篇须附带·史海知音】
传记写完后，从真实历史人物中选 1 位与主人公人生事实最相近者（全朝代自选）。
figureMatch.kind 固定为 "historical"。
disclaimer 固定为：「此为 AI 基于您提供素材生成的趣味文化呼应，不代表历史评价或人格测试。」

匹配依据（仅原始素材，硬性）：
- 优先看：职业/技艺、谋生方式、时代处境（务工、从军、务农、行商、匠作、读书入仕等）、人生转折与性格作为。
- **绝对禁止**匹配：归有光、司马迁、袁宏道、张岱、韩愈、柳宗元（文风模板作者，非用户人生事实）；不得因 biography 文体像某作家就选该作家。
- 普通人务工、进厂、手艺、回乡谋生：优先匹配有相近处境的工匠、布衣、小吏、务实人物，而非散文家、史学家。
- 素材仅平淡提及父母/家庭、无专门追忆线：不得仅因「有父母、有孩子」就选文学家型人物。`;

function getHistoricalStyleAuthorBlockHint(classicalPick) {
  const names = HISTORICAL_STYLE_AUTHOR_BLOCKLIST.join("、");
  let extra = "";
  if (classicalPick?.main === "zhenchuan") {
    extra = "\n- 本篇 biography 为震川家史体，但 figureMatch 禁止选归有光；须从素材事实另选他人。";
  } else if (classicalPick?.main === "taishigong") {
    extra = "\n- 本篇 biography 为太史公史传体，但 figureMatch 禁止选司马迁；须从素材事实另选他人。";
  } else if (classicalPick?.main === "wanming") {
    extra = "\n- 本篇 biography 为晚明小品体，但 figureMatch 禁止选袁宏道、张岱；须从素材事实另选他人。";
  } else if (classicalPick?.main === "tangsong") {
    extra = "\n- 本篇 biography 为唐宋哲思体，但 figureMatch 禁止选韩愈、柳宗元；须从素材事实另选他人。";
  }
  return `【史海知音·文风作者禁选】
禁止匹配以下人物（本篇文风模板代表，非用户人生事实）：${names}。${extra}`;
}

function pickHistoricalFigureHints(material) {
  const t = String(material || "");
  const candidates = [];

  function add(name, era, note) {
    if (!name || isBlockedStyleAuthor(name)) return;
    if (candidates.some((c) => c.name === name)) return;
    candidates.push({ name, era, note });
  }

  if (/(机械|五金|机床|技术员|技工|售后|维修|工匠|手艺|操作)/.test(t)) {
    add("鲁班", "春秋", "以巧艺立身");
    add("马钧", "三国", "工巧发明");
  }
  if (/(纺织|织|厂|车间)/.test(t)) {
    add("黄道婆", "元代", "纺织革新");
  }
  if (/(南下|打工|务工|谋生|寄钱|离省|回乡|回县)/.test(t)) {
    add("张骞", "汉代", "远行求索");
    add("班超", "东汉", "投笔从戎");
  }
  if (/(教师|教书|讲台|学生|师范)/.test(t)) {
    add("孔子", "春秋", "教化传道");
  }
  if (/(农|种|田|村|县|镇)/.test(t)) {
    add("郑板桥", "清代", "亲民务实");
  }
  if (/(医|护士|药)/.test(t)) {
    add("华佗", "东汉", "行医济世");
  }

  add("颜真卿", "唐代", "担当实干");
  add("王冕", "元代", "布衣自守");

  return candidates.slice(0, 5);
}

function formatHistoricalFigureHints(hints) {
  if (!hints?.length) return "";
  const lines = hints.map((h) => `- ${h.name}（${h.era}·${h.note}）`).join("\n");
  return `【史海知音·素材导向候选】请优先从下列与原始素材事实相近的人物中选 1 位（可不在列表中，但不得选文风作者禁选名单）：\n${lines}`;
}

const JINYONG_USER_APPEND = `【本篇须附带·江湖知音】
传记写完后，从金庸长篇武侠小说中选 1 位角色（figureMatch.kind 固定为 "jinyong"）。
仅依据 user prompt 末尾原始素材中的人生事实与处境匹配，不得依据 biography 的武侠修辞或叙事风格选人。
匹配侠义气质与人生处境，非武功高低；禁止欧阳锋等纯反派；story 原创短述不抄书。
era 固定为「金庸武侠世界」。
disclaimer 固定为：「此为 AI 基于您提供素材生成的趣味文化呼应，不代表对原著人物的官方解读或人格测试。」`;

const WUXIA_TONE_LEGEND = 67;

function normalizeWuxiaToneLocal(tone) {
  const levels = [20, 50, 80];
  const n = Number(tone);
  if (!Number.isFinite(n)) return levels[0];
  return levels.reduce(
    (best, level) => (Math.abs(level - n) < Math.abs(best - n) ? level : best),
    levels[0]
  );
}

function isFigureMatchEnabled(style, wuxiaTone) {
  if (style === "classical") return true;
  if (style === "wuxia" && normalizeWuxiaToneLocal(wuxiaTone) >= WUXIA_TONE_LEGEND) return true;
  return false;
}

function getFigureMatchKind(style, wuxiaTone) {
  if (style === "classical") return "historical";
  if (style === "wuxia" && normalizeWuxiaToneLocal(wuxiaTone) >= WUXIA_TONE_LEGEND) return "jinyong";
  return null;
}

function getFigureMatchUserAppend(kind, options = {}) {
  if (kind === "historical") {
    const hints = pickHistoricalFigureHints(options.material || "");
    const blockHint = getHistoricalStyleAuthorBlockHint(options.classicalPick);
    const hintBlock = formatHistoricalFigureHints(hints);
    return [HISTORICAL_USER_APPEND_BASE, hintBlock, blockHint].filter(Boolean).join("\n\n");
  }
  if (kind === "jinyong") return JINYONG_USER_APPEND;
  return "";
}

function isBlockedStyleAuthor(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  return HISTORICAL_STYLE_AUTHOR_BLOCKLIST.some(
    (blocked) => n === blocked || n.includes(blocked) || blocked.includes(n)
  );
}

function parseJsonResponse(raw) {
  let text = String(raw || "").trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function sanitizeFigureMatch(raw, kind) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name || "").trim().slice(0, 24);
  if (!name) return null;

  let reasons = raw.reasons;
  if (!Array.isArray(reasons)) reasons = [];
  reasons = reasons
    .map((r) => String(r || "").trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);
  while (reasons.length < 3) {
    reasons.push("人生经历与担当精神有相通之处");
  }

  const story = String(raw.story || "").trim().slice(0, 400);
  const bridge = String(raw.bridge || "").trim().slice(0, 200);
  if (story.length < 40 || bridge.length < 20) return null;

  const disclaimer =
    kind === "jinyong"
      ? "此为 AI 基于您提供素材生成的趣味文化呼应，不代表对原著人物的官方解读或人格测试。"
      : "此为 AI 基于您提供素材生成的趣味文化呼应，不代表历史评价或人格测试。";

  return {
    enabled: true,
    kind,
    name,
    alias: String(raw.alias || "").trim().slice(0, 24),
    era: String(raw.era || (kind === "jinyong" ? "金庸武侠世界" : "")).trim().slice(0, 24),
    tagline: String(raw.tagline || "").trim().slice(0, 30),
    reasons,
    story,
    bridge,
    matchScore: String(raw.matchScore || "气质相近").trim().slice(0, 12),
    disclaimer,
  };
}

function filterFigureMatch(match) {
  if (!match) return null;
  const blob = [match.name, match.alias, match.tagline, match.story, match.bridge, ...(match.reasons || [])].join(
    "\n"
  );
  const check = filterOutput(blob);
  if (!check.allowed) return null;
  return match;
}

function parseBiographyWithFigureMatch(raw, kind) {
  const parsed = parseJsonResponse(raw);
  if (!parsed) {
    return { biography: String(raw || "").trim(), figureMatch: null, parseFailed: true };
  }

  const biography = String(parsed.biography || parsed.content || "").trim();
  if (!biography) {
    return { biography: "", figureMatch: null, parseFailed: true };
  }

  let figureMatch = sanitizeFigureMatch(parsed.figureMatch, kind);
  figureMatch = filterFigureMatch(figureMatch);

  return { biography, figureMatch, parseFailed: false };
}

module.exports = {
  FIGURE_MATCH_SYSTEM_APPEND,
  isFigureMatchEnabled,
  getFigureMatchKind,
  getFigureMatchUserAppend,
  pickHistoricalFigureHints,
  parseBiographyWithFigureMatch,
  WUXIA_TONE_LEGEND,
};
