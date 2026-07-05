const cloud = require("wx-server-sdk");
const { publishShare, getShare, getShareQrCode } = require("./common/shareBio");
const { publishResonance, getResonance } = require("./common/shareResonance");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event?.action;
  const db = cloud.database();

  try {
    if (action === "publish") {
      if (!openid) {
        return { success: false, code: "UNAUTHORIZED", message: "用户未授权" };
      }
      return publishShare(db, openid, event);
    }

    if (action === "get") {
      return getShare(db, event.shareId);
    }

    if (action === "publishResonance") {
      if (!openid) {
        return { success: false, code: "UNAUTHORIZED", message: "用户未授权" };
      }
      return publishResonance(db, openid, event);
    }

    if (action === "getResonance") {
      return getResonance(db, event.resonanceId);
    }

    if (action === "qrcode") {
      const qr = await getShareQrCode(cloud, {
        shareId: event.shareId,
        resonanceId: event.resonanceId,
        from: event.from,
        target: event.target,
        envVersion: event.envVersion,
      });
      return qr;
    }

    return { success: false, code: "INVALID_ACTION", message: "未知操作" };
  } catch (err) {
    console.error("bioShare failed", action, err);
    return {
      success: false,
      code: "SHARE_FAILED",
      message: err.message || "分享服务暂时不可用",
    };
  }
};
