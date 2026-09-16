# Req21 baseline y diagnóstico (T1-T2)

## Atribución

Este reporte y la carpeta `artifacts/req21-baseline/` fueron creados durante la
sesión aislada del `execute-agent` para req21. El estado previo completo está en
`git-status.txt`, `unstaged.patch`, `staged.patch`, `untracked.txt` y
`potential-sha256.txt`. No se restauró, limpió ni sobrescribió ningún cambio
previo.

## Alcance potencial

Las áreas inspeccionadas fueron `webapp/js/views/{maquinas,bpm,rca}`,
`webapp/js/components`, `webapp/js/api`, `modules/{bpm,rca_tree}` y tests
unitarios/integración. La lista exacta y hashes previos están en
`potential-files.txt` y `potential-sha256.txt`.

## Reproducción estática/preflight

| FR | Observación inicial | Estado de entorno |
| --- | --- | --- |
| 21-01 | `#/maquinas` ya contiene enlace `#/maquinas_detalle?new=1`; también conserva modal legacy para edición | Requiere navegador real para confirmar ausencia de apertura modal |
| 21-02 | catálogo filtra máquinas; `save_contract_machines` aceptaba IDs sin validar el catálogo en una transacción única | Backend verificable sin DSS mediante tests con repositorio/mocks |
| 21-03 | modal legacy tiene `role=tab` y solo panel activo; ficha dedicada aún presenta bloques continuos | Requiere confirmar ruta elegida por la UI |
| 21-04 | payload de `contratos` devuelve filtros y filas; carga inicial depende de bootstrap SPA | Requiere Playwright |
| 21-05/06 | detalles de operación/proceso ya proyectan descripción, contratos/máquinas y acción BPM | Requiere Playwright para selección y cambio de contexto |
| 21-07 | endpoint devuelve `assigned` y `available`; selector múltiple permite edición | Validar atomicidad y persistencia en backend/UI |
| 21-08 | árbol conserva `treePage.detail` y paneles de presentación; panel exacto fijado por ODT | Requiere Playwright para no regresión |
| 21-09 | `buildWorkspacePanel` todavía contiene el bloque “Cadena científica”, aunque el montaje lo elimina | Debe retirarse del markup de presentación sin tocar resultados/APIs |
| 21-10 | backend bloquea análisis cerrado y guarda resultados en transacción; faltan validaciones explícitas de existencia/pertenencia de hipótesis | Requiere tests backend y UI real |

## Referencia visual ODT

Los ODT fueron convertidos a PDF y las páginas PNG quedaron en este directorio
(`odt2-*.png`). La primera captura del segundo ODT muestra el árbol causal con un
inspector redundante en el borde derecho; la segunda muestra el panel derecho
“Cadena científica” y etiquetas “solo lectura” dentro de las tarjetas. La
retirada req21 debe limitarse a esa presentación, conservando árbol, resultados,
hipótesis y APIs.

## Contratos y decisión de preservación

- Asociaciones contrato-máquina siguen en `contrato_maquina`; no se crea tabla.
- Resultados siguen en `analisis_resultado`; el guardado usa el adaptador de
  transacción RCA existente.
- Las reglas de existencia, estado editable y atomicidad se refuerzan en
  adaptadores/casos de uso backend; la UI solo da feedback inmediato.
- Los archivos que ya estaban modificados al inicio se consideran preexistentes;
  cualquier cambio posterior se aplicará sobre su contenido actual y se
  atribuirá únicamente a req21.

