# Traza de Requerimientos — UC_BIB_Solve

Este archivo mantiene un registro de los requerimientos identificados y procesados para evitar duplicados y facilitar la identificación de nuevos.

## Estados canónicos
- `identificado`: el requerimiento existe pero no se ha analizado.
- `en_analisis`: el requerimiento se está transformando en especificación.
- `pendiente_aclaraciones`: faltan respuestas del programador humano para cerrar el spec.
- `spec_pendiente_validacion`: el `spec.md` está redactado y espera validación humana.
- `spec_validada`: el programador humano validó el `spec.md`.
- `en_implementacion`: existe un `task_plan.md` aprobado y la implementación está en curso.
- `en_enmienda`: se ha capturado una aclaración o mini-requerimiento sobre el req en curso.
- `implementado_pendiente_validacion`: la implementación terminó pero falta validación final humana.
- `no_conforme`: la validación humana detectó desviaciones respecto al spec o al plan.
- `en_correccion`: el flujo está corrigiendo una no conformidad.
- `done`: el programador humano validó definitivamente la conformidad final.
- `bloqueado`: el flujo no puede avanzar por dependencia o decisión pendiente.
- `vencido`: requisito inicial cerrado por caducidad o reformulación; sus artefactos se conservan como historial y no se reactiva automáticamente.

## Requerimientos Procesados

- **requerimiento_01**: Iniciado 2026-04-21. Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar este flujo.
  Descripción: Webapp Dash + PostgreSQL local para construir y gestionar diagramas de análisis causa-efecto (árbol causal jerárquico tipo Ishikawa). Fase 1: definición de contratos, máquinas, árbol causal con hipótesis, persistencia PostgreSQL, visualización interactiva con dash-cytoscape.
  Origen: requerimiento bruto del cliente (brainstorming + HU-01 a HU-10).
  Enriquecido 2026-04-21. 8 ambigüedades resueltas. Gates 1-2 auto-validados 2026-04-21.
  59 ACs. 10 tareas (T1-T10) completadas 2026-04-21. Smoke test OK. App en http://localhost:8050.
  El flujo queda cerrado administrativamente; no ejecutar Gate 3.

- **requerimiento_02**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar este flujo.
- **requerimiento_03**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No crear ni continuar un flujo derivado.

- **requerimiento_04**: Iniciado 2026-05-30. Estado: `vencido` por caducidad y reformulación del requisito inicial. No implementar.
  Descripción: Reestructuración clean architecture del proyecto, renombrando el boundary de producto a `uc_bib_solv/`, moviendo todo el frontend actual de Dash a `webapp_dash/` y creando `webapp_java/` para la migración completa del frontend a HTML/CSS/JavaScript + backend Flask interno de Dataiku.
  Origen: `requerimientos_cliente/requerimiento_04/requerimiento_04.md` + `requerimientos_cliente/requerimiento_04/instrucciones_migracion.md`.
  Alcance confirmado: migración completa del frontend y conservación temporal del Dash como fallback hasta validación.

- **requerimiento_05**: Iniciado 2026-05-31. Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar correcciones.
  Descripción: Base de conocimiento causal corporativa en DAG PostgreSQL, con proyección visual en árbol desde un nodo raíz y soporte de reutilización entre contratos, causas e hipótesis.
  Origen: `requerimientos_cliente/requerimiento_05.md`.
  NC-001 registrada el 2026-05-31 tras validación humana: la implementación actual persiste `CONTRACT -> CONTRACT` con `DEPENDS_ON`, pero el core no recupera/proyecta automáticamente las causas descendentes atravesando `CONTRACT -> CONTRACT -> CAUSE`.
  Causa raíz clasificada: `implementation`. Re-entrada requerida: `execute-agent`. Estado transicionado a `no_conforme` y actualmente `en_correccion`.

- **requerimiento_08**: Iniciado 2026-07-18. Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar validación.
  Descripción: consolidación de la solución en webapp Java, retirada de Dash, CRUD seleccionable, modelo de máquinas, análisis causal trazable y fixture de verificación.
  Especificación y plan producidos en modo degradado por fallo de los agentes obligatorios. Fixture PostgreSQL ejecutado con 9 causas, 9 hipótesis y 18 resultados.
  El flujo queda cerrado administrativamente; la evidencia histórica se conserva sin continuar correcciones.

- **requerimiento_11**: Iniciado 2026-07-20. Estado: `vencido` por caducidad y reformulación del requisito inicial. No analizar ni implementar.
  Descripción: establecer una taxonomía multinivel (`nivel_0` a `nivel_n`) que distinga proceso, etapa, subproceso, operación y detalle operativo, con descomposición progresiva, paralelismo y trazabilidad.
  Origen: `tests/test_descripcion_procesos.md`, implementación y observaciones de validación del requerimiento 10.

- **requerimiento_10**: Iniciado 2026-07-20. Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar correcciones.
  Descripción: vertical slice de modelado de procesos en webapp JavaScript, incluyendo AMD-003 de selección sin catálogo lateral, scroll global y fullscreen/fallback.
  NC-001 registrada el 2026-07-20 tras validación humana: flujo ausente en renderización inicial, subformularios fuera del layout principal full-width y expansión/contracción que abandona fullscreen. NC-002 registrada el 2026-07-27 tras evidencia Playwright: `STOCK_MEZCLAS` quedó inicialmente 7 px desplazado respecto a `FAB_MEZCLA`, incumpliendo AC-25 `<1 px`; su corrección técnica obtiene 0 px en el run `2026-07-27T10-10-44`, pero sigue pendiente de validación humana. NC-003 registrada el 2026-07-27: el subárbol expandido de `OP2` intercepta el clic de expansión de `OP3`, desprende el botón del DOM y vence el timeout. NC-004 y NC-005 permanecen registradas en sus artefactos de no conformidad. NC-006, registrada el 2026-08-30 por el programador humano, detecta que el nodo de decisión y las ramas Sí/No se renderizan en serie/vertical en vez de dos ramas visualmente paralelas y claramente separadas.
  Estado administrativo: `vencido`; el flujo de trabajo se encuentra en `en_correccion`. NC-001 a NC-006 tienen causa raíz `implementation` y reentrada `execute-agent`; NC-006 queda pendiente de corrección y validación humana Gate 3.
  Elaborado en modo degradado autorizado por indisponibilidad del `requirements-agent`; pendiente validación humana y elaboración posterior de `spec.md`.

- **requerimiento_12**: Iniciado 2026-07-30. Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar validación ni correcciones.
  Descripción: sistema generalista de contexto estructurado para más de 1000 procesos, preservando BPM, causalidad, plantillas, metodología y consignas existentes; MACBU/BU se utiliza únicamente como fixture de cobertura y gap discovery.
  AMD-001 y AMD-002 integradas. El `spec.md` fue validado explícitamente por el programador humano el 2026-08-01 y `task_plan.md` fue aprobado para ejecución. Implementación completada por `execute-agent`; pendiente Gate 3.
  NC-001, NC-002, NC-003 y NC-004 quedan `resolved` por confirmación explícita del programador humano el 2026-08-02; NC-005 se mantiene `resolved` con cierre humano del 2026-08-01. NC-006 permanece `open` con causa raíz `implementation`; AMD-02-003 fue ejecutada por `execute-agent` con evidencia técnica, y queda pendiente la validación humana de Gate 3. Debe mantenerse el modelo generalista y no se permiten tablas, entidades, rutas o repositorios BU/MACBU. El requerimiento queda en `implementado_pendiente_validacion`; no se marca `done` ni se cierra NC-006 automáticamente.

- **requerimiento_15**: Iniciado 2026-08-17. Estado: `done` tras aprobación humana de Gate 3 el 2026-08-20 y cierre documental en modo degradado autorizado.
  NC-001, causa raíz `implementation` y reentrada `execute-agent`, queda `resolved` tras auditoría independiente T1 `AUDIT_PASS` y confirmación explícita del programador humano el 2026-08-17. Los cuatro artefactos T1 cumplen la corrección: 23 tablas, CSV válido de 8 campos y atribución temporal reproducible delimitada al perímetro T1. La corrección no modificó código funcional ni esquema. El cierre final queda respaldado por T1–T10 y la aprobación de Gate 3.
  NC-002 queda `resolved`: la auditoría independiente T2 obtuvo `AUDIT_PASS` el 2026-08-19 y el programador humano confirmó explicitamente `continuar con T3` el 2026-08-19, cerrando la NC y aprobando Gate 2. T3–T9 quedan completadas; Gate 3 fue aprobado por el programador humano el 2026-08-20 y la documentación/contexto se cerraron en modo degradado autorizado.

- **requerimiento_06**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar este flujo.
- **requerimiento_07**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar este flujo.
- **requerimiento_09**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No crear ni continuar un flujo derivado.
- **requerimiento_13**: Estado: `vencido` por caducidad y reformulación del requisito inicial. No continuar este flujo.

- **requerimiento_14**: Estado: `descartado`. No implementar. Su alcance queda sustituido por el requerimiento 15, vigente para la arquitectura domain-first hexagonal.

- **requerimiento_16**: Estado: `implementado_pendiente_validacion` tras la corrección E2E del 2026-08-20. Se corrigieron selectores de sidebar, navegación de vistas standalone y la interacción guiada/fallback de `nominal_capacity`; la suite E2E-16-01…E2E-16-12 conserva su cobertura. La validación Playwright permanece bloqueada porque Chromium no puede iniciar (`sandbox_host_linux.cc:41`, `Operation not permitted`), con evidencia en `requeriments_spec_driven_development/requerimiento_16/documentacion.md`; no se declara pasada. Provenance degradada preservada por la contingencia de runtime.

## Reinicio administrativo

El 2026-08-20, los requisitos iniciales pendientes se cierran como `vencido` por caducidad y reformulación. Sus especificaciones, planes y evidencias se conservan únicamente como historial. El trabajo futuro comienza desde el estado actual del proyecto mediante nuevos requisitos reformulados; no se reactivan automáticamente estos flujos.

## Instrucciones para el Orchestrator
- Al escanear ./requerimientos_cliente, compara los archivos encontrados con esta lista.
- Si un archivo no está listado, considéralo nuevo y agrégalo aquí tras procesarlo.
- Actualiza el estado solo usando los estados canónicos definidos en este archivo.
- No marques un requerimiento como `done` hasta validación final explícita del programador humano.
