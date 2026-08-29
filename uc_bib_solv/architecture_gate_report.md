# Informe de gates arquitectónicos

Las secciones anteriores a ARC-008 conservan resultados históricos de fases
anteriores. No describen disponibilidad actual de aliases HTTP ni de módulos de
compatibilidad retirados; el estado vigente está en la sección ARC-008.

## Gates 7–10

Validados mediante tests focalizados, compilación, validadores estructural/naming/dependencies y auditoría runtime.

- Gate 7: referencias BPM opacas y `BpmContextPort` público para TREE.
- Gate 8: ports TREE explícitos y `CausalTreePostgresAdapter` canónico.
- Gate 9: composition root con adaptador HTTP canónico de Process Modeling.
- Gate 10: `agent_tools` compuesto con servicios BPM/TREE canónicos.

## Gate 11

La suite arquitectónica raíz pasa 7/7. La suite focalizada de la migración pasa en cada fase.

La suite histórica `tests/unit` se ejecuta como caracterización y presenta incidencias preexistentes del checkout local:

- referencias a `uc_bib_solv/app.py`, eliminado del árbol actual;
- referencias a `db/schema.sql`, eliminado del árbol actual;
- referencias a `app/persistence/pm_process_repo.py`, movido al árbol `uc_bib_solv` canónico;
- tests causales legacy que dependen de IDs/fixtures de PostgreSQL no presentes;
- una prueba HTTP causal que asume un mock no conectado al adaptador canónico actual.

Estas incidencias se registran como caracterización histórica; no implican que
los módulos o aliases retirados sigan disponibles y no se consideran regresiones
de los cambios BPM/TREE validados.

## Gate 12

Se retiró únicamente `uc_bib_solv/modules/process_modeling/application/ports/persistence.py`, un duplicado sin consumidores estáticos ni dinámicos conocidos. Los ports activos están en `persistence_ports.py` y en `modules/bpm/application/ports`.

En aquella iteración no se eliminaron otras rutas, servicios o repositorios
legacy. Ese resultado es histórico y queda supersedido por las retiradas
documentadas en ARC-008.

## Estabilización posterior — ejecución actual

Cambios aplicados sin alterar contratos HTTP, esquema ni datos:

- El detalle de contratos invalida cargas asíncronas obsoletas al cancelar, eliminar o cambiar de contexto.
- El selector múltiple de máquinas no pierde una selección manual por una respuesta tardía.
- El guardado muestra estado de carga, bloquea la acción mientras se cargan asociaciones y cierra el detalle antes de refrescar el catálogo.
- El panel de metadatos BPM siempre conserva la sección de resumen; la prueba de edición valida la redirección a la página dedicada.

Resultados:

- Tests focalizados canónicos: `42/42` correctos.
- Tests unitarios frontend de contratos, componentes y metadatos: `18/18` correctos.
- E2E aislados de Process Modeling: `2/2` correctos.
- E2E conjunto: `14` correctos; fallos pendientes: fixture jerárquico inexistente `TEST_PM_UI_1784458754642` y reapertura del detalle de contrato tras una recarga completa. Además, `3` casos quedaron omitidos y `3` no se ejecutaron porque la suite es serial.
- Validadores arquitectónicos completos: correctos.
- Auditoría backend/runtime: correcta; `67` endpoints únicos, `68` rutas runtime y ningún adaptador inbound no observado.
- `compileall`: correcto.

El gate de estabilización no se marca como cerrado mientras existan esos dos fallos E2E. Las incidencias históricas de `tests/unit` descritas arriba siguen sin resolverse y no se han ocultado mediante restauración de módulos eliminados.

## Fase de arquitectura explícita BPM + RCA_TREE

Se añadieron los núcleos canónicos `modules/bpm` y `modules/rca_tree`, con dominio, aplicación, adaptadores e infraestructura. La composición Flask registra las rutas nuevas `/api/bpm` y `/api/rca-tree`; los contratos frontend canónicos ya las consumen.

Verificación adicional:

- `compileall` de los módulos nuevos: correcto.
- Validadores estructural, dependencias y concrete implementations: correctos.
- Tests de estructura, aislamiento de dominios y composición HTTP: correctos.
- `Flask.test_client()` confirma respuestas en procesos BPM, catálogo operacional, operaciones, nodos RCA_TREE y análisis RCA_TREE.

Limitación histórica: en esa ejecución las fachadas HTTP y persistencias legacy
seguían registradas como compatibilidad transitoria. ARC-008 actualiza ese estado
para las fachadas HTTP; las persistencias no forman parte de ese alcance.

## Separación de persistencia de análisis RCA_TREE

El análisis causal canónico utiliza `RcaTreeAnalysisPostgresAdapter`, que contiene el SQL y el mapeo propios del dominio y no depende de `causal_analysis`. Los puertos de participantes y resultados se componen explícitamente en `analysis_wiring.py`; los tests con dobles en memoria cubren creación, actualización y guardado de resultados.

En esa fase la ruta legacy `/api/analyses` mantenía una fachada compatible;
ARC-008 la retiró y dejó `/api/rca-tree/analyses` como ruta canónica.

Verificación de esta fase:

- Auditoría backend: correcta; sin errores de parseo ni módulos API sin consumidor estático.
- Validadores estructural, naming, dependencias y concrete implementations: correctos.
- Suite `unittest`: 11/11 correcta.
- Rutas canónicas de análisis comprobadas con `Flask.test_client()`: 200.
- `compileall`: correcto.

Quedaba pendiente la extracción futura del seam `db_cursor`; la retirada de
fachadas HTTP quedó resuelta por ARC-008.

## Port transaccional RCA_TREE

La persistencia de análisis RCA_TREE recibe ahora un `TransactionPort`. `PostgresTransactionAdapter` encapsula la implementación basada en PostgreSQL y `RcaTreeAnalysisPostgresAdapter` ya no importa directamente `db_cursor`.

La fase queda validada con 13 tests focalizados, 11 tests de la suite `unittest`, validadores arquitectónicos, auditoría runtime, comprobación de las rutas canónicas y legacy con `Flask.test_client()`, y `compileall`.

No se modificaron esquema, datos, SQL ni contratos HTTP. La allowlist descrita
en esta fase era histórica; ARC-008 retiró las fachadas HTTP incluidas en su
alcance.

## Fachada legacy de análisis sobre RCA_TREE

En esa fase `routes.analysis` conservaba las rutas públicas `/api/analyses` y
delegaba en `RcaTreeAnalysisService`. ARC-008 retiró esa fachada HTTP; la
implementación inbound de `modules/causal_analysis` tampoco se registra en
runtime.

Validación: 13 tests focalizados, 11 tests `unittest`, rutas legacy y canónicas con HTTP 200, auditoría runtime, validadores arquitectónicos, compilación y `git diff --check` correctos.

La retirada física del paquete legacy quedó resuelta para los módulos incluidos
en ARC-008; los tests históricos que mencionan literales legacy solo sirven como
caracterización de ausencia.

## Consumidores históricos migrados

Los repositorios y fachadas internas de análisis ahora componen el servicio y persistencia RCA_TREE. `app.domain.analisis_causas` reexporta las reglas desde el dominio canónico y se mantiene `create_legacy` para compatibilidad de los repositorios históricos.

Validación: 14 tests focalizados, 11 tests de descubrimiento `unittest`, rutas legacy/canónicas con HTTP 200, auditoría, validadores y compilación correctos.

La suite histórica de `causas_service` conserva fallos de baseline por imports y mocks legacy; se mantienen documentados y no se restauran módulos retirados. El paquete `causal_analysis` queda pendiente de retirada tras resolver esa compatibilidad y confirmar consumidores externos.

## Caracterización legacy RCA_TREE estabilizada

Las pruebas históricas de causas y detalle causal fueron normalizadas para usar exclusivamente namespaces `uc_bib_solv.*` y parchear los símbolos consumidos por los módulos bajo prueba. Esto elimina falsos negativos derivados de cargar simultáneamente aliases top-level y paquetes canónicos.

Validación: 15/15 tests causales, 14/14 tests focalizados RCA_TREE/compatibilidad, suite `unittest discover` 11/11, auditoría, validadores y compilación correctos.

Los aliases HTTP mencionados en esa caracterización fueron retirados por
ARC-008; cualquier literal legacy restante debe interpretarse como prueba de
ausencia, no como superficie disponible.

## Pruebas del entrypoint histórico migradas

Las pruebas de Process Modeling y causas dejaron de cargar el entrypoint inexistente `uc_bib_solv/app.py`. Process Modeling usa el composition root canónico; las causas registran de forma aislada la fachada `uc_bib_solv.routes.causas`.

Validación: 12/12 tests de esas suites, 40/40 tests combinados de rutas/causalidad/RCA_TREE, suite `unittest discover` 11/11, auditoría, validadores y compilación correctos.

Los aliases top-level descritos aquí son un registro histórico; ARC-008 no los
ofrece como superficie HTTP actual.

## Inventario de aliases top-level

La comprobación arquitectónica confirma que el código productivo no importa los namespaces top-level `app`, `modules`, `repositories`, `routes` o `services` como dependencias internas. Las referencias restantes están confinadas a pruebas históricas y no representan fachadas HTTP registradas.

Se corrigió además la expectativa obsoleta que marcaba `causal_tree` como inbound no registrado. El único adaptador inbound no observado es el legacy de `causal_analysis`.

Validación: auditoría backend, validadores, compilación, suite `unittest` 11/11 y tests causales 15/15 correctos.

## Gate final — consolidación física BPM + RCA_TREE

Estado: VALIDADO.

- Solo existen `modules/bpm`, `modules/rca_tree` y `modules/platform` como directorios de primer nivel bajo `modules`.
- `app`, `routes`, `services`, `repositories`, `causal_tree`, `causal_analysis`, `operational_modeling` y `process_modeling` fueron retirados físicamente del workspace.
- BPM es propietario de procesos, operaciones, etapas, máquinas, contratos y asociaciones.
- RCA_TREE es propietario de causalidad, análisis, causas, hipótesis, evidencias y grafo.
- La persistencia SQL queda detrás de adaptadores PostgreSQL de cada bounded context y las transacciones en platform.
- La aplicación arranca con 131 reglas runtime y mantiene los contratos HTTP públicos existentes.
- No quedan imports productivos hacia namespaces legacy ni imports cruzados directos entre los dominios.

Verificación ejecutada:

- `python3 -m unittest discover -s tests/unit -p 'test_*.py' -q`: 160/160 correctos.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: correcto.
- `python3 scripts/audit_application_architecture.py --check --check-backend`: correcto.
- Validadores architecture structure, naming, dependencies y concrete: correctos.
- `python3 -m compileall -q uc_bib_solv`: correcto.
- Tests de auditoría frontend ejecutados directamente: 13/13 correctos.

No se modificaron PostgreSQL, `db_management/schema.sql`, migraciones, datos ni contratos HTTP.

Comprobación adicional: RCA_TREE no importa repositorios BPM directamente; la resolución de referencias de contrato se compone mediante `platform.adapters.bpm_contract_context`.

## ARC-008 — retirada de aliases HTTP

ARC-008 removes the legacy HTTP aliases, inbound compatibility blueprints, and
legacy-only outbound facades. The runtime registers canonical `/api/bpm/...`
and `/api/rca-tree/...` routes only; legacy paths are not registered. No
database schema, data, SQL, or migration artifact was changed.
