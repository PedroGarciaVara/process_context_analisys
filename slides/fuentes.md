# Fuentes y trazabilidad

## Fuentes leídas

| Fuente | Uso en este material |
|---|---|
| `README.md` | Propósito, tecnologías, arranque, funcionalidades, arquitectura, persistencia y limitaciones conocidas. |
| `uc_bib_solv/local_server.py` | Punto de entrada Flask y servicio de la SPA. |
| `uc_bib_solv/webapp/index.html` | Entrada HTML, estilos, tipografías y carga del frontend. |
| `uc_bib_solv/webapp/js/core/router.js` y `views/index.js` | Rutas reales de la SPA y nombres de las vistas disponibles. |
| `uc_bib_solv/webapp/js/views/nodes/process-modeling.js` | Interfaz real del modelado: selector, paleta, nodos, transiciones, metadatos y validación. |
| `uc_bib_solv/webapp/js/components/process-modeling/graph.js` y controladores de `process-modeling/` | Representación gráfica, expansión, viewport y acciones del editor. |
| `uc_bib_solv/webapp/js/views/inicio/inicio.js`, vistas BPM, RCA, máquinas y contexto | Comprobación de que esas pantallas existen, sin presentarlas como capturadas. |
| `db_management/schema.sql` | Tablas y relaciones persistentes del modelo causal, operativo y BPM. |
| `tests/e2e/process-modeling.spec.js` | Rutas/interacciones E2E y selectores del flujo de modelado. |
| `requeriments_spec_driven_development/requerimiento_10/task_plan.md` | Procedencia de las capturas, cobertura de la evidencia y estado de validación documentado. |
| `requeriments_spec_driven_development/requerimiento_12/spec.md` | Alcance de contexto estructurado y orientación generalista. |
| `proyecto_master.md` y `entorno.md` | Contexto del proyecto y configuración/operación documentadas. |
| `slides/flujo_demo.md` | Registro de la ejecución local, IDs y bloqueo de configuraciones. |

## Hechos verificados

- La entrada actual es una SPA HTML/CSS/JavaScript servida por Flask; el README indica que Dash está retirado del arranque actual.
- El router declara las vistas `inicio`, `procesos`, `contratos`, `maquinas`, `arboles`, `analisis_causas`, `modelado-procesos` y `contexto`, además de detalles BPM/RCA.
- El modelado BPM muestra los tipos de nodo `input`, `output`, `operation`, `subprocess`, `decision` y `stock` en el código de la vista.
- El esquema PostgreSQL contiene `bpm_process`, `pm_process_node` y `pm_process_transition`, además de tablas causales y operativas.
- Las cuatro imágenes incluidas son capturas PNG existentes en la evidencia de `requerimiento_10`; sus contenidos corresponden visualmente al frontend de modelado BPM.
- La evidencia del plan documenta ejecución Playwright y capturas del modelado; también indica que la validación humana final/Gate 3 seguía pendiente.
- En esta ejecución Flask respondió en `127.0.0.1:8051`, PostgreSQL aceptó conexiones y Playwright tomó seis capturas nuevas.
- Se verificaron las entidades demo: proceso BPM, nodos de operación, contrato, máquina, causas, hipótesis y análisis RCA.
- La creación de configuraciones máquina–operación devolvió HTTP 409 `persistence_error`; la máquina quedó creada sin esas configuraciones.

## Información pendiente o que debe confirmarse

- Reintento de las tres configuraciones máquina–operación cuando se resuelva el `409 persistence_error`.
- Validación humana final de la implementación antes de presentar el requisito como cerrado.
- Estado real de PostgreSQL y datos de demostración en el entorno final de defensa.
- Integración conceptual completa entre el modelo causal y el modelado de procesos, que el README identifica como pendiente.
- El origen histórico exacto de cada PNG `modelado_bpm_*` sigue siendo la evidencia de `requerimiento_10`; las imágenes numeradas `01`–`06` sí corresponden a esta sesión.
