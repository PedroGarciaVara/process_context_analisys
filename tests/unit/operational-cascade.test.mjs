import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOperationalPageParams,
  filterMachines,
  getContractScopes,
  getOperations,
} from "../../uc_bib_solv/webapp/js/core/operational.js";
import { AppState, setCurrentOperation } from "../../uc_bib_solv/webapp/js/core/state.js";

const processA = "11111111-1111-1111-1111-111111111111";
const processB = "22222222-2222-2222-2222-222222222222";
const versionA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const versionB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const operationA = "aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa";
const operationB = "bbbbbbbb-0000-0000-0000-bbbbbbbbbbbb";

function state() {
  return {
    currentProcess: 7,
    currentOperation: null,
    filters: {},
    catalog: {
      data: {
        procesos: [{ id: 7, name: "Proceso legacy A" }, { id: 8, name: "Proceso legacy B" }],
        contratos: [],
        maquinas: [
          { id: 1, processId: 7, operations: [{ operation_id: operationA, process_version_id: versionA, process_id: processA, legacy_process_id: 7 }] },
          { id: 2, processId: 8, operations: [{ operation_id: operationB, process_version_id: versionB, process_id: processB, legacy_process_id: 8 }] },
        ],
      },
    },
  };
}

test("las opciones BPM se deduplican y conservan el proceso legacy asociado", () => {
  const operations = getOperations(state());
  assert.deepEqual(operations.map((item) => item.processId), [7, 8]);
  assert.equal(operations[0].bpmProcessId, processA);
});

test("la cascada de máquinas exige proceso legacy y operación BPM compatibles", () => {
  const current = state();
  assert.deepEqual(filterMachines(current, 7, `${operationA}|${versionA}`).map((item) => item.id), [1]);
  assert.deepEqual(filterMachines(current, 7, `${operationB}|${versionB}`).map((item) => item.id), []);
});

test("seleccionar operación mantiene su proceso y envía ambos identificadores", () => {
  const current = state();
  current.currentOperation = `${operationA}|${versionA}`;
  setCurrentOperation(current.currentOperation, 7);
  const params = buildOperationalPageParams(current, "maquinas");
  assert.equal(current.currentProcess, 7);
  assert.equal(params.processId, 7);
  assert.equal(params.process_id, processA);
  assert.equal(params.operation_id, operationA);
  assert.equal(params.process_version_id, versionA);
});

test("limpiar operación conserva el proceso seleccionado", () => {
  AppState.currentProcess = 7;
  setCurrentOperation(null);
  assert.equal(AppState.currentOperation, null);
  assert.equal(AppState.currentProcess, 7);
});

test("los alcances BPM usan el catálogo de página como respaldo", () => {
  const current = state();
  current.pageData = {
    contratos: {
      catalog: {
        data: {
          contractScopes: {
            processes: [{ id: "bpm-process-1", name: "Proceso BPM" }],
            operations: [{ id: "bpm-node-1", name: "Operación BPM" }],
          },
        },
      },
    },
  };
  assert.deepEqual(getContractScopes(current), {
    processes: [{ id: "bpm-process-1", name: "Proceso BPM" }],
    operations: [{ id: "bpm-node-1", name: "Operación BPM" }],
  });
});
