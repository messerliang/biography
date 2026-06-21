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

function buildLegendPacingHint({ source, material, style, wuxiaTone, normalizeWuxiaTone }) {
  if (style !== "wuxia" || normalizeWuxiaTone(wuxiaTone) < 67) return "";

  const segments = parseMaterialSegments(material);
  if (!segments.length) {
    return `【节奏提示】章数随素材而定，可 1–3 章 + 终章；禁止为凑章节重复同一写法。全文累计 3–4 段细写即可，终章以收束为主、勿再大段细写。\n\n`;
  }

  const ranked = [...segments].sort((a, b) => b.score - a.score);
  const keySegments = ranked.filter((s) => s.score >= 8).slice(0, 2);
  const fallbackKeys = keySegments.length ? keySegments : ranked.slice(0, Math.min(2, ranked.length));
  const substantial = segments.filter((s) => s.score >= 6 || s.text.length >= 50);
  const thin = segments.filter((s) => s.score < 6 && s.text.length < 50);

  let chapterMax = Math.min(Math.max(1, Math.ceil(substantial.length / 2)), 4);
  if (segments.length <= 2) chapterMax = 1;
  else if (segments.length <= 4) chapterMax = Math.min(chapterMax, 2);

  const keyLabels = fallbackKeys.map((s) => {
    const datePart = s.date ? `（${s.date}）` : "";
    return `「${s.label}」${datePart}`;
  });

  const mergeHint =
    thin.length > 0
      ? `另有 ${thin.length} 处素材较简略（如 ${thin
          .slice(0, 2)
          .map((s) => s.label)
          .join("、")}），宜合并进相邻章节快切带过，勿单独成章。`
      : "相邻阶段可合并叙述，不必一节点一章。";

  return `【节奏提示·系统自动判定，勿向用户确认】
1. 建议章回数：约 ${chapterMax} 章正文 + 终章（素材少时可仅 1 章 + 终章）；${mergeHint}
2. 重点细写章（固定规则：素材信息最丰富的 2 个阶段）：${keyLabels.join("、")}——仅此 2 章可安排完整细写场景（每章 1–2 段，80–150 字/段）；其余章节以叙事推进、对话或快切为主，禁止章章同密度。
3. 全书累计：细写段 3–4 段、引号对话 ≥3 段、关隘/张力点 2–3 处即可，勿每章机械凑齐。
4. 相邻两章禁止同开篇（忌连续「环境长句起笔」）与同收束（忌连续「意象金句收尾」）；终章禁止再上大段细写。

`;
}

module.exports = {
  buildLegendPacingHint,
  parseMaterialSegments,
  scoreSegmentText,
};
