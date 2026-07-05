const QR_CACHE = {};

function parseShareScene(scene) {
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

async function callBioShare(data, timeout = 30000) {
  const res = await wx.cloud.callFunction({
    name: "bioShare",
    data,
    timeout,
  });
  return res?.result || {};
}

async function publishShareBio(payload) {
  const result = await callBioShare({
    action: "publish",
    title: payload.title,
    content: payload.content,
    styleLabel: payload.styleLabel,
    sourceLabel: payload.sourceLabel,
    style: payload.style,
    shareId: payload.shareId,
  });
  if (!result.success) {
    throw new Error(result.message || "分享发布失败");
  }
  return result;
}

async function getShareBio(shareId) {
  return callBioShare({ action: "get", shareId });
}

function cacheKey({ shareId, from, target } = {}) {
  if (target === "home") return "target:home";
  return shareId ? `id:${shareId}` : `from:${from || "export"}`;
}

function getMiniProgramEnvVersion() {
  try {
    return wx.getAccountInfoSync()?.miniProgram?.envVersion || "release";
  } catch (e) {
    return "release";
  }
}

async function getShareQrLocalPath({ shareId, from, target } = {}) {
  const key = cacheKey({ shareId, from, target });
  if (QR_CACHE[key]) return QR_CACHE[key];

  const result = await callBioShare({
    action: "qrcode",
    shareId,
    from,
    target,
    envVersion: getMiniProgramEnvVersion(),
  });
  if (!result.success) {
    throw new Error(result.message || "小程序码获取失败");
  }

  let filePath = "";
  if (result.fileID) {
    const dl = await wx.cloud.downloadFile({ fileID: result.fileID });
    filePath = dl.tempFilePath;
  } else if (result.tempFileURL) {
    const dl = await wx.downloadFile({ url: result.tempFileURL });
    filePath = dl.tempFilePath;
  }
  if (!filePath) {
    throw new Error("小程序码下载失败");
  }

  QR_CACHE[key] = filePath;
  return filePath;
}

function getHomeQrLocalPath() {
  return getShareQrLocalPath({ target: "home" });
}

function buildSharePath(shareId) {
  if (!shareId) return "/pages/bio/home/home";
  return `/pages/bio/share/share?id=${shareId}`;
}

function buildShareTitle(title, content) {
  const name = String(title || "人生传记").trim();
  const preview = String(content || "")
    .replace(/\s+/g, "")
    .slice(0, 36);
  if (preview) return `${name}｜${preview}……`;
  return name;
}

module.exports = {
  parseShareScene,
  publishShareBio,
  getShareBio,
  getShareQrLocalPath,
  getHomeQrLocalPath,
  buildSharePath,
  buildShareTitle,
};
