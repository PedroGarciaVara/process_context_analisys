# Requerimiento 12 — cobertura del fixture

`proceso_BU_estructurado.md` se usa únicamente como fixture de cobertura y gap discovery.

| Área del fixture | Contrato generalista | Estado |
| --- | --- | --- |
| identidad, aliases, bloques y relaciones BPM | proceso/version/nodo/transición + detalle JSON | cubierto |
| declaración vigente | `pm_process_node_metadata` con envelope `family/schema_version/data/source/provenance` | cubierto |
| hecho de ejecución | `pm_context_record.record_type=fact` + `execution_id` | cubierto |
| evidencia y soporte | `pm_context_record.record_type=evidence` + `supports` | cubierto |
| recursos, materiales, tags y defectos | `data`/`payload` generalista | cubierto como extensión |
| PLC, PI-AVEVA, Nivel 1/2 y lecturas externas | source/provenance únicamente | gap: integración futura |
| KPI/Cpk y optimización dinámica | endpoint KPI con entradas explícitas | gap: fuentes y fórmula autorizada |
| marcado, inspecciones y señales no descritas | hecho/evidencia si se aporta | gap: instancia/contrato pendiente |

No se crea ninguna tabla, entidad, repositorio, ruta o bounded context dedicado a BU/MACBU.
Los nombres del fixture no forman invariantes del producto.

## Evidencia de NC-001 — reentrada correctiva 2026-08-01

### Evidencia estática y de contrato verificada en esta ejecución

- El helper exige literalmente la versión BPM `886ffe83-5235-4eb8-8c1d-528041518617`, no crea versiones y usa únicamente tablas/contratos genéricos.
- `python3 -m unittest tests.unit.test_req12_fixture_seed tests.unit.test_req12_context tests.unit.test_process_modeling_api tests.unit.test_process_modeling_service tests.unit.test_process_modeling_validation` → 13 OK.
- `python3 -m unittest discover -s tests/unit -p 'test_*.py'` → 51 OK.
- `python3 -m compileall -q scripts/seed_req12_bu_fixture.py app uc_bib_solv/webapp_java/python-backend` → OK.
- `node --check uc_bib_solv/webapp_java/webapp/js/views/contexto.js` y del cliente API → OK.
- La revisión estática no encuentra tabla, entidad, repositorio o bounded context especializado BU/MACBU. El helper protege los `ON CONFLICT` contra actualización de filas con provenance ajena.

### Evidencia runtime no disponible

- `python3 scripts/seed_req12_bu_fixture.py --dry-run --json` → exit 2: PostgreSQL no está accesible en `/var/run/postgresql` (`pg_isready`: no response; conexión denegada por el entorno). No se ejecutaron carga, limpieza ni reseed, y no se inventan sus conteos.
- `python3 -m unittest tests.integration.test_process_modeling_db_integration` → 2 fallos en `setUp` con HTTP 409 `persistence_error`; requiere una instancia PostgreSQL/estado de esquema operativo y queda clasificado como bloqueo de entorno/persistencia, no como éxito ni como fallo específico del fixture.
- No se ejecutaron API runtime, UI/Playwright ni comprobaciones de conservación de datos ajenos porque dependen de la base de datos y del servidor. No existe evidencia runtime verificable de nodos, relaciones, recursos, metodología o gaps en la UUID objetivo en esta sesión.

### Cobertura y gaps declarados

- El diseño del seed conserva los gaps `BU-N-044`, `BU-N-043`, `BU-N-017` y `BU-N-024` como contrato/configuración, futura integración o terminología no bloqueante; no crea conectores, tablas ni modelos específicos.
- T7/T8 y NC-001 permanecen pendientes de validación runtime humana. El estado del requerimiento es `implementado_pendiente_validacion`; Gate 3 y el cierre de NC-001 no se modifican.
