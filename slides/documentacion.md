# Documentacion

## Objetivo

Mantener una base verificable para preparar la presentación del TFM de UC_BIB_Solve: guion, capturas reutilizables, inventario, fuentes y límites de evidencia.

## Audiencia

- Mantenedores y responsables de la defensa del TFM.
- Revisores humanos que necesiten rastrear cada afirmación a código o documentación.
- Diseñadores de las diapositivas finales.

## Alcance

- Incluye únicamente material de presentación bajo `slides/`.
- Excluye cambios en la aplicación, artefactos de tests, vídeos, trazas, credenciales y datos persistentes.
- Se relaciona con el frontend `uc_bib_solv/webapp/`, el backend Flask, el esquema PostgreSQL y las evidencias SDD citadas en `fuentes.md`.

## Estado actual

- Responsabilidad principal: organizar evidencia visual y narrativa para una presentación posterior.
- Punto de entrada: `README.md`.
- Capacidades actuales: seis capturas nuevas del flujo demo, cuatro capturas históricas BPM, guion ampliado y trazabilidad de fuentes.
- Demo documentada: proceso `TFM_DEMO_1788104782421_PROC`, `process_id` `4cda3697-8024-41ce-aaeb-a0988eff073a`; operaciones `OP-001`/`OP-002`/`OP-003` con sus IDs UUID; contrato `216`; máquina `352`; análisis RCA `26` cerrado.
- Limitación conocida: el proceso se creó desde UI, pero la UI de proceso vacío exige nodo padre y las operaciones se crearon mediante API Playwright. La API de configuración máquina–operación devuelve HTTP 409; la máquina `352` queda sin asociaciones persistidas a los tres nodos demo.

## Estructura

| Ruta | Tipo | Responsabilidad | Cuándo modificar |
|---|---|---|---|
| `README.md` | índice | Explica el contenido y su estado. | Al añadir o retirar material. |
| `flujo_demo.md` | trazabilidad | Registra fases, IDs, rutas, resultados y pendientes. | Cada ejecución real del flujo. |
| `guion_presentacion.md` | documento | Ordena el relato, mensajes y fuentes. | Al cerrar el enfoque de la defensa. |
| `inventario_capturas.md` | documento | Registra procedencia, demostración y reproducción de cada imagen. | Cada vez que cambie una captura. |
| `fuentes.md` | documento | Separa hechos verificados de pendientes. | Al confirmar o refutar una afirmación. |
| `capturas/` | directorio | Contiene solo PNG/JPG/WebP de UI real. | Solo con evidencia visual autorizada. |

## Funcionalidad principal

| Funcionalidad | Dónde vive | Cómo se usa | Dependencias |
|---|---|---|---|
| Consulta del material | `README.md` | Seguir el índice hacia guion, inventario y fuentes. | Markdown. |
| Selección de evidencia | `inventario_capturas.md` | Elegir la imagen cuyo estado se quiera mostrar. | Capturas procedentes de evidencia de UI. |
| Preparación narrativa | `guion_presentacion.md` | Convertir cada fila en una diapositiva y verificar sus fuentes. | Código y documentación del repositorio. |

## Flujos de uso u operación

1. Abrir `README.md` y revisar el estado de las capturas.
2. Seleccionar una diapositiva y consultar las fuentes indicadas.
3. Usar la imagen asociada desde `capturas/`, manteniendo su nombre descriptivo.
4. Resolver el `409` y repetir solo las asociaciones máquina–operación antes de declarar el flujo completo; la documentación actual no las presenta como completadas.

## Configuración y operación

| Recurso / variable | Obligatorio | Uso | Valor esperado / fuente |
|---|---|---|---|
| Aplicación local Flask | Para nuevas capturas | Servir la SPA en `127.0.0.1:8050`. | `README.md` y `scripts/run_webapp_java_local.sh`. |
| PostgreSQL | Para flujos con datos | Proveer el catálogo y grafos persistidos. | Configuración descrita en `README.md`. |
| Chromium/Playwright | Para nuevas capturas automatizadas | Ejecutar los flujos E2E y guardar imágenes en una ubicación controlada. | `package.json`, `tests/e2e/` y skill de UI. |

## Decisiones vigentes

| ID | Decisión | Racional | Alternativas consideradas | Consecuencias | Archivos afectados | Estado |
|---|---|---|---|---|---|---|
| DEC-001 | Conservar capturas reales nuevas y distinguirlas de las históricas. | La sesión local permitió validar el flujo y tomar evidencia sin fabricar imágenes. | Generar mockups o presentar imágenes históricas como nuevas. | El material cubre seis fases y mantiene trazabilidad temporal. | `capturas/`, `inventario_capturas.md`, `flujo_demo.md` | Vigente |
| DEC-002 | No incluir `requerimientos_cliente/BPM.png` como captura de producto. | Es una referencia de diagrama, no una pantalla de la SPA. | Presentarla como evidencia de UI. | Se conserva la distinción entre diseño de referencia y producto ejecutable. | `fuentes.md`, `README.md` | Vigente |
| DEC-003 | No modificar código; conservar los datos `TFM_DEMO_*` creados por el flujo. | El usuario autorizó crear datos demo y pidió no borrar ni usar reset. | Borrado posterior o `reset_db.py`. | La máquina y el contrato quedan disponibles para reproducir el bloqueo. | `slides/` y base local | Vigente |
| DEC-004 | No presentar asociaciones máquina–operación como persistidas. | Las tres peticiones devolvieron `409 persistence_error`. | Inferir éxito desde la existencia de la máquina o del contrato. | La captura 03 conserva el estado “Sin configuración de operación”. | `flujo_demo.md`, `inventario_capturas.md`, `README.md` | Vigente |

## Validación y troubleshooting

| Comprobación | Comando / método | Resultado esperado | Si falla |
|---|---|---|---|
| Archivos del material | `find slides -maxdepth 2 -type f` | Índice, documentos y capturas presentes. | Actualizar `README.md` e inventario. |
| Tipos de imagen | `file slides/capturas/*` | Solo PNG/JPG/WebP. | Retirar el formato no permitido. |
| Servidor temporal | `pgrep -af 'local_server.py|flask'` | No hay servidor de esta tarea. | Detener únicamente un proceso creado por esta tarea, si existiera. |

## Riesgos y limitaciones

- Las imágenes `modelado_bpm_*` son evidencia histórica; las numeradas `01`–`06` fueron tomadas en esta sesión.
- La evidencia SDD consultada deja la validación humana final pendiente.
- La configuración máquina–operación no pudo completarse por HTTP 409 y requiere corrección/reintento.

## Relación con artefactos SDD

- Specs relevantes: `requeriments_spec_driven_development/requerimiento_10/` y `requeriments_spec_driven_development/requerimiento_12/spec.md`.
- Task plans relevantes: `requeriments_spec_driven_development/requerimiento_10/task_plan.md`.
- Contexto para agentes: no se ha escrito ni modificado `context.md`.
- No conformidades relevantes: consultar el `nc-log.md` del requerimiento 10; no se copia al directorio de slides.
