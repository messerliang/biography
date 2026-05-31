const {
  getTimelineDraft,
  saveTimelineDraft,
  getDefaultTimelineDraft,
  normalizeWritingStyle,
} = require("../../../utils/bio");

Page({
  data: {
    nodeId: "",
    date: "",
    title: "",
    description: "",
    isExample: false,
    totalCount: 0,
    dirty: false,
  },

  originalSnapshot: "",

  onLoad(options) {
    const nodeId = options.id;
    if (!nodeId) {
      wx.showToast({ title: "节点不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const draft = getTimelineDraft() || getDefaultTimelineDraft();
    const node = draft.nodes.find((n) => n.id === nodeId);
    if (!node) {
      wx.showToast({ title: "节点不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const snapshot = this.buildSnapshot(node);
    this.originalSnapshot = snapshot;

    this.setData({
      nodeId,
      date: node.date || "",
      title: node.title || "",
      description: node.description || "",
      isExample: !!node.isExample,
      totalCount: draft.nodes.length,
      dirty: false,
    });
  },

  onUnload() {
    this.disableLeaveConfirm();
  },

  buildSnapshot(node) {
    return JSON.stringify({
      date: (node.date || "").trim(),
      title: (node.title || "").trim(),
      description: (node.description || "").trim(),
    });
  },

  getCurrentSnapshot() {
    return JSON.stringify({
      date: this.data.date.trim(),
      title: this.data.title.trim(),
      description: this.data.description.trim(),
    });
  },

  updateDirty() {
    const dirty = this.getCurrentSnapshot() !== this.originalSnapshot;
    if (dirty !== this.data.dirty) {
      this.setData({ dirty });
      if (dirty) this.enableLeaveConfirm();
      else this.disableLeaveConfirm();
    }
  },

  enableLeaveConfirm() {
    if (typeof wx.enableAlertBeforeUnload === "function") {
      wx.enableAlertBeforeUnload({
        message: "节点内容尚未保存，确定离开吗？",
      });
    }
  },

  disableLeaveConfirm() {
    if (typeof wx.disableAlertBeforeUnload === "function") {
      wx.disableAlertBeforeUnload();
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, () => this.updateDirty());
  },

  save() {
    const { nodeId, date, title, description } = this.data;
    if (!date.trim() && !title.trim() && !description.trim()) {
      wx.showToast({ title: "请至少填写一项", icon: "none" });
      return;
    }

    const draft = getTimelineDraft() || getDefaultTimelineDraft();
    const nodes = draft.nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        date: date.trim(),
        title: title.trim(),
        description: description.trim(),
        isExample: false,
      };
    });

    saveTimelineDraft({
      nodes,
      selectedStyle: normalizeWritingStyle(draft.selectedStyle || "narrative"),
      manualSort: draft.manualSort,
    });

    this.disableLeaveConfirm();
    wx.showToast({ title: "已保存", icon: "success" });
    setTimeout(() => wx.navigateBack(), 400);
  },

  deleteNode() {
    if (this.data.totalCount <= 1) {
      wx.showToast({ title: "至少保留一个节点", icon: "none" });
      return;
    }

    wx.showModal({
      title: "删除节点",
      content: "确定删除这个时间节点吗？",
      confirmColor: "#8b6914",
      success: (res) => {
        if (!res.confirm) return;
        const draft = getTimelineDraft() || getDefaultTimelineDraft();
        const nodes = draft.nodes.filter((n) => n.id !== this.data.nodeId);
        saveTimelineDraft({
          nodes,
          selectedStyle: normalizeWritingStyle(draft.selectedStyle || "narrative"),
          manualSort: draft.manualSort,
        });
        this.disableLeaveConfirm();
        wx.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => wx.navigateBack(), 400);
      },
    });
  },
});
