from pathlib import Path
import base64

root = Path(__file__).resolve().parents[1]
woff_b64 = base64.b64encode((root / "assets/fonts/hero-title-subset.woff").read_bytes()).decode()
woff2_b64 = base64.b64encode((root / "assets/fonts/hero-title-subset.woff2").read_bytes()).decode()

js = f"""const HERO_FONT_FAMILY = "HeroCalligraphy";
// 志芒星（Zhi Mang Xing）— 书法标题字体
const FONT_SOURCES = [
  'url("data:font/woff;base64,{woff_b64}")',
  'url("data:font/woff2;base64,{woff2_b64}")',
  'url("https://cdn.jsdelivr.net/fontsource/fonts/zhi-mang-xing@5.2.5/chinese-simplified-400-normal.woff")',
  'url("https://cdn.jsdelivr.net/fontsource/fonts/zhi-mang-xing@5.2.5/chinese-simplified-400-normal.woff2")',
];

let loadPromise = null;

function loadHeroCalligraphyFont() {{
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {{
    if (!wx.loadFontFace) {{
      resolve(false);
      return;
    }}

    let index = 0;
    const tryLoad = () => {{
      if (index >= FONT_SOURCES.length) {{
        resolve(false);
        return;
      }}

      wx.loadFontFace({{
        family: HERO_FONT_FAMILY,
        source: FONT_SOURCES[index],
        global: true,
        desc: {{
          style: "normal",
          weight: "400",
          variant: "normal",
        }},
        scopes: ["webview", "native"],
        success: () => {{
          console.log("hero font loaded via source", index);
          resolve(true);
        }},
        fail: (err) => {{
          console.warn("hero font load failed", index, err);
          index += 1;
          tryLoad();
        }},
      }});
    }};

    tryLoad();
  }});

  return loadPromise;
}}

module.exports = {{
  HERO_FONT_FAMILY,
  loadHeroCalligraphyFont,
}};
"""

(root / "utils/heroFont.js").write_text(js, encoding="utf-8")
print("heroFont.js written")
