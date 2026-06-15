const HERO_FONT_FAMILY = "HeroCalligraphy";
// 志芒星（Zhi Mang Xing）— 书法标题字体
const FONT_SOURCES = [
  'url("data:font/woff;base64,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")',
  'url("data:font/woff2;base64,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")',
  'url("https://cdn.jsdelivr.net/fontsource/fonts/zhi-mang-xing@5.2.5/chinese-simplified-400-normal.woff")',
  'url("https://cdn.jsdelivr.net/fontsource/fonts/zhi-mang-xing@5.2.5/chinese-simplified-400-normal.woff2")',
];

let loadPromise = null;

function loadHeroCalligraphyFont() {
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
        family: HERO_FONT_FAMILY,
        source: FONT_SOURCES[index],
        global: true,
        desc: {
          style: "normal",
          weight: "400",
          variant: "normal",
        },
        scopes: ["webview", "native"],
        success: () => {
          console.log("hero font loaded via source", index);
          resolve(true);
        },
        fail: (err) => {
          console.warn("hero font load failed", index, err);
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
  HERO_FONT_FAMILY,
  loadHeroCalligraphyFont,
};
