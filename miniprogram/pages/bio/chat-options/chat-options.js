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
  normalizeYanqingTone,
  DEFAULT_YANQING_TONE,
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
    yanqingTone: DEFAULT_YANQING_TONE,
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
      styleLabel: getStyleLabel(style, { wuxiaTone: draft?.wuxiaTone, yanqingTone: draft?.yanqingTone }),
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
      wuxiaTone: normalizeWuxiaTone(draft?.wuxiaTone),
      yanqingTone: normalizeYanqingTone(draft?.yanqingTone),
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
      yanqingTone: this.data.yanqingTone,
    });
  },

  onSubjectNameInput(e) {
    this.setData({ subjectName: e.detail.value || "" });
    this.persistDraft();
  },

  selectPerson(e) {
    const person = normalizePerson(e.currentTarget.dataset.person);
    this.setData({
      selectedPerson: person,
      personLabel: getPersonLabel(person),
      subjectName: person === "third" ? this.data.subjectName : "",
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
    if (this.data.selectedPerson === "third" && !(this.data.subjectName || "").trim()) {
      wx.showToast({ title: "请填写主人公称呼", icon: "none" });
      return;
    }

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
    if (this.data.selectedStyle === "yanqing") {
      payload.yanqingTone = this.data.yanqingTone;
    }
    navigateToGenerate(payload);
  },
});
