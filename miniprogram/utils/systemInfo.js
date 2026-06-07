function getCompatSystemInfo() {
  const hasSplitApi =
    typeof wx.getWindowInfo === "function" &&
    typeof wx.getDeviceInfo === "function" &&
    typeof wx.getAppBaseInfo === "function";

  if (hasSplitApi) {
    return {
      ...wx.getAppBaseInfo(),
      ...wx.getDeviceInfo(),
      ...wx.getWindowInfo(),
    };
  }

  return wx.getSystemInfoSync();
}

function isIOSDevice() {
  try {
    if (typeof wx.getDeviceInfo === "function") {
      const { platform, system } = wx.getDeviceInfo();
      if (platform === "ios") return true;
      return String(system || "").includes("iOS");
    }
  } catch (e) {
    // fall through
  }
  return getCompatSystemInfo().system.includes("iOS");
}

function isWxWorkClient() {
  try {
    const appBaseInfo = wx.getAppBaseInfo();
    const env = appBaseInfo?.host?.env;
    if (env === "Wework" || env === "wxwork") return true;
  } catch (e) {
    // fall through
  }
  try {
    return getCompatSystemInfo().environment === "wxwork";
  } catch (e) {
    return false;
  }
}

module.exports = {
  getCompatSystemInfo,
  isIOSDevice,
  isWxWorkClient,
};
