const {
  streamBiography,
  saveBiography,
  clearTimelineDraft,
  getGeneratePayload,
  clearGeneratePayload,
  getStyleLabel,
  getLengthLabel,
  normalizeLength,
  getSourceLabel,
  getGenerateErrorMessage,
} = require("../../../utils/bio");
const { exportAndSaveBiography } = require("../../../utils/exportBiography");
const {
  publishShareBio,
  buildSharePath,
  buildShareTitle,
} = require("../../../utils/shareBio");
const {
  getResonanceMeta,
  publishResonanceBio,
  buildResonancePath,
  buildResonanceShareTitle,
  isUserCancelError,
  getResonanceErrorMessage,
} = require("../../../utils/resonance");
const {
  saveResonanceCard,
  exportResonanceForShare,
  shareResonanceImage,
} = require("../../../utils/exportResonanceCard");

Page({
  data: {
    title: "我的人生传记",
    subjectName: "",
    content: "",
    generating: true,
    generateFailed: false,
    errorMessage: "",
    statusText: "",
    saved: false,
    exporting: false,
    shareId: "",
    sharePublishing: false,
    source: "form",
    style: "narrative",
    length: "normal",
    styleLabel: "",
    lengthLabel: "",
    sourceLabel: "",
    rawData: null,
    hasFigureMatch: false,
    figureMatch: null,
    figureMatchRevealed: false,
    resonanceMeta: null,
    resonanceId: "",
    resonanceSaving: false,
    resonanceSharing: false,
  },

  generateParams: null,
  _figureMatch: null,
  _resonanceId: "",
  _shareResonanceMode: false,

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
      const length = normalizeLength(params.length);
      const wuxiaTone = params.wuxiaTone;
      const yanqingTone = params.yanqingTone;
      const title =
        params.source === "form" && params.data?.name
          ? `${params.data.name}的人生传记`
          : params.source === "chat" && params.data?.subjectName
            ? `${params.data.subjectName}的人生传记`
          : params.source === "timeline" && params.data?.subjectName
            ? `${params.data.subjectName}的人生传记`
            : params.source === "timeline" && params.data?.nodes?.length
              ? (params.data.nodes.find((n) => n.title)?.title || "人生") + "的传记"
            : params.source === "video"
              ? "视频口述传记"
              : params.source === "audio"
                ? "音频口述传记"
                : "我的人生传记";

      const subjectName =
        params.data?.subjectName?.trim() ||
        params.data?.name?.trim() ||
        "";

      this.generateParams = params;
      this.setData({
        title,
        subjectName,
        source: params.source,
        style,
        length,
        styleLabel: getStyleLabel(style, { wuxiaTone, yanqingTone }),
        lengthLabel: getLengthLabel(length),
        sourceLabel: getSourceLabel(params.source),
        rawData: params.data,
        generating: true,
        generateFailed: false,
        errorMessage: "",
        statusText: "",
        saved: false,
        content: "",
        hasFigureMatch: false,
        figureMatch: null,
        figureMatchRevealed: false,
        resonanceMeta: null,
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
      const genResult = await streamBiography({
        source: params.source,
        data: params.data,
        style: params.style || "narrative",
        length: params.length || "normal",
        person: params.person || "third",
        wuxiaTone: params.wuxiaTone,
        yanqingTone: params.yanqingTone,
        onStatus: (statusText) => {
          this.setData({ statusText });
        },
        onChunk: (fullText) => {
          this.setData({ content: fullText });
        },
      });
      const figureMatch = genResult.figureMatch;
      const hasFigureMatch = !!(figureMatch && figureMatch.enabled);
      this._figureMatch = figureMatch;
      this.setData({
        generating: false,
        generateFailed: false,
        errorMessage: "",
        statusText: "",
        figureMatch: hasFigureMatch ? figureMatch : null,
        hasFigureMatch,
        figureMatchRevealed: false,
        resonanceMeta: hasFigureMatch ? getResonanceMeta(figureMatch.kind) : null,
      });
      this.enableLeaveConfirm();
      this.prepareShare();
    } catch (err) {
      console.error(err);
      const errorMessage = getGenerateErrorMessage(err);
      const isTimeout = errorMessage.includes("超时");
      this.setData({
        generating: false,
        generateFailed: true,
        errorMessage,
        content:
          this.data.content ||
          (isTimeout ? "生成超时，请点击下方按钮重试。" : "生成失败，请查看上方错误说明后重试。"),
      });
      wx.showToast({
        title: isTimeout ? "生成超时" : errorMessage.slice(0, 20),
        icon: "none",
        duration: 2800,
      });
    }
  },

  retryGenerate() {
    if (!this.generateParams) return;
    this._figureMatch = null;
    this.setData({
      generating: true,
      generateFailed: false,
      errorMessage: "",
      saved: false,
      content: "",
      hasFigureMatch: false,
      figureMatch: null,
      figureMatchRevealed: false,
      resonanceMeta: null,
    });
    this.startGenerate(this.generateParams);
  },

  revealFigureMatch() {
    if (!this.data.figureMatch) return;
    this.setData({ figureMatchRevealed: true });
  },

  async ensureResonancePublished() {
    const figureMatch = this._figureMatch || this.data.figureMatch;
    if (!figureMatch) return "";
    if (this._resonanceId || this.data.resonanceId) return this._resonanceId || this.data.resonanceId;
    const res = await publishResonanceBio({
      bioTitle: this.data.title,
      figureMatch,
      resonanceId: this._resonanceId,
    });
    this._resonanceId = res.resonanceId;
    this.setData({ resonanceId: res.resonanceId });
    return res.resonanceId;
  },

  async saveResonanceCardTap() {
    if (!this.data.figureMatchRevealed || !this.data.figureMatch || this.data.resonanceSaving) return;
    this.setData({ resonanceSaving: true });
    try {
      await saveResonanceCard({
        figureMatch: this.data.figureMatch,
        bioTitle: this.data.title,
        kind: this.data.figureMatch.kind,
      });
      wx.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      if (!isUserCancelError(err)) {
        console.error(err);
        wx.showToast({ title: "保存失败", icon: "none" });
      }
    } finally {
      this.setData({ resonanceSaving: false });
    }
  },

  async prepareResonanceShareTap() {
    this._shareResonanceMode = true;
    if (!this.data.figureMatchRevealed) return;
    try {
      await this.ensureResonancePublished();
    } catch (err) {
      const tip = getResonanceErrorMessage(err);
      if (tip) wx.showToast({ title: tip, icon: "none", duration: 3200 });
    }
  },

  async shareResonanceImageTap() {
    if (!this.data.figureMatchRevealed || !this.data.figureMatch || this.data.resonanceSharing) return;
    this.setData({ resonanceSharing: true });
    try {
      const filePath = await exportResonanceForShare({
        figureMatch: this.data.figureMatch,
        bioTitle: this.data.title,
        kind: this.data.figureMatch.kind,
      });
      await shareResonanceImage(filePath);
    } catch (err) {
      if (isUserCancelError(err)) return;
      console.error(err);
      try {
        await saveResonanceCard({
          figureMatch: this.data.figureMatch,
          bioTitle: this.data.title,
          kind: this.data.figureMatch.kind,
        });
        wx.showToast({ title: "已存相册，可发送图片", icon: "none" });
      } catch (e2) {
        if (!isUserCancelError(e2)) {
          wx.showToast({ title: "分享失败", icon: "none" });
        }
      }
    } finally {
      this.setData({ resonanceSharing: false });
    }
  },

  copyContent() {
    if (!this.data.content) return;
    wx.setClipboardData({
      data: this.data.content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  async prepareShare() {
    if (this._shareId || this.data.shareId || !this.data.content) return this.data.shareId;
    if (this._sharePreparing) return this._sharePreparing;
    this._sharePreparing = (async () => {
      this.setData({ sharePublishing: true });
      try {
        const res = await publishShareBio({
          title: this.data.title,
          content: this.data.content,
          styleLabel: this.data.styleLabel,
          sourceLabel: this.data.sourceLabel,
          style: this.data.style,
        });
        this._shareId = res.shareId;
        this.setData({ shareId: res.shareId });
        return res.shareId;
      } catch (err) {
        console.error(err);
        return "";
      } finally {
        this._sharePreparing = null;
        this.setData({ sharePublishing: false });
      }
    })();
    return this._sharePreparing;
  },

  async exportContent() {
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

  async saveContent() {
    if (!this.data.content || this.data.generating || this.data.generateFailed) return;

    if (this.data.saved) {
      this.goHistory();
      return;
    }

    const shareId = (await this.prepareShare()) || this.data.shareId || this._shareId;

    saveBiography({
      title: this.data.title,
      content: this.data.content,
      style: this.data.style,
      length: this.data.length,
      source: this.data.source,
      wuxiaTone: this.generateParams?.wuxiaTone,
      yanqingTone: this.generateParams?.yanqingTone,
      shareId,
      figureMatch: this._figureMatch || this.data.figureMatch,
      figureMatchRevealed: this.data.figureMatchRevealed,
      resonanceId: this._resonanceId || this.data.resonanceId,
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
    if (this._shareResonanceMode && this.data.figureMatchRevealed && this.data.figureMatch) {
      this._shareResonanceMode = false;
      const resonanceId = this._resonanceId || this.data.resonanceId;
      if (!resonanceId) {
        this.ensureResonancePublished();
      }
      return {
        title: buildResonanceShareTitle(this.data.title, this.data.figureMatch),
        path: buildResonancePath(resonanceId),
      };
    }
    const shareId = this.data.shareId || this._shareId;
    if (!shareId) {
      this.prepareShare();
    }
    return {
      title: buildShareTitle(this.data.title, this.data.content),
      path: buildSharePath(shareId),
    };
  },
});
