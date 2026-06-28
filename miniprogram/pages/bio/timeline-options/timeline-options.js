const {
  getStyleGroupsForUI,
  getStyleLabel,
  getLengthOptionsForUI,
  getLengthLabel,
  getPersonOptionsForUI,
  getPersonLabel,
  normalizeLength,
  normalizePerson,
  getTimelineDraft,
  saveTimelineDraft,
  resolveTimelineDraft,
  sortTimelineNodes,
  isNodeFilled,
  countFilledNodes,
  getActiveExampleNodes,
  navigateToGenerate,
  normalizeWuxiaTone,
  DEFAULT_WUXIA_TONE,
  normalizeYanqingTone,
  DEFAULT_YANQING_TONE,
} = require("../../../utils/bio");

Page({
  data: {
    subjectName: "",
    filledCount: 0,
    selectedPerson: "third",
    personLabel: getPersonLabel("third"),
    personOptions: getPersonOptionsForUI(),
    selectedStyle: "narrative",
    styleLabel: getStyleLabel("narrative"),
    selectedLength: "normal",
    lengthLabel: getLengthLabel("normal"),
    styleGroups: getStyleGroupsForUI(),
    lengthOptions: getLengthOptionsForUI(),
    showStylePicker: false,
    showLengthPicker: false,
    wuxiaTone: DEFAULT_WUXIA_TONE,
    yanqingTone: DEFAULT_YANQING_TONE,
    nodes: [],
    manualSort: false,
  },

  onShow() {
    const draft = resolveTimelineDraft(getTimelineDraft());
    const filledCount = countFilledNodes(draft.nodes);
    if (filledCount === 0) {
      wx.showToast({ title: "请先填写节点", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const person = normalizePerson(draft.selectedPerson);
    const style = draft.selectedStyle || "narrative";
    const length = normalizeLength(draft.selectedLength);

    this.setData({
      nodes: draft.nodes,
      manualSort: !!draft.manualSort,
      subjectName: draft.subjectName || "",
      filledCount,
      selectedPerson: person,
      personLabel: getPersonLabel(person),
      selectedStyle: style,
      styleLabel: getStyleLabel(style, { wuxiaTone: draft.wuxiaTone, yanqingTone: draft.yanqingTone }),
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
      wuxiaTone: normalizeWuxiaTone(draft.wuxiaTone),
      yanqingTone: normalizeYanqingTone(draft.yanqingTone),
    });
  },

  persistDraft() {
    saveTimelineDraft({
      nodes: this.data.nodes,
      subjectName: this.data.subjectName,
      selectedPerson: this.data.selectedPerson,
      selectedStyle: this.data.selectedStyle,
      selectedLength: this.data.selectedLength,
      wuxiaTone: this.data.wuxiaTone,
      yanqingTone: this.data.yanqingTone,
      manualSort: this.data.manualSort,
    });
  },

  selectPerson(e) {
    const person = normalizePerson(e.currentTarget.dataset.person);
    this.setData({
      selectedPerson: person,
      personLabel: getPersonLabel(person),
    });
    this.persistDraft();
  },

  toggleLengthPicker() {
    this.setData({ showLengthPicker: !this.data.showLengthPicker });
  },

  toggleStylePicker() {
    this.setData({ showStylePicker: !this.data.showStylePicker });
  },

  selectLength(e) {
    const length = normalizeLength(e.currentTarget.dataset.length);
    this.setData({
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
    });
    this.persistDraft();
  },

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    this.setData({
      selectedStyle: style,
      styleLabel: getStyleLabel(style, { wuxiaTone: this.data.wuxiaTone, yanqingTone: this.data.yanqingTone }),
      showStylePicker: style === "wuxia" || style === "yanqing" ? true : this.data.showStylePicker,
    });
    this.persistDraft();
  },

  onWuxiaToneChange(e) {
    const wuxiaTone = normalizeWuxiaTone(e.detail.value);
    this.setData({
      wuxiaTone,
      styleLabel: getStyleLabel(this.data.selectedStyle, { wuxiaTone, yanqingTone: this.data.yanqingTone }),
    });
    this.persistDraft();
  },

  onYanqingToneChange(e) {
    const yanqingTone = normalizeYanqingTone(e.detail.value);
    this.setData({
      yanqingTone,
      styleLabel: getStyleLabel(this.data.selectedStyle, { wuxiaTone: this.data.wuxiaTone, yanqingTone }),
    });
    this.persistDraft();
  },

  goBack() {
    wx.navigateBack();
  },

  generate() {
    const filledNodes = this.data.nodes.filter(isNodeFilled);
    const emptyCount = this.data.nodes.length - filledNodes.length;

    const proceed = () => {
      const nodesToSend = sortTimelineNodes(filledNodes, {
        manualSort: this.data.manualSort,
      });
      navigateToGenerate({
        source: "timeline",
        style: this.data.selectedStyle,
        length: this.data.selectedLength,
        person: this.data.selectedPerson,
        wuxiaTone: this.data.selectedStyle === "wuxia" ? this.data.wuxiaTone : undefined,
        yanqingTone: this.data.selectedStyle === "yanqing" ? this.data.yanqingTone : undefined,
        data: {
          nodes: nodesToSend,
          manualSort: this.data.manualSort,
          subjectName: (this.data.subjectName || "").trim(),
        },
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
