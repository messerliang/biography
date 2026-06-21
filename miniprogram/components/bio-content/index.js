const { parseBiographyContent } = require("../../utils/bioContentFormat");
const { loadHeroCalligraphyFont } = require("../../utils/heroFont");
const { loadCommentFont } = require("../../utils/commentFont");

Component({
  properties: {
    content: {
      type: String,
      value: "",
    },
    fontSize: {
      type: Number,
      value: 30,
    },
    showCursor: {
      type: Boolean,
      value: false,
    },
  },

  observers: {
    "content, fontSize": function (content, fontSize) {
      this.refreshBlocks(content, fontSize);
    },
  },

  lifetimes: {
    attached() {
      loadHeroCalligraphyFont();
      loadCommentFont();
      this.refreshBlocks(this.properties.content, this.properties.fontSize);
    },
  },

  methods: {
    refreshBlocks(content, fontSize) {
      const body = fontSize || 30;
      this.setData({
        blocks: parseBiographyContent(content),
        mainTitleSize: Math.round(body * 1.47),
        chapterSize: Math.round(body * 1.13),
        commentLabelSize: Math.round(body * 1.07),
        hookFontSize: Math.round(body * 1.05),
        commentLineSize: Math.round(body * 1.1),
      });
    },
  },

  data: {
    blocks: [],
    mainTitleSize: 44,
    chapterSize: 34,
    commentLabelSize: 32,
    hookFontSize: 32,
    commentLineSize: 33,
  },
});
