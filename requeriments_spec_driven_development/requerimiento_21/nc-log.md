# NC Log — requerimiento_21

## Metadata
- Requirement ID: `requerimiento_21`
- Spec File: `./requeriments_spec_driven_development/requerimiento_21/spec.md`
- Task Plan: `./requeriments_spec_driven_development/requerimiento_21/task_plan.md`
- Created At: `2026-09-13`
- Last Updated: `2026-09-13` (registro NC-005)

---

## Estado de cierre del requerimiento

Estado actual de NCs: `5 abiertas; 1 resuelta (NC-005)`

---

## Registro de No Conformidades

### NC-001

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `ui-log-analysis-agent` |
| **Descripcion** | AC-21-01 no puede completar la navegación a crear máquina: la ruta llega a `#/maquinas_detalle?new=1`, pero la vista falla al leer `contract_id` de un contexto indefinido y no renderiza el formulario. |
| **Comportamiento esperado** | AC-21-01: la ruta de detalle en modo creación renderiza el formulario “Nueva máquina”, sin modal, conservando el flujo de guardado y errores. |
| **Comportamiento observado** | La captura `AC-21-01-create-machine.png` muestra `Cannot read properties of undefined (reading 'contract_id')`; no aparece el heading ni el formulario. `request-failures.log` y `response-errors.log` están vacíos. |
| **Causa raiz** | `implementation` — spec y task plan definen explícitamente la ruta, el modo creación y el formulario; la desviación se produce en el código de la vista por acceso no protegido al contexto. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se registra NC y se delega diagnóstico/corrección focalizada de la causa común en `maquinas_detalle` al `execute-agent`; se protege el contexto ausente y se mantiene la vista de creación. | `correccion aplicada; validacion Playwright pendiente` |

### NC-002

| Campo | Valor |
|-------|-------|
| **ID** | NC-002 |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `ui-log-analysis-agent` |
| **Descripcion** | AC-21-03 no puede verificar las pestañas de máquina genérica y específica porque la vista de detalle nueva no llega a renderizar sus paneles debido al mismo error de contexto. |
| **Comportamiento esperado** | AC-21-03: la página presenta dos tabs accesibles, “Máquina genérica” y “Máquina específica”, monta solo el panel activo y conserva los valores editados. |
| **Comportamiento observado** | La captura `AC-21-03-final.png` muestra el mismo error/estado vacío de `maquinas_detalle?new=1`; no aparecen las dos pestañas. |
| **Causa raiz** | `implementation` — spec y task plan cubren ambos tabs y su montaje exclusivo; el error de inicialización de la implementación impide su renderizado. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se agrupa con NC-001 para corregir la causa común de inicialización de `maquinas_detalle`; se añaden tabs ARIA con panel inactivo oculto mediante `execute-agent`. | `correccion aplicada; validacion Playwright pendiente` |

### NC-003

| Campo | Valor |
|-------|-------|
| **ID** | NC-003 |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `programador_humano` durante Gate 3 |
| **Descripcion** | La vista de árbol/análisis sigue mostrando repetidamente el texto/icono “Solo lectura” en nodos visibles. |
| **Comportamiento esperado** | AC-21-09 / FR-21-09: retirar el símbolo y texto de solo lectura de la presentación, manteniendo intacta la protección de dominio para análisis realmente cerrados. |
| **Comportamiento observado** | La evidencia visual actual muestra ocurrencias visibles de “Solo lectura” en nodos del árbol; el run `2026-09-13_10-30-00-req21-rerun1` lo declaró PASS sin comprobar cero ocurrencias en toda la vista. |
| **Causa raiz** | `implementation` — spec y task plan exigen explícitamente retirar el símbolo/texto visual; la implementación conserva fuentes de presentación en árbol/componentes/CSS. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se registra el defecto visual tras rechazo humano de Gate 3 y se delega inventario exhaustivo de fuentes en árbol/componentes/CSS al `execute-agent`; se retiran textos/iconos visibles y se conserva la protección de edición. | `correccion aplicada; validacion Playwright pendiente` |
| 2026-09-13 | El run `2026-09-13_15-00-00-req21-nc34-rerun` verifica AC-21-09 con cero ocurrencias visibles (case-insensitive) de “solo lectura” en la vista. | `revalidada; cierre humano pendiente` |

### NC-004

| Campo | Valor |
|-------|-------|
| **ID** | NC-004 |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `programador_humano` durante Gate 3 |
| **Descripcion** | En análisis abierto, al seleccionar una hipótesis, completar evidencia y criterio e intentar marcar OK o NO OK, la UI muestra “Una decisión confirmada o rechazada requiere evidencia y criterio.” y no persiste. |
| **Comportamiento esperado** | AC-21-10 / FR-21-10: análisis abierto/nuevo debe aceptar evidencia y criterio, permitir guardar decisiones OK y NO OK y conservarlas tras recarga; análisis cerrado debe rechazar con motivo. |
| **Comportamiento observado** | La reproducción humana muestra validación roja y ausencia de guardado aun con los dos campos de texto completados. El E2E previo fue insuficiente: no seleccionó hipótesis, rellenó ambos campos, pulsó OK y NO OK, comprobó persistencia tras reload ni verificó el rechazo cerrado. |
| **Causa raiz** | `implementation` — spec y task plan definen el contrato editable y persistencia; la implementación no mapea/valida correctamente el contrato real de evidencia/criterio y payload de decisión. Como acción correctiva, la prueba E2E debe cubrir el flujo real para impedir otro falso positivo. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se registra NC tras rechazo humano de Gate 3; se corrigen contrato/payload, criterio de hipótesis, persistencia y cobertura E2E del flujo OK/NO OK mediante `execute-agent`. | `correccion aplicada; validacion Playwright pendiente` |
| 2026-09-13 | Segundo intento: el run `2026-09-13_15-00-00-req21-nc34-rerun` revalida AC-21-09/NC-003, pero AC-21-10 falla en NO OK: el backend devuelve 400 porque el payload contiene evidencia, criterio y conclusión, pero carece de `decision_justification`; se delega un nuevo diagnóstico/corrección contractual focalizada a `execute-agent`. | `segunda correccion requerida; NC sigue in_correction` |
| 2026-09-13 | Resultado del intento 2: el run `2026-09-13_15-30-00-req21-nc4-rerun2` obtiene HTTP 201 para OK y NO OK con evidencia, criterio, conclusión y `decision_justification`, pero el GET posterior de `/api/rca-tree/analyses/39` devuelve resultados históricos y no los recién guardados. Se registra `NC-004-PERSIST` como defecto de lectura/proyección/persistencia. | `intento 2 no conforme; escalado humano obligatorio antes de intento 3` |

### NC-004-PERSIST

| Campo | Valor |
|-------|-------|
| **ID** | NC-004-PERSIST |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `ui-log-analysis-agent` en rerun Playwright real |
| **Descripcion** | Los resultados OK y NO OK se aceptan (HTTP 201), pero no aparecen en la lectura posterior del análisis; el GET devuelve resultados históricos y AC-21-10 no puede acreditar persistencia tras recarga. |
| **Comportamiento esperado** | AC-21-10 / FR-21-10: las decisiones guardadas en análisis abierto deben conservarse y proyectarse tras reload; el caso cerrado debe seguir rechazando con motivo. |
| **Comportamiento observado** | En análisis abierto #39/hipótesis #157, OK crea id 354 y NO OK crea id 355 con payload completo, pero GET `/api/rca-tree/analyses/39` no devuelve esos valores TEST y muestra resultados antiguos. |
| **Causa raiz** | `implementation` — spec y task plan exigen persistencia y lectura tras reload; el defecto queda localizado en la lectura/repositorio/cache/proyección de resultados, no en el contrato de entrada. |
| **Punto de re-entrada** | `execute-agent`, bloqueado por escalado humano tras máximo de dos intentos |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se registra NC-004-PERSIST con la evidencia del run `2026-09-13_15-30-00-req21-nc4-rerun2`; los dos POST responden 201 pero el GET posterior no proyecta ids 354/355 ni sus valores TEST. | `escalado humano obligatorio; no autorizado intento 3` |

### NC-005

| Campo | Valor |
|-------|-------|
| **ID** | NC-005 |
| **Fecha deteccion** | 2026-09-13 |
| **Detectado por** | `programador_humano` durante Gate 3, tras validar AMD-21-001 |
| **Descripcion** | En `R12_BU_EVACUACION`, el editor acepta la identidad libre `ffff` y persiste `pm_process_node_metadata.metadata.data.equipment` con `EV01`; tras retirar EV02 de esa representacion, la relacion canonica sigue conteniendo EV01 y EV02, por lo que operaciones y el panel derecho siguen mostrando ambas maquinas. |
| **Comportamiento esperado** | AMD-21-001, FR-21-02/02A y AC-21-02, AC-21-13..17: `machine_operation_configuration JOIN maquina` es la unica fuente de verdad; la API debe transportar IDs canonicos, rechazar `ffff`/IDs inexistentes, actualizar atomicamente la relacion canonica y hacer que todas las lecturas muestren solo sus miembros. Las listas `equipment`, `canonical_ids.maquina_ids` y `operation_machine_assignments` no deben leerse, escribirse ni conservarse como pertenencia duplicada. |
| **Comportamiento observado** | Se acepto y persistio `ffff`/`metadata.data.equipment`; al eliminar EV02 de esa copia JSON, el join canonico mantuvo EV01 y EV02. La tabla de operaciones y el panel derecho continuaron mostrando EV01 y EV02, evidenciando divergencia entre la representacion JSON y la relacion canonica. |
| **Causa raiz** | `implementation` — el spec validado y el task plan aprobado ya establecen el join canonico como fuente unica, IDs canonicos, comando dedicado, validacion y atomicidad; la implementacion conserva/consulta representaciones duplicadas y acepta una identidad libre. |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `resolved` |
| **Validacion de cierre** | `aprobada por programador_humano en Gate 3 ("sí", 2026-09-13)` |
| **Trazabilidad** | `AMD-21-001`; `FR-21-02`, `FR-21-02A`; `AC-21-02`, `AC-21-13`, `AC-21-14`, `AC-21-15`, `AC-21-16`, `AC-21-17` |

#### Historial

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-09-13 | Se registra la NC tras confirmacion humana de la divergencia en `R12_BU_EVACUACION`; Gate 1 y Gate 2 de AMD-21-001 permanecen aprobados y la implementacion queda autorizada para reentrada en `execute-agent`. | `correccion pendiente; validacion Gate 3 pendiente` |
| 2026-09-13 | `execute-agent` aplica el paquete correctivo AMD-21-001: GET/PUT canonicos, DTO estricto con rechazo de metadata duplicada, reemplazo PostgreSQL atomico conservando filas retenidas, selector UI, retirada de metadata duplicada y migracion/reconciliacion idempotente con backup acotado `artifacts/req21-reconciliation-backup-20260913_163641.json`. | `correccion tecnica aplicada; pendiente validacion humana` |
| 2026-09-13 | La migracion local deja `R12_BU_EVACUACION` exactamente con EV01/id13 y sin EV02/id14; la segunda ejecucion produce `UPDATE 0`/`DELETE 0` y no quedan ocurrencias de metadata prohibida. Verificacion focalizada: 20 tests Python + 13 subtests, 13 tests Node, compilacion/sintaxis/diff correctos. El run `.playwright-artifacts/test-results/2026-09-13_16-45-10-req21-nc5` obtiene Playwright 1/1 y AC-21-02/13..17 6/6: selector, panel derecho y tabla muestran solo EV01; `ffff`, IDs inexistentes y payload mixto invalido responden 4xx sin mutacion; no hay claves duplicadas ni nuevos candidatos NC; cleanup final `[13]`. Backend reiniciado solo localmente (PID 658556). | `NC-005 sigue in_correction; cierre pendiente de Gate 3` |
| 2026-09-13 | El programador humano valida explícitamente con «sí» en Gate 3 la corrección de NC-005, sobre la evidencia final ya registrada: relación canónica de `R12_BU_EVACUACION` exactamente EV01/id13, EV02/id14 ausente, reconciliación idempotente, rechazos 4xx sin mutación, cero representaciones duplicadas y run Playwright 1/1 con AC-21-02/13..17 6/6. | `NC-005 resolved; cierre aprobado por programador_humano` |

---

## Tabla resumen

| NC | Causa raiz | Estado | Punto re-entrada | Cierre |
|----|------------|--------|-----------------|--------|
| NC-001 | `implementation` | `in_correction` | `execute-agent` | `pendiente` |
| NC-002 | `implementation` | `in_correction` | `execute-agent` | `pendiente` |
| NC-003 | `implementation` | `in_correction` | `execute-agent` | `pendiente` |
| NC-004 | `implementation` | `in_correction` | `execute-agent` | `pendiente` |
| NC-004-PERSIST | `implementation` | `in_correction` | `execute-agent` (escalado) | `pendiente` |
| NC-005 | `implementation` | `resolved` | `execute-agent` | `2026-09-13, Gate 3 aprobado por programador_humano` |
