const https = require("https");
const { DEEPSEEK_API_URL, DEEPSEEK_MODEL } = require("./constants");

function getApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("DEEPSEEK_API_KEY 未配置，请在云函数环境变量中设置");
  }
  return key;
}

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const { hostname, pathname } = new URL(url);
    const req = https.request(
      {
        hostname,
        path: pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          ...headers,
        },
        timeout: 55000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(raw || "{}");
            if (res.statusCode < 200 || res.statusCode >= 300) {
              const msg = json?.error?.message || json?.message || `DeepSeek HTTP ${res.statusCode}`;
              reject(new Error(msg));
              return;
            }
            resolve(json);
          } catch (e) {
            reject(new Error("DeepSeek 响应解析失败"));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("DeepSeek 请求超时"));
    });
    req.write(payload);
    req.end();
  });
}

async function chatCompletion(messages, options = {}) {
  const {
    model = DEEPSEEK_MODEL,
    temperature = 0.65,
    max_tokens = 4096,
    response_format,
  } = options;

  const body = {
    model,
    messages,
    temperature,
    max_tokens,
    stream: false,
  };
  if (response_format) body.response_format = response_format;

  const json = await postJson(
    DEEPSEEK_API_URL,
    { Authorization: `Bearer ${getApiKey()}` },
    body
  );

  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek 未返回有效内容");
  }
  return String(content).trim();
}

module.exports = { chatCompletion };
