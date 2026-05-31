function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, pIndex) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    for (const char of paragraph) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (pIndex < paragraphs.length - 1) lines.push("");
  });

  return lines;
}

function exportBiographyToImage({ title, content, styleLabel, sourceLabel }) {
  return new Promise((resolve, reject) => {
    const padding = 48;
    const width = 750;
    const maxTextWidth = width - padding * 2;
    const titleSize = 36;
    const metaSize = 24;
    const bodySize = 28;
    const lineHeight = 44;

    const ctx = wx.createCanvasContext("exportCanvas");
    ctx.setFontSize(titleSize);
    const titleLines = wrapText(ctx, title || "人生传记", maxTextWidth);
    ctx.setFontSize(bodySize);
    let bodyLines = wrapText(ctx, content || "", maxTextWidth);
    if (bodyLines.length > 180) {
      bodyLines = bodyLines.slice(0, 180);
      bodyLines[179] = `${bodyLines[179] || ""}……（内容过长已截断）`;
    }

    const meta = [styleLabel, sourceLabel].filter(Boolean).join(" · ");
    let height = padding;
    height += titleLines.length * (lineHeight + 8) + 8;
    if (meta) height += lineHeight;
    height += 48 + bodyLines.length * lineHeight + padding;
    height = Math.min(Math.max(height, 800), 12000);

    ctx.setFillStyle("#faf6f0");
    ctx.fillRect(0, 0, width, height);

    let y = padding;
    ctx.setFillStyle("#3d2b1f");
    ctx.setFontSize(titleSize);
    ctx.setTextAlign("left");
    titleLines.forEach((line) => {
      ctx.fillText(line, padding, y + titleSize);
      y += lineHeight + 8;
    });

    if (meta) {
      y += 8;
      ctx.setFillStyle("#8b7355");
      ctx.setFontSize(metaSize);
      ctx.fillText(meta, padding, y + metaSize);
      y += lineHeight;
    }

    y += 16;
    ctx.setStrokeStyle("#e8dfd3");
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    y += 32;

    ctx.setFillStyle("#3d2b1f");
    ctx.setFontSize(bodySize);
    bodyLines.forEach((line) => {
      ctx.fillText(line || " ", padding, y + bodySize);
      y += lineHeight;
    });

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
  });
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
