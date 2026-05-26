const compareVersions = (version1, version2) => {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  for (let i = 0; i < maxLength; i++) {
    const num1 = v1Parts[i] || 0;
    const num2 = v2Parts[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

let isDomainWarn = false;

function cloudRequest(options) {
  return new Promise(async (resolve, reject) => {
    const appBaseInfo = wx.getAppBaseInfo();
    const { path, data, method = "GET", timeout = 120000 } = options;

    const handleSuccess = (res) => {
      const body = res.data !== undefined ? res.data : res;
      if (res.statusCode !== undefined && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(body?.message || "请求失败"));
        return;
      }
      resolve(body);
    };

    const handleFail = (e) => {
      if (e.errno === 600002 || (e.errMsg && e.errMsg.includes("url not in domain list"))) {
        let envId = "";
        try {
          envId = wx.cloud.extend.AI.bot.context.env || "";
        } catch (err) {
          /* ignore */
        }
        const msg = envId
          ? `请在微信公众平台 request 合法域名中添加 https://${envId}.api.tcloudbasegateway.com`
          : "请在微信公众平台配置云开发 request 合法域名";
        if (!isDomainWarn) {
          isDomainWarn = true;
          wx.showModal({
            title: "域名未配置",
            content: msg,
            complete: () => {
              isDomainWarn = false;
            },
          });
        }
      }
      reject(e);
    };

    if (compareVersions(appBaseInfo.SDKVersion, "3.8.1") < 0) {
      try {
        const tokenRes = await wx.cloud.extend.AI.bot.tokenManager.getToken();
        const token = tokenRes.token;
        const envId = wx.cloud.extend.AI.bot.context.env;
        wx.request({
          url: `https://${envId}.api.tcloudbasegateway.com/v1/aibot/${path}`,
          method,
          data,
          timeout,
          header: { Authorization: `Bearer ${token}` },
          success: handleSuccess,
          fail: handleFail,
        });
      } catch (err) {
        reject(err);
      }
    } else {
      wx.cloud.extend.AI.request({
        path,
        method,
        data,
        timeout,
        success: handleSuccess,
        fail: handleFail,
      });
    }
  });
}

module.exports = { cloudRequest };
