# T2 — Evidencia de validadores arquitectónicos deterministas

Fecha: 2026-08-19  
Requerimiento: `requerimiento_15`  
Estado de tarea: `blocked` (NC-002 en corrección; cierre pendiente de validación independiente)  
Alcance: únicamente T2. No se modificaron schema, frontend ni código runtime existente.

## Artefactos producidos

- `uc_bib_solv/architecture_validators/__init__.py`
- `uc_bib_solv/architecture_validators/__main__.py`
- `uc_bib_solv/architecture_validators/allowlist.py`
- `uc_bib_solv/architecture_validators/runner.py`
- `tests/architecture/test_architecture_validators.py`
- Fixtures positivos/negativos bajo `tests/architecture/fixtures/`.

El entry point soporta `--check-structure`, `--check-naming`, `--check-dependencies`,
`--check-concrete-implementations` y el modo combinado sin flags. La salida se ordena
por archivo, línea, regla, origen y destino; cada diagnóstico renderiza explícitamente
`archivo:línea`, incluso cuando la línea es `0`, seguido de regla, origen, destino y
mensaje. Los diagnósticos sintéticos de estructura y naming de path usan línea `1` de
forma determinista; los diagnósticos de duplicidad usan la línea determinista de la
declaración de cada implementación.

## Guardas implementadas

- Estructura obligatoria: `domain`, `application/ports`, `adapters/inbound`,
  `adapters/outbound` e `infrastructure`.
- Naming AST para módulos, funciones, clases y constantes.
- Clasificación de imports por módulo, dominio y capa.
- Aislamiento de `domain` frente a frameworks, persistencia, red, filesystem,
  SQL y capas externas.
- Prohibición de imports inbound→outbound, application→concretos y
  cross-domain salvo puertos públicos.
- Detección de instanciación/importación de concretos en domain/application y
  duplicidad de implementaciones outbound.
- Allowlists explícitas con propietario, motivo, fase y criterio de retirada en
  `allowlist.py`, aplicadas durante la emisión de diagnósticos y limitadas a
  superficies legacy fuera de `modules/`; ninguna ruta bajo `uc_bib_solv/modules/`
  puede quedar exceptuada.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `python -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python -m uc_bib_solv.architecture_validators --check-naming` | PASS, exit 0 |
| `python -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python -m uc_bib_solv.architecture_validators` | PASS, exit 0 |
| `python -m compileall -q uc_bib_solv/architecture_validators tests/architecture` | PASS, exit 0 |
| Ejecución directa de las 9 funciones de `tests/architecture/test_architecture_validators.py` | PASS, 9/9 |
| CLI sobre fixtures positivos/negativos, incluidos diagnósticos de línea y allowlist legacy | PASS; positivo exit 0, negativos exit 1 |

Los fixtures negativos verifican exit `1` y diagnósticos deterministas para estructura,
naming, `psycopg2` en domain, imports internos cross-domain, concretos, duplicidad y
modo combinado. La comparación de dos ejecuciones sobre el fixture positivo fue igual.

## Limitación ambiental y bloqueo

`pytest -q tests/architecture` no pudo ejecutarse porque `pytest` no está instalado en
el entorno (`/bin/bash: pytest: command not found`, exit 127). No es un fallo funcional
observado del código; la suite fue validada mediante compilación, ejecución directa de
sus nueve pruebas y subprocesos CLI. Se requiere instalar pytest y repetir el comando
estándar antes de avanzar al siguiente gate. Por esta limitación y porque NC-002 aún
requiere validación independiente, T2 no se marca como completada.

## Perímetro y no-regresión

- `db_management/schema.sql` conserva SHA-256 `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866`.
- No se hicieron commits.
- Los cambios preexistentes del worktree se preservaron y no se atribuyen a T2.

## Corrección NC-002 — intento 1 de 2

La verificación de reanudación confirma que la corrección ya estaba presente en
los artefactos de T2, por lo que no se realizaron cambios funcionales:

- `check_structure` y el diagnóstico de naming de path emiten línea explícita
  determinista (`:1`).
- `check_duplicate_implementations` emite la línea AST de cada declaración de
  implementación; el fixture actual produce `:1` para ambas clases duplicadas.
- `_allowlisted` se invoca efectivamente en los flujos de naming,
  dependencias, implementaciones concretas, aislamiento SQL y duplicidades.
- La allowlist sigue limitada a superficies legacy y no permite excepciones bajo
  `uc_bib_solv/modules/`.

### Verificación de reanudación

| Comando | Resultado |
|---|---|
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators` | PASS, exit 0 |
| Fixtures negativos de estructura, naming y duplicidad | PASS: diagnósticos con línea explícita, exit 1 |
| Comprobación directa de allowlist y fixture positivo | PASS |
| `python3 -m compileall -q uc_bib_solv/architecture_validators tests/architecture` | PASS, exit 0 |

No se ejecutó `pytest` porque el entorno no dispone del comando (`pytest:
command not found`); permanece como limitación ambiental documentada. T2 no se
marca completada y queda pendiente de auditoría independiente de cierre de
NC-002.

## Corrección NC-002 — verificación focalizada 2026-08-19

Se mantuvo el alcance exclusivamente en T2/NC-002. El validador ahora usa
fallback `1` para cualquier línea sintética o AST ausente, evitando diagnósticos
emitidos con línea `0`; las líneas de duplicidad siguen siendo las líneas AST de
las clases duplicadas. La prueba de naming incluye una función inválida dentro
de `routes/LegacyRoute.py` y confirma que la entrada legacy queda suprimida por
`_allowlisted`, mientras que una ruta bajo `uc_bib_solv/modules/` no queda
allowlisted.

| Comprobación | Resultado exacto |
|---|---|
| `python3 -m uc_bib_solv.architecture_validators --check-structure` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-naming` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-dependencies` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators --check-concrete-implementations` | PASS, exit 0 |
| `python3 -m uc_bib_solv.architecture_validators` | PASS, exit 0 |
| Fixtures negativos `invalid_structure`, `invalid_naming`, `invalid_dependencies`, `invalid_cross_domain`, `invalid_concrete`, `invalid_combined` | PASS, cada uno exit 1 |
| Invocación directa de las 11 funciones `test_*` de `tests/architecture/test_architecture_validators.py` | PASS, 11/11 |
| Comprobación de estabilidad y líneas positivas en los seis fixtures negativos | PASS; cada lista ya ordenada, todos los diagnósticos con línea > 0 |
| Allowlist directa (`routes/LegacyRoute.py` true; `modules/...` false) | PASS |
| `python3 -m compileall -q uc_bib_solv/architecture_validators tests/architecture` | PASS, exit 0 |
| `python3 -m pytest -q tests/architecture` | BLOQUEADO ambientalmente, exit 1: `/usr/bin/python3: No module named pytest` |

La corrección de implementación queda preparada para auditoría independiente,
pero `NC-002` permanece `in_correction` y T2 permanece `blocked` hasta que esa
auditoría confirme el cierre. No se modificaron schema, código runtime fuera del
validador/fixtures/tests ni gates posteriores; no se hizo commit ni push.
