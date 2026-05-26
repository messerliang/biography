const { cloudRequest } = require("./cloudRequest");

const BIO_BOT_ID = "agent-ryan-3ghdryeyb5ad5812";
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION = 600;

function getVoiceFormat(filePath) {
  const ext = (filePath.split(".").pop() || "").toLowerCase();
  const map = {
    mp4: "mp4",
    mov: "mp4",
    m4v: "mp4",
    m4a: "m4a",
    mp3: "mp3",
    wav: "wav",
    aac: "aac",
  };
  return map[ext] || "mp4";
}

function chooseVideo() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ["video"],
      sourceType: ["album", "camera"],
      maxDuration: MAX_VIDEO_DURATION,
      camera: "back",
      success: (res) => {
        const file = res.tempFiles[0];
        if (!file) {
          reject(new Error("未选择视频"));
          return;
        }
        if (file.size > MAX_VIDEO_SIZE) {
          reject(new Error("视频大小不能超过 100MB"));
          return;
        }
        resolve({
          tempFilePath: file.tempFilePath,
          size: file.size,
          duration: file.duration,
          thumbTempFilePath: file.thumbTempFilePath,
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes("cancel")) {
          reject(new Error("cancel"));
        } else {
          reject(err);
        }
      },
    });
  });
}

function uploadVideo(tempFilePath, onProgress) {
  const ext = tempFilePath.split(".").pop() || "mp4";
  const cloudPath = `bio_videos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return new Promise((resolve, reject) => {
    const task = wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: resolve,
      fail: reject,
    });
    if (task && task.onProgressUpdate && onProgress) {
      task.onProgressUpdate(onProgress);
    }
  });
}

function getTempFileUrl(fileId) {
  return wx.cloud.getTempFileURL({ fileList: [fileId] }).then((res) => {
    const item = res.fileList && res.fileList[0];
    if (!item || item.status !== 0) {
      throw new Error("获取视频链接失败");
    }
    return item.tempFileURL;
  });
}

async function speechToText(videoUrl, voiceFormat) {
  const data = await cloudRequest({
    path: `bots/${BIO_BOT_ID}/speech-to-text`,
    method: "POST",
    data: {
      url: videoUrl,
      voiceFormat: voiceFormat || "mp4",
    },
    timeout: 300000,
  });

  const text = data?.Result || data?.result || data?.data?.Result || "";
  if (!text || !String(text).trim()) {
    throw new Error("未能识别出语音内容，请尝试更清晰、时长更短的视频");
  }
  return String(text).trim();
}

async function parseVideo({ tempFilePath, onUploadProgress, onStatusChange }) {
  if (onStatusChange) onStatusChange("uploading");
  const uploadRes = await uploadVideo(tempFilePath, onUploadProgress);
  const fileUrl = await getTempFileUrl(uploadRes.fileID);

  if (onStatusChange) onStatusChange("transcribing");
  const voiceFormat = getVoiceFormat(tempFilePath);
  const transcript = await speechToText(fileUrl, voiceFormat);

  return {
    transcript,
    fileId: uploadRes.fileID,
    fileUrl,
  };
}

module.exports = {
  BIO_BOT_ID,
  MAX_VIDEO_DURATION,
  chooseVideo,
  uploadVideo,
  parseVideo,
  speechToText,
};
