const { getBiographyList } = require("../../../utils/bio");

Page({
  data: {
    historyCount: 0,
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
