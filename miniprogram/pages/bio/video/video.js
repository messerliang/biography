const { STYLES } = require("../../../utils/bio");
const { chooseVideo, parseVideo } = require("../../../utils/videoParser");

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
    videoPath: "",
    videoThumb: "",
    videoSize: 0,
    videoDuration: 0,
    durationText: "",
    sizeText: "",
    parsing: false,
    uploadProgress: 0,
    statusText: "准备解析...",
    statusTip: "正在上传视频到云端",
    transcript: "",
    selectedStyle: "narrative",
    styleList: Object.entries(STYLES).map(([key, val]) => ({ key, ...val })),
  },

  async pickVideo() {
    try {
      const file = await chooseVideo();
      this.setData({
        videoPath: file.tempFilePath,
        videoThumb: file.thumbTempFilePath || "",
        videoSize: file.size,
        videoDuration: file.duration,
        durationText: formatDuration(file.duration),
        sizeText: formatSize(file.size),
        transcript: "",
        parsing: false,
        uploadProgress: 0,
      });
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

  resetVideo() {
    this.setData({
      videoPath: "",
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
    if (!this.data.videoPath || this.data.parsing) return;

    this.setData({
      parsing: true,
      uploadProgress: 0,
      statusText: "正在上传视频...",
      statusTip: "视频上传中，请保持网络畅通",
      transcript: "",
    });

    try {
      const { transcript } = await parseVideo({
        tempFilePath: this.data.videoPath,
        onUploadProgress: (res) => {
          const progress = res.progress || 0;
          this.setData({
            uploadProgress: progress,
            statusText: progress < 100 ? `上传中 ${progress}%` : "正在识别语音...",
            statusTip: progress < 100 ? "视频上传中" : "AI 正在提取视频中的讲述内容",
          });
        },
        onStatusChange: (status) => {
          if (status === "transcribing") {
            this.setData({
              uploadProgress: 100,
              statusText: "正在识别语音...",
              statusTip: "根据视频时长，可能需要 30 秒到数分钟",
            });
          }
        },
      });

      this.setData({
        transcript,
        parsing: false,
      });
      wx.showToast({ title: "解析完成", icon: "success" });
    } catch (err) {
      console.error(err);
      this.setData({ parsing: false });
      wx.showModal({
        title: "解析失败",
        content: err.message || "请确认云开发已开通语音转文字能力，或换一段更清晰的视频重试",
        showCancel: false,
      });
    }
  },

  generateBio() {
    const text = this.data.transcript.trim();
    if (!text) {
      wx.showToast({ title: "请先解析视频", icon: "none" });
      return;
    }

    const payload = encodeURIComponent(
      JSON.stringify({
        source: "video",
        style: this.data.selectedStyle,
        data: { text },
      })
    );
    wx.navigateTo({ url: `/pages/bio/result/result?payload=${payload}` });
  },
});
