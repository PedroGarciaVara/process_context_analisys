# AMD-02-003 — evidencia de implementación

Estado entregado: `implementado_pendiente_validacion`.

## Alcance ejecutado

- T9: validador de árbol versionado (`schema_version=1`) con exactamente dos niveles, IDs y órdenes estables, errores funcionales y compatibilidad de PATCH parcial.
- T10: persistencia aditiva en `pm_process_node.properties.etapas`, normalización API como `operation.etapas`, actualización parcial de propiedades y migración idempotente para operaciones históricas.
- T11: modal `maquinas_v02` con editor visual de etapas/subetapas, reordenación, eliminación confirmada, estados vacío/error y ruta `Etapa › Subetapa`; no se ofrece editor JSON de etapas.
- T12: pruebas unitarias, API aislada, JavaScript y Playwright preparado sobre el fixture vigente.

## Verificación reproducible

```text
python -m compileall -q app uc_bib_solv scripts                 OK
python -m unittest discover -s tests/unit -p 'test_*.py'       82 OK
node --test tests/unit/operational-cascade.test.mjs             OK
node --check <módulos JS afectados>                             OK
git diff --check                                                 OK
```

La suite Playwright queda preparada en `tests/e2e/ui-functional.spec.js` y
`tests/e2e/req12-machine-context.spec.js`; su ejecución remota requiere las
variables/servidor DSS del entorno de validación. No se cierra Gate 3 ni
`NC-006` automáticamente.

## Evidencia técnica

- `operation_id` y `process_version_id` se transportan desde la selección BPM.
- El árbol se guarda como `{schema_version: 1, etapas: [...]}` bajo la clave `properties.etapas`.
- Un PATCH sin `etapas` conserva el árbol existente.
- Las demás claves de `properties` se conservan al actualizar etapas.
- Los nodos persistidos sin etapas se proyectan como `etapas: []`.
