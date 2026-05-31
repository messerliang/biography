const { cloudRequest } = require("./cloudRequest");

const BIO_BOT_ID = "agent-ryan-3ghdryeyb5ad5812";

function uploadAudio(tempFilePath, onProgress) {
  const ext = (tempFilePath.split(".").pop() || "aac").toLowerCase();
  const cloudPath = `bio_audio/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

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
      throw new Error("获取音频链接失败");
    }
    return item.tempFileURL;
  });
}

async function speechToTextFromUrl(url, voiceFormat) {
  const data = await cloudRequest({
    path: `bots/${BIO_BOT_ID}/speech-to-text`,
    method: "POST",
    data: {
      url,
      voiceFormat: voiceFormat || "aac",
    },
    timeout: 300000,
  });

  const text = data?.Result || data?.result || data?.data?.Result || "";
  if (!text || !String(text).trim()) {
    throw new Error("未能识别出语音内容，请尝试更清晰、环境更安静的录音");
  }
  return String(text).trim();
}

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
  return map[ext] || "aac";
}

async function transcribeLocalAudio(tempFilePath, onUploadProgress) {
  const uploadRes = await uploadAudio(tempFilePath, onUploadProgress);
  const fileUrl = await getTempFileUrl(uploadRes.fileID);
  const voiceFormat = getVoiceFormat(tempFilePath);
  const transcript = await speechToTextFromUrl(fileUrl, voiceFormat);
  return { transcript, fileId: uploadRes.fileID };
}

function createRecorderSession({ onStatusChange } = {}) {
  const recorder = wx.getRecorderManager();
  let active = false;
  let pendingResolve = null;
  let pendingReject = null;

  recorder.onStop(async (res) => {
    if (!pendingResolve) return;
    if (onStatusChange) onStatusChange("transcribing");
    try {
      const result = await transcribeLocalAudio(res.tempFilePath);
      if (onStatusChange) onStatusChange("idle");
      pendingResolve(result.transcript);
    } catch (err) {
      if (onStatusChange) onStatusChange("idle");
      pendingReject(err);
    } finally {
      active = false;
      pendingResolve = null;
      pendingReject = null;
    }
  });

  recorder.onError((err) => {
    active = false;
    if (onStatusChange) onStatusChange("idle");
    if (pendingReject) pendingReject(err);
    pendingResolve = null;
    pendingReject = null;
  });

  return {
    begin() {
      if (active) return;
      active = true;
      if (onStatusChange) onStatusChange("recording");
      recorder.start({
        duration: 120000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: "aac",
      });
    },
    end() {
      return new Promise((resolve, reject) => {
        if (!active) {
          reject(new Error("未在录音"));
          return;
        }
        pendingResolve = resolve;
        pendingReject = reject;
        recorder.stop();
      });
    },
    cancel() {
      active = false;
      pendingResolve = null;
      pendingReject = null;
      recorder.stop();
      if (onStatusChange) onStatusChange("idle");
    },
  };
}

module.exports = {
  transcribeLocalAudio,
  createRecorderSession,
  getVoiceFormat,
};
