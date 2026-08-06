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

## Requerimientos Procesados

- **requerimiento_01**: Iniciado 2026-04-21. Estado: `implementado_pendiente_validacion`.
  Descripción: Webapp Dash + PostgreSQL local para construir y gestionar diagramas de análisis causa-efecto (árbol causal jerárquico tipo Ishikawa). Fase 1: definición de contratos, máquinas, árbol causal con hipótesis, persistencia PostgreSQL, visualización interactiva con dash-cytoscape.
  Origen: requerimiento bruto del cliente (brainstorming + HU-01 a HU-10).
  Enriquecido 2026-04-21. 8 ambigüedades resueltas. Gates 1-2 auto-validados 2026-04-21.
  59 ACs. 10 tareas (T1-T10) completadas 2026-04-21. Smoke test OK. App en http://localhost:8050.
  Pendiente validación final humana (Gate 3).

- **requerimiento_04**: Iniciado 2026-05-30. Estado: `spec_validada`.
  Descripción: Reestructuración clean architecture del proyecto, renombrando el boundary de producto a `uc_bib_solv/`, moviendo todo el frontend actual de Dash a `webapp_dash/` y creando `webapp_java/` para la migración completa del frontend a HTML/CSS/JavaScript + backend Flask interno de Dataiku.
  Origen: `requerimientos_cliente/requerimiento_04/requerimiento_04.md` + `requerimientos_cliente/requerimiento_04/instrucciones_migracion.md`.
  Alcance confirmado: migración completa del frontend y conservación temporal del Dash como fallback hasta validación.

- **requerimiento_05**: Iniciado 2026-05-31. Estado: `en_correccion`.
  Descripción: Base de conocimiento causal corporativa en DAG PostgreSQL, con proyección visual en árbol desde un nodo raíz y soporte de reutilización entre contratos, causas e hipótesis.
  Origen: `requerimientos_cliente/requerimiento_05.md`.
  NC-001 registrada el 2026-05-31 tras validación humana: la implementación actual persiste `CONTRACT -> CONTRACT` con `DEPENDS_ON`, pero el core no recupera/proyecta automáticamente las causas descendentes atravesando `CONTRACT -> CONTRACT -> CAUSE`.
  Causa raíz clasificada: `implementation`. Re-entrada requerida: `execute-agent`. Estado transicionado a `no_conforme` y actualmente `en_correccion`.

- **requerimiento_08**: Iniciado 2026-07-18. Estado: `implementado_pendiente_validacion`.
  Descripción: consolidación de la solución en webapp Java, retirada de Dash, CRUD seleccionable, modelo de máquinas, análisis causal trazable y fixture de verificación.
  Especificación y plan producidos en modo degradado por fallo de los agentes obligatorios. Fixture PostgreSQL ejecutado con 9 causas, 9 hipótesis y 18 resultados.
  Pendiente validación final humana; la suite unitaria mantiene un fallo de compatibilidad en opciones de edición de causa.

- **requerimiento_11**: Iniciado 2026-07-20. Estado: `identificado`.
  Descripción: establecer una taxonomía multinivel (`nivel_0` a `nivel_n`) que distinga proceso, etapa, subproceso, operación y detalle operativo, con descomposición progresiva, paralelismo y trazabilidad.
  Origen: `tests/test_descripcion_procesos.md`, implementación y observaciones de validación del requerimiento 10.

- **requerimiento_10**: Iniciado 2026-07-20. Estado: `en_correccion`.
  Descripción: vertical slice de modelado de procesos en webapp JavaScript, incluyendo AMD-003 de selección sin catálogo lateral, scroll global y fullscreen/fallback.
  NC-001 registrada el 2026-07-20 tras validación humana: flujo ausente en renderización inicial, subformularios fuera del layout principal full-width y expansión/contracción que abandona fullscreen. NC-002 registrada el 2026-07-27 tras evidencia Playwright: `STOCK_MEZCLAS` quedó inicialmente 7 px desplazado respecto a `FAB_MEZCLA`, incumpliendo AC-25 `<1 px`; su corrección técnica obtiene 0 px en el run `2026-07-27T10-10-44`, pero sigue pendiente de validación humana. NC-003 registrada el 2026-07-27: el subárbol expandido de `OP2` intercepta el clic de expansión de `OP3`, desprende el botón del DOM y vence el timeout.
  Estado transitado por `no_conforme` y se encuentra en `en_correccion`. NC-001, NC-002, NC-003 y NC-004 tienen causa raíz `implementation` y reentrada `execute-agent`; las correcciones técnicas pasan la validación Playwright focalizada, pero ninguna NC está cerrada hasta Gate 3 humano.
  Elaborado en modo degradado autorizado por indisponibilidad del `requirements-agent`; pendiente validación humana y elaboración posterior de `spec.md`.

- **requerimiento_12**: Iniciado 2026-07-30. Estado: `implementado_pendiente_validacion`.
  Descripción: sistema generalista de contexto estructurado para más de 1000 procesos, preservando BPM, causalidad, plantillas, metodología y consignas existentes; MACBU/BU se utiliza únicamente como fixture de cobertura y gap discovery.
  AMD-001 y AMD-002 integradas. El `spec.md` fue validado explícitamente por el programador humano el 2026-08-01 y `task_plan.md` fue aprobado para ejecución. Implementación completada por `execute-agent`; pendiente Gate 3.
  NC-001, NC-002, NC-003 y NC-004 quedan `resolved` por confirmación explícita del programador humano el 2026-08-02; NC-005 se mantiene `resolved` con cierre humano del 2026-08-01. NC-006 permanece `open` con causa raíz `implementation`; AMD-02-003 fue ejecutada por `execute-agent` con evidencia técnica, y queda pendiente la validación humana de Gate 3. Debe mantenerse el modelo generalista y no se permiten tablas, entidades, rutas o repositorios BU/MACBU. El requerimiento queda en `implementado_pendiente_validacion`; no se marca `done` ni se cierra NC-006 automáticamente.

## Instrucciones para el Orchestrator
- Al escanear ./requerimientos_cliente, compara los archivos encontrados con esta lista.
- Si un archivo no está listado, considéralo nuevo y agrégalo aquí tras procesarlo.
- Actualiza el estado solo usando los estados canónicos definidos en este archivo.
- No marques un requerimiento como `done` hasta validación final explícita del programador humano.
