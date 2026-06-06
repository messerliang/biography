const {
  getStyleGroupsForUI,
  getLengthOptionsForUI,
  normalizeLength,
  navigateToGenerate,
} = require("../../../utils/bio");
const { chooseVideo, chooseAudio, parseVideo, parseAudio } = require("../../../utils/videoParser");

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}分${String(s).padStart(2, "0")}秒`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

Page({
  data: {
    mediaMode: "video",
    mediaPath: "",
    mediaName: "",
    videoThumb: "",
    mediaSize: 0,
    mediaDuration: 0,
    durationText: "",
    sizeText: "",
    parsing: false,
    uploadProgress: 0,
    statusText: "准备解析...",
    statusTip: "正在上传到云端",
    transcript: "",
    selectedStyle: "narrative",
    selectedLength: "normal",
    styleGroups: getStyleGroupsForUI(),
    lengthOptions: getLengthOptionsForUI(),
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.mediaMode) return;
    this.setData({
      mediaMode: mode,
      mediaPath: "",
      mediaName: "",
      videoThumb: "",
      transcript: "",
      parsing: false,
      uploadProgress: 0,
    });
  },

  async pickMedia() {
    try {
      if (this.data.mediaMode === "audio") {
        const file = await chooseAudio();
        this.setData({
          mediaPath: file.tempFilePath,
          mediaName: file.name || "音频文件",
          videoThumb: "",
          mediaSize: file.size,
          mediaDuration: 0,
          durationText: "",
          sizeText: formatSize(file.size),
          transcript: "",
          parsing: false,
          uploadProgress: 0,
        });
      } else {
        const file = await chooseVideo();
        this.setData({
          mediaPath: file.tempFilePath,
          mediaName: "",
          videoThumb: file.thumbTempFilePath || "",
          mediaSize: file.size,
          mediaDuration: file.duration,
          durationText: formatDuration(file.duration),
          sizeText: formatSize(file.size),
          transcript: "",
          parsing: false,
          uploadProgress: 0,
        });
      }
    } catch (err) {
      if (err.message === "cancel") return;
      wx.showToast({ title: err.message || "选择失败", icon: "none" });
    }
  },

  onTranscriptInput(e) {
    this.setData({ transcript: e.detail.value });
  },

  selectStyle(e) {
    this.setData({ selectedStyle: e.currentTarget.dataset.style });
  },

  selectLength(e) {
    this.setData({ selectedLength: normalizeLength(e.currentTarget.dataset.length) });
  },

  resetMedia() {
    this.setData({
      mediaPath: "",
      mediaName: "",
      videoThumb: "",
      transcript: "",
      parsing: false,
      uploadProgress: 0,
    });
  },

  reparse() {
    this.setData({ transcript: "" });
    this.startParse();
  },

  async startParse() {
    if (!this.data.mediaPath || this.data.parsing) return;

    const isAudio = this.data.mediaMode === "audio";
    this.setData({
      parsing: true,
      uploadProgress: 0,
      statusText: isAudio ? "正在上传音频..." : "正在上传视频...",
      statusTip: "上传中，请保持网络畅通",
      transcript: "",
    });

    try {
      const parseFn = isAudio ? parseAudio : parseVideo;
      const { transcript } = await parseFn({
        tempFilePath: this.data.mediaPath,
        onUploadProgress: (res) => {
          const progress = res.progress || 0;
          this.setData({
            uploadProgress: progress,
            statusText: progress < 100 ? `上传中 ${progress}%` : "正在识别语音...",
            statusTip: progress < 100 ? "文件上传中" : "AI 正在提取讲述内容",
          });
        },
        onStatusChange: (status) => {
          if (status === "transcribing") {
            this.setData({
              uploadProgress: 100,
              statusText: "正在识别语音...",
              statusTip: "根据时长，可能需要 30 秒到数分钟",
            });
          }
        },
      });

      this.setData({ transcript, parsing: false });
      wx.showToast({ title: "解析完成", icon: "success" });
    } catch (err) {
      console.error(err);
      this.setData({ parsing: false });
      wx.showModal({
        title: "解析失败",
        content: err.message || "请确认云开发已开通语音转文字能力，或换一段更清晰的文件重试",
        showCancel: false,
      });
    }
  },

  generateBio() {
    const text = this.data.transcript.trim();
    if (!text) {
      wx.showToast({ title: "请先解析文件", icon: "none" });
      return;
    }

    const isAudio = this.data.mediaMode === "audio";
    navigateToGenerate({
      source: isAudio ? "audio" : "video",
      style: this.data.selectedStyle,
      length: this.data.selectedLength,
      data: { text },
    });
  },
});
