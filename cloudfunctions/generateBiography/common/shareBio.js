const crypto = require("crypto");
const { filterOutput } = require("./contentFilter");

const SHARE_COLLECTION = "bio_shares";
const MAX_CONTENT = 50000;
const SHARE_PAGE = "pages/bio/share/share";
const HOME_PAGE = "pages/bio/home/home";
const RESONANCE_PAGE = "pages/bio/resonance/resonance";

function makeShareId() {
  return crypto.randomBytes(6).toString("hex");
}

function buildScene({ shareId, resonanceId, from }) {
  if (resonanceId) return `rid=${resonanceId}`.slice(0, 32);
  if (shareId) return `id=${shareId}`.slice(0, 32);
  if (from) return `from=${from}`.slice(0, 32);
  return "from=export";
}

async function publishShare(db, openid, payload) {
  const title = String(payload.title || "我的人生传记").trim().slice(0, 80);
  const content = String(payload.content || "").trim();
  if (content.length < 20) {
    return { success: false, code: "TOO_SHORT", message: "传记内容过短，无法分享" };
  }

  const outputCheck = filterOutput(content);
  if (!outputCheck.allowed) {
    return { success: false, code: outputCheck.code, message: outputCheck.message || "内容不适宜分享" };
  }

  const shareId = String(payload.shareId || "").trim() || makeShareId();
  const excerpt =
    outputCheck.text.slice(0, 120) + (outputCheck.text.length > 120 ? "……" : "");
  const doc = {
    shareId,
    openid,
    title,
    content: outputCheck.text.slice(0, MAX_CONTENT),
    styleLabel: String(payload.styleLabel || "").slice(0, 40),
    sourceLabel: String(payload.sourceLabel || "").slice(0, 40),
    style: String(payload.style || "narrative").slice(0, 24),
    excerpt,
    updatedAt: db.serverDate(),
  };

  const existing = await db
    .collection(SHARE_COLLECTION)
    .where({ shareId, openid })
    .limit(1)
    .get();

  if (existing.data.length) {
    await db.collection(SHARE_COLLECTION).doc(existing.data[0]._id).update({ data: doc });
  } else {
    doc.createdAt = db.serverDate();
    await db.collection(SHARE_COLLECTION).add({ data: doc });
  }

  return { success: true, shareId, excerpt };
}

async function getShare(db, shareId) {
  const id = String(shareId || "").trim();
  if (!id) {
    return { success: false, code: "INVALID_ID", message: "分享链接无效" };
  }

  const res = await db.collection(SHARE_COLLECTION).where({ shareId: id }).limit(1).get();
  if (!res.data.length) {
    return { success: false, code: "NOT_FOUND", message: "分享内容不存在或已失效" };
  }

  const item = res.data[0];
  return {
    success: true,
    share: {
      shareId: item.shareId,
      title: item.title,
      content: item.content,
      styleLabel: item.styleLabel,
      sourceLabel: item.sourceLabel,
      style: item.style,
      excerpt: item.excerpt,
      createdAt: item.createdAt,
    },
  };
}

async function getShareQrCode(cloud, { shareId, resonanceId, from, target, envVersion }) {
  const isHome = target === "home";
  const isResonance = target === "resonance" || Boolean(resonanceId);
  const scene = isHome ? "from=export" : buildScene({ shareId, resonanceId, from });
  let page = SHARE_PAGE;
  if (isHome) page = HOME_PAGE;
  else if (isResonance) page = RESONANCE_PAGE;
  const allowed = ["develop", "trial", "release"];
  const version = allowed.includes(envVersion) ? envVersion : "release";
  const result = await cloud.openapi.wxacode.getUnlimited({
    scene,
    page,
    checkPath: false,
    envVersion: version,
    width: 280,
  });

  if (!result || !result.buffer) {
    throw new Error("小程序码生成失败");
  }

  const tag = isHome ? "home" : resonanceId || shareId || from || "export";
  const cloudPath = `share-qrcodes/${tag}_${Date.now()}.png`;
  const upload = await cloud.uploadFile({
    cloudPath,
    fileContent: result.buffer,
  });

  const urlRes = await cloud.getTempFileURL({
    fileList: [upload.fileID],
  });
  const tempFileURL = urlRes.fileList?.[0]?.tempFileURL || "";

  return {
    success: true,
    fileID: upload.fileID,
    tempFileURL,
    scene,
  };
}

module.exports = {
  SHARE_COLLECTION,
  SHARE_PAGE,
  HOME_PAGE,
  RESONANCE_PAGE,
  publishShare,
  getShare,
  getShareQrCode,
  buildScene,
};
