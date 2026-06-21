function stripInlineMarkdown(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

const LEADING_INDENT_RE =
  /^[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]+/;

function stripLineLeadingIndent(line) {
  return String(line || "").replace(LEADING_INDENT_RE, "");
}

/** 去掉 AI 手打的段首空格/全角空格，避免与展示层缩进叠加 */
function normalizeParagraphText(text) {
  return stripInlineMarkdown(text)
    .split("\n")
    .map(stripLineLeadingIndent)
    .join("\n")
    .trim();
}

function isMainTitleLine(trimmed) {
  return /^#(?!#)\s*/.test(trimmed);
}

function isChapterLine(trimmed) {
  return /^##(?!#)\s*/.test(trimmed) && !/^##\s*江湖评语\s*$/.test(trimmed);
}

function isCommentLabelOnly(trimmed) {
  return (
    /^(\*\*)?江湖评语(\*\*)?$/.test(trimmed) ||
    /^##\s*江湖评语\s*$/.test(trimmed) ||
    /^(\*\*)?江湖评语(\*\*)?[：:]\s*$/.test(trimmed)
  );
}

function parseCommentLabelLine(trimmed) {
  const match = trimmed.match(/^(\*\*)?江湖评语(\*\*)?[：:]\s*(.*)$/);
  if (!match) return null;
  return { rest: (match[3] || "").trim() };
}

function stripHeadingMarks(line, level) {
  if (level === 2) return line.replace(/^##(?!#)\s*/, "");
  return line.replace(/^#(?!#)\s*/, "");
}

/** 江湖评语拆行：尊重 AI 换行，仅在整句末尾断行，不在逗号处硬拆 */
function cleanPoetryLine(line) {
  return String(line || "").trim();
}

function splitPoetryLines(text) {
  const normalized = normalizeParagraphText(text);
  if (!normalized) return [];

  const lines = [];

  normalized.split(/\n+/).forEach((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    trimmed.split(/(?<=[。！？])/).forEach((sentence) => {
      const line = cleanPoetryLine(sentence);
      if (line) lines.push(line);
    });
  });

  return lines.length ? lines : [normalized];
}

function pushCommentLines(blocks, text) {
  splitPoetryLines(text).forEach((line) => {
    blocks.push({ type: "comment-line", text: line });
  });
}

function parseBiographyContent(raw) {
  const lines = String(raw || "").split("\n");
  const blocks = [];
  let hookLines = [];
  let paraLines = [];
  let afterMainTitle = false;
  let sawChapter = false;
  let inCommentSection = false;

  function flushParagraph() {
    const text = normalizeParagraphText(paraLines.join("\n"));
    paraLines = [];
    if (!text || text === "---") return;

    if (inCommentSection) {
      pushCommentLines(blocks, text);
      return;
    }

    blocks.push({ type: "paragraph", text });
  }

  function flushHook() {
    const text = normalizeParagraphText(hookLines.join("\n"));
    hookLines = [];
    if (!text || text === "---") return;
    blocks.push({ type: "hook", text });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = stripLineLeadingIndent(lines[i].trim());

    if (trimmed === "---") {
      flushParagraph();
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isMainTitleLine(trimmed)) {
      flushParagraph();
      flushHook();
      inCommentSection = false;
      blocks.push({
        type: "main-title",
        text: normalizeParagraphText(stripHeadingMarks(trimmed, 1)),
      });
      afterMainTitle = true;
      continue;
    }

    if (isChapterLine(trimmed)) {
      flushParagraph();
      flushHook();
      sawChapter = true;
      afterMainTitle = false;
      inCommentSection = false;
      blocks.push({
        type: "chapter",
        text: normalizeParagraphText(stripHeadingMarks(trimmed, 2)),
      });
      continue;
    }

    if (isCommentLabelOnly(trimmed)) {
      flushParagraph();
      flushHook();
      afterMainTitle = false;
      inCommentSection = true;
      blocks.push({ type: "comment-label", text: "江湖评语" });
      continue;
    }

    const commentLine = parseCommentLabelLine(trimmed);
    if (commentLine) {
      flushParagraph();
      flushHook();
      afterMainTitle = false;
      inCommentSection = true;
      blocks.push({ type: "comment-label", text: "江湖评语" });
      if (commentLine.rest) {
        pushCommentLines(blocks, commentLine.rest);
      }
      continue;
    }

    if (afterMainTitle && !sawChapter) {
      hookLines.push(trimmed);
      continue;
    }

    paraLines.push(trimmed);
  }

  flushParagraph();
  flushHook();

  if (!sawChapter) {
    return blocks.map((block) => {
      if (block.type === "hook") {
        return { type: "hook", text: block.text };
      }
      return block;
    });
  }

  return blocks;
}

module.exports = {
  parseBiographyContent,
  stripInlineMarkdown,
  normalizeParagraphText,
  splitPoetryLines,
};
