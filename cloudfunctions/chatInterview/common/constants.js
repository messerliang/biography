const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

const SUMMARIZE_CHAR_THRESHOLD = 2800;

const RATE_LIMITS = {
  biography: { perHour: 15, perDay: 60 },
  chat: { perHour: 80, perDay: 300 },
};

const AUDIT_COLLECTION = "bio_audit_log";
const RATE_LIMIT_COLLECTION = "bio_rate_limit";

module.exports = {
  DEEPSEEK_API_URL,
  DEEPSEEK_MODEL,
  SUMMARIZE_CHAR_THRESHOLD,
  RATE_LIMITS,
  AUDIT_COLLECTION,
  RATE_LIMIT_COLLECTION,
};
