const {
  FORM_STEPS,
  getStyleGroupsForUI,
  getDefaultForm,
  getFormDraft,
  saveFormDraft,
  clearFormDraft,
  navigateToGenerate,
} = require("../../../utils/bio");

Page({
  data: {
    steps: FORM_STEPS,
    totalSteps: FORM_STEPS.length,
    currentStep: 0,
    progressPercent: 20,
    form: getDefaultForm(),
    selectedStyle: "narrative",
    styleGroups: getStyleGroupsForUI(),
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
              selectedStyle: draft.selectedStyle || "narrative",
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

  selectStyle(e) {
    this.setData({ selectedStyle: e.currentTarget.dataset.style });
    this.saveDraft();
  },

  saveDraft() {
    saveFormDraft({
      form: this.data.form,
      currentStep: this.data.currentStep,
      selectedStyle: this.data.selectedStyle,
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

  generate() {
    const { form } = this.data;
    const hasContent = Object.values(form).some((v) => v && String(v).trim());
    if (!hasContent) {
      wx.showToast({ title: "请至少填写一些内容", icon: "none" });
      return;
    }

    clearFormDraft();
    navigateToGenerate({
      source: "form",
      style: this.data.selectedStyle,
      data: form,
    });
  },
});
