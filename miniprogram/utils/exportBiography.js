const { parseBiographyContent, extractSubjectNameFromTitle, inferClassicalMainTitle } = require("./bioContentFormat");
const { loadHeroCalligraphyFont, HERO_FONT_FAMILY } = require("./heroFont");
const { loadCommentFont, COMMENT_FONT_FAMILY } = require("./commentFont");
const { getHomeQrLocalPath } = require("./shareBio");

const FOOTER_HEIGHT = 200;
const QR_SIZE = 120;

function wrapText(ctx, text, maxWidth, firstLineIndent = 0) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, pIndex) => {
    if (!paragraph) {
      if (pIndex < paragraphs.length - 1) lines.push({ text: "", indent: 0 });
      return;
    }

    let line = "";
    let isFirstLineOfParagraph = true;

    for (const char of paragraph) {
      const test = line + char;
      const indent = isFirstLineOfParagraph ? firstLineIndent : 0;
      const limit = maxWidth - indent;

      if (ctx.measureText(test).width > limit && line) {
        lines.push({ text: line, indent: isFirstLineOfParagraph ? firstLineIndent : 0 });
        line = char;
        isFirstLineOfParagraph = false;
      } else {
        line = test;
      }
    }

    if (line) {
      lines.push({
        text: line,
        indent: isFirstLineOfParagraph ? firstLineIndent : 0,
      });
    }

    if (pIndex < paragraphs.length - 1) {
      lines.push({ text: "", indent: 0 });
    }
  });

  return lines;
}

function measureBlockLines(ctx, block, maxTextWidth, sizes) {
  const { bodySize, mainTitleSize, chapterSize, commentSize, hookSize, commentLineSize } =
    sizes;
  const indent = Math.round(bodySize * 2);

  switch (block.type) {
    case "main-title":
      ctx.setFontSize(mainTitleSize);
      return wrapText(ctx, block.text, maxTextWidth).map((line) => ({
        ...line,
        fontSize: mainTitleSize,
        align: "center",
        color: "#3d2b1f",
        bold: true,
        gapAfter: 16,
      }));
    case "chapter":
      ctx.setFontSize(chapterSize);
      return wrapText(ctx, block.text, maxTextWidth).map((line) => ({
        ...line,
        fontSize: chapterSize,
        align: "center",
        color: "#3d2b1f",
        bold: true,
        gapBefore: 24,
        gapAfter: 12,
      }));
    case "comment-label":
      ctx.setFontSize(commentSize);
      return [
        {
          text: block.text,
          indent: 0,
          fontSize: commentSize,
          align: "center",
          color: "#8b6914",
          fontFamily: COMMENT_FONT_FAMILY,
          gapBefore: 24,
          gapAfter: 8,
        },
      ];
    case "hook":
      ctx.setFontSize(hookSize);
      return wrapText(ctx, block.text, maxTextWidth, indent).map((line, index) => ({
        ...line,
        fontSize: hookSize,
        align: "left",
        color: "#5c4a3a",
        fontFamily: HERO_FONT_FAMILY,
        gapBefore: index === 0 ? 8 : 0,
        gapAfter: 4,
      }));
    case "comment-line":
      ctx.setFontSize(commentLineSize);
      return wrapText(ctx, block.text, maxTextWidth, indent).map((line) => ({
        ...line,
        fontSize: commentLineSize,
        align: "left",
        color: "#6b5344",
        fontFamily: COMMENT_FONT_FAMILY,
        gapAfter: 4,
      }));
    default:
      ctx.setFontSize(bodySize);
      return wrapText(ctx, block.text, maxTextWidth, indent).map((line) => ({
        ...line,
        fontSize: bodySize,
        align: "left",
        color: "#3d2b1f",
        gapAfter: 4,
      }));
  }
}

function drawExportFooter(ctx, width, height, qrPath) {
  const padding = 48;
  const footerTop = height - FOOTER_HEIGHT;

  ctx.setFillStyle("#f5efe6");
  ctx.fillRect(0, footerTop, width, FOOTER_HEIGHT);

  ctx.setStrokeStyle("#e8dfd3");
  ctx.beginPath();
  ctx.moveTo(padding, footerTop + 8);
  ctx.lineTo(width - padding, footerTop + 8);
  ctx.stroke();

  ctx.setFillStyle("#3d2b1f");
  ctx.setFontSize(28);
  ctx.setTextAlign("left");
  ctx.fillText("人生传记", padding, footerTop + 52);

  ctx.setFillStyle("#8b7355");
  ctx.setFontSize(22);
  ctx.fillText("记录故事 · 传承记忆", padding, footerTop + 88);
  ctx.fillText("扫码开始创作您的传记", padding, footerTop + 122);

  if (qrPath) {
    ctx.drawImage(qrPath, width - padding - QR_SIZE, footerTop + 36, QR_SIZE, QR_SIZE);
  }
}

function exportBiographyToImage({ title, content, styleLabel, sourceLabel }) {
  const qrPromise = getHomeQrLocalPath().catch(() => null);

  return Promise.all([loadHeroCalligraphyFont(), loadCommentFont(), qrPromise]).then(
    ([, , qrPath]) =>
      new Promise((resolve, reject) => {
        const padding = 48;
        const width = 750;
        const maxTextWidth = width - padding * 2;
        const bodySize = 28;
        const mainTitleSize = 40;
        const chapterSize = 32;
        const commentSize = 30;
        const hookSize = Math.round(bodySize * 1.05);
        const commentLineSize = Math.round(bodySize * 1.1);
        const lineHeight = 38;
        const sizes = {
          bodySize,
          mainTitleSize,
          chapterSize,
          commentSize,
          hookSize,
          commentLineSize,
        };

        const subjectName = extractSubjectNameFromTitle(title);
        let blocks = parseBiographyContent(content || "", { subjectName });
        const hasContentTitle = blocks.some((b) => b.type === "main-title");
        if (!hasContentTitle) {
          const inferred = inferClassicalMainTitle(content || "", subjectName);
          if (inferred) {
            blocks = [{ type: "main-title", text: inferred }, ...blocks];
          } else if (title) {
            blocks = [{ type: "main-title", text: title }, ...blocks];
          }
        }

        const ctx = wx.createCanvasContext("exportCanvas");
        const drawLines = [];
        let totalLines = 0;
        const maxLines = 220;

        blocks.forEach((block) => {
          const blockLines = measureBlockLines(ctx, block, maxTextWidth, sizes);
          blockLines.forEach((line) => {
            if (totalLines >= maxLines) return;
            drawLines.push(line);
            totalLines += 1;
          });
        });

        if (totalLines >= maxLines) {
          const last = drawLines[drawLines.length - 1];
          if (last) last.text = `${last.text || ""}……（内容过长已截断）`;
        }

        const meta = [styleLabel, sourceLabel].filter(Boolean).join(" · ");
        let height = padding;
        height += meta ? lineHeight + 16 : 0;
        height += 24;
        drawLines.forEach((line) => {
          height += (line.gapBefore || 0) + lineHeight + (line.gapAfter || 0);
        });
        height += padding;
        height += FOOTER_HEIGHT;
        height = Math.min(Math.max(height, 800 + FOOTER_HEIGHT), 12000);

        ctx.setFillStyle("#faf6f0");
        ctx.fillRect(0, 0, width, height);

        let y = padding;

        if (meta) {
          ctx.setFillStyle("#8b7355");
          ctx.setFontSize(24);
          ctx.setTextAlign("left");
          ctx.fillText(meta, padding, y + 24);
          y += lineHeight + 8;
        }

        ctx.setStrokeStyle("#e8dfd3");
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        y += 28;

        drawLines.forEach((line) => {
          y += line.gapBefore || 0;
          ctx.setFillStyle(line.color || "#3d2b1f");
          const fontSize = line.fontSize || bodySize;
          if (line.fontFamily) {
            ctx.font = `normal ${fontSize}px ${line.fontFamily}, sans-serif`;
          } else {
            ctx.setFontSize(fontSize);
          }
          const x =
            line.align === "center" ? width / 2 : padding + (line.indent || 0);
          ctx.setTextAlign(line.align === "center" ? "center" : "left");
          ctx.fillText(line.text || " ", x, y + fontSize);
          ctx.setTextAlign("left");
          y += lineHeight + (line.gapAfter || 0);
        });

        drawExportFooter(ctx, width, height, qrPath);

        ctx.draw(false, () => {
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvasId: "exportCanvas",
              width,
              height,
              destWidth: width * 2,
              destHeight: height * 2,
              success: (res) => resolve(res.tempFilePath),
              fail: reject,
            });
          }, 300);
        });
      })
  );
}

function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes("auth deny")) {
          wx.showModal({
            title: "需要相册权限",
            content: "请在设置中允许保存到相册，以便导出传记长图",
            confirmText: "去设置",
            success: (res) => {
              if (res.confirm) wx.openSetting({});
            },
          });
        }
        reject(err);
      },
    });
  });
}

function exportAndSaveBiography(options) {
  return exportBiographyToImage(options).then((filePath) => saveImageToAlbum(filePath));
}

module.exports = {
  exportBiographyToImage,
  saveImageToAlbum,
  exportAndSaveBiography,
};
