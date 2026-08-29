import test from "node:test";
import assert from "node:assert/strict";
import { createNodeWithTransition, getProcess } from "../../uc_bib_solv/webapp/js/api/process-modeling.js";

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
