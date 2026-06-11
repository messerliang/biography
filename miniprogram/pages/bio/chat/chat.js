const {
  getStyleGroupsForUI,
  getStyleLabel,
  getLengthOptionsForUI,
  getLengthLabel,
  normalizeLength,
  getChatMaterialStats,
  streamChatReply,
  navigateToGenerate,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  getDefaultChatDraft,
  WELCOME_MESSAGE,
  normalizeWuxiaTone,
  DEFAULT_WUXIA_TONE,
} = require("../../../utils/bio");
const { createRecorderSession } = require("../../../utils/voiceInput");

Page({
  data: {
    messages: [{ role: "assistant", content: WELCOME_MESSAGE }],
    inputValue: "",
    isTyping: false,
    typingText: "",
    scrollTo: "",
    selectedStyle: "narrative",
    styleLabel: getStyleLabel("narrative"),
    selectedLength: "normal",
    lengthLabel: getLengthLabel("normal"),
    styleGroups: getStyleGroupsForUI(),
    lengthOptions: getLengthOptionsForUI(),
    showStylePicker: false,
    showLengthPicker: false,
    wuxiaTone: DEFAULT_WUXIA_TONE,
    materialTip: "",
    materialSufficient: false,
    userMsgCount: 0,
    recording: false,
    voiceStatus: "",
  },

  recorderSession: null,

  onLoad() {
    const draft = getChatDraft();
    if (draft && draft.messages && draft.messages.length > 1) {
      wx.showModal({
        title: "发现未完成访谈",
        content: "是否继续上次访谈内容？",
        confirmColor: "#8b6914",
        success: (res) => {
          if (res.confirm) {
            this.applyDraft(draft);
          } else {
            clearChatDraft();
            this.updateMaterialStats();
          }
        },
      });
    } else {
      this.updateMaterialStats();
    }
  },

  onUnload() {
    this.saveDraft();
    if (this.recorderSession) this.recorderSession.cancel();
  },

  applyDraft(draft) {
    const style = draft.selectedStyle || "narrative";
    const length = normalizeLength(draft.selectedLength);
    this.setData({
      messages: draft.messages,
      selectedStyle: style,
      styleLabel: getStyleLabel(style, draft.wuxiaTone),
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
      wuxiaTone: normalizeWuxiaTone(draft.wuxiaTone),
    });
    this.updateMaterialStats();
  },

  saveDraft() {
    if (this.data.messages.length <= 1) return;
    saveChatDraft({
      messages: this.data.messages,
      selectedStyle: this.data.selectedStyle,
      selectedLength: this.data.selectedLength,
      wuxiaTone: this.data.wuxiaTone,
    });
  },

  updateMaterialStats() {
    const stats = getChatMaterialStats(this.data.messages);
    this.setData({
      materialTip: stats.tip,
      materialSufficient: stats.sufficient,
      userMsgCount: stats.userCount,
    });
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
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
      showLengthPicker: false,
    });
    this.saveDraft();
  },

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    this.setData({
      selectedStyle: style,
      styleLabel: getStyleLabel(style, this.data.wuxiaTone),
      showStylePicker: style === "wuxia" ? true : this.data.showStylePicker,
    });
    this.saveDraft();
  },

  onWuxiaToneChange(e) {
    const wuxiaTone = normalizeWuxiaTone(e.detail.value);
    this.setData({
      wuxiaTone,
      styleLabel: getStyleLabel(this.data.selectedStyle, wuxiaTone),
    });
    this.saveDraft();
  },

  scrollToBottom() {
    this.setData({ scrollTo: "" });
    setTimeout(() => {
      this.setData({ scrollTo: "msg-bottom" });
    }, 50);
  },

  async sendMessage(e) {
    let text = "";
    if (typeof e === "string") {
      text = e.trim();
    } else if (e && e.detail && typeof e.detail.value === "string") {
      text = e.detail.value.trim();
    } else {
      text = this.data.inputValue.trim();
    }
    if (!text || this.data.isTyping) return;

    const userMessages = [
      ...this.data.messages.filter((m) => m.role === "user" || m.role === "assistant"),
      { role: "user", content: text },
    ];

    this.setData({
      inputValue: "",
      messages: userMessages,
      isTyping: true,
      typingText: "",
    });
    this.scrollToBottom();

    try {
      const apiMessages = userMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let fullText = await streamChatReply(apiMessages, (replyText) => {
        this.setData({ typingText: replyText });
        this.scrollToBottom();
      });

      if (!fullText) {
        fullText = "抱歉，我没有听清楚，能再说一遍吗？";
      }

      this.setData({
        messages: [...userMessages, { role: "assistant", content: fullText }],
        isTyping: false,
        typingText: "",
      });
      this.saveDraft();
      this.updateMaterialStats();
    } catch (err) {
      console.error(err);
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
      this.setData({ isTyping: false, typingText: "" });
    }
    this.scrollToBottom();
  },

  onVoiceTouchStart() {
    if (this.data.isTyping || this.data.recording) return;
    this.recorderSession = createRecorderSession({
      onStatusChange: (status) => {
        const map = {
          recording: "正在聆听，松手发送…",
          transcribing: "识别中…",
          idle: "",
        };
        this.setData({
          voiceStatus: map[status] || "",
          recording: status === "recording",
        });
      },
    });
    this.recorderSession.begin();
  },

  onVoiceTouchEnd() {
    if (!this.data.recording || !this.recorderSession) return;
    this.recorderSession
      .end()
      .then((text) => {
        this.setData({ recording: false, voiceStatus: "" });
        if (text) this.sendMessage(text);
      })
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: "语音识别失败", icon: "none" });
        this.setData({ recording: false, voiceStatus: "" });
      });
  },

  onVoiceTouchCancel() {
    if (this.recorderSession) this.recorderSession.cancel();
    this.setData({ recording: false, voiceStatus: "" });
  },

  generateBiography() {
    const chatMessages = this.data.messages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    const stats = getChatMaterialStats(chatMessages);

    const proceed = () => {
      clearChatDraft();
      navigateToGenerate({
        source: "chat",
        style: this.data.selectedStyle,
        length: this.data.selectedLength,
        wuxiaTone: this.data.selectedStyle === "wuxia" ? this.data.wuxiaTone : undefined,
        data: { messages: chatMessages },
      });
    };

    if (!stats.sufficient) {
      wx.showModal({
        title: "素材可能不足",
        content: `${stats.tip}。内容较少时传记可能较简略，是否仍要生成？`,
        confirmText: "继续生成",
        cancelText: "再聊聊",
        confirmColor: "#8b6914",
        success: (res) => {
          if (res.confirm) proceed();
        },
      });
      return;
    }

    proceed();
  },

  onShareAppMessage() {
    return {
      title: "我正在用「人生传记」记录人生故事",
      path: "/pages/bio/home/home",
    };
  },
});
