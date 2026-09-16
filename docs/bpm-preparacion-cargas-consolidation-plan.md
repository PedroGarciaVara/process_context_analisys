# Ejecución consolidada — Preparación de cargas reforzantes en BPM Studio

## Propósito y alcance

Este documento registra el estado ejecutado y los pasos pendientes para consolidar el proceso de preparación y dosificación de cargas en el BPM canónico de la aplicación.

Es documentación operativa de ejecución, no un artefacto SDD: no sustituye a una especificación, no es un `task_plan.md` y no abre un flujo de versionado.

Fecha de contraste técnico y de datos: 9 de septiembre de 2026.

Fuentes contrastadas:

- API final validada en `http://127.0.0.1:8052/api/bpm/processes`; la instancia histórica de 8050 se conserva sólo como referencia del reinicio pendiente.
- Lecturas directas, sin escritura, de PostgreSQL.
- `requerimientos_cliente/descripciones del proceso/test_dosificacion_cargas`.
- Código del BPM Studio, repositorios PostgreSQL, esquema y pruebas del worktree actual.
- Backup lógico previo a la consolidación en `artifacts/db-migrations/proceso_ml_fabricacion_before_consolidation.json`.

## Decisiones explícitas y límites

| Decisión | Estado | Aplicación práctica |
|---|---|---|
| Trabajar sobre un único proceso canónico | Aceptada | `PROC_MEZCLAS_CAUCHO_CARGAS` es el único propietario del subproceso de cargas. |
| Eliminar el proceso duplicado | Ejecutada | `PROCESO_ML_FABRICACION` ya no existe en `bpm_process` y su API devuelve `404 not_found`. |
| Sin versionado del proceso ni del layout | Aceptada | Las ediciones actualizan el estado vigente. No se crean snapshots, revisiones BPM ni historial de coordenadas. |
| Crear una nueva función de enlace máquina–operación desde esta iniciativa | Descartada | No se añade otro flujo de asociación. Se utiliza la relación canónica ya existente `machine_operation_configuration` y el vínculo contractual existente. |
| Añadir acciones de “copiar” o “reutilizar” como parte de la consolidación | Descartada | La migración es única, controlada e idempotente; no se convierte en una función de usuario para duplicar entidades de negocio. |
| Mantener JSON/JSONB como persistencia | Aceptada | La UI ofrece formularios guiados, pero no sustituye ni aplana los documentos persistidos. |
| Separar semántica y presentación | Aceptada | Nodos/transiciones son el grafo de negocio; coordenadas son una proyección visual independiente en PostgreSQL. |

“Sin versionado” se refiere al proceso BPM y al layout. El campo legado `contrato.version` y marcadores como `schema_version` describen compatibilidad de datos; no representan un historial de revisiones del diagrama.

La acción genérica de duplicado que pueda existir en el Studio no forma parte de esta consolidación. No debe utilizarse para volver a crear `PROCESO_ML_FABRICACION` ni para clonar `CARGAS_DOSIF`.

## Identidad canónica actual

### Proceso padre

- Nombre: `Fabricación de mezclas de caucho para neumáticos`.
- Código: `PROCESO_MEZCLAS_CAUCHO_NEUMATICOS`.
- `process_id`: `06757b45-a08d-4493-8012-db03325399c8`.
- Estado: `draft`.

### Subproceso canónico de origen

- Nombre: `Preparación de cargas reforzantes`.
- Código: `PROC_MEZCLAS_CAUCHO_CARGAS`.
- `process_id`: `f247eee0-cfa1-4ea5-b4e6-fa4598a061b5`.
- `parent_process_id`: `06757b45-a08d-4493-8012-db03325399c8`.
- Estado: `draft`.

### Subproceso canónico siguiente

- Nombre: `Fabricación de mezclas`.
- Código: `PROC_MEZCLAS_CAUCHO_FABRICACION`.
- `process_id`: `d9034ddb-6ede-49e6-9ad6-e2904a894a14`.
- `parent_process_id`: `06757b45-a08d-4493-8012-db03325399c8`.
- Entrada interna relevante: nodo `MIX_IN`, “Productos dosificados”.

### Proceso duplicado retirado

- Código y nombre: `PROCESO_ML_FABRICACION`.
- Antiguo `process_id`: `d320e817-5601-5fe4-937a-cefda5b5dd48`.
- Estado actual: ausente en PostgreSQL y no recuperable mediante la API ordinaria.
- Recuperación excepcional: posible a partir del backup lógico citado, no desde una función de versionado.

## Relación exacta entre preparación de cargas y fabricación de mezclas

La unión vigente está modelada en el grafo del proceso padre, no como una transición que atraviese dos grafos hijos.

```text
Proceso padre PROCESO_MEZCLAS_CAUCHO_NEUMATICOS

PREP_CARGAS (subprocess) ──[sequence: “Salida de subproceso”]──> FAB_MEZCLA (subprocess)
       │                                                                  │
       └─ child_process_id: PROC_MEZCLAS_CAUCHO_CARGAS                    └─ child_process_id: PROC_MEZCLAS_CAUCHO_FABRICACION
```

Datos exactos del grafo padre:

- Nodo origen `PREP_CARGAS`: `0333973e-4030-4973-aabd-87f545ece4c6`.
- Su `child_process_id`: `f247eee0-cfa1-4ea5-b4e6-fa4598a061b5`.
- Nodo destino `FAB_MEZCLA`: `db5a1e06-b759-4474-b699-da27808109f9`.
- Su `child_process_id`: `d9034ddb-6ede-49e6-9ad6-e2904a894a14`.
- Transición padre: `d14e1b82-9e94-4a9e-937a-f9e7c08a3260`.
- Tipo: `sequence`.
- Etiqueta: `Salida de subproceso`.

La transición significa: cuando finaliza la invocación de preparación de cargas en el proceso padre, el flujo padre continúa con la invocación de fabricación de mezclas.

No existe una relación formal `output-port → input-port` entre el nodo `OUT` del primer hijo y `MIX_IN` del segundo hijo.

Tampoco existe actualmente una entidad “puerto”, un contrato de interfaz entre puertos ni una transición cross-process. El contenido transferido se expresa mediante nombres, descripciones, metadatos y la secuencia del padre:

- salida interna de cargas: “Cargas dosificadas para MI”;
- entrada interna de fabricación: “Productos dosificados”;
- continuidad jerárquica: `PREP_CARGAS → FAB_MEZCLA` en el padre.

Por tanto, no se debe dibujar una arista directa entre UUID de nodos pertenecientes a procesos diferentes. Una interfaz tipada entre subprocesos sería una ampliación futura del modelo de dominio y queda fuera de esta ejecución.

## Grafo interno consolidado de preparación de cargas

La topología final del proceso canónico contiene **21 nodos y 20 transiciones**. Conserva los tres nodos canónicos previos (`IN`, `CARGAS_DOSIF` y `OUT`) y añade 18 nodos creados mediante la interfaz del Studio controlada con Playwright.

```text
IN → OP-001 → OP-002 → OP-003 → DECISION-001
                                  ├─ Sí → OP-004 → OP-005 → STOCK-001
                                  │        → OP-006 → OP-007 → OP-008 → OP-009
                                  │        → STOCK-002 → OP-010 → CARGAS_DOSIF
                                  │        → OP-011 → OP-012 → OP-013 → OUT
                                  └─ No → OP-014 → OUTPUT-001
```

Flujo funcional resumido:

1. El camión entra en recepción y se registra su lote en BSM y QMP.
2. Un operador toma una muestra; laboratorio la mide y registra el resultado en QMP.
3. `DECISION-001` separa explícitamente el resultado con ramas `Sí` y `No`.
4. Rama `No`: se bloquea la descarga, se gestiona la no conformidad y el camión queda retenido en `OUTPUT-001`.
5. Rama `Sí`: se autoriza la descarga y se transfiere el material por circuitos independientes de negro o sílice.
6. El producto queda en `STOCK-001`, los silos generales de 30 T.
7. Al nivel de pedido se emite la solicitud, se validan blocajes/proporción de NIF y se repone la cabecera.
8. El circuito se limpia en vacío durante dos minutos y el producto queda en `STOCK-002`, silo de cabecera exclusivo de línea de 3 T.
9. Se prepara la demanda del MI según receta y se ejecuta `CARGAS_DOSIF` con hasta tres NIP y dos básculas.
10. Se estabiliza, verifica y corrige el peso, se descarga a la tolva del MI y se confirma el cero final.
11. `OUT` representa la carga reforzante disponible para la siguiente fase de fabricación de mezclas.

Inventario final:

| Código | Tipo | Nombre |
|---|---|---|
| `IN` | `input` | Camión de cargas reforzantes en recepción |
| `OP-001` | `operation` | Registrar camión y lote en BSM y QMP |
| `OP-002` | `operation` | Tomar muestra manual del camión |
| `OP-003` | `operation` | Medir muestra y registrar resultado en QMP |
| `DECISION-001` | `decision` | ¿Resultado dentro de tolerancias? |
| `OP-004` | `operation` | Autorizar y ejecutar descarga en puesto |
| `OP-005` | `operation` | Transferir por circuito independiente |
| `STOCK-001` | `stock` | Silos generales de negro y sílice |
| `OP-006` | `operation` | Detectar nivel de pedido y emitir solicitud |
| `OP-007` | `operation` | Aplicar blocajes y proporción de NIF |
| `OP-008` | `operation` | Reponer silo de cabecera hasta nivel alto |
| `OP-009` | `operation` | Limpiar circuito en vacío durante 2 min |
| `STOCK-002` | `stock` | Silo de cabecera exclusivo de línea |
| `OP-010` | `operation` | Preparar demanda MI según receta |
| `CARGAS_DOSIF` | `operation` | Dosificación de cargas reforzantes |
| `OP-011` | `operation` | Estabilizar, verificar y corregir peso |
| `OP-012` | `operation` | Descargar producto a la tolva del MI |
| `OP-013` | `operation` | Verificar cero final de báscula |
| `OUT` | `output` | Carga reforzante disponible en tolva del MI |
| `OP-014` | `operation` | Bloquear descarga y gestionar no conformidad |
| `OUTPUT-001` | `output` | Camión retenido sin descarga |

Los UUID preservados son `IN = 7c68aef0-53e6-44e8-8d7d-97c0f250aa07`, `CARGAS_DOSIF = 9a8b4bed-6cf2-56a7-8457-b2d5ddf0bfff` y `OUT = 75191cec-35e5-451f-98f7-7ced3e08857a`.

### Bucles operativos encapsulados

El dominio canónico rechaza ciclos dirigidos con el error `graph_cycle`. Por ello, los retornos repetitivos descritos por el proceso industrial no se representan con una arista que vuelva a un nodo anterior.

Se modelan como comportamiento interno de una operación acotada:

- `OP-011` encapsula “esperar peso estable → verificar → corregir → volver a verificar” hasta obtener el resultado operativo esperado o escalar la incidencia.
- `OP-013` encapsula “verificar cero final → repetir descarga si queda producto → volver a verificar”.

Esta decisión mantiene el grafo como DAG válido sin perder el significado industrial. La repetición debe permanecer documentada en descripción, etapas, controles y criterios de la operación. Si en el futuro se necesita analizar cada iteración como evento independiente, deberá modelarse como ejecución/telemetría o ampliarse explícitamente el dominio; no se debe eludir `graph_cycle` creando una transición inválida.

## Consolidación del duplicado

### Salvaguarda

Antes de eliminar el origen se generó un backup lógico JSON de 176214 bytes.

- Ruta: `artifacts/db-migrations/proceso_ml_fabricacion_before_consolidation.json`.
- Formato: `uc-bib-logical-backup-v1`.
- Fecha UTC: `2026-09-09T20:19:36.077231+00:00`.
- SHA-256 declarado: `602ba6a211d47e0c44f4bc44c4b2529f886903a7ecefd83fadf4265f1e904f80`.

La restauración desde ese archivo es una operación administrativa excepcional. No equivale a versionado funcional.

### Datos migrados al proceso canónico

1. Se movió la operación `CARGAS_DOSIF` conservando su UUID estable.
2. Se normalizó su nombre a “Dosificación de cargas reforzantes”.
3. Se incorporó la descripción de cero, tres regímenes de caudal, estabilización, verificación, corrección, descarga y cero final.
4. Se enriquecieron sus metadatos JSONB con objetivo, entradas, salida, equipos, parámetros y controles de calidad.
5. Se añadieron procedencia y trazabilidad hacia el documento de cliente y el antiguo proceso duplicado.
6. Como primera consolidación se sustituyó el enlace directo `IN → OUT` por `IN → CARGAS_DOSIF → OUT`; el modelado posterior mediante UI amplió esa base hasta el flujo final de 21 nodos y 20 transiciones, conservando los tres UUID.
7. Se preservaron las ocho máquinas canónicas `BN11`, `BN12`, `BN21`, `BN22`, `BN31`, `BN32`, `BN41` y `BN42`, con IDs `322` a `329`.
8. Se asociaron esas ocho máquinas al contrato canónico 99 mediante `contrato_maquina`.
9. Se reubicaron ocho filas de `machine_operation_configuration` al proceso canónico, a la operación consolidada y al contrato 99.
10. Esas configuraciones conservan entradas adicionales, controles, mediciones disponibles, seguridad, estado y vigencia; se retiró únicamente el prefijo técnico del fixture en la descripción.
11. Se reubicaron ocho registros de contexto de recursos BN al proceso canónico, conservando su identidad y añadiendo procedencia de migración.

Metadatos funcionales resultantes de la operación:

- Objetivo: dosificar las cargas requeridas por la receta dentro de tolerancia y del tiempo de ciclo del MI.
- Entradas: negro de humo, sílice, receta y demanda del MI.
- Salida: cargas reforzantes pesadas y descargadas en la tolva de introducción del MI.
- Parámetros: gran caudal, regulación, velocidad mínima, K, retardo y media móvil de cinco ciclos.
- Controles: cero inicial, peso estable, impulsos por defecto, retirada manual por exceso, cero final y producto retenido.

Contrato canónico resultante:

- ID: `99`.
- Nombre: `impacto en TRSP`.
- Proceso operacional: `65`.
- `bpm_process_id`: `f247eee0-cfa1-4ea5-b4e6-fa4598a061b5`.
- Objetivo: `TRSP por dosificacion fuera de tolerancia <1%`.
- KPI: `TRSP`.

### Datos que deliberadamente no se duplicaron

El contrato temporal 159 no se clonó: sus relaciones BN se reasignaron al contrato 99 y después se retiró junto con el fixture.

Tampoco se migraron como entidades canónicas las operaciones ajenas al alcance de cargas (`BU_APROV`, `CAUCHO_APROV`, `SILANO_DOSIF`, `ACEITE_DOSIF`, `MI_MEZCLADO`, `HA_HOMOALIMENTADOR`), el stock `GOULOTTE_ESPERA` ni la entrada `INPUT_ML`.

Las máquinas exclusivas del fixture distintas de BN no se trasladaron a este subproceso. El script verificó referencias externas antes de eliminarlas. La salvaguarda contiene 25 máquinas del ámbito previo; se conservaron las ocho BN y se retiraron 17 recursos exclusivos del duplicado.

Los contratos temporales 157 a 163, así como causas, hipótesis, relaciones y contexto propiedad exclusiva del fixture, se eliminaron por cascada o de forma controlada después del backup.

## Persistencia PostgreSQL del layout

El layout compartido está implementado como una proyección separada en `pm_process_node_layout`:

- `node_id` es clave primaria y FK a `pm_process_node`, con borrado en cascada.
- `x` e `y` son coordenadas numéricas limitadas al intervalo permitido.
- no hay columna de versión, historial ni snapshot;
- la ausencia de fila significa “usar layout determinista derivado del grafo”;
- un `PUT` reemplaza el conjunto vigente de posiciones del proceso;
- una lista vacía borra los overrides y restablece el auto-layout;
- se rechazan UUID de nodos que no pertenezcan al proceso.

La API implementada es:

- `GET /api/bpm/processes/{process_id}/layout`;
- `PUT /api/bpm/processes/{process_id}/layout` con `{ "positions": [...] }`.

El Studio carga grafo y layout en paralelo, guarda alineación, distribución y arrastre en PostgreSQL, y sólo importa coordenadas antiguas de `localStorage` tras confirmación explícita. La exportación del grafo sigue siendo semántica y no convierte las coordenadas en relaciones de negocio.

Estado de datos al auditar: la tabla existe y contiene cero overrides para el proceso canónico de cargas; por ello debe renderizarse inicialmente con el algoritmo determinista.

Incidencia de entorno conservada: la instancia antigua levantada en `127.0.0.1:8050` responde `404` al endpoint de layout y requiere reinicio para servir el backend nuevo. Esta condición ya no bloquea la validación final: el modelado y la comprobación Playwright se completaron contra la instancia actualizada en `127.0.0.1:8052`.

## Formularios estructurados con persistencia JSONB

El flujo normal ya no exige escribir JSON.

Para operaciones, el editor guiado presenta filas de título y descripción, con añadir, eliminar y reordenar, para:

- entradas;
- salidas;
- materiales;
- equipos;
- parámetros;
- controles de calidad;
- indicadores;
- información pendiente.

Las etapas y subetapas se editan con controles estructurados. Se persisten en `pm_process_node.properties.etapas` manteniendo su envolvente de esquema.

Para tipos de máquina y máquinas específicas se utilizan editores estructurados en capacidad, controles, características, parámetros, rangos, limitaciones, instrucciones y diferencias frente al tipo.

La persistencia permanece en las columnas JSONB existentes, entre ellas `pm_process_node_metadata.metadata`, `pm_process_node.properties` y los campos JSONB de máquina/tipo/configuración. No se introduce una tabla paralela para cada lista visual.

El serializador conserva tipos escalares, forma lista/objeto, claves no mostradas y extensiones desconocidas. Una edición de título o descripción parchea sólo esos valores; reordenar desplaza el objeto completo. Las claves vacías o duplicadas se rechazan antes del guardado.

## Estado por fases

| Fase | Estado | Evidencia o siguiente acción |
|---|---|---|
| Descubrir identidad canónica y relación jerárquica | Realizado | IDs y transición padre contrastados en API y PostgreSQL. |
| Tomar decisiones de alcance | Realizado | Sin versionado; nueva asociación y copiar/reutilizar descartados. |
| Crear backup lógico | Realizado | Archivo, tamaño, fecha y hash registrados. |
| Consolidar `CARGAS_DOSIF` | Realizado | La operación conserva UUID y pertenece al proceso canónico. |
| Reubicar configuraciones y contextos BN | Realizado | Ocho configuraciones, ocho vínculos contractuales y ocho contextos. |
| Retirar `PROCESO_ML_FABRICACION` | Realizado | Ausente de BD; API `404 not_found`. |
| Mantener enlace padre `PREP_CARGAS → FAB_MEZCLA` | Realizado | Transición padre conservada con su UUID original. |
| Implementar layout compartido en PostgreSQL | Realizado en código y BD | Tabla, dominio, repositorio, casos de uso y pruebas presentes. |
| Modelar el flujo industrial completo desde la UI | Realizado | 18 nodos nuevos creados con Playwright UI; total final 21 nodos y 20 transiciones. |
| Modelar decisión con ramas `Sí` y `No` | Realizado | Rama conforme continúa a descarga; rama no conforme termina en camión retenido. |
| Encapsular repeticiones incompatibles con DAG | Realizado | Corrección de peso y cero final quedan dentro de `OP-011` y `OP-013`; no hay `graph_cycle`. |
| Activar endpoint de layout en la instancia 8052 | Realizado | Backend actualizado usado en la validación final. |
| Reiniciar la instancia histórica del puerto 8050 | Pendiente operativo | Necesario sólo para que ese proceso sirva el backend nuevo; no bloquea el cierre validado en 8052. |
| Sustituir entrada JSON por formularios guiados | Realizado | Editores de operación, etapas y máquina integrados. |
| Validar el recorrido completo con Playwright CLI | Realizado | Ejecución final 20:57:54: padre → hijo → padre y validación de dominio correctas. |
| Validar funcionalmente el contenido industrial | Pendiente de negocio | Confirmar tolerancias, capacidades y variantes tecnológicas con responsables. |

## Operación posterior al cierre técnico

1. Mantener `127.0.0.1:8052` como referencia de la validación final mientras el proceso antiguo de 8050 no se reinicie.
2. Reiniciar la instancia de 8050 con el worktree actual cuando deba volver a utilizarse.
3. Realizar la revisión de contenido con responsables de recepción, laboratorio, silos, dosificación y MI.
4. Confirmar tolerancias, capacidad efectiva, reglas de blocaje y variantes por línea sin alterar la topología validada salvo decisión de negocio.
5. Registrar cualquier cambio posterior mediante la UI y repetir la validación canónica del proceso.

## Estrategia de verificación con Playwright CLI

### Preparación

- La ejecución final usó Chromium mediante Playwright CLI contra `http://127.0.0.1:8052`.
- Confirmar previamente salud de API, endpoint de layout y carga de módulos JS sin `404`.
- Capturar consola, errores de página y respuestas `4xx/5xx`.
- Crear procesos de prueba con prefijo `TEST_BPM_CONSOLIDATION_` para las interacciones mutables.

### Escenario 1 — jerarquía canónica

1. Abrir el Studio en el proceso padre.
2. Afirmar que `PREP_CARGAS` y `FAB_MEZCLA` son nodos `subprocess`.
3. Afirmar que la transición renderizada entre ambos tiene la etiqueta “Salida de subproceso”.
4. Navegar desde `PREP_CARGAS` al hijo canónico y volver mediante breadcrumb.
5. Verificar que no aparece `PROCESO_ML_FABRICACION` en el selector.

### Escenario 2 — contenido consolidado

1. Abrir directamente el proceso `f247eee0-cfa1-4ea5-b4e6-fa4598a061b5`.
2. Afirmar exactamente 21 nodos y 20 transiciones.
3. Seleccionar `CARGAS_DOSIF` y comprobar objetivo, entradas, salida, parámetros y controles.
4. Verificar que el contexto muestra BN11, BN12, BN21, BN22, BN31, BN32, BN41 y BN42 una sola vez.
5. Abrir la ficha operativa completa y confirmar el contrato 99 y su KPI TRSP.
6. Verificar las ramas `Sí → OP-004` y `No → OP-014` desde `DECISION-001`.
7. Comprobar que `OP-011` y `OP-013` documentan sus repeticiones internas sin transiciones de retorno.

### Escenario 3 — edición JSONB sin JSON manual

1. Crear proceso y operación temporales por API.
2. Inyectar una extensión desconocida y un objeto anidado de prueba.
3. Abrir la ficha de operación en la UI.
4. Añadir, editar, eliminar y reordenar filas; añadir una etapa.
5. Guardar y recargar.
6. Verificar por API que los cambios se persistieron y las claves desconocidas siguen intactas.
7. Repetir el montaje guiado en detalle de máquina.

### Escenario 4 — layout compartido

1. Crear un proceso temporal con tres nodos.
2. Seleccionarlos y usar “Alinear arriba”.
3. Esperar el `PUT /layout` correcto.
4. Consultar la API y afirmar tres coordenadas `y` iguales.
5. Abrir un segundo contexto limpio y comparar posiciones renderizadas.
6. Ejecutar auto-layout y afirmar `positions: []` en PostgreSQL.
7. Probar una posición antigua en `localStorage`: el sistema debe pedir confirmación, importar sólo UUID válidos y conservar backup local.

### Escenario 5 — guardas de dominio

- Rechazar una posición de un nodo perteneciente a otro proceso con `layout_node_process_mismatch`.
- No permitir una transición directa entre nodos de procesos hijos distintos.
- No recrear el proceso duplicado, contrato 159 ni una segunda `CARGAS_DOSIF`.
- Confirmar que auto-layout sólo afecta presentación y no modifica nodos ni transiciones.

### Evidencias a conservar

- traza Playwright;
- capturas del padre, hijo de cargas, panel de contexto y segundo navegador con layout compartido;
- log de red filtrado por `/api/bpm/processes`, `/layout`, `/metadata` y `/machines`;
- resultado de pruebas unitarias e integración;
- identificación y borrado confirmado de cada fixture temporal.

## Criterios de aceptación de cierre

- Existe un solo proceso canónico para preparación de cargas.
- `CARGAS_DOSIF` conserva su UUID y está dentro de `PROC_MEZCLAS_CAUCHO_CARGAS`.
- El flujo interno contiene exactamente 21 nodos y 20 transiciones; `IN`, `CARGAS_DOSIF` y `OUT` conservan sus UUID previos.
- Los 18 nodos añadidos fueron creados desde BPM Studio mediante Playwright UI, no mediante una carga paralela directa en base de datos.
- `DECISION-001` tiene dos salidas inequívocas: `Sí` hacia el flujo conforme y `No` hacia la gestión de no conformidad.
- Las repeticiones de corrección de peso y cero final están encapsuladas, y la validación no devuelve `graph_cycle`.
- Las ocho BN están vinculadas una sola vez al contrato 99 y tienen una configuración coherente con el mismo proceso y operación.
- El proceso padre conserva `PREP_CARGAS → FAB_MEZCLA`.
- La UI y la documentación no presentan esa relación como `output-port → input-port`.
- La navegación padre/hijo funciona en ambos sentidos y mantiene el proceso seleccionado.
- El usuario edita información de operación y máquina mediante controles estructurados, sin escribir JSON.
- El round-trip conserva extensiones JSONB desconocidas.
- Las coordenadas manuales se comparten entre navegadores mediante PostgreSQL.
- Auto-layout borra sólo los overrides de presentación.
- No se crea historial de versiones BPM ni de layout.
- No se añade una nueva función de asociación máquina–operación ni de copiar/reutilizar como parte de esta consolidación.
- Playwright finaliza sin errores de consola, errores de página ni respuestas inesperadas `4xx/5xx`.

## Validación técnica ya ejecutada

- Pruebas Python focalizadas de consolidación, layout, extensiones y persistencia PostgreSQL: `15 passed, 4 subtests passed`.
- Pruebas Node focalizadas de contrato del Studio, API de layout y modelo estructurado: `24 passed`.
- Consulta PostgreSQL de sólo lectura: origen ausente, tres procesos canónicos presentes, ocho vínculos BN, ocho configuraciones y ocho contextos migrados.
- API actual: los tres procesos canónicos responden `200`; el proceso duplicado responde `404`.
- Playwright UI final, ejecutado el 9 de septiembre de 2026 a las `20:57:54` contra el puerto 8052: correcto.
- Resultado observado tras el modelado: `21` nodos y `20` transiciones, incluidos los enlaces `branch` etiquetados `Sí` y `No`.
- Navegación verificada: proceso padre → nodo `PREP_CARGAS` → proceso hijo → regreso al padre.
- Validación de dominio verificada por API: `{ "valid": true, "errors": [] }`.
- La instancia antigua del puerto 8050 sigue requiriendo reinicio para reflejar el backend nuevo; no invalida el resultado obtenido en 8052.

## Archivos de referencia de implementación

- `scripts/consolidate_duplicate_ml_process.py` — artefacto histórico de la consolidación, no una migración operativa vigente.
- `db_management/schema.sql` y `db_management/init_db.py` — DDL y punto único de despliegue actualmente soportados.
- `uc_bib_solv/modules/bpm/adapters/outbound/postgres/pm_layout_repo.py` — repositorio PostgreSQL.
- `uc_bib_solv/modules/bpm/domain/processes/layout.py` — invariantes del layout.
- `uc_bib_solv/webapp/js/bpm-studio.js` — carga, edición, guardado e importación de layout.
- `uc_bib_solv/webapp/js/components/structured-field-model.js` — round-trip sin pérdida.
- `uc_bib_solv/webapp/js/components/operation-metadata-editor.js` — formulario guiado de operación.
- `uc_bib_solv/webapp/js/components/machine-stages.js` — etapas y subetapas.
- `tests/e2e/bpm-studio-layout-persistence.spec.js` — persistencia compartida y migración local.
- `tests/e2e/structured-business-editors.spec.js` — edición guiada y conservación de extensiones.

## Resultado alcanzado

El proceso canónico de cargas contiene el recorrido industrial completo desde la recepción del camión hasta la disponibilidad en la tolva del MI, con tratamiento explícito de conformidad y no conformidad. El usuario puede comprender su continuidad con fabricación desde el grafo padre, editar el contexto industrial mediante formularios profesionales y compartir el layout entre sesiones. El sistema conserva un DAG semántico válido y datos JSONB enriquecibles sin introducir versionado, duplicados, ciclos ficticios ni conexiones inexistentes entre puertos de procesos distintos.
