# Diagnóstico AMD-21-002 — baseline y atribución

Fecha: 2026-09-13. Fase: ejecución previa a Gate 3.

## Baseline observado

- `operacion_form.js` exponía `data-operation-machines`; `operaciones_detalle.js`
  lo rellenaba con un checkbox por cada máquina del catálogo.
- El guardado recogía `input[data-operation-machine]:checked`, de modo que el
  DOM crecía con el catálogo y no había alta explícita ni recuadro separado.
- El GET existente devuelve `machineIds` y `catalog`; el PUT existente recibe
  `process_id` y `machine_ids`. Ese contrato no se modificó.

## Ownership y cambio aplicado

El cambio queda acotado a `operacion_form.js`, `operaciones_detalle.js` y el
contrato focalizado de `tests/unit/operaciones-detalle-contract.test.mjs`.
El estado de edición vive solo en `form._operationMachineState.selectedIds`, un
`Set` transitorio de IDs numéricos; la persistencia continúa usando únicamente
el GET/PUT canónico. No se leen ni escriben las listas persistentes prohibidas.

El worktree tenía cambios ajenos previos y fueron preservados. No se ejecutaron
`reset`, `checkout`, `clean`, commit ni push. Playwright real y consulta directa
de base de datos quedan pendientes para el flujo formal UI/Gate 3.
