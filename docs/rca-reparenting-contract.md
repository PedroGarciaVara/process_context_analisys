# Contrato RCA: reparenting y compatibilidad científica

Estado: contrato de implementación para T00 (`RCA-UI-ARBOLES-ANALISIS`).

Excepción de workflow: T00 se ejecuta desde `plan.md` en el flujo NO-SDD
autorizado explícitamente; no consume ni crea `spec.md`/`task_plan.md`. La
revisión humana de T00–T01 sigue siendo obligatoria antes de implementar.

Este documento fija el contrato funcional y técnico que deben consumir el
dominio, la persistencia, la API y los adaptadores de UI. La autoridad de las
invariantes es el backend. `expected_version` es control de concurrencia
optimista de una causa RCA; no representa versionado de procesos, contratos,
flujos BPM ni de una investigación.

## 1. Operación de mover una causa

### Request

```http
PATCH /api/rca-tree/causes/{cause_id}/parent
Content-Type: application/json
X-Correlation-ID: 7f0b8d9c-3e4a-4b91-8c12-rca-test-001
```

```json
{
  "parent_id": 1202,
  "expected_version": 7,
  "reason": "La evidencia confirma que la causa pertenece a la rama de suministro"
}
```

Campos obligatorios:

- `cause_id`: identificador existente de la causa a mover; se toma de la URL.
- `parent_id`: identificador de la nueva causa padre, o `null` sólo cuando el
  contrato admite una raíz y la política de raíz lo permite.
- `expected_version`: valor opaco (`string` o `number`) leído del recurso. Es
  obligatorio y se compara dentro de la transacción.
- `reason`: texto no vacío, recortado por el servidor y conservado en auditoría.
  El cliente no puede sustituir al actor autenticado.

El comando accesible, teclado y drag/drop deben enviar exactamente este payload
y atravesar la misma previsualización y confirmación. El drop nunca persiste
por sí mismo.

### Respuesta 200

```json
{
  "data": {
    "cause": {
      "id": 1207,
      "contract_id": 44,
      "parent_id": 1202,
      "version": 8
    },
    "moved_from": {"parent_id": 1190},
    "moved_to": {"parent_id": 1202},
    "affected_descendant_ids": [1210, 1211],
    "primary_relationship": {
      "type": "CAUSES",
      "from_cause_id": 1207,
      "to_cause_id": 1202
    },
    "preserved": {
      "hypothesis_ids": [3007, 3008],
      "analysis_result_ids": [5007],
      "reference_ids": [9007]
    },
    "audit": {
      "id": "8d7e6c5b-4a39-4f20-9e18-rca-test-001",
      "action": "CAUSE_REPARENTED",
      "actor_id": "user-qa",
      "reason": "La evidencia confirma que la causa pertenece a la rama de suministro",
      "correlation_id": "7f0b8d9c-3e4a-4b91-8c12-rca-test-001",
      "occurred_at": "2026-09-11T10:30:00Z"
    }
  }
}
```

La respuesta devuelve el mismo `cause.id`, `contract_id` y relaciones
científicas; sólo cambia el padre, la relación primaria y la versión de la
causa. La nueva versión se devuelve para el siguiente comando.

## 2. Invariantes y atomicidad

Antes de escribir, y de nuevo bajo el lock transaccional apropiado, el servidor
debe comprobar:

1. La causa y, si no es `null`, el padre existen.
2. Ambos pertenecen al mismo `contract_id`; no se permite cruzar contratos.
3. `parent_id != cause_id` (self-parent).
4. El nuevo padre no está en el subárbol de la causa; esto evita ciclos directos
   e indirectos.
5. La causa raíz protegida no se convierte en hija ni se sustituye. Un contrato
   con raíz única permite `parent_id:null` sólo para la política explícita de
   desanclaje y no crea una segunda raíz.
6. La relación estructural primaria es única y de tipo `CAUSES`. Enlaces de
   reutilización/DAG o referencias secundarias no se convierten en la relación
   primaria ni se borran.
7. El actor tiene permiso sobre el contrato y la causa no está bloqueada por el
   estado de sólo lectura aplicable.
8. `expected_version` coincide con la versión actual. Una igualdad de
   `updated_at` sólo es admisible si el adaptador la trata como valor opaco y
   mantiene detección de conflicto; no se inventa un contador de workflow.

La transacción actualiza `causa.parent_id`, reemplaza la relación primaria
`CAUSES` y registra la auditoría. Todo debe confirmarse en un único commit. Si
cualquier validación, lock, update o auditoría falla, se hace rollback completo:
ninguna tabla queda modificada. Un 409 tampoco cambia hipótesis, resultados,
referencias, nodos ni relaciones.

## 3. Errores HTTP

Todos los errores siguen esta forma y deben incluir `correlation_id`:

```json
{
  "error": {
    "code": "RCA_CYCLE_DETECTED",
    "message": "El destino pertenece al subárbol de la causa.",
    "details": {"cause_id": 1207, "parent_id": 1210},
    "correlation_id": "7f0b8d9c-3e4a-4b91-8c12-rca-test-001"
  }
}
```

| HTTP | code | Uso y efecto |
|---:|---|---|
| 400 | `RCA_INVALID_REQUEST` | JSON ausente/mal formado, campo obligatorio ausente o tipo inválido; no escribe. |
| 401 | `RCA_UNAUTHENTICATED` | No hay actor autenticado; no escribe. |
| 403 | `RCA_FORBIDDEN` | Actor sin permiso o recurso en sólo lectura; no escribe. |
| 404 | `RCA_CAUSE_NOT_FOUND` / `RCA_PARENT_NOT_FOUND` | Causa o padre inexistente; no escribe. |
| 409 | `RCA_SELF_PARENT` | El padre es la propia causa; no escribe. |
| 409 | `RCA_CYCLE_DETECTED` | El padre es descendiente, directo o indirecto; no escribe. |
| 409 | `RCA_CONTRACT_MISMATCH` | Causa y padre pertenecen a contratos distintos; no escribe. |
| 409 | `RCA_ROOT_POLICY` | Raíz protegida, segunda raíz o `null` no permitido; no escribe. |
| 409 | `RCA_VERSION_CONFLICT` | `expected_version` obsoleto; no escribe y debe devolverse versión actual sólo si la política de exposición lo permite. |
| 409 | `RCA_PRIMARY_RELATION_CONFLICT` | No puede existir más de una relación primaria `CAUSES`; no escribe. |
| 422 | `RCA_INVALID_REASON` | `reason` vacío, sólo espacios o fuera de límites; no escribe. |
| 422 | `RCA_READONLY_ANALYSIS` | Se intentó mutar un snapshot/análisis cerrado; no escribe. |
| 500 | `RCA_MOVE_FAILED` | Fallo inesperado; la transacción debe hacer rollback y la respuesta no afirma éxito. |

El cliente conserva el estado visible y el formulario ante error, muestra el
código y permite reintentar con datos frescos. Sólo un 200 autoriza ocultar o
reordenar el nodo localmente (`DATA-01`).

## 4. Auditoría

Cada 200 crea exactamente un evento de movimiento con: `id`, `action`, actor
autenticado, timestamp UTC, `contract_id`, `cause_id`, padre anterior, padre
nuevo, `expected_version`, versión resultante, `reason`, `correlation_id` y
resultado. La auditoría es append-only y no contiene una copia mutable de
hipótesis o resultados. Una compensación posterior es otro movimiento explícito;
no se revierte `parent_id` automáticamente sin decisión del usuario.

## 5. Compatibilidad de datos e investigación científica

Se mantienen sin renombrar ni reenumerar todos los IDs actuales de causas,
hipótesis, análisis, resultados y referencias. Mover una plantilla no recrea
causas, no cambia `hypothesis.cause_id`, no reescribe resultados históricos y no
rompe referencias. Un análisis conserva su snapshot y sus IDs aunque la
plantilla sea reparentada después.

Los campos nuevos son nullable o tienen default seguro: `prediccion`,
`metrica`, `unidad`, `fuente_datos`, `metodo`, `periodo`, `calculo`, `umbral`,
`evidencia`, `decision`, `justificacion_decision`, `accion_control`,
`responsable_accion`, `fecha_control`. El payload antiguo, con sólo descripción,
tipo y criterio, sigue siendo válido y se devuelve con los campos nuevos como
`null`/vacíos guiados. No se hace backfill inventando evidencia.

Estados válidos y reglas:

- `pendiente`: sin decisión final; compatible con datos antiguos.
- `validada`/`confirmada`: decisión confirmada; exige criterio mínimo y
  evidencia no vacía.
- `rechazada`/`descartada`: alternativa rechazada; exige criterio mínimo,
  evidencia y justificación suficiente para conservar el aprendizaje.
- `inconclusa`: evidencia insuficiente o contradictoria; exige justificación y
  conserva la hipótesis para futura prueba.

Los nombres legacy se leen y escriben sin reescritura destructiva; la API puede
normalizar la presentación, pero debe conservar el valor persistido original o
un mapeo reversible. Una acción/control sólo puede registrarse después de la
decisión, y no convierte automáticamente una hipótesis en causa. Un análisis
cerrado es sólo lectura; `reabrir` es una acción explícita y auditable.

## 6. Fixtures canónicos `TEST_`

Los tests deben crear y limpiar datos aislados con prefijo `TEST_`:

| Fixture | Datos y propósito |
|---|---|
| `TEST_RCA_CONTRACT_01` | contrato 44, raíz protegida `TEST_RCA_ROOT_01`, hijos 1202/1207 y descendientes 1210/1211. |
| `TEST_RCA_MOVE_VALID_01` | mover 1207 bajo 1202 con `expected_version=7`; espera 200 y versión 8. |
| `TEST_RCA_SELF_01` | `parent_id=1207`; espera `RCA_SELF_PARENT` 409. |
| `TEST_RCA_CYCLE_01` | mover 1202 bajo su descendiente 1210; espera `RCA_CYCLE_DETECTED` 409. |
| `TEST_RCA_CROSS_CONTRACT_01` | padre 2202 de contrato 45; espera `RCA_CONTRACT_MISMATCH` 409. |
| `TEST_RCA_STALE_01` | mismo nodo con versión 6 tras haber pasado a 8; espera `RCA_VERSION_CONFLICT` 409 y cero cambios. |
| `TEST_RCA_SCIENTIFIC_01` | hipótesis legacy y otra con cadena completa; mover no cambia sus IDs, evidencia, resultados ni referencias. |
| `TEST_RCA_CLOSED_01` | análisis cerrado con resultado `inconclusa`; mutación denegada hasta reapertura explícita. |

## 7. Criterios de aceptación trazables

- **MOVER-01:** comando accesible, preview y confirmación envían el request
  definido; un 200 persiste el nuevo padre tras recarga.
- **MOVER-02:** self-parent y todo el subárbol aparecen excluidos en UI y el
  backend rechaza ciclos con `409` explicativo.
- **MOVER-03:** IDs y vínculos de hipótesis, evidencia, resultados y referencias
  son idénticos antes y después del movimiento.
- **MOVER-04:** comando, teclado y drag/drop producen el mismo payload,
  transacción y evento de auditoría.
- **DATA-01:** ningún cambio visual definitivo ocurre antes del 200; cualquier
  4xx/5xx conserva/restaura el estado local y el retry no duplica auditoría.
- **RCA-01:** no se confirma/rechaza sin evidencia y criterio; `inconclusa`
  conserva justificación y la cadena científica visible.
- **RCA-02:** análisis cerrado no muta ni pierde resultados; reapertura explícita
  permite editar y conserva historial.
