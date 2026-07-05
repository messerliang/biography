"""Generate miniprogram/utils/commentFont.js with embedded font subset."""

from __future__ import annotations

import base64
import subprocess
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "utils" / "commentFont.js"
FONT_URL = (
    "https://cdn.jsdelivr.net/fontsource/fonts/ma-shan-zheng@5.2.5/"
    "chinese-simplified-400-normal.woff2"
)
CDN_WOFF2 = FONT_URL
CDN_WOFF = (
    "https://cdn.jsdelivr.net/fontsource/fonts/ma-shan-zheng@5.2.5/"
    "chinese-simplified-400-normal.woff"
)

# 批注标题 + 常用标点 + 高频汉字（覆盖传记正文/评语常见用字）
SUBSET_TEXT = (
    "江湖评语情笺结语道评太史公曰"
    "0123456789"
    "，。！？；：、""''（）《》【】—…·"
    "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能"
    "下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加"
    "量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关"
    "各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最"
    "立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山"
    "统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任加示论细门任非但"
    "信关更拉直界门何深机提走议声先走把三好小又性些被高己之已老从动两还天去年也子没再"
    "今当没动面起看定天分她本去最好重并物手知理世实加量都两体制机当使点从业本去把性"
    "教师学生讲台大学成家出生入学人生传记记忆故事传承记录创作生成叙述人称篇幅风格"
    "震川古典武侠江湖史海知音匹配揭晓保存分享扫码开始"
    "陈宇张明外婆李老师父母子女兄弟姐妹朋友同事邻居"
    "春夏秋冬风雨雪月日星辰山河湖海天地人间岁月时光"
    "欢喜悲愁思念希望坚持努力成长改变选择告别重逢"
)


def download_font(path: Path) -> None:
    req = urllib.request.Request(FONT_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        path.write_bytes(resp.read())


def subset_font(src: Path, dst: Path) -> None:
    cmd = [
        "pyftsubset",
        str(src),
        f"--output-file={dst}",
        f"--text={SUBSET_TEXT}",
        "--flavor=woff2",
        "--layout-features=*",
        "--glyph-names",
        "--symbol-cmap",
        "--legacy-cmap",
        "--notdef-glyph",
        "--notdef-outline",
        "--recommended-glyphs",
    ]
    subprocess.run(cmd, check=True)


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        src = tmp_dir / "source.woff2"
        subset = tmp_dir / "comment-subset.woff2"

        print("Downloading font...")
        download_font(src)
        print(f"Downloaded {src.stat().st_size} bytes")

        print("Creating subset...")
        subset_font(src, subset)
        print(f"Subset size {subset.stat().st_size} bytes")

        woff2_b64 = base64.b64encode(subset.read_bytes()).decode()

    js = f"""const COMMENT_FONT_FAMILY = "CommentXingKai";
// 马善政楷书 — 传记批注/评语用字（内嵌子集 + CDN 全量兜底）
const FONT_SOURCES = [
  'url("data:font/woff2;base64,{woff2_b64}")',
  'url("{CDN_WOFF2}")',
  'url("{CDN_WOFF}")',
];

let loadPromise = null;

function loadCommentFont() {{
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
        family: COMMENT_FONT_FAMILY,
        source: FONT_SOURCES[index],
        global: true,
        desc: {{
          style: "normal",
          weight: "400",
          variant: "normal",
        }},
        scopes: ["webview", "native"],
        success: () => resolve(true),
        fail: () => {{
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
  COMMENT_FONT_FAMILY,
  loadCommentFont,
}};
"""

    OUT.write_text(js, encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
