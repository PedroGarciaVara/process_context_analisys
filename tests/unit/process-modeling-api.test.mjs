import test from "node:test";
import assert from "node:assert/strict";
import { createNodeWithTransition, getProcess, getProcessLayout, replaceProcessLayout, updateTransition, getOperationMachines, replaceOperationMachines } from "../../uc_bib_solv/webapp/js/api/process-modeling.js";

test("getProcess serializa únicamente la opción canónica de expansión", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ status: "ok", data: {} }) };
  };
  try {
    await getProcess("parent/id", { expandNodeId: "node/id" });
    assert.equal(requestedUrl, "/api/bpm/processes/parent%2Fid?expand_node_id=node%2Fid");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getProcess normal no añade contexto ni query string", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => ({ status: "ok", data: {} }) };
  };
  try {
    await getProcess("parent-id");
    assert.equal(requestedUrl, "/api/bpm/processes/parent-id");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createNodeWithTransition usa el endpoint atómico", async () => {
  let requestedUrl;
  globalThis.fetch = async (url) => { requestedUrl = url; return { ok: true, json: async () => ({}) }; };
  await createNodeWithTransition("p-1", { node: {}, transition: {} });
  assert.equal(requestedUrl, "/api/bpm/processes/p-1/nodes-with-transition");
});

test("updateTransition conserva el endpoint canónico de la relación", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  let requestedOptions;
  globalThis.fetch = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return { ok: true, json: async () => ({ status: "ok", data: {} }) };
  };
  try {
    await updateTransition("edge/id", { label: "Conforme" });
    assert.equal(requestedUrl, "/api/bpm/transitions/edge%2Fid");
    assert.equal(requestedOptions.method, "PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("layout usa GET y reemplazo PUT sobre el proceso", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ status: "ok", data: { positions: [] } }) };
  };
  try {
    await getProcessLayout("process/id");
    await replaceProcessLayout("process/id", [{ node_id: "node-1", x: 10, y: 20 }]);
    assert.equal(requests[0].url, "/api/bpm/processes/process%2Fid/layout");
    assert.equal(requests[1].options.method, "PUT");
    assert.deepEqual(JSON.parse(requests[1].options.body), { positions: [{ node_id: "node-1", x: 10, y: 20 }] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("operación usa GET/PUT canónicos por IDs", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => { requests.push({ url, options }); return { ok: true, json: async () => ({ status: "ok", data: {} }) }; };
  try {
    await getOperationMachines("op/id", "process/id");
    await replaceOperationMachines("op/id", "process/id", [13]);
    assert.equal(requests[0].url, "/api/bpm/operations/op%2Fid/machines?process_id=process%2Fid");
    assert.equal(requests[1].options.method, "PUT");
    assert.deepEqual(JSON.parse(requests[1].options.body), { process_id: "process/id", machine_ids: [13] });
  } finally { globalThis.fetch = originalFetch; }
});
