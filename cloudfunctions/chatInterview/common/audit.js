const cloud = require("wx-server-sdk");
const { encryptText, sha256 } = require("./crypto");
const { AUDIT_COLLECTION } = require("./constants");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

async function writeAuditLog({ openid, action, source, materialHash, summarized }) {
  if (process.env.ENABLE_PII_AUDIT !== "true") return;

  try {
    const db = cloud.database();
    await db.collection(AUDIT_COLLECTION).add({
      data: {
        openid,
        action,
        source,
        materialHash,
        summarized: !!summarized,
        payloadEnc: encryptText(`${openid}:${materialHash}`),
        createdAt: db.serverDate(),
        expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

module.exports = { writeAuditLog, sha256 };
