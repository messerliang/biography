const { STYLES, INTERVIEW_SYSTEM_PROMPT } = require("../../../utils/bio");

const WELCOME =
  "您好，我是您的传记助手。接下来我会像老朋友一样，慢慢听您讲述人生故事。\n\n我们从童年说起吧——您小时候在哪里长大？家里有哪些让您印象深刻的人？";

Page({
  data: {
    messages: [{ role: "assistant", content: WELCOME }],
    inputValue: "",
    isTyping: false,
    typingText: "",
    scrollTo: "",
    styleIndex: 0,
    styleLabels: Object.values(STYLES).map((s) => s.label),
    styleKeys: Object.keys(STYLES),
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onStyleChange(e) {
    this.setData({ styleIndex: Number(e.detail.value) });
  },

  scrollToBottom() {
    this.setData({ scrollTo: "" });
    setTimeout(() => {
      this.setData({ scrollTo: "msg-bottom" });
    }, 50);
  },

  async sendMessage() {
    const text = this.data.inputValue.trim();
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

      const ai = wx.cloud.extend.AI;
      const aiModel = ai.createModel("deepseek");
      const res = await aiModel.streamText({
        data: {
          model: "deepseek-v3.2",
          messages: [{ role: "system", content: INTERVIEW_SYSTEM_PROMPT }, ...apiMessages],
        },
      });

      let fullText = "";
      for await (const event of res.eventStream) {
        const { data: eventData } = event;
        try {
          const dataJson = JSON.parse(eventData);
          const { choices = [] } = dataJson || {};
          const { delta, finish_reason } = choices[0] || {};
          if (finish_reason === "stop") break;
          const chunk = delta?.content || "";
          if (chunk) {
            fullText += chunk;
            this.setData({ typingText: fullText });
            this.scrollToBottom();
          }
        } catch (e) {
          break;
        }
      }

      if (!fullText) {
        fullText = "抱歉，我没有听清楚，能再说一遍吗？";
      }

      this.setData({
        messages: [...userMessages, { role: "assistant", content: fullText }],
        isTyping: false,
        typingText: "",
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
      this.setData({ isTyping: false, typingText: "" });
    }
    this.scrollToBottom();
  },

  generateBiography() {
    const chatMessages = this.data.messages.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    if (chatMessages.length < 2) {
      wx.showToast({ title: "请至少聊几句再生成", icon: "none" });
      return;
    }

    const style = this.data.styleKeys[this.data.styleIndex];
    const payload = encodeURIComponent(
      JSON.stringify({
        source: "chat",
        style,
        data: { messages: chatMessages },
      })
    );
    wx.navigateTo({ url: `/pages/bio/result/result?payload=${payload}` });
  },
});
