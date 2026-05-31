const {
  streamBiography,
  saveBiography,
  clearTimelineDraft,
  getGeneratePayload,
  clearGeneratePayload,
  getStyleLabel,
  getSourceLabel,
} = require("../../../utils/bio");
const { exportAndSaveBiography } = require("../../../utils/exportBiography");

Page({
  data: {
    title: "我的人生传记",
    content: "",
    generating: true,
    generateFailed: false,
    errorMessage: "",
    saved: false,
    exporting: false,
    source: "form",
    style: "narrative",
    styleLabel: "",
    sourceLabel: "",
    rawData: null,
  },

  generateParams: null,

  onLoad(options) {
    let params = null;

    if (options.payload) {
      try {
        params = JSON.parse(decodeURIComponent(options.payload));
      } catch (e) {
        /* fallback */
      }
    }

    if (!params) {
      params = getGeneratePayload();
    }

    if (!params) {
      wx.showToast({ title: "参数错误", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    clearGeneratePayload();

    try {
      const style = params.style || "narrative";
      const title =
        params.source === "form" && params.data?.name
          ? `${params.data.name}的人生传记`
          : params.source === "timeline" && params.data?.nodes?.length
            ? (params.data.nodes.find((n) => n.title)?.title || "人生") + "的传记"
            : params.source === "video"
              ? "视频口述传记"
              : params.source === "audio"
                ? "音频口述传记"
                : "我的人生传记";

      this.generateParams = params;
      this.setData({
        title,
        source: params.source,
        style,
        styleLabel: getStyleLabel(style),
        sourceLabel: getSourceLabel(params.source),
        rawData: params.data,
        generating: true,
        generateFailed: false,
        errorMessage: "",
        saved: false,
        content: "",
      });

      this.startGenerate(params);
    } catch (e) {
      wx.showToast({ title: "数据解析失败", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onUnload() {
    this.disableLeaveConfirm();
  },

  enableLeaveConfirm() {
    if (typeof wx.enableAlertBeforeUnload === "function") {
      wx.enableAlertBeforeUnload({
        message: "传记尚未保存至「我的传记」，确定离开吗？",
      });
    }
  },

  disableLeaveConfirm() {
    if (typeof wx.disableAlertBeforeUnload === "function") {
      wx.disableAlertBeforeUnload();
    }
  },

  async startGenerate(params) {
    this.disableLeaveConfirm();
    try {
      await streamBiography({
        source: params.source,
        data: params.data,
        style: params.style || "narrative",
        onChunk: (fullText) => {
          this.setData({ content: fullText });
        },
      });
      this.setData({ generating: false, generateFailed: false, errorMessage: "" });
      this.enableLeaveConfirm();
    } catch (err) {
      console.error(err);
      const isTimeout = String(err?.message || err?.errMsg || err || "")
        .toLowerCase()
        .includes("timeout");
      this.setData({
        generating: false,
        generateFailed: true,
        errorMessage: isTimeout
          ? "生成超时，可能是网络较慢或内容较多。您可以重试，或稍后再试。"
          : "生成失败，请检查云开发 AI 配置与网络后重试。",
        content:
          this.data.content ||
          (isTimeout ? "生成超时，请点击下方按钮重试。" : "生成失败，请检查云开发 AI 配置后重试。"),
      });
      wx.showToast({ title: isTimeout ? "生成超时" : "生成失败", icon: "none" });
    }
  },

  retryGenerate() {
    if (!this.generateParams) return;
    this.setData({
      generating: true,
      generateFailed: false,
      errorMessage: "",
      saved: false,
      content: "",
    });
    this.startGenerate(this.generateParams);
  },

  copyContent() {
    if (!this.data.content) return;
    wx.setClipboardData({
      data: this.data.content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  exportContent() {
    if (!this.data.content || this.data.exporting) return;
    this.setData({ exporting: true });
    exportAndSaveBiography({
      title: this.data.title,
      content: this.data.content,
      styleLabel: this.data.styleLabel,
      sourceLabel: this.data.sourceLabel,
    })
      .then(() => wx.showToast({ title: "已保存到相册", icon: "success" }))
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: "导出失败", icon: "none" });
      })
      .finally(() => this.setData({ exporting: false }));
  },

  saveContent() {
    if (!this.data.content || this.data.generating || this.data.generateFailed) return;

    if (this.data.saved) {
      this.goHistory();
      return;
    }

    saveBiography({
      title: this.data.title,
      content: this.data.content,
      style: this.data.style,
      source: this.data.source,
    });

    if (this.data.source === "timeline") {
      clearTimelineDraft();
    }

    this.disableLeaveConfirm();
    this.setData({ saved: true });
    wx.showToast({ title: "已保存至我的传记", icon: "success" });
  },

  goHistory() {
    wx.navigateTo({ url: "/pages/bio/history/history" });
  },

  onShareAppMessage() {
    const preview = (this.data.content || "").slice(0, 40);
    return {
      title: this.data.title || "我的人生传记",
      path: "/pages/bio/home/home",
      desc: preview ? `${preview}……` : "记录故事，传承记忆",
    };
  },
});
