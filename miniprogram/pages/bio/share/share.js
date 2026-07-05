const { getShareBio, parseShareScene } = require("../../../utils/shareBio");

Page({
  data: {
    loading: true,
    error: "",
    isLanding: false,
    share: null,
  },

  onLoad(options) {
    const sceneParams = parseShareScene(options.scene);
    const shareId = options.id || sceneParams.id;
    const fromExport = sceneParams.from === "export" || options.from === "export";

    if (!shareId) {
      this.setData({
        loading: false,
        isLanding: fromExport,
        error: fromExport ? "欢迎阅读人生传记" : "未找到分享内容",
      });
      return;
    }

    this.loadShare(shareId);
  },

  async loadShare(shareId) {
    this.setData({ loading: true, error: "", share: null });
    try {
      const result = await getShareBio(shareId);
      if (!result.success || !result.share) {
        this.setData({
          loading: false,
          error: result.message || "分享内容不存在或已失效",
        });
        return;
      }
      this.setData({
        loading: false,
        share: result.share,
      });
      wx.setNavigationBarTitle({ title: result.share.title || "传记分享" });
    } catch (err) {
      console.error(err);
      this.setData({
        loading: false,
        error: err.message || "加载失败，请稍后重试",
      });
    }
  },

  goHome() {
    wx.reLaunch({ url: "/pages/bio/home/home" });
  },

  onShareAppMessage() {
    const { share } = this.data;
    if (!share) {
      return {
        title: "人生传记 · 记录故事，传承记忆",
        path: "/pages/bio/home/home",
      };
    }
    return {
      title: share.title || "人生传记",
      path: `/pages/bio/share/share?id=${share.shareId}`,
    };
  },
});
