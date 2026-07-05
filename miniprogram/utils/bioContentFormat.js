function stripInlineMarkdown(text) {
  return String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .trim();
}

const LEADING_INDENT_RE =
  /^[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]+/;

const COMMENT_LABELS = ["江湖评语", "情笺结语", "道评", "太史公曰"];

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCommentSectionHeading(trimmed, label) {
  const escaped = escapeRegExp(label);
  return (
    new RegExp(`^(\\*\\*)?${escaped}(\\*\\*)?$`).test(trimmed) ||
    new RegExp(`^##\\s*${escaped}\\s*$`).test(trimmed) ||
    new RegExp(`^(\\*\\*)?${escaped}(\\*\\*)?[：:]\\s*$`).test(trimmed)
  );
}

function parseCommentSectionLine(trimmed, label) {
  const escaped = escapeRegExp(label);
  const match = trimmed.match(new RegExp(`^(\\*\\*)?${escaped}(\\*\\*)?[：:]\\s*(.*)$`));
  if (!match) return null;
  return { label, rest: (match[3] || "").trim() };
}

function matchCommentSection(trimmed) {
  for (let i = 0; i < COMMENT_LABELS.length; i += 1) {
    const label = COMMENT_LABELS[i];
    if (isCommentSectionHeading(trimmed, label)) {
      return { label, rest: "" };
    }
    const parsed = parseCommentSectionLine(trimmed, label);
    if (parsed) return parsed;
  }
  return null;
}

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

/** 文言等无 markdown 时的总题：赵家传、某某小传、《某某传》 */
function isStandaloneMainTitle(trimmed) {
  const t = stripInlineMarkdown(trimmed);
  if (!t || t.length < 2 || t.length > 24) return false;
  if (/[。！？；：，、]/.test(t)) return false;
  if (/^《[^》]{1,16}》$/.test(t)) return true;
  if (/^[^《》\n]{1,20}(?:传|家传|小传|事略|行述|江湖录|修行录|道纪|渡劫记|纪|录|略)$/.test(t)) return true;
  return false;
}

function inferClassicalMainTitle(raw, subjectName) {
  const firstLine = String(raw || "")
    .split("\n")
    .map((line) => stripLineLeadingIndent(line.trim()))
    .find(Boolean);
  if (firstLine && isStandaloneMainTitle(firstLine)) {
    return stripInlineMarkdown(firstLine);
  }

  const name = String(subjectName || "").trim();
  if (name.length >= 2 && name.length <= 8) {
    return `${name}传`;
  }

  if (!firstLine) return "";
  const match = firstLine.match(/^([\u4e00-\u9fa5·]{2,8})者[，,]/);
  if (match) return `${match[1]}传`;
  return "";
}

function extractSubjectNameFromTitle(title) {
  const m = String(title || "").match(/^(.+?)的人生传记$/);
  return m ? m[1].trim() : "";
}

function finalizeBlocks(blocks, meta = {}) {
  let result = blocks.slice();
  let hasMainTitle = result.some((b) => b.type === "main-title");
  const hasChapter = result.some((b) => b.type === "chapter");

  if (!hasMainTitle && result[0]?.type === "paragraph") {
    const lines = result[0].text.split("\n");
    const head = lines[0]?.trim();
    if (head && isStandaloneMainTitle(head)) {
      const rest = lines.slice(1).join("\n").trim();
      result = [{ type: "main-title", text: head }];
      if (rest) result.push({ type: "paragraph", text: rest });
      result = result.concat(blocks.slice(1));
      hasMainTitle = true;
    }
  }

  if (!hasMainTitle) {
    const inferred = inferClassicalMainTitle(meta.raw, meta.subjectName);
    if (inferred) {
      result.unshift({ type: "main-title", text: inferred });
      hasMainTitle = true;
    }
  }

  if (!hasChapter && hasMainTitle) {
    result = result.map((block) => {
      if (block.type === "hook") {
        return { type: "paragraph", text: block.text };
      }
      return block;
    });
  }

  return result;
}

function isChapterLine(trimmed) {
  if (!/^##(?!#)\s*/.test(trimmed)) return false;
  return !COMMENT_LABELS.some((label) => isCommentSectionHeading(trimmed, label));
}

function stripHeadingMarks(line, level) {
  if (level === 2) return line.replace(/^##(?!#)\s*/, "");
  return line.replace(/^#(?!#)\s*/, "");
}

/** 结语拆行：尊重 AI 换行，仅在整句末尾断行，不在逗号处硬拆 */
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

function flushPreChapterContent(blocks, hookLinesRef, asHook) {
  const text = normalizeParagraphText(hookLinesRef.lines.join("\n"));
  hookLinesRef.lines = [];
  if (!text || text === "---") return;
  blocks.push({ type: asHook ? "hook" : "paragraph", text });
}

function hasChapterHeadings(raw) {
  return String(raw || "")
    .split("\n")
    .some((line) => isChapterLine(stripLineLeadingIndent(line.trim())));
}

function parseBiographyContent(raw, options = {}) {
  const subjectName = options.subjectName || "";
  const willHaveChapters = hasChapterHeadings(raw);
  const lines = String(raw || "").split("\n");
  const blocks = [];
  const hookLines = { lines: [] };
  let paraLines = [];
  let afterMainTitle = false;
  let sawChapter = false;
  let inCommentSection = false;
  let seenContent = false;

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

  function flushHookBeforeChapter() {
    flushPreChapterContent(blocks, hookLines, true);
  }

  function flushPreChapterParagraph() {
    flushPreChapterContent(blocks, hookLines, false);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = stripLineLeadingIndent(lines[i].trim());

    if (trimmed === "---") {
      flushParagraph();
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      if (afterMainTitle && !sawChapter && hookLines.lines.length) {
        if (!willHaveChapters) {
          flushPreChapterParagraph();
        }
      }
      continue;
    }

    if (isMainTitleLine(trimmed)) {
      flushParagraph();
      flushHookBeforeChapter();
      inCommentSection = false;
      blocks.push({
        type: "main-title",
        text: normalizeParagraphText(stripHeadingMarks(trimmed, 1)),
      });
      afterMainTitle = true;
      seenContent = true;
      continue;
    }

    if (!seenContent && isStandaloneMainTitle(trimmed)) {
      flushParagraph();
      flushHookBeforeChapter();
      inCommentSection = false;
      blocks.push({
        type: "main-title",
        text: normalizeParagraphText(trimmed),
      });
      afterMainTitle = true;
      seenContent = true;
      continue;
    }

    seenContent = true;

    if (isChapterLine(trimmed)) {
      flushParagraph();
      flushHookBeforeChapter();
      sawChapter = true;
      afterMainTitle = false;
      inCommentSection = false;
      blocks.push({
        type: "chapter",
        text: normalizeParagraphText(stripHeadingMarks(trimmed, 2)),
      });
      continue;
    }

    const commentSection = matchCommentSection(trimmed);
    if (commentSection) {
      flushParagraph();
      flushHookBeforeChapter();
      afterMainTitle = false;
      inCommentSection = true;
      blocks.push({ type: "comment-label", text: commentSection.label });
      if (commentSection.rest) {
        pushCommentLines(blocks, commentSection.rest);
      }
      continue;
    }

    if (afterMainTitle && !sawChapter) {
      hookLines.lines.push(trimmed);
      continue;
    }

    paraLines.push(trimmed);
  }

  flushParagraph();
  if (hookLines.lines.length) {
    flushPreChapterContent(blocks, hookLines, willHaveChapters && !sawChapter);
  }

  if (!sawChapter) {
    const mapped = blocks.map((block) => {
      if (block.type === "hook") {
        return { type: "paragraph", text: block.text };
      }
      return block;
    });
    return finalizeBlocks(mapped, { raw, subjectName });
  }

  return finalizeBlocks(blocks, { raw, subjectName });
}

module.exports = {
  parseBiographyContent,
  stripInlineMarkdown,
  normalizeParagraphText,
  splitPoetryLines,
  inferClassicalMainTitle,
  extractSubjectNameFromTitle,
  COMMENT_LABELS,
};
