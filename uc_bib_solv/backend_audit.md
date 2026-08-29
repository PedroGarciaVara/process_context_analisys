# Auditoría backend

Fecha: 2026-08-23

## Resultado de la ejecución actual

El inventario se genera con `scripts/audit_application_architecture.py`. La auditoría combina AST estático con el `url_map` real de Flask y no accede a PostgreSQL ni modifica archivos o datos.

| Indicador | Resultado |
|---|---:|
| Declaraciones de endpoints encontradas | 109 |
| Endpoints únicos por método y ruta | 67 |
| Rutas activas en Flask | 68 |
| Definiciones duplicadas | 42 |
| Imports dinámicos detectados | 2 |
| Errores de sintaxis | 0 |

## Composición activa

La factoría activa es `uc_bib_solv/modules/platform/infrastructure/app_factory.py`. Actualmente registra:

- el adaptador canónico operacional BPM de `modules/operational_modeling/adapters/inbound/http/routes.py`;
- el adaptador canónico TREE de `modules/causal_tree/adapters/inbound/http/routes.py`;
- el adaptador canónico de análisis TREE de `modules/causal_analysis/adapters/inbound/http/routes.py`;
- el adaptador canónico de entrada de Process Modeling mediante `routes/process_modeling.py`;
- los adaptadores platform de health y bootstrap;
- el servicio web SPA cuando se usa `local_server.py`.

Las fachadas `routes/operational.py`, `routes/causas.py` y `routes/analysis.py` continúan importables para compatibilidad, pero ya no son las implementaciones registradas en runtime. Se verificó que sus contratos de rutas siguen presentes en la composición canónica.

## Clasificación

El inventario clasifica módulos y funciones según referencias estáticas y ubicación arquitectónica:

- `active`: tiene consumidores o participa en la composición observada;
- `compatibility_or_legacy`: pertenece a una capa legacy y tiene consumidores;
- `candidate_legacy_pending_dynamic_validation`: pertenece a una capa legacy sin consumidor estático suficiente;
- `candidate_without_static_consumer`: no tiene consumidor estático observado;
- `adapter_not_observed_in_runtime_map`: declara rutas, pero no está conectado al `url_map` runtime.

En la composición actual no quedan adaptadores inbound HTTP canónicos sin observar.

Las cifras de funciones no equivalen a eliminaciones. Los nombres genéricos pueden producir coincidencias imprecisas, y los imports dinámicos, tests, scripts o entrypoints externos pueden mantener consumidores válidos.

## Imports dinámicos

Se detectan actualmente:

- carga explícita de `uc_bib_solv.repositories.operational_repository` desde el adaptador de persistencia operacional;
- uso dinámico de `pathlib` dentro del servicio de modelado de procesos.

Estos casos deben permanecer incluidos en cualquier búsqueda de consumidores.

## Candidatos prioritarios para revisión posterior

La siguiente revisión debe centrarse en la duplicación de inbound adapters y en los repositorios BPM legacy que no muestran consumidores estáticos directos, especialmente:

- `app/persistence/pm_node_repo.py`;
- `app/persistence/pm_transition_repo.py`;
- `app/persistence/pm_version_repo.py`;
- las implementaciones paralelas de causalidad y análisis;
- la fachada operacional y su adaptador canónico no registrado.

No se eliminan en esta fase.

## Criterio de eliminación

Solo se podrá eliminar un módulo, función o endpoint después de comprobar:

1. ausencia de referencias en backend, frontend, tests, scripts y documentación;
2. ausencia de imports dinámicos o consumidores externos conocidos;
3. cobertura de contrato para la implementación canónica;
4. mapa Flask sin pérdida de rutas públicas;
5. actualización explícita de la allowlist de compatibilidad;
6. ejecución correcta de tests unitarios, integración y validadores arquitectónicos.

## Comandos de verificación

```bash
python3 scripts/audit_application_architecture.py --check --check-backend
python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m uc_bib_solv.architecture_validators --check-structure
python3 -m uc_bib_solv.architecture_validators --check-naming
python3 -m uc_bib_solv.architecture_validators --check-dependencies
```
## ARC-008 — estado vigente (2026-08-29)

The legacy HTTP aliases and compatibility inbound adapters described in older
sections are retired. Current runtime consumers use the canonical BPM and
RCA_TREE namespaces; no compatibility route registry remains.
