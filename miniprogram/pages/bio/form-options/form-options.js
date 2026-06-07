const {
  getStyleGroupsForUI,
  getStyleLabel,
  getLengthOptionsForUI,
  getLengthLabel,
  getPersonOptionsForUI,
  getPersonLabel,
  normalizeLength,
  normalizePerson,
  getFormDraft,
  saveFormDraft,
  clearFormDraft,
  navigateToGenerate,
} = require("../../../utils/bio");

const FORM_SECTION_FIELDS = [
  "name",
  "birthYear",
  "hometown",
  "childhood",
  "education",
  "career",
  "emotion",
  "insight",
];

function countFilledFormSections(form) {
  if (!form) return 0;
  return FORM_SECTION_FIELDS.filter((key) => {
    const value = form[key];
    return value && String(value).trim();
  }).length;
}

function hasFormContent(form) {
  return countFilledFormSections(form) > 0;
}

Page({
  data: {
    form: {},
    subjectName: "",
    filledCount: 0,
    selectedPerson: "third",
    personLabel: getPersonLabel("third"),
    personOptions: getPersonOptionsForUI(),
    selectedStyle: "narrative",
    styleLabel: getStyleLabel("narrative"),
    selectedLength: "normal",
    lengthLabel: getLengthLabel("normal"),
    styleGroups: getStyleGroupsForUI(),
    lengthOptions: getLengthOptionsForUI(),
    showStylePicker: false,
    showLengthPicker: false,
  },

  onShow() {
    const draft = getFormDraft();
    if (!draft?.form || !hasFormContent(draft.form)) {
      wx.showToast({ title: "请先填写内容", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    const person = normalizePerson(draft.selectedPerson);
    const style = draft.selectedStyle || "narrative";
    const length = normalizeLength(draft.selectedLength);
    const form = draft.form;

    this.setData({
      form,
      subjectName: (form.name || "").trim(),
      filledCount: countFilledFormSections(form),
      selectedPerson: person,
      personLabel: getPersonLabel(person),
      selectedStyle: style,
      styleLabel: getStyleLabel(style),
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
    });
  },

  persistDraft() {
    const stored = getFormDraft() || {};
    saveFormDraft({
      form: this.data.form,
      currentStep: stored.currentStep,
      selectedPerson: this.data.selectedPerson,
      selectedStyle: this.data.selectedStyle,
      selectedLength: this.data.selectedLength,
    });
  },

  selectPerson(e) {
    const person = normalizePerson(e.currentTarget.dataset.person);
    this.setData({
      selectedPerson: person,
      personLabel: getPersonLabel(person),
    });
    this.persistDraft();
  },

  toggleLengthPicker() {
    this.setData({ showLengthPicker: !this.data.showLengthPicker });
  },

  toggleStylePicker() {
    this.setData({ showStylePicker: !this.data.showStylePicker });
  },

  selectLength(e) {
    const length = normalizeLength(e.currentTarget.dataset.length);
    this.setData({
      selectedLength: length,
      lengthLabel: getLengthLabel(length),
    });
    this.persistDraft();
  },

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    this.setData({
      selectedStyle: style,
      styleLabel: getStyleLabel(style),
    });
    this.persistDraft();
  },

  goBack() {
    wx.navigateBack();
  },

  generate() {
    clearFormDraft();
    navigateToGenerate({
      source: "form",
      style: this.data.selectedStyle,
      length: this.data.selectedLength,
      person: this.data.selectedPerson,
      data: this.data.form,
    });
  },
});
