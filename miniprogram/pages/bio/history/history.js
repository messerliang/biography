const {
  getBiographyList,
  getBiographyById,
  deleteBiography,
  updateBiographyShareId,
  updateBiographyResonance,
  getStyleLabel,
  getSourceLabel,
  getSampleBiographies,
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
const { extractSubjectNameFromTitle } = require("../../../utils/bioContentFormat");

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
    resonanceSaving: false,
    resonanceSharing: false,
  },

  _shareResonanceMode: false,

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
      const figureMatch = item.figureMatch?.enabled ? item.figureMatch : null;
      this.setData({
        showDetail: true,
        detail: {
          ...item,
          subjectName: extractSubjectNameFromTitle(item.title),
          styleLabel: getStyleLabel(item.style, { wuxiaTone: item.wuxiaTone, yanqingTone: item.yanqingTone }),
          sourceLabel: getSourceLabel(item.source),
          figureMatch,
          figureMatchRevealed: !!item.figureMatchRevealed,
          resonanceMeta: figureMatch ? getResonanceMeta(figureMatch.kind) : null,
        },
      });
      this.prepareShareForDetail(item);
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

  async prepareShareForDetail(detail) {
    if (!detail || detail.isSample || detail.shareId) return detail?.shareId;
    try {
      const res = await publishShareBio({
        title: detail.title,
        content: detail.content,
        styleLabel: detail.styleLabel || getStyleLabel(detail.style),
        sourceLabel: detail.sourceLabel || getSourceLabel(detail.source),
        style: detail.style,
      });
      updateBiographyShareId(detail.id, res.shareId);
      if (this.data.detail?.id === detail.id) {
        this.setData({ detail: { ...this.data.detail, shareId: res.shareId } });
      }
      return res.shareId;
    } catch (err) {
      console.error(err);
      return "";
    }
  },

  revealDetailFigureMatch() {
    const detail = this.data.detail;
    if (!detail?.figureMatch) return;
    updateBiographyResonance(detail.id, { figureMatchRevealed: true });
    this.setData({ detail: { ...detail, figureMatchRevealed: true } });
  },

  async ensureDetailResonancePublished() {
    const detail = this.data.detail;
    if (!detail?.figureMatch) return "";
    if (detail.resonanceId) return detail.resonanceId;
    const res = await publishResonanceBio({
      bioTitle: detail.title,
      figureMatch: detail.figureMatch,
    });
    updateBiographyResonance(detail.id, { resonanceId: res.resonanceId });
    this.setData({ detail: { ...this.data.detail, resonanceId: res.resonanceId } });
    return res.resonanceId;
  },

  async saveDetailResonanceCard() {
    const detail = this.data.detail;
    if (!detail?.figureMatchRevealed || !detail?.figureMatch || this.data.resonanceSaving) return;
    this.setData({ resonanceSaving: true });
    try {
      await saveResonanceCard({
        figureMatch: detail.figureMatch,
        bioTitle: detail.title,
        kind: detail.figureMatch.kind,
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

  prepareDetailResonanceShare() {
    this._shareResonanceMode = true;
    if (this.data.detail?.figureMatchRevealed) {
      this.ensureDetailResonancePublished().catch(console.error);
    }
  },

  async shareDetailResonanceImage() {
    const detail = this.data.detail;
    if (!detail?.figureMatchRevealed || !detail?.figureMatch || this.data.resonanceSharing) return;
    this.setData({ resonanceSharing: true });
    try {
      const filePath = await exportResonanceForShare({
        figureMatch: detail.figureMatch,
        bioTitle: detail.title,
        kind: detail.figureMatch.kind,
      });
      await shareResonanceImage(filePath);
    } catch (err) {
      if (isUserCancelError(err)) return;
      console.error(err);
      wx.showToast({ title: getResonanceErrorMessage(err) || "请保存图片后发送", icon: "none" });
    } finally {
      this.setData({ resonanceSharing: false });
    }
  },

  exportDetail() {
    if (this.data.exporting || !this.data.detail.content) return;
    this.setData({ exporting: true });
    const detail = this.data.detail;
    exportAndSaveBiography({
      title: detail.title,
      content: detail.content,
      styleLabel: detail.styleLabel,
      sourceLabel: detail.sourceLabel,
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
    if (this._shareResonanceMode && detail?.figureMatchRevealed && detail?.figureMatch) {
      this._shareResonanceMode = false;
      if (!detail.resonanceId) {
        this.ensureDetailResonancePublished();
      }
      return {
        title: buildResonanceShareTitle(detail.title, detail.figureMatch),
        path: buildResonancePath(detail.resonanceId),
      };
    }
    if (detail && detail.title && this.data.showDetail && !detail.isSample) {
      if (!detail.shareId) {
        this.prepareShareForDetail(detail);
      }
      return {
        title: buildShareTitle(detail.title, detail.content),
        path: buildSharePath(detail.shareId),
      };
    }
    return {
      title: "人生传记 · 记录故事，传承记忆",
      path: "/pages/bio/home/home",
    };
  },
});
