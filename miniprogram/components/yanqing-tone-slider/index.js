const {
  normalizeYanqingTone,
  yanqingToneToLevel,
  yanqingLevelToTone,
  getYanqingToneMeta,
  getYanqingToneMetaForUI,
  DEFAULT_YANQING_TONE,
} = require("../../utils/bio");

const LEVEL_COUNT = 2;

function syncDisplay(tone) {
  const normalized = normalizeYanqingTone(tone);
  const meta = getYanqingToneMeta(normalized);
  const level = yanqingToneToLevel(normalized);
  return {
    level,
    hint: meta.hint,
    thumbPercent: level * 100,
    dragging: false,
  };
}

function levelFromRatio(ratio) {
  return ratio < 0.5 ? 0 : 1;
}

function ratioFromTouch(clientX, rect) {
  if (!rect || !rect.width) return 0;
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
}

Component({
  properties: {
    value: {
      type: Number,
      value: DEFAULT_YANQING_TONE,
    },
  },

  data: {
    levelMeta: getYanqingToneMetaForUI(),
    level: 0,
    hint: getYanqingToneMeta(DEFAULT_YANQING_TONE).hint,
    thumbPercent: 0,
    dragging: false,
  },

  observers: {
    value(tone) {
      this.setData(syncDisplay(tone));
    },
  },

  methods: {
    queryTrackRect() {
      return new Promise((resolve) => {
        this.createSelectorQuery()
          .in(this)
          .select(".yanqing-tone-track")
          .boundingClientRect((rect) => {
            resolve(rect && rect.width ? rect : null);
          })
          .exec();
      });
    },

    updateFromClientX(clientX, rect) {
      const ratio = ratioFromTouch(clientX, rect);
      const level = levelFromRatio(ratio);
      const tone = yanqingLevelToTone(level);
      const meta = getYanqingToneMeta(tone);
      this.setData({
        level,
        hint: meta.hint,
        thumbPercent: ratio * 100,
      });
      return level;
    },

    applyLevel(idx, emit) {
      const safeIdx = Math.min(LEVEL_COUNT - 1, Math.max(0, Math.round(idx)));
      const tone = yanqingLevelToTone(safeIdx);
      this.setData(syncDisplay(tone));
      if (emit) {
        this.triggerEvent("change", { value: tone });
      }
    },

    selectLevel(e) {
      const idx = Number(e.currentTarget.dataset.level);
      if (!Number.isFinite(idx)) return;
      this.applyLevel(idx, true);
    },

    async onTrackTouchStart(e) {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = await this.queryTrackRect();
      if (!rect) return;
      this._trackRect = rect;
      this._dragStartLevel = this.data.level;
      this._touchMoved = false;
      this.setData({ dragging: true });
      this.updateFromClientX(touch.clientX, rect);
    },

    onTrackTouchMove(e) {
      if (!this.data.dragging) return;
      const touch = e.touches[0];
      if (!touch || !this._trackRect) return;
      this._touchMoved = true;
      this.updateFromClientX(touch.clientX, this._trackRect);
    },

    onTrackTouchEnd() {
      if (!this.data.dragging) return;
      const idx = this.data.level;
      const tone = yanqingLevelToTone(idx);
      const startLevel = this._dragStartLevel ?? idx;
      this.setData(syncDisplay(tone));
      this._trackRect = null;
      if (this._touchMoved || idx !== startLevel) {
        this.triggerEvent("change", { value: tone });
      }
    },
  },
});
