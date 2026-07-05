function scoreSegmentText(text) {
  const t = String(text || "").trim();
  if (!t) return 0;

  let score = Math.min(Math.floor(t.length / 25), 12);
  if (t.length >= 80) score += 4;
  if (t.length >= 160) score += 3;
  if (/["""「『''']/.test(t)) score += 6;
  if (/[\u4e00-\u9fa5]{2,4}(师傅|老师|同事|同学|工友|爹|娘|父|母|哥|姐)/.test(t)) score += 4;
  if (/(说|问|答|喊|骂|笑|嘱咐|叮嘱)/.test(t)) score += 2;
  return score;
}

function parseMaterialSegments(material) {
  const text = String(material || "");
  const segments = [];
  const re = /【([^】]+)】(（[^）]*）)?\n([\s\S]*?)(?=\n\n【|$)/g;
  let match = re.exec(text);

  while (match) {
    const label = match[1].trim();
    const body = (match[3] || "").trim();
    if (label === "主人公" || label === "系统说明") {
      match = re.exec(text);
      continue;
    }
    segments.push({
      label,
      date: (match[2] || "").replace(/[（）]/g, "").trim(),
      text: body,
      score: scoreSegmentText(`${label}\n${body}`),
    });
    match = re.exec(text);
  }

  if (segments.length) return segments;

  const blocks = text.split(/\n\n+/).filter((b) => b.trim().length >= 12);
  return blocks.slice(0, 8).map((block, index) => ({
    label: `段落${index + 1}`,
    date: "",
    text: block.trim(),
    score: scoreSegmentText(block),
  }));
}

function normalizeStyleKey(style) {
  if (style === "qiongyao") return "yanqing";
  return style;
}

function shouldUseLegendPacing(style, wuxiaTone, yanqingTone, normalizeWuxiaTone, normalizeYanqingTone) {
  const s = normalizeStyleKey(style);
  if (s === "classical" || s === "xuanhuan") return true;
  if (s === "yanqing") return normalizeYanqingTone(yanqingTone) >= 50;
  if (s === "wuxia" && normalizeWuxiaTone(wuxiaTone) >= 67) return true;
  return false;
}

function getClassicalPacingLabel(pick) {
  if (!pick) return "震川风";
  if (pick.main === "taishigong") return "太史公风";
  if (pick.main === "wanming") return pick.sub === "zhang" ? "晚明·张岱式" : "晚明·袁宏道式";
  if (pick.main === "tangsong") return pick.sub === "liu" ? "唐宋·柳宗元式" : "唐宋·韩愈式";
  return "震川风";
}

function buildClassicalPacingHint(ctx, classicalPick) {
  const label = getClassicalPacingLabel(classicalPick);
  const main = classicalPick?.main || "zhenchuan";

  let detailHint = "重点阶段可略细写，其余宜简，以文气胜。";
  if (main === "taishigong") detailHint = "时代脉络与命运转折可细写 2–3 处；终须太史公曰。";
  if (main === "zhenchuan") detailHint = "日常碎片、旧物、家常话宜细写 1–2 处；忌铺陈。";
  if (main === "wanming") detailHint = "段落宜短；抓取 2–3 个有趣或梦忆瞬间。";
  if (main === "tangsong") detailHint = "一事一技宜细写 1–2 处；论说点睛一句即可。";

  const antiNodeHint =
    "禁止一段一节点、禁止段首「年X（YYYY）」或「阶段名+（年份）」；须重述为场景叙事，勿逐条翻译素材。";

  if (!ctx) {
    return `【节奏提示·文言${label}】${detailHint} 句法须有文言质感；今物今词可保留，勿白话流水句。${antiNodeHint}\n\n`;
  }

  return `【节奏提示·文言${label}·系统自动判定，勿向用户确认】
1. 分段/节数随素材：约 ${ctx.chapterMax} 段叙述（非一节点一段）；${ctx.mergeHint}
2. 下列阶段信息较丰，宜在叙述中自然融入其细节，勿以其名为段首、勿机械一段对应一节点：${ctx.keyLabels.join("、")}
3. ${detailHint}
4. 相邻两段禁止同起笔、同收束模板；素材节点日期仅供排序，禁止复制到段首（含干支括注公历）。
5. ${antiNodeHint}

`;
}

function computePacingContext(material) {
  const segments = parseMaterialSegments(material);
  if (!segments.length) return null;

  const ranked = [...segments].sort((a, b) => b.score - a.score);
  const keySegments = ranked.filter((s) => s.score >= 8).slice(0, 2);
  const fallbackKeys = keySegments.length ? keySegments : ranked.slice(0, Math.min(2, ranked.length));
  const substantial = segments.filter((s) => s.score >= 6 || s.text.length >= 50);
  const thin = segments.filter((s) => s.score < 6 && s.text.length < 50);

  let chapterMax = Math.min(Math.max(1, Math.ceil(substantial.length / 2)), 4);
  if (segments.length <= 2) chapterMax = 1;
  else if (segments.length <= 4) chapterMax = Math.min(chapterMax, 2);

  const keyLabels = fallbackKeys.map((s) => `「${s.label}」`);

  const mergeHint =
    thin.length > 0
      ? `另有 ${thin.length} 处素材较简略（如 ${thin
          .slice(0, 2)
          .map((s) => s.label)
          .join("、")}），宜合并进相邻章节快切带过，勿单独成章。`
      : "相邻阶段可合并叙述，不必一节点一章。";

  return { chapterMax, keyLabels, mergeHint };
}

function buildDefaultPacingHint(style, ctx) {
  const tensionLabel =
    style === "yanqing" ? "情感张力点" : style === "xuanhuan" ? "心魔劫/试炼" : "关隘/张力点";

  if (!ctx) {
    const emptyTail =
      style === "xuanhuan"
        ? "全文累计 3–4 段内外对照细写即可，每章末须有一句悟道收束，终章不写道评块。"
        : "全文累计 3–4 段细写即可，终章以收束为主、勿再大段细写。";
    return `【节奏提示】章数随素材而定，可 1–3 章 + 终章；禁止为凑章节重复同一写法。${emptyTail}\n\n`;
  }

  return `【节奏提示·系统自动判定，勿向用户确认】
1. 建议章回数：约 ${ctx.chapterMax} 章正文 + 终章（素材少时可仅 1 章 + 终章）；${ctx.mergeHint}
2. 重点细写章（固定规则：素材信息最丰富的 2 个阶段）：${ctx.keyLabels.join("、")}——仅此 2 章可安排完整细写场景（每章 1–2 段，80–150 字/段）；其余章节以叙事推进、对话或快切为主，禁止章章同密度。
3. 全书累计：细写段 3–4 段、引号对话 ≥3 段、${tensionLabel} 2–3 处即可，勿每章机械凑齐。
4. 相邻两章禁止同开篇（忌连续「环境长句起笔」或「XXXX年/月起句」）与同收束（忌连续「意象金句收尾」）；终章禁止再上大段细写。素材节点日期仅供排序，禁止复制到章首起句。

`;
}

function buildYanqingPacingHint(ctx) {
  if (!ctx) {
    return `【节奏提示·言情虐恋深情档】幕数随素材而定，可 1–3 幕 + 终章；禁止流水线「误会→分离→重逢」套同一模板。须写 3–4 段关系细写、≥4 段对话、≥3 处内心独白；禁止江湖化起笔与古龙留白。\n\n`;
  }

  return `【节奏提示·言情虐恋深情档·系统自动判定，勿向用户确认】
1. 建议分幕数：约 ${ctx.chapterMax} 幕正文 + 终章；${ctx.mergeHint} 幕名须带情感场景（如雨夜、车站、老院），禁「入道、历练、破关」类词。
2. 重点细写幕：${ctx.keyLabels.join("、")}——仅此 2 幕可安排完整关系细写（每幕 1–2 段）；其余幕以对话、闪回、书信体或季节快切推进。
3. 全书累计：关系细写 3–4 段；引号对话 ≥4；内心独白 ≥3；情感张力点 ≥3；信物/场景呼应 ≥1。
4. 写法池至少 3 种（对话推进 / 回忆闪回 / 书信便签 / 单场景细写 / 物件快切），相邻两幕禁止同起笔（含禁止各幕首段「XXXX年/月」起句）与同收束。
5. 禁止江湖语汇、古龙短句、关隘/侠气比喻；终章可加强虐恋浓度但须扣素材人物。

`;
}

function buildXuanhuanPacingHint(ctx, authorStyle) {
  const styleLabel =
    authorStyle === "chendong" ? "史诗群像流（辰东式）" : "凡人流（忘语式）";
  const styleNote =
    authorStyle === "chendong"
      ? "宏阔起笔与排比可多用，但须扣素材时代与地域。"
      : "段落宜偏短，突出算计、隐忍、资源与代价，忌热血口号。";

  if (!ctx) {
    return `【节奏提示·玄幻专用·${styleLabel}】章数随素材而定，可 1–3 章 + 终章；禁止流水线境界章名。须写至少 2 处心魔劫/破境具体场景（各≥80字）；3–4 段内外对照细写；每章末悟道句融入正文；无道评块。开卷语与首段同频。${styleNote}\n\n`;
  }

  return `【节奏提示·玄幻专用·${styleLabel}·系统自动判定，勿向用户确认】
1. 建议章回数：约 ${ctx.chapterMax} 章正文 + 终章；${ctx.mergeHint} 章名从素材取意象，禁灵根/筑基/炼器/化神式流水线。
2. 重点悟境章：${ctx.keyLabels.join("、")}——仅此 2 章可安排完整内外对照细写（每章 1–2 段）；其余章按${styleLabel}写法池推进。
3. 全书累计：内外对照细写 3–4 段；引号对话 ≥3；**心魔劫/破境瞬间 ≥2 处**（各须写具体事件、压力、动摇、破境一瞬，不可概括）；天地—人间对照 ≥4；道号/修名呼应 ≥2。
4. 相邻两章禁止同模板起笔/收束（含禁止各章首段「XXXX年/月」起句）；禁止连续两章同一式「境界突破」。
5. 开卷语与第一章首段同频；终章宿命收束，末句最强悟道，禁止道评块与禁用套话。${styleNote}

`;
}

function buildLegendPacingHint({
  source,
  material,
  style,
  wuxiaTone,
  yanqingTone,
  normalizeWuxiaTone,
  normalizeYanqingTone,
  xuanhuanAuthorStyle,
  classicalPick,
}) {
  const s = normalizeStyleKey(style);
  if (!shouldUseLegendPacing(s, wuxiaTone, yanqingTone, normalizeWuxiaTone, normalizeYanqingTone)) {
    return "";
  }

  const ctx = computePacingContext(material);

  if (s === "classical") {
    return buildClassicalPacingHint(ctx, classicalPick);
  }

  if (s === "xuanhuan") {
    return buildXuanhuanPacingHint(ctx, xuanhuanAuthorStyle);
  }

  if (s === "yanqing") {
    return buildYanqingPacingHint(ctx);
  }

  return buildDefaultPacingHint(s, ctx);
}

module.exports = {
  buildLegendPacingHint,
  parseMaterialSegments,
  scoreSegmentText,
};
