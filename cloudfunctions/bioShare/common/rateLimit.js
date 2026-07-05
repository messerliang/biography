const cloud = require("wx-server-sdk");
const { RATE_LIMITS, RATE_LIMIT_COLLECTION } = require("./constants");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function getWindowKey(date, unit) {
  if (unit === "hour") {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

async function checkRateLimit(openid, action) {
  const limits = RATE_LIMITS[action];
  if (!limits || !openid) {
    return { allowed: true };
  }

  const db = cloud.database();
  const now = new Date();
  const hourKey = getWindowKey(now, "hour");
  const dayKey = getWindowKey(now, "day");
  const docId = `${openid}_${action}`;

  try {
    const docRes = await db.collection(RATE_LIMIT_COLLECTION).doc(docId).get();
    const record = docRes.data || {
      hourWindow: hourKey,
      hourCount: 0,
      dayWindow: dayKey,
      dayCount: 0,
    };

    let hourCount = record.hourWindow === hourKey ? record.hourCount : 0;
    let dayCount = record.dayWindow === dayKey ? record.dayCount : 0;

    if (hourCount >= limits.perHour) {
      return {
        allowed: false,
        message: "操作过于频繁，请稍后再试（每小时限额）",
      };
    }
    if (dayCount >= limits.perDay) {
      return {
        allowed: false,
        message: "今日请求已达上限，请明天再试",
      };
    }

    hourCount += 1;
    dayCount += 1;

    await db
      .collection(RATE_LIMIT_COLLECTION)
      .doc(docId)
      .set({
        data: {
          openid,
          action,
          hourWindow: hourKey,
          hourCount,
          dayWindow: dayKey,
          dayCount,
          updatedAt: db.serverDate(),
        },
      });

    return { allowed: true };
  } catch (err) {
    if (err && err.errCode === -1) {
      return { allowed: true };
    }
    console.error("rateLimit error", err);
    return { allowed: true };
  }
}

module.exports = { checkRateLimit };
