# NC Log — requerimiento_05

## Metadata
- Requirement ID: `requerimiento_05`
- Spec File: `./requeriments_spec_driven_development/requerimiento_05/spec.md`
- Task Plan: `./requeriments_spec_driven_development/requerimiento_05/task_plan.md`
- Created At: `2026-05-31`
- Last Updated: `2026-05-31`

---

## Estado de cierre del requerimiento

> Un requerimiento no puede cambiar a `done` mientras exista al menos una NC
> con estado `open` o `in_correction` en este archivo.

Estado actual de NCs: `NCs abiertas`

---

## Registro de No Conformidades

### NC-001

| Campo | Valor |
|-------|-------|
| **ID** | NC-001 |
| **Fecha deteccion** | 2026-05-31 |
| **Detectado por** | `programador_humano` |
| **Descripcion** | Falta el metodo funcional de recuperacion/proyeccion descendente desde un contrato raiz cuando existe la cadena `CONTRACT -> CONTRACT -> CAUSE`. |
| **Comportamiento esperado** | Segun `spec.md` (FR-06, FR-08, FR-11; AC-09, AC-11, AC-15) y `task_plan.md` (T5, T7, T8, T11), el core debe recuperar el subgrafo descendente y construir el arbol visual desde el contrato raiz, incluyendo las causas del contrato hijo alcanzadas via `DEPENDS_ON`. |
| **Comportamiento observado** | La implementacion actual permite persistir y consultar la relacion `CONTRACT -> CONTRACT` con `DEPENDS_ON`, pero la proyeccion funcional de causas desde contrato raiz no atraviesa ese contrato hijo. En la practica no hay metodo de core que devuelva automaticamente las causas descendentes del contrato dependiente y la UI no puede expandirlas ni mostrarlas. |
| **Causa raiz** | `implementation` |
| **Punto de re-entrada** | `execute-agent` |
| **Estado** | `in_correction` |
| **Validacion de cierre** | `pendiente` |

#### Historial de correcciones

| Fecha | Accion | Resultado |
|-------|--------|-----------|
| 2026-05-31 | Se registra la NC, se clasifica la causa raiz como `implementation` y se prepara re-entrada a `execute-agent` para extender la consulta/proyeccion `CONTRACT -> CONTRACT -> CAUSE` y su cobertura de tests. | `segunda validacion pendiente` |
| 2026-05-31 | Se corrige `app/persistence/graph_query_repo.py` para recorrer contratos descendentes via `DEPENDS_ON` antes de proyectar causas, manteniendo el contrato de `get_projected_causes_for_contract`, y se añaden tests de integracion para el caso `CONTRACT -> CONTRACT -> CAUSE` y la no regresion `CONTRACT -> CAUSE`. | `correccion tecnica aplicada; validacion humana pendiente` |

---

## Tabla resumen

| NC | Causa raiz | Estado | Punto re-entrada | Cierre |
|----|------------|--------|-----------------|--------|
| NC-001 | `implementation` | `in_correction` | `execute-agent` | `pendiente` |

---

## Protocolo de uso

### Cuando se detecta una NC

1. El `nc-resolution-agent` crea o actualiza este archivo.
2. Asigna un ID correlativo (`NC-001`, `NC-002`...).
3. Clasifica la causa raiz: `spec` | `task_plan` | `implementation`.
4. Determina el punto de re-entrada y lo registra.
5. Actualiza el estado del requerimiento en `traza_requerimiento.md` a `no_conforme`.

### Durante la correccion

1. El estado de la NC cambia a `in_correction`.
2. El estado del requerimiento en `traza_requerimiento.md` cambia a `en_correccion`.
3. El agente corrector (segun punto de re-entrada) ejecuta la correccion.
4. El resultado de cada accion correctiva se registra en el historial.

### Al cerrar una NC

1. El `nc-resolution-agent` verifica que la correccion satisface el criterio de aceptacion original.
2. Solicita validacion explicita al programador humano.
3. Tras confirmacion humana, cambia el estado de la NC a `resolved` y registra la fecha.
4. Si todas las NCs estan `resolved`, actualiza `traza_requerimiento.md` a `implementado_pendiente_validacion`.

### Valores de estado validos

| Estado | Significado |
|--------|-------------|
| `open` | NC detectada, pendiente de clasificacion y correccion |
| `in_correction` | Correccion en curso |
| `resolved` | Correccion aplicada y validada por el programador humano |
