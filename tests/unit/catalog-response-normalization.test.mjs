import test from "node:test";
import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;

test.after(() => {
  globalThis.fetch = originalFetch;
});

test("el cliente operativo desenvuelve el catálogo BPM antes de entregarlo al estado", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        status: "ok",
        data: {
          data: {
            procesos: [{ id: 7, name: "Proceso visible" }],
            contratos: [{ id: 12, name: "Contrato visible" }],
            maquinas: [{ id: 3, name: "Máquina visible" }],
          },
          defaults: { processId: 7 },
        },
      };
    },
  });

  const api = await import(`../../uc_bib_solv/webapp/js/api/client.js?catalog-test=${Date.now()}`);
  const catalog = await api.fetchOperationalCatalog();

  assert.deepEqual(catalog.data.procesos, [{ id: 7, name: "Proceso visible" }]);
  assert.deepEqual(catalog.data.contratos, [{ id: 12, name: "Contrato visible" }]);
  assert.deepEqual(catalog.data.maquinas, [{ id: 3, name: "Máquina visible" }]);
  assert.equal(catalog.defaults.processId, 7);
});

test("el cliente operativo desenvuelve las páginas sin alterar sus filas", async () => {
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        status: "ok",
        data: {
          page: "procesos",
          data: {
            rows: [{ id: 7, name: "Proceso visible" }],
            selected_process_id: 7,
          },
        },
      };
    },
  });

  const api = await import(`../../uc_bib_solv/webapp/js/api/client.js?page-test=${Date.now()}`);
  const page = await api.fetchOperationalPage("procesos");

  assert.equal(page.page, "procesos");
  assert.deepEqual(page.data.rows, [{ id: 7, name: "Proceso visible" }]);
  assert.equal(page.data.selected_process_id, 7);
});
