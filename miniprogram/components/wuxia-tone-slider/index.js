const {
  normalizeWuxiaTone,
  wuxiaToneToLevel,
  wuxiaLevelToTone,
  getWuxiaToneMeta,
  getWuxiaToneMetaForUI,
  DEFAULT_WUXIA_TONE,
} = require("../../utils/bio");

function syncDisplay(tone) {
  const normalized = normalizeWuxiaTone(tone);
  const meta = getWuxiaToneMeta(normalized);
  return {
    level: wuxiaToneToLevel(normalized),
    hint: meta.hint,
  };
}

Component({
  properties: {
    value: {
      type: Number,
      value: DEFAULT_WUXIA_TONE,
    },
  },

  data: {
    levelMeta: getWuxiaToneMetaForUI(),
    level: 0,
    hint: getWuxiaToneMeta(DEFAULT_WUXIA_TONE).hint,
  },

  observers: {
    value(tone) {
      this.setData(syncDisplay(tone));
    },
  },

  methods: {
    onChanging(e) {
      const tone = wuxiaLevelToTone(e.detail.value);
      this.setData(syncDisplay(tone));
    },

    onChange(e) {
      const tone = wuxiaLevelToTone(e.detail.value);
      this.triggerEvent("change", { value: tone });
    },
  },
});
