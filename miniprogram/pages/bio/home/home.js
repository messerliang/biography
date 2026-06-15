const { getBiographyList } = require("../../../utils/bio");
const { loadHeroCalligraphyFont } = require("../../../utils/heroFont");

Page({
  data: {
    historyCount: 0,
    heroFontReady: false,
  },

  onLoad() {
    loadHeroCalligraphyFont().then((loaded) => {
      this.setData({ heroFontReady: loaded });
      if (!loaded) {
        console.warn("hero title font fallback to system serif");
      }
    });
  },

  onShow() {
    this.setData({ historyCount: getBiographyList().length });
  },

  goForm() {
    wx.navigateTo({ url: "/pages/bio/form/form" });
  },

  goChat() {
    wx.navigateTo({ url: "/pages/bio/chat/chat" });
  },

  goVideo() {
    wx.navigateTo({ url: "/pages/bio/video/video" });
  },

  goTimeline() {
    wx.navigateTo({ url: "/pages/bio/timeline/timeline" });
  },

  goHistory() {
    wx.navigateTo({ url: "/pages/bio/history/history" });
  },
});
