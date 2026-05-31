const {
  getBiographyList,
  getBiographyById,
  deleteBiography,
  getStyleLabel,
  getSourceLabel,
  getSampleBiographies,
} = require("../../../utils/bio");
const { exportAndSaveBiography } = require("../../../utils/exportBiography");

const FONT_SIZE_MAP = {
  small: 26,
  medium: 30,
  large: 36,
};

const FILTER_TABS = [
  { key: "all", label: "全部" },
  { key: "form", label: "分步" },
  { key: "chat", label: "访谈" },
  { key: "video", label: "视频" },
  { key: "audio", label: "音频" },
  { key: "timeline", label: "时间轴" },
];

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

Page({
  data: {
    list: [],
    filteredList: [],
    samples: getSampleBiographies(),
    searchKeyword: "",
    filterKey: "all",
    filterTabs: FILTER_TABS,
    showDetail: false,
    detail: {},
    fontSizeKey: "medium",
    fontSize: FONT_SIZE_MAP.medium,
    lineHeight: 2,
    exporting: false,
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    const list = getBiographyList().map((item) => ({
      ...item,
      styleLabel: getStyleLabel(item.style),
      sourceLabel: getSourceLabel(item.source),
      dateStr: formatDate(item.createdAt),
      preview: item.content.slice(0, 120) + (item.content.length > 120 ? "……" : ""),
    }));
    this.setData({ list }, () => this.applyFilter());
  },

  applyFilter() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    const { filterKey, list } = this.data;
    let filtered = list;
    if (filterKey !== "all") {
      filtered = filtered.filter((item) => item.source === filterKey);
    }
    if (keyword) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          item.preview.toLowerCase().includes(keyword) ||
          item.content.toLowerCase().includes(keyword)
      );
    }
    this.setData({ filteredList: filtered });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value }, () => this.applyFilter());
  },

  clearSearch() {
    this.setData({ searchKeyword: "" }, () => this.applyFilter());
  },

  switchFilter(e) {
    this.setData({ filterKey: e.currentTarget.dataset.key }, () => this.applyFilter());
  },

  switchFontSize(e) {
    const key = e.currentTarget.dataset.size;
    this.setData({
      fontSizeKey: key,
      fontSize: FONT_SIZE_MAP[key],
      lineHeight: key === "large" ? 2.2 : 2,
    });
  },

  viewDetail(e) {
    const item = getBiographyById(e.currentTarget.dataset.id);
    if (item) {
      this.setData({
        showDetail: true,
        detail: {
          ...item,
          styleLabel: getStyleLabel(item.style),
          sourceLabel: getSourceLabel(item.source),
        },
      });
    }
  },

  viewSample(e) {
    const sample = this.data.samples.find((s) => s.id === e.currentTarget.dataset.id);
    if (sample) {
      this.setData({
        showDetail: true,
        detail: {
          ...sample,
          styleLabel: getStyleLabel(sample.style),
          sourceLabel: getSourceLabel(sample.source),
          isSample: true,
        },
      });
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

  exportDetail() {
    if (this.data.exporting || !this.data.detail.content) return;
    this.setData({ exporting: true });
    exportAndSaveBiography({
      title: this.data.detail.title,
      content: this.data.detail.content,
      styleLabel: this.data.detail.styleLabel,
      sourceLabel: this.data.detail.sourceLabel,
    })
      .then(() => wx.showToast({ title: "已保存到相册", icon: "success" }))
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: "导出失败", icon: "none" });
      })
      .finally(() => this.setData({ exporting: false }));
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

  onShareAppMessage() {
    const { detail } = this.data;
    if (detail && detail.title && this.data.showDetail) {
      return {
        title: detail.title,
        path: "/pages/bio/home/home",
      };
    }
    return {
      title: "我的人生传记",
      path: "/pages/bio/home/home",
    };
  },
});
