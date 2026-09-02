# Flujo de demostración ejecutado

Ejecución real contra Flask en `http://127.0.0.1:8051` y PostgreSQL local el 30-08-2026. El proceso objetivo es `TFM_DEMO_1788104782421_PROC`, con `process_id` `4cda3697-8024-41ce-aaeb-a0988eff073a`. No se eliminaron datos existentes.

| Fase | Pantalla/ruta | Resultado | Entidades / IDs |
|---:|---|---|---|
| 1 | `#/modelado-procesos` | Proceso creado desde la UI. El proceso vacío exigía un nodo padre para crear operaciones desde la UI. | Proceso BPM `4cda3697-8024-41ce-aaeb-a0988eff073a`. |
| 2 | `#/modelado-procesos` | Las operaciones se crearon mediante API Playwright por la limitación anterior. | `OP-001` / `c5a14f21-db32-4bef-b7b1-0bf7c285e404`: “Preparar materia prima”; `OP-002` / `53142d7f-3e99-49da-a5fe-232fb8f39d7f`: “Procesar lote”; `OP-003` / `c597b72d-6c60-4d66-ad9e-2d66fd77124b`: descripción no demostrada en las fuentes conservadas. |
| 3 | `#/maquinas` | Máquina creada con descripción y contrato; las tres configuraciones máquina–operación devolvieron HTTP 409. | Máquina `TFM_DEMO_1788104782421 Máquina A`, ID `352`; tipo `5`; contrato `216`. Las asociaciones quedaron no persistidas. |
| 4 | `#/contratos` | Contrato BPM creado con KPI y objetivo. | `TFM_DEMO_1788104782421 Contrato RCA`, ID `216`, proceso operativo `281`, estado `review`. |
| 5 | `#/arboles` | Causa raíz e hipótesis creadas para usar el contrato como template RCA. | Causa raíz `TFM_DEMO_1788104782421 Causa raíz` (`362`/`363` según el intento); hipótesis `255`. |
| 6 | `#/analisis_causas` | Plantilla seleccionada, indicio/participante registrados y análisis cerrado. | Análisis `26`, contrato `216`, proceso `281`, estado `cerrado`. |

## Bloqueo

`POST /api/bpm/machines/352/configurations` devolvió `409 persistence_error` para los tres `operation_id`, también sin `contract_id`. No se insertaron configuraciones directamente ni se fabricó evidencia: `03-maquinas.png` muestra “Sin configuración de operación”. No debe presentarse ninguna asociación como completada.

## Capturas

Las seis capturas numeradas se tomaron con Playwright/Chromium en pantalla completa y se copiaron a `slides/capturas/`. No contienen credenciales ni tokens.

## Intentos conservados

Antes de estabilizar la interacción se creó también el proceso `TFM_DEMO_1788104703715 Proceso demostración`, BPM `10acf05c-3eb5-4e6a-a7d8-9679db35b254`, sin nodos. Se conserva porque la instrucción fue no borrar datos. La causa `362` se creó en un primer intento y la causa `363` en el segundo; ambas pertenecen al contrato `216`.
