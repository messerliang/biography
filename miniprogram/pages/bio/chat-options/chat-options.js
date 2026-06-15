const {
  getStyleGroupsForUI,
  getStyleLabel,
  getLengthOptionsForUI,
  getLengthLabel,
  getPersonOptionsForUI,
  getPersonLabel,
  getChatMaterialStats,
  normalizeLength,
  normalizePerson,
  normalizeWuxiaTone,
  DEFAULT_WUXIA_TONE,
  getChatDraft,
  saveChatDraft,
  clearChatDraft,
  navigateToGenerate,
} = require("../../../utils/bio");

Page({
  data: {
    messages: [],
    subjectName: "",
    userMsgCount: 0,
    messageCount: 0,
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
  },

  onShow() {
    const draft = getChatDraft();
    const messages = (draft?.messages || []).filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    if (messages.length < 2) {
      wx.showToast({ title: "请先完成访谈", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const person = normalizePerson(draft?.selectedPerson);
    const style = draft?.selectedStyle || "narrative";
    const length = normalizeLength(draft?.selectedLength);
    const stats = getChatMaterialStats(messages);

    this.setData({
      messages,
      subjectName: draft?.subjectName || "",
      userMsgCount: stats.userCount,
      messageCount: messages.length,
      selectedPerson: person,
      personLabel: getPersonLabel(person),
      selectedStyle: style,
      styleLabel: getStyleLabel(style, draft?.wuxiaTone),
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
      wuxiaTone: normalizeWuxiaTone(draft?.wuxiaTone),
    });
  },

  persistDraft() {
    saveChatDraft({
      messages: this.data.messages,
      subjectName: this.data.subjectName,
      selectedPerson: this.data.selectedPerson,
      selectedStyle: this.data.selectedStyle,
      selectedLength: this.data.selectedLength,
      wuxiaTone: this.data.wuxiaTone,
    });
  },

  promptSubjectName(onSuccess) {
    const hint = this.data.subjectName
      ? `当前称呼：${this.data.subjectName}。请在下方输入新的称呼。`
      : "第三人称叙述时，请填写如何称呼主人公（如：张先生、母亲、老李）";
    wx.showModal({
      title: "主人公称呼",
      content: hint,
      editable: true,
      placeholderText: "请输入称呼",
      confirmText: "确定",
      confirmColor: "#8b6914",
      success: (res) => {
        if (!res.confirm) return;
        const subjectName = (res.content || "").trim();
        if (!subjectName) {
          wx.showToast({ title: "请填写称呼", icon: "none" });
          return;
        }
        this.setData({
          selectedPerson: "third",
          personLabel: getPersonLabel("third"),
          subjectName,
        });
        this.persistDraft();
        if (onSuccess) onSuccess();
      },
    });
  },

  editSubjectName() {
    this.promptSubjectName();
  },

  selectPerson(e) {
    const person = normalizePerson(e.currentTarget.dataset.person);
    if (person === "third") {
      this.promptSubjectName();
      return;
    }
    this.setData({
      selectedPerson: person,
      personLabel: getPersonLabel(person),
      subjectName: "",
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
      styleLabel: getStyleLabel(style, this.data.wuxiaTone),
      showStylePicker: style === "wuxia" ? true : this.data.showStylePicker,
    });
    this.persistDraft();
  },

  onWuxiaToneChange(e) {
    const wuxiaTone = normalizeWuxiaTone(e.detail.value);
    this.setData({
      wuxiaTone,
      styleLabel: getStyleLabel(this.data.selectedStyle, wuxiaTone),
    });
    this.persistDraft();
  },

  goBack() {
    wx.navigateBack();
  },

  generate() {
    const proceed = () => {
      const chatMessages = this.data.messages;
      clearChatDraft();
      const payload = {
        source: "chat",
        style: this.data.selectedStyle,
        length: this.data.selectedLength,
        person: this.data.selectedPerson,
        data: {
          messages: chatMessages,
          subjectName: (this.data.subjectName || "").trim(),
        },
      };
      if (this.data.selectedStyle === "wuxia") {
        payload.wuxiaTone = this.data.wuxiaTone;
      }
      navigateToGenerate(payload);
    };

    if (this.data.selectedPerson === "third" && !(this.data.subjectName || "").trim()) {
      this.promptSubjectName(proceed);
      return;
    }

    proceed();
  },
});
