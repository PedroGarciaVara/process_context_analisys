export function createCausaDetailHypothesisActions({ state, refs, createHypothesis, updateHypothesis, deleteHypothesis, fetchHypothesisDeletePreview, setDeleteModalContent, setAlert, setModalVisible, refreshDetail, clearCreationFeedback, beginCreationAttempt, showCreationFeedback }) {
  function applyTemplateValues(values = {}) {
    if (refs.hypothesisTitle) refs.hypothesisTitle.value = values.nombre || values.titulo || values.title || values.descripcion || "";
    refs.hypothesisDescription.value = values.descripcion || "";
    refs.hypothesisCriterion.value = values.criterio_validacion || "";
    if (refs.hypothesisMethod) refs.hypothesisMethod.value = values.metodo || values.method || "";
  }

  function clearHypothesisForm({ invalidate = true } = {}) {
    clearCreationFeedback({ invalidate });
    state.activeHypothesisId = null;
    applyTemplateValues();
    refs.hypothesisSave.textContent = "Guardar hipotesis";
  }

  function editHypothesis(hypothesisId) {
    beginCreationAttempt();
    const selected = (state.detail?.hypotheses || []).find((item) => Number(item.id) === Number(hypothesisId));
    if (!selected) return;
    state.activeHypothesisId = Number(hypothesisId);
    applyTemplateValues(selected);
    refs.hypothesisSave.textContent = "Actualizar hipotesis";
  }

  async function saveHypothesis() {
    const feedbackToken = beginCreationAttempt();
    if (!state.detail?.causa_id) return setAlert("warning", "Carga una causa antes de editar hipotesis.");
    try {
      const payload = {
        cause_id: state.detail.causa_id,
        hypothesis_id: state.activeHypothesisId,
        nombre: refs.hypothesisTitle?.value || "",
        descripcion: refs.hypothesisDescription.value,
        criterio_validacion: refs.hypothesisCriterion.value,
        metodo: refs.hypothesisMethod?.value || "",
      };
      const isCreation = !state.activeHypothesisId;
      const response = state.activeHypothesisId
        ? await updateHypothesis(state.activeHypothesisId, payload)
        : await createHypothesis(state.detail.causa_id, payload);
      setAlert("success", response.message || "Hipotesis guardada.");
      clearHypothesisForm({ invalidate: false });
      await refreshDetail({ feedbackToken });
      if (isCreation) showCreationFeedback("Hipótesis creada", feedbackToken);
    } catch (error) {
      clearCreationFeedback({ token: feedbackToken });
      setAlert("danger", error.message);
    }
  }

  async function openDeleteModal(hypothesisId) {
    beginCreationAttempt();
    try {
      const preview = await fetchHypothesisDeletePreview(hypothesisId);
      state.deletePreview = preview;
      setDeleteModalContent(refs.deleteModal, preview);
      setModalVisible(refs.deleteModal, true);
    } catch (error) {
      clearCreationFeedback();
      setAlert("danger", error.message);
    }
  }

  async function confirmDelete() {
    beginCreationAttempt();
    if (!state.deletePreview?.hipotesis_id) return;
    try {
      await deleteHypothesis(state.deletePreview.hipotesis_id);
      setAlert("success", "Hipotesis eliminada.");
      state.deletePreview = null;
      setModalVisible(refs.deleteModal, false);
      clearHypothesisForm({ invalidate: false });
      await refreshDetail();
    } catch (error) {
      clearCreationFeedback();
      setAlert("danger", error.message);
    }
  }

  return { clearHypothesisForm, editHypothesis, saveHypothesis, openDeleteModal, confirmDelete };
}
