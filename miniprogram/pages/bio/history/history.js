const { getBiographyList, getBiographyById, deleteBiography, STYLES } = require("../../../utils/bio");

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

Page({
  data: {
    list: [],
    showDetail: false,
    detail: {},
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    const list = getBiographyList().map((item) => ({
      ...item,
      styleLabel: STYLES[item.style]?.label || "纪实叙述",
      dateStr: formatDate(item.createdAt),
      preview: item.content.slice(0, 120) + (item.content.length > 120 ? "……" : ""),
    }));
    this.setData({ list });
  },

  viewDetail(e) {
    const item = getBiographyById(e.currentTarget.dataset.id);
    if (item) {
      this.setData({ showDetail: true, detail: item });
    }
  },

  closeDetail() {
    this.setData({ showDetail: false });
  },

  copyDetail() {
    wx.setClipboardData({
      data: this.data.detail.content,
      success: () => wx.showToast({ title: "已复制", icon: "success" }),
    });
  },

  deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "确认删除",
      content: "删除后无法恢复，确定吗？",
      success: (res) => {
        if (res.confirm) {
          deleteBiography(id);
          this.loadList();
          wx.showToast({ title: "已删除", icon: "success" });
        }
      },
    });
  },

  stopProp() {},

  goHome() {
    wx.redirectTo({ url: "/pages/bio/home/home" });
  },
});
