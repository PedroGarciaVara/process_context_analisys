export function createCausaDetailHypothesisActions({ state, refs, createHypothesis, updateHypothesis, deleteHypothesis, fetchHypothesisDeletePreview, setDeleteModalContent, setAlert, setModalVisible, refreshDetail }) {
  function clearHypothesisForm() {
    state.activeHypothesisId = null;
    refs.hypothesisDescription.value = "";
    refs.hypothesisType.value = "aceptacion";
    refs.hypothesisCriterion.value = "";
    if (refs.hypothesisStatus) refs.hypothesisStatus.value = "pendiente";
    refs.hypothesisSave.textContent = "Guardar hipotesis";
  }

  function editHypothesis(hypothesisId) {
    const selected = (state.detail?.hypotheses || []).find((item) => Number(item.id) === Number(hypothesisId));
    if (!selected) return;
    state.activeHypothesisId = Number(hypothesisId);
    refs.hypothesisDescription.value = selected.descripcion || "";
    refs.hypothesisType.value = selected.tipo || "aceptacion";
    refs.hypothesisCriterion.value = selected.criterio_validacion || "";
    if (refs.hypothesisStatus) refs.hypothesisStatus.value = selected.estado || "pendiente";
    refs.hypothesisSave.textContent = "Actualizar hipotesis";
  }

  async function saveHypothesis() {
    if (!state.detail?.causa_id) return setAlert("warning", "Carga una causa antes de editar hipotesis.");
    try {
      const payload = {
        cause_id: state.detail.causa_id,
        hypothesis_id: state.activeHypothesisId,
        descripcion: refs.hypothesisDescription.value,
        tipo: refs.hypothesisType.value,
        criterio_validacion: refs.hypothesisCriterion.value,
        estado: refs.hypothesisStatus?.value || "pendiente",
      };
      const response = state.activeHypothesisId
        ? await updateHypothesis(state.activeHypothesisId, payload)
        : await createHypothesis(state.detail.causa_id, payload);
      setAlert("success", response.message || "Hipotesis guardada.");
      clearHypothesisForm();
      await refreshDetail();
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  async function openDeleteModal(hypothesisId) {
    try {
      const preview = await fetchHypothesisDeletePreview(hypothesisId);
      state.deletePreview = preview;
      setDeleteModalContent(refs.deleteModal, preview);
      setModalVisible(refs.deleteModal, true);
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  async function confirmDelete() {
    if (!state.deletePreview?.hipotesis_id) return;
    try {
      await deleteHypothesis(state.deletePreview.hipotesis_id);
      setAlert("success", "Hipotesis eliminada.");
      state.deletePreview = null;
      setModalVisible(refs.deleteModal, false);
      clearHypothesisForm();
      await refreshDetail();
    } catch (error) {
      setAlert("danger", error.message);
    }
  }

  return { clearHypothesisForm, editHypothesis, saveHypothesis, openDeleteModal, confirmDelete };
}
