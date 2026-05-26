const { streamBiography, saveBiography } = require("../../../utils/bio");

Page({
  data: {
    title: "我的人生传记",
    content: "",
    generating: true,
    source: "form",
    style: "narrative",
    rawData: null,
  },

  onLoad(options) {
    if (!options.payload) {
      wx.showToast({ title: "参数错误", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    try {
      const params = JSON.parse(decodeURIComponent(options.payload));
      const title =
        params.source === "form" && params.data?.name
          ? `${params.data.name}的人生传记`
          : params.source === "video"
            ? "视频口述传记"
            : "我的人生传记";

      this.setData({
        title,
        source: params.source,
        style: params.style || "narrative",
        rawData: params.data,
      });

      this.startGenerate(params);
    } catch (e) {
      wx.showToast({ title: "数据解析失败", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async startGenerate(params) {
    try {
      await streamBiography({
        source: params.source,
        data: params.data,
        style: params.style || "narrative",
        onChunk: (fullText) => {
          this.setData({ content: fullText });
        },
      });
      this.setData({ generating: false });
    } catch (err) {
      console.error(err);
      this.setData({
        generating: false,
        content: this.data.content || "生成失败，请检查云开发 AI 配置后重试。",
      });
      wx.showToast({ title: "生成失败", icon: "none" });
    }
  },

  copyContent() {
    if (!this.data.content) return;
    wx.setClipboardData({
      data: this.data.content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  saveContent() {
    if (!this.data.content) return;
    saveBiography({
      title: this.data.title,
      content: this.data.content,
      style: this.data.style,
      source: this.data.source,
    });
    wx.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => {
      wx.navigateTo({ url: "/pages/bio/history/history" });
    }, 1200);
  },
});
