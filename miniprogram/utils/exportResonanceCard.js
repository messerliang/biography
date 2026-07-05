const { getHomeQrLocalPath } = require("./shareBio");
const { getResonanceMeta } = require("./resonance");

const CARD_WIDTH = 750;
const PADDING = 48;
const FOOTER_HEIGHT = 180;
const QR_SIZE = 120;

function wrapText(ctx, text, maxWidth, fontSize) {
  ctx.setFontSize(fontSize);
  const chars = String(text || "").split("");
  const lines = [];
  let line = "";
  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawResonanceCard(ctx, width, height, options, qrPath) {
  const { figureMatch, bioTitle, kind } = options;
  const meta = getResonanceMeta(kind || figureMatch?.kind);
  const maxTextWidth = width - PADDING * 2;

  ctx.setFillStyle("#faf6f0");
  ctx.fillRect(0, 0, width, height);

  ctx.setFillStyle(kind === "jinyong" ? "#4a2c2a" : "#3d2b1f");
  ctx.setFontSize(28);
  ctx.setTextAlign("left");
  ctx.fillText(meta.cardHeader, PADDING, PADDING + 28);

  ctx.setStrokeStyle("#e8dfd3");
  ctx.beginPath();
  ctx.moveTo(PADDING, PADDING + 44);
  ctx.lineTo(width - PADDING, PADDING + 44);
  ctx.stroke();

  let y = PADDING + 88;
  ctx.setFillStyle("#3d2b1f");
  ctx.setFontSize(44);
  ctx.fillText(figureMatch.name || "", PADDING, y);
  y += 48;

  if (figureMatch.alias) {
    ctx.setFillStyle("#8b7355");
    ctx.setFontSize(26);
    ctx.fillText(figureMatch.alias, PADDING, y);
    y += 36;
  }

  if (figureMatch.era) {
    ctx.setFillStyle("#a89580");
    ctx.setFontSize(22);
    ctx.fillText(figureMatch.era, PADDING, y);
    y += 32;
  }

  if (figureMatch.tagline) {
    ctx.setFillStyle("#6b5344");
    ctx.setFontSize(24);
    const tagLines = wrapText(ctx, `「${figureMatch.tagline}」`, maxTextWidth, 24);
    tagLines.forEach((line) => {
      ctx.fillText(line, PADDING, y);
      y += 34;
    });
    y += 8;
  }

  ctx.setFillStyle("#8b6914");
  ctx.setFontSize(26);
  ctx.fillText("为何相通", PADDING, y);
  y += 36;

  ctx.setFillStyle("#3d2b1f");
  ctx.setFontSize(24);
  (figureMatch.reasons || []).forEach((reason) => {
    const lines = wrapText(ctx, `· ${reason}`, maxTextWidth, 24);
    lines.forEach((line) => {
      ctx.fillText(line, PADDING, y);
      y += 32;
    });
  });
  y += 12;

  ctx.setFillStyle("#8b6914");
  ctx.setFontSize(26);
  ctx.fillText(meta.storyTitle, PADDING, y);
  y += 36;

  ctx.setFillStyle("#3d2b1f");
  ctx.setFontSize(24);
  const storyLines = wrapText(ctx, figureMatch.story || "", maxTextWidth, 24);
  storyLines.slice(0, 8).forEach((line) => {
    ctx.fillText(line, PADDING, y);
    y += 32;
  });
  y += 12;

  ctx.setFillStyle("#8b6914");
  ctx.setFontSize(26);
  ctx.fillText(`与《${(bioTitle || "人生传记").slice(0, 16)}》的呼应`, PADDING, y);
  y += 36;

  ctx.setFillStyle("#5c4a3a");
  ctx.setFontSize(24);
  const bridgeLines = wrapText(ctx, figureMatch.bridge || "", maxTextWidth, 24);
  bridgeLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, PADDING, y);
    y += 32;
  });

  const footerTop = height - FOOTER_HEIGHT;
  ctx.setFillStyle("#f5efe6");
  ctx.fillRect(0, footerTop, width, FOOTER_HEIGHT);

  ctx.setStrokeStyle("#e8dfd3");
  ctx.beginPath();
  ctx.moveTo(PADDING, footerTop + 8);
  ctx.lineTo(width - PADDING, footerTop + 8);
  ctx.stroke();

  ctx.setFillStyle("#8b7355");
  ctx.setFontSize(20);
  ctx.fillText(figureMatch.disclaimer || "趣味文化呼应，非人格测试", PADDING, footerTop + 40);

  ctx.setFillStyle("#8b7355");
  ctx.setFontSize(22);
  ctx.fillText("扫码开始创作您的传记", PADDING, footerTop + 78);

  if (qrPath) {
    ctx.drawImage(qrPath, width - PADDING - QR_SIZE, footerTop + 36, QR_SIZE, QR_SIZE);
  }
}

function measureCardHeight(ctx, options) {
  const { figureMatch, bioTitle } = options;
  const maxTextWidth = CARD_WIDTH - PADDING * 2;
  let y = PADDING + 88 + 48 + 36 + 32 + 40 + 36;
  if (figureMatch.alias) y += 36;
  if (figureMatch.tagline) y += 42;

  y += 36;
  (figureMatch.reasons || []).forEach((reason) => {
    y += wrapText(ctx, `· ${reason}`, maxTextWidth, 24).length * 32;
  });
  y += 48;

  y += wrapText(ctx, figureMatch.story || "", maxTextWidth, 24).slice(0, 8).length * 32 + 48;
  y += wrapText(ctx, figureMatch.bridge || "", maxTextWidth, 24).slice(0, 5).length * 32;

  return Math.min(Math.max(y + FOOTER_HEIGHT + PADDING, 900), 2400);
}

function exportResonanceToImage(options) {
  const qrPromise = getHomeQrLocalPath().catch(() => null);
  return qrPromise.then((qrPath) => {
    const ctx = wx.createCanvasContext("resonanceCanvas");
    const height = measureCardHeight(ctx, options);
    return new Promise((resolve, reject) => {
      drawResonanceCard(ctx, CARD_WIDTH, height, options, qrPath);
      ctx.draw(false, () => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: "resonanceCanvas",
            width: CARD_WIDTH,
            height,
            destWidth: CARD_WIDTH * 2,
            destHeight: height * 2,
            success: (res) => resolve(res.tempFilePath),
            fail: reject,
          });
        }, 300);
      });
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
            content: "请在设置中允许保存到相册",
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

function shareResonanceImage(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof wx.showShareImageMenu === "function") {
      wx.showShareImageMenu({
        path: filePath,
        success: resolve,
        fail: reject,
      });
      return;
    }
    reject(new Error("当前版本不支持直接分享图片"));
  });
}

function saveResonanceCard(options) {
  return exportResonanceToImage(options).then((filePath) => saveImageToAlbum(filePath));
}

function exportResonanceForShare(options) {
  return exportResonanceToImage(options);
}

module.exports = {
  exportResonanceToImage,
  saveResonanceCard,
  exportResonanceForShare,
  shareResonanceImage,
};
