const {
  getStyleGroupsForUI,
  getStyleLabel,
  normalizeWritingStyle,
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
  navigateToGenerate,
} = require("../../../utils/bio");

Page({
  data: {
    nodes: [],
    sortedNodes: [],
    filledCount: 0,
    totalCount: 0,
    selectedStyle: "narrative",
    styleLabel: getStyleLabel("narrative"),
    styleGroups: getStyleGroupsForUI(),
    showStylePicker: false,
    sortMode: false,
    manualSort: false,
  },

  onLoad() {
    this.loadDraft(false);
  },

  onShow() {
    this.loadDraft(true);
  },

  loadDraft(silent) {
    const stored = getTimelineDraft();
    const draft = resolveTimelineDraft(stored);
    const style = draft.selectedStyle || "narrative";
    const manualSort = !!draft.manualSort;
    const nodes = draft.nodes;
    const sortedNodes = this.buildDisplayNodes(nodes, manualSort);
    const restoredDefault = shouldUseDefaultTimelineDraft(stored);

    this.setData({
      nodes,
      sortedNodes,
      selectedStyle: style,
      styleLabel: getStyleLabel(style),
      manualSort,
      filledCount: countFilledNodes(nodes),
      totalCount: nodes.length,
    });

    if (!silent || restoredDefault) {
      saveTimelineDraft({ nodes, selectedStyle: style, manualSort });
    }
  },

  buildDisplayNodes(nodes, manualSort) {
    const manual = manualSort !== undefined ? manualSort : this.data.manualSort;
    return sortTimelineNodes(nodes, { manualSort: manual }).map((node) => ({
      ...node,
      filled: isNodeFilled(node),
      descPreview: node.description
        ? node.description.length > 72
          ? `${node.description.slice(0, 72)}…`
          : node.description
        : "",
    }));
  },

  persistDraft() {
    saveTimelineDraft({
      nodes: this.data.nodes,
      selectedStyle: this.data.selectedStyle,
      manualSort: this.data.manualSort,
    });
    const sortedNodes = this.buildDisplayNodes(this.data.nodes, this.data.manualSort);
    this.setData({
      sortedNodes,
      filledCount: countFilledNodes(this.data.nodes),
      totalCount: this.data.nodes.length,
      styleLabel: getStyleLabel(this.data.selectedStyle),
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

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    this.setData({
      selectedStyle: style,
      styleLabel: getStyleLabel(style),
    });
    this.persistDraft();
  },

  toggleStylePicker() {
    this.setData({ showStylePicker: !this.data.showStylePicker });
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

  generate() {
    const filledNodes = this.data.nodes.filter(isNodeFilled);
    if (filledNodes.length === 0) {
      wx.showToast({ title: "请至少填写一个节点", icon: "none" });
      return;
    }

    const emptyCount = this.data.nodes.length - filledNodes.length;
    const proceed = () => {
      const nodesToSend = sortTimelineNodes(filledNodes, {
        manualSort: this.data.manualSort,
      });
      navigateToGenerate({
        source: "timeline",
        style: this.data.selectedStyle,
        data: { nodes: nodesToSend },
      });
    };

    const exampleNodes = getActiveExampleNodes(this.data.nodes);
    const runGenerate = () => {
      if (emptyCount > 0) {
        wx.showModal({
          title: "提示",
          content: `有 ${emptyCount} 个空白节点将被忽略，是否继续生成传记？`,
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
        content: `仍有 ${exampleNodes.length} 个示例节点未修改，直接生成可能写成虚构故事。建议先替换为自己的经历。`,
        confirmText: "去修改",
        cancelText: "仍要生成",
        confirmColor: "#8b6914",
        success: (res) => {
          if (!res.confirm) runGenerate();
        },
      });
      return;
    }

    runGenerate();
  },
});
