const crypto = require("crypto");
const { filterOutput } = require("./contentFilter");

const RESONANCE_COLLECTION = "bio_resonances";
const RESONANCE_PAGE = "pages/bio/resonance/resonance";

function makeResonanceId() {
  return crypto.randomBytes(6).toString("hex");
}

async function publishResonance(db, openid, payload) {
  const bioTitle = String(payload.bioTitle || "我的人生传记").trim().slice(0, 80);
  const match = payload.figureMatch;
  if (!match || !match.name) {
    return { success: false, code: "INVALID_MATCH", message: "知音数据无效" };
  }

  const blob = [
    match.name,
    match.alias,
    match.tagline,
    match.story,
    match.bridge,
    ...(match.reasons || []),
  ].join("\n");
  const outputCheck = filterOutput(blob);
  if (!outputCheck.allowed) {
    return { success: false, code: outputCheck.code, message: outputCheck.message || "内容不适宜分享" };
  }

  const resonanceId = String(payload.resonanceId || "").trim() || makeResonanceId();
  const doc = {
    resonanceId,
    openid,
    bioTitle,
    kind: String(match.kind || "historical").slice(0, 16),
    name: String(match.name || "").slice(0, 24),
    alias: String(match.alias || "").slice(0, 24),
    era: String(match.era || "").slice(0, 24),
    tagline: String(match.tagline || "").slice(0, 40),
    reasons: (match.reasons || []).slice(0, 3).map((r) => String(r).slice(0, 80)),
    story: String(match.story || "").slice(0, 400),
    bridge: String(match.bridge || "").slice(0, 200),
    matchScore: String(match.matchScore || "气质相近").slice(0, 12),
    disclaimer: String(match.disclaimer || "").slice(0, 120),
    updatedAt: db.serverDate(),
  };

  const existing = await db
    .collection(RESONANCE_COLLECTION)
    .where({ resonanceId, openid })
    .limit(1)
    .get();

  if (existing.data.length) {
    await db.collection(RESONANCE_COLLECTION).doc(existing.data[0]._id).update({ data: doc });
  } else {
    doc.createdAt = db.serverDate();
    await db.collection(RESONANCE_COLLECTION).add({ data: doc });
  }

  return { success: true, resonanceId };
}

async function getResonance(db, resonanceId) {
  const id = String(resonanceId || "").trim();
  if (!id) {
    return { success: false, code: "INVALID_ID", message: "分享链接无效" };
  }

  const res = await db.collection(RESONANCE_COLLECTION).where({ resonanceId: id }).limit(1).get();
  if (!res.data.length) {
    return { success: false, code: "NOT_FOUND", message: "知音内容不存在或已失效" };
  }

  const item = res.data[0];
  return {
    success: true,
    resonance: {
      resonanceId: item.resonanceId,
      bioTitle: item.bioTitle,
      kind: item.kind,
      name: item.name,
      alias: item.alias,
      era: item.era,
      tagline: item.tagline,
      reasons: item.reasons,
      story: item.story,
      bridge: item.bridge,
      matchScore: item.matchScore,
      disclaimer: item.disclaimer,
    },
  };
}

module.exports = {
  RESONANCE_COLLECTION,
  RESONANCE_PAGE,
  publishResonance,
  getResonance,
};
