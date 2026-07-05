const RESONANCE_KIND_META = {
  historical: {
    label: "史海知音",
    revealBtn: "看看像哪位历史人物",
    cardHeader: "人生传记 · 史海知音",
    storyTitle: "TA 的故事",
  },
  jinyong: {
    label: "江湖知音",
    revealBtn: "看看像哪位江湖人物",
    cardHeader: "人生传记 · 江湖知音",
    storyTitle: "TA 的江湖",
  },
};

function getResonanceMeta(kind) {
  return RESONANCE_KIND_META[kind] || RESONANCE_KIND_META.historical;
}

function isFigureMatchStyle(style, wuxiaTone) {
  if (style === "classical") return true;
  if (style === "wuxia") {
    const levels = [20, 50, 80];
    const n = Number(wuxiaTone);
    const tone = Number.isFinite(n)
      ? levels.reduce((best, l) => (Math.abs(l - n) < Math.abs(best - n) ? l : best), levels[0])
      : levels[0];
    return tone >= 67;
  }
  return false;
}

async function callBioShare(data, timeout = 30000) {
  const res = await wx.cloud.callFunction({
    name: "bioShare",
    data,
    timeout,
  });
  return res?.result || {};
}

async function publishResonanceBio(payload) {
  const result = await callBioShare({
    action: "publishResonance",
    bioTitle: payload.bioTitle,
    figureMatch: payload.figureMatch,
    resonanceId: payload.resonanceId,
  });
  if (!result.success) {
    throw new Error(result.message || "知音分享发布失败");
  }
  return result;
}

async function getResonanceBio(resonanceId) {
  return callBioShare({ action: "getResonance", resonanceId });
}

function parseResonanceScene(scene) {
  if (!scene) return {};
  let decoded = String(scene);
  try {
    decoded = decodeURIComponent(decoded);
  } catch (e) {
    /* keep raw */
  }
  const params = {};
  decoded.split("&").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx <= 0) return;
    params[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  return params;
}

function buildResonancePath(resonanceId) {
  if (!resonanceId) return "/pages/bio/home/home";
  return `/pages/bio/resonance/resonance?id=${resonanceId}`;
}

function buildResonanceShareTitle(bioTitle, figureMatch) {
  const name = figureMatch?.name || "知音";
  const kind = figureMatch?.kind;
  const prefix = kind === "jinyong" ? "江湖知音" : "史海知音";
  const title = String(bioTitle || "人生传记").trim();
  return `${prefix}：${name} · ${title}`;
}

function isUserCancelError(err) {
  const msg = String(err?.errMsg || err?.message || err || "");
  return /cancel/i.test(msg);
}

function getResonanceErrorMessage(err) {
  const msg = String(err?.errMsg || err?.message || err || "");
  if (/bio_resonances|DATABASE_COLLECTION_NOT_EXIST|502005/i.test(msg)) {
    return "请先在云开发控制台创建集合 bio_resonances";
  }
  if (isUserCancelError(err)) {
    return "";
  }
  return "知音分享失败，请稍后重试";
}

module.exports = {
  getResonanceMeta,
  isFigureMatchStyle,
  publishResonanceBio,
  getResonanceBio,
  parseResonanceScene,
  buildResonancePath,
  buildResonanceShareTitle,
  isUserCancelError,
  getResonanceErrorMessage,
};
