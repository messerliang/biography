const {
  getTimelineDraft,
  saveTimelineDraft,
  getDefaultTimelineDraft,
  resolveTimelineDraft,
  shouldUseDefaultTimelineDraft,
  createTimelineNode,
  sortTimelineNodes,
  ensureNodeSortOrder,
  reorderTimelineNode,
  isNodeFilled,
  countFilledNodes,
  getActiveExampleNodes,
} = require("../../../utils/bio");

Page({
  data: {
    nodes: [],
    sortedNodes: [],
    filledCount: 0,
    totalCount: 0,
    subjectName: "",
    sortMode: false,
    manualSort: false,
  },

  onLoad() {
    this._shownOnce = false;
  },

  onShow() {
    this.loadDraft(this._shownOnce);
    this._shownOnce = true;
  },

  loadDraft(silent) {
    const stored = getTimelineDraft();
    const draft = resolveTimelineDraft(stored);
    const manualSort = !!draft.manualSort;
    const subjectName = draft.subjectName || "";
    const nodes = draft.nodes;
    const sortedNodes = this.buildDisplayNodes(nodes, manualSort);
    const restoredDefault = shouldUseDefaultTimelineDraft(stored);

    this.setData({
      nodes,
      sortedNodes,
      subjectName,
      manualSort,
      filledCount: countFilledNodes(nodes),
      totalCount: nodes.length,
    });

    if (!silent || restoredDefault) {
      saveTimelineDraft({
        nodes,
        subjectName,
        selectedPerson: draft.selectedPerson,
        selectedStyle: draft.selectedStyle,
        selectedLength: draft.selectedLength,
        manualSort,
      });
    }
  },

  onSubjectNameInput(e) {
    this.setData({ subjectName: e.detail.value });
    this.persistDraft();
  },

  buildDisplayNodes(nodes, manualSort) {
    const manual = manualSort !== undefined ? manualSort : this.data.manualSort;
    return sortTimelineNodes(nodes, { manualSort: manual }).map((node) => {
      const hasDesc = !!node.description;
      const descPreview = hasDesc
        ? node.description.length > 72
          ? `${node.description.slice(0, 72)}…`
          : node.description
        : "点击添加事件描述…";
      return {
        ...node,
        filled: isNodeFilled(node),
        descPreview,
        descPlaceholder: !hasDesc,
      };
    });
  },

  persistDraft() {
    const stored = getTimelineDraft() || getDefaultTimelineDraft();
    saveTimelineDraft({
      nodes: this.data.nodes,
      subjectName: (this.data.subjectName || "").trim(),
      selectedPerson: stored.selectedPerson,
      selectedStyle: stored.selectedStyle,
      selectedLength: stored.selectedLength,
      manualSort: this.data.manualSort,
    });
    const sortedNodes = this.buildDisplayNodes(this.data.nodes, this.data.manualSort);
    this.setData({
      sortedNodes,
      filledCount: countFilledNodes(this.data.nodes),
      totalCount: this.data.nodes.length,
    });
  },

  editNode(e) {
    if (this.data.sortMode) return;
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/bio/nodeedit/nodeedit?id=${id}` });
  },

  addNode() {
    const nodes = [...this.data.nodes, createTimelineNode()];
    this.setData({ nodes });
    this.persistDraft();
    wx.showToast({ title: "已添加节点", icon: "success" });
  },

  deleteNode(e) {
    const { id } = e.currentTarget.dataset;
    if (this.data.nodes.length <= 1) {
      wx.showToast({ title: "至少保留一个节点", icon: "none" });
      return;
    }
    wx.showModal({
      title: "删除节点",
      content: "确定删除这个时间节点吗？",
      confirmColor: "#8b6914",
      success: (res) => {
        if (!res.confirm) return;
        const nodes = this.data.nodes.filter((n) => n.id !== id);
        this.setData({ nodes });
        this.persistDraft();
        wx.showToast({ title: "已删除", icon: "success" });
      },
    });
  },

  toggleSortMode() {
    const sortMode = !this.data.sortMode;
    let nodes = this.data.nodes;
    if (sortMode) {
      nodes = ensureNodeSortOrder(nodes);
    }
    this.setData({
      sortMode,
      manualSort: sortMode ? true : this.data.manualSort,
      nodes,
    });
    this.persistDraft();
  },

  moveNode(e) {
    const { id, direction } = e.currentTarget.dataset;
    const nodes = reorderTimelineNode(this.data.nodes, id, direction);
    this.setData({ nodes, manualSort: true });
    this.persistDraft();
  },

  resetExamples() {
    wx.showModal({
      title: "恢复示例",
      content: "将恢复前三个示例节点内容，您自定义的节点不会受影响。",
      confirmColor: "#8b6914",
      success: (res) => {
        if (!res.confirm) return;
        const defaults = getDefaultTimelineDraft().nodes;
        const customNodes = this.data.nodes.filter((n) => !n.isExample);
        const nodes = ensureNodeSortOrder([...defaults.slice(0, 3), ...customNodes]);
        this.setData({ nodes });
        this.persistDraft();
        wx.showToast({ title: "已恢复示例", icon: "success" });
      },
    });
  },

  goNextStep() {
    const filledNodes = this.data.nodes.filter(isNodeFilled);
    if (filledNodes.length === 0) {
      wx.showToast({ title: "请至少填写一个节点", icon: "none" });
      return;
    }

    const emptyCount = this.data.nodes.length - filledNodes.length;
    const proceed = () => {
      this.persistDraft();
      wx.navigateTo({ url: "/pages/bio/timeline-options/timeline-options" });
    };

    const exampleNodes = getActiveExampleNodes(this.data.nodes);
    const runNext = () => {
      if (emptyCount > 0) {
        wx.showModal({
          title: "提示",
          content: `有 ${emptyCount} 个空白节点，下一步后将自动忽略。是否继续？`,
          confirmColor: "#8b6914",
          success: (res) => {
            if (res.confirm) proceed();
          },
        });
      } else {
        proceed();
      }
    };

    if (exampleNodes.length > 0) {
      wx.showModal({
        title: "含有示例节点",
        content: `仍有 ${exampleNodes.length} 个示例节点未修改，建议先替换为自己的经历。`,
        confirmText: "去修改",
        cancelText: "仍要继续",
        confirmColor: "#8b6914",
        success: (res) => {
          if (!res.confirm) runNext();
        },
      });
      return;
    }

    runNext();
  },
});
