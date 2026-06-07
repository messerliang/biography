const {
  FORM_STEPS,
  getDefaultForm,
  getFormDraft,
  saveFormDraft,
  normalizeLength,
  normalizePerson,
} = require("../../../utils/bio");

Page({
  data: {
    steps: FORM_STEPS,
    totalSteps: FORM_STEPS.length,
    currentStep: 0,
    progressPercent: 20,
    form: getDefaultForm(),
  },

  onLoad() {
    const draft = getFormDraft();
    if (draft && draft.form) {
      wx.showModal({
        title: "发现草稿",
        content: "是否继续上次填写的内容？",
        success: (res) => {
          if (res.confirm) {
            this.setData({
              form: draft.form,
              currentStep: draft.currentStep || 0,
              progressPercent: ((draft.currentStep || 0) + 1) / FORM_STEPS.length * 100,
            });
          }
        },
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
    this.saveDraft();
  },

  saveDraft() {
    const stored = getFormDraft() || {};
    saveFormDraft({
      form: this.data.form,
      currentStep: this.data.currentStep,
      selectedPerson: normalizePerson(stored.selectedPerson),
      selectedStyle: stored.selectedStyle || "narrative",
      selectedLength: normalizeLength(stored.selectedLength),
    });
  },

  prevStep() {
    const step = this.data.currentStep - 1;
    this.setData({
      currentStep: step,
      progressPercent: ((step + 1) / this.data.totalSteps) * 100,
    });
    this.saveDraft();
  },

  nextStep() {
    if (this.data.currentStep === 0 && !this.data.form.name.trim()) {
      wx.showToast({ title: "请至少填写姓名", icon: "none" });
      return;
    }
    const step = this.data.currentStep + 1;
    this.setData({
      currentStep: step,
      progressPercent: ((step + 1) / this.data.totalSteps) * 100,
    });
    this.saveDraft();
  },

  goToOptions() {
    const { form } = this.data;
    const hasContent = Object.values(form).some((v) => v && String(v).trim());
    if (!hasContent) {
      wx.showToast({ title: "请至少填写一些内容", icon: "none" });
      return;
    }
    this.saveDraft();
    wx.navigateTo({ url: "/pages/bio/form-options/form-options" });
  },
});
