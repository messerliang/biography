const { getResonanceBio, parseResonanceScene, buildResonancePath, buildResonanceShareTitle, publishResonanceBio, getResonanceMeta } = require("../../../utils/resonance");

Page({
  data: {
    loading: true,
    error: "",
    resonance: null,
    meta: null,
  },

  onLoad(options) {
    const sceneParams = parseResonanceScene(options.scene);
    const resonanceId = options.id || sceneParams.rid;
    if (!resonanceId) {
      this.setData({
        loading: false,
        error: "未找到知音内容",
      });
      return;
    }
    this.loadResonance(resonanceId);
  },

  async loadResonance(resonanceId) {
    this.setData({ loading: true, error: "", resonance: null });
    try {
      const result = await getResonanceBio(resonanceId);
      if (!result.success || !result.resonance) {
        this.setData({
          loading: false,
          error: result.message || "知音内容不存在或已失效",
        });
        return;
      }
      const resonance = result.resonance;
      const meta = getResonanceMeta(resonance.kind);
      this.setData({
        loading: false,
        resonance,
        meta,
      });
      wx.setNavigationBarTitle({
        title: `${meta.label} · ${resonance.name}`,
      });
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
    const { resonance } = this.data;
    if (!resonance) {
      return {
        title: "人生传记 · 知音卡片",
        path: "/pages/bio/home/home",
      };
    }
    const meta = getResonanceMeta(resonance.kind);
    return {
      title: `${meta.label}：${resonance.name}`,
      path: buildResonancePath(resonance.resonanceId),
    };
  },
});
