const COMMENT_FONT_FAMILY = "CommentXingKai";
// 行楷风格：iOS 等设备可回退系统「华文行楷」；其余平台加载霞鹜文楷（清晰易读）
const FONT_SOURCES = [
  'url("https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.woff2")',
  'url("https://cdn.staticfile.org/lxgw-wenkai-webfont/1.6.0/lxgwwenkai-regular.woff2")',
];

let loadPromise = null;

function loadCommentFont() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (!wx.loadFontFace) {
      resolve(false);
      return;
    }

    let index = 0;
    const tryLoad = () => {
      if (index >= FONT_SOURCES.length) {
        resolve(false);
        return;
      }

      wx.loadFontFace({
        family: COMMENT_FONT_FAMILY,
        source: FONT_SOURCES[index],
        global: true,
        desc: {
          style: "normal",
          weight: "400",
          variant: "normal",
        },
        scopes: ["webview", "native"],
        success: () => resolve(true),
        fail: () => {
          index += 1;
          tryLoad();
        },
      });
    };

    tryLoad();
  });

  return loadPromise;
}

module.exports = {
  COMMENT_FONT_FAMILY,
  loadCommentFont,
};
