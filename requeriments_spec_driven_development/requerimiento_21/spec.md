# Spec — requerimiento_21: Corrección conjunta de incidencias de navegación, contexto y análisis

## Metadata

- Requirement ID: `requerimiento_21`
- Estado: `spec_validada`
- Autor del spec: `requirements-agent`
- Fecha: 2026-09-13
- Fuente: `requerimientos_cliente/solucionar_problemas_encontrados.odt` y `requerimientos_cliente/solucionar_problemas_encontrados_02.odt`
- Sesión: aislada, modelo `gpt-5.6-luna`, razonamiento `medium`

## Overview

Se requiere corregir conjuntamente diez incidencias observadas en las capturas y
descripciones del cliente: consistencia de navegación y formularios de máquinas,
integridad de relaciones máquina-operación, presentación de pestañas y filtros,
contexto de operaciones/procesos/contratos, reducción de paneles redundantes y
edición de resultados de hipótesis en análisis nuevos y abiertos.

La aplicación activa es la SPA JavaScript bajo `uc_bib_solv/webapp`, con APIs
Flask modulares en `uc_bib_solv/modules/bpm` y `uc_bib_solv/modules/rca_tree`.
Las correcciones DEBERÁN conservar los datos existentes y validarse mediante
Playwright; cada incidencia tendrá un resultado identificable y evidencias en
`.playwright-artifacts/test-results/<run>/`.

## Functional Requirements

### FR-21-01 — Navegación uniforme de máquinas

Crear máquina DEBERÁ seguir el mismo patrón de navegación que Detalle máquina:
la acción DEBERÁ abrir la página de detalle de máquina en modo creación mediante
la ruta SPA existente, y no un modal. El guardado y los estados de error deberán
conservar la forma de trabajo de la página de detalle.

### FR-21-02 — Integridad máquina-operación

La relación operación–máquina DEBERÁ tener como única fuente de verdad la
relación canónica `machine_operation_configuration` unida con `maquina`. La UI
DEBERÁ permitir seleccionar únicamente máquinas del catálogo, transportar sus
IDs canónicos y presentar la asociación derivada de esa relación. El backend
DEBERÁ validar la existencia de cada máquina y la compatibilidad máquina /
operación / proceso antes de mutar, y persistir altas, reemplazos y bajas
mediante un comando dedicado de backend/dominio/aplicación contra esa relación.
La operación completa DEBERÁ ser atómica: una asociación inválida no podrá crear
ni eliminar relaciones parcialmente, y la relación canónica DEBERÁ conservarse
al recargar.

### FR-21-02A — Exclusión de representaciones duplicadas

No se DEBERÁ crear, actualizar, retener como fallback ni leer o escribir
`pm_process_node_metadata.metadata.data.equipment` para determinar pertenencia
operación–máquina. Tampoco podrán actuar como fuentes independientes de
pertenencia `canonical_ids.maquina_ids` ni
`operation_machine_assignments`. Las claves históricas de esos tres formatos
DEBERÁN eliminarse mediante una reconciliación idempotente y controlada; los
payloads nuevos que las incluyan DEBERÁN rechazarse con error funcional estable,
sin guardar la copia. Los atributos descriptivos propios de la configuración
(por ejemplo, parámetros de operación de una máquina) sí podrán permanecer en
`machine_operation_configuration`, pero nunca como listas duplicadas de
miembros. Todas las lecturas de tabla de operaciones, panel derecho, editor de
detalle, APIs, contexto/RCA y agentes DEBERÁN derivar los miembros del mismo
  `machine_operation_configuration JOIN maquina`, sin caché, JSON alternativo ni
  fallback.

### FR-21-02B — Selector acumulativo de máquinas asociadas

En el editor de la relación operación–máquina, la UI DEBERÁ mostrar un único
desplegable alimentado exclusivamente por el catálogo canónico de `maquina` y un
botón explícito con la etiqueta “Seleccionar máquina” para agregar la opción
seleccionada. La selección DEBERÁ ser acumulativa: cada activación válida del
botón agregará la máquina al conjunto en edición sin sustituir las ya
seleccionadas ni generar duplicados.

La UI DEBERÁ mostrar las máquinas ya seleccionadas/asociadas en un recuadro
separado del desplegable. El recuadro DEBERÁ mostrar únicamente miembros
derivados de `machine_operation_configuration JOIN maquina`, permitir eliminar
cualquier miembro y permitir continuar agregando máquinas desde el mismo
desplegable. Mientras una máquina pertenezca al conjunto en edición, DEBERÁ
quedar excluida o deshabilitada en las opciones disponibles. Cuando no haya
máquinas seleccionadas, el recuadro DEBERÁ mostrar un estado vacío explícito y
no una lista del catálogo completo.

El control DEBERÁ seguir siendo operable con un catálogo de más de 100 máquinas:
no DEBERÁ renderizar el catálogo completo como una lista permanente de controles
ni requerir una altura proporcional al catálogo; DEBERÁ ofrecer búsqueda o
filtrado nativo del desplegable y mantener el recuadro limitado al conjunto
seleccionado. Guardar, eliminar y recargar DEBERÁN conservar un conjunto único y
coherente entre el estado visible y la relación canónica. Ninguna de estas
interacciones DEBERÁ leer, escribir o reintroducir listas persistentes en
`pm_process_node_metadata.metadata.data.equipment`, `canonical_ids.maquina_ids`
u `operation_machine_assignments`.

### FR-21-03 — Pestañas de máquina genérica y específica

La página de detalle DEBERÁ presentar Máquina genérica y Máquina específica como
dos pestañas distinguibles y navegables, no como dos bloques continuos. El cambio
de pestaña DEBERÁ mostrar solo el contenido de la pestaña activa y mantener los
valores editados conforme al patrón de formulario existente.

### FR-21-04 — Filtro inicial de contratos

Al entrar en Contratos, el filtro activo DEBERÁ representarse con su valor
seleccionado y la lista DEBERÁ cargar sus contratos correspondientes en el primer
renderizado, sin exigir una actualización manual. El estado vacío solo podrá
mostrarse cuando la respuesta de catálogo confirme cero resultados.

### FR-21-05 — Contexto de operación

Desde Operaciones, cada operación DEBERÁ permitir acceder a sus contratos
asignados y mostrar las máquinas asociadas a ella. El panel derecho del detalle
DEBERÁ mostrar un acceso accionable al flujo BPM de la operación y la descripción
de la operación seleccionada. El orden y jerarquía visual DEBERÁN mantener el
patrón de la página de Procesos.

### FR-21-06 — Descripción de proceso

El panel derecho de Procesos/Detalle de proceso DEBERÁ mostrar la descripción del
proceso seleccionado en la zona resaltada del diseño de referencia, con contenido
actualizado al cambiar de proceso y un estado explícito si no existe descripción.

### FR-21-07 — Máquinas asociadas a contrato

En el detalle de contrato, la lista visible de máquinas asociadas DEBERÁ contener
solo las relaciones persistidas para ese contrato. DEBERÁ existir un selector de
máquinas disponibles para seleccionar y agregar una máquina; el cuadro/lista de
asociadas DEBERÁ actualizarse tras guardar y tras recargar. Una máquina no podrá
aparecer como asociada si no existe relación para el contrato.

### FR-21-08 — Eliminación de panel redundante del árbol

La vista de árbol causal DEBERÁ eliminar el panel señalado en la primera captura
del segundo ODT. La eliminación DEBERÁ limitarse a la presentación redundante y no
romper árbol, selección, zoom, acciones, navegación ni carga de nodos.

### FR-21-09 — Simplificación de análisis

La vista de análisis causal DEBERÁ eliminar el panel “Cadena científica”, sus
modelos/componentes de presentación asociados y el símbolo de “solo lectura”. La
eliminación DEBERÁ ser quirúrgica: no podrá eliminar ni alterar el modelo de
datos, los resultados, las hipótesis, el árbol causal ni las acciones de análisis.

### FR-21-10 — Edición de resultados de hipótesis

En un análisis abierto, el usuario DEBERÁ poder modificar y guardar los campos de
resultado de una hipótesis. En un análisis nuevo, el usuario DEBERÁ poder
completar y guardar esos resultados antes de cerrar el análisis. El frontend
DEBERÁ presentar controles editables, estados de carga y errores accionables; el
backend DEBERÁ aceptar la escritura solo para análisis editables, validar la
hipótesis y persistir atómicamente evaluación, evidencia/conclusión o campos
equivalentes del contrato vigente. Un análisis cerrado DEBERÁ conservar la regla
de solo lectura del dominio y mostrar el motivo al usuario.

## Frontend/backend y placement

- Frontend: extender las vistas existentes en
  `uc_bib_solv/webapp/js/views/{maquinas,bpm,rca}`, los componentes/paneles y
  clientes API ya existentes. El frontend es responsable de rutas, tabs,
  presentación, selección, validación inmediata, estados de carga/error y
  accesibilidad; no es fuente de verdad de integridad ni permisos de edición.
- Backend/dominio: reutilizar los módulos existentes
  `uc_bib_solv/modules/bpm` y `uc_bib_solv/modules/rca_tree`, sus casos de uso,
  adaptadores HTTP y repositorios PostgreSQL. Las reglas de existencia de
  máquinas, pertenencia de relaciones, edición según estado del análisis y
  atomicidad DEBERÁN vivir en dominio/aplicación/adaptador de persistencia según
  el patrón vigente, no solo en callbacks o JavaScript.
- Persistencia: no se autoriza una tabla nueva para estas incidencias. Las
  conexiones y transacciones seguirán en los adaptadores PostgreSQL existentes;
  el modelo/DDL seguirá en `db_management/schema.sql` y migraciones existentes
  solo se tocarán si una verificación demuestra una necesidad compatible con el
  alcance aprobado.
- No se crea un nuevo bounded context ni un directorio superior: se extienden
  los módulos BPM y RCA existentes y sus vistas SPA correspondientes.

## Non-Functional Requirements

- **NFR-21-01 Trazabilidad UI:** cada incidencia deberá tener al menos un test
  Playwright y una entrada en `ac-results.json` con `passed` y detalle.
- **NFR-21-02 Evidencia:** cada run deberá conservar capturas cuando aplique,
  respuestas relevantes, logs de consola/red y resumen bajo
  `.playwright-artifacts/test-results/<timestamp>/`.
- **NFR-21-03 Integridad:** las operaciones de asociación y resultados no deberán
  dejar relaciones o resultados parciales ante error.
- **NFR-21-04 Accesibilidad:** tabs, selectores, acciones de contexto y edición
  deberán tener nombre accesible, foco visible y mensajes de estado legibles.
- **NFR-21-05 Regresión:** las eliminaciones visuales no deberán eliminar datos ni
  romper rutas, carga, selección, zoom, navegación o edición no afectadas.
- **NFR-21-06 Escalabilidad del selector:** con un catálogo de más de 100 máquinas,
  el DOM inicial del editor no DEBERÁ contener una lista permanente de controles
  para todas ellas; las opciones deberán permanecer disponibles mediante el
  desplegable y su búsqueda/filtrado, y el recuadro deberá contener como máximo
  una entrada por máquina asociada.

## Constraints and Assumptions

- Se mantiene la SPA JavaScript y los contratos HTTP existentes; no se migra a
  Dash ni se crea una interfaz paralela.
- “Panel señalado” se interpreta conforme a las capturas incrustadas en el ODT;
  la eliminación se limita al panel visual identificado y sus modelos de
  presentación, preservando los datos y APIs compartidos.
- Las etiquetas visibles podrán conservar el idioma y nomenclatura actuales,
  salvo que el criterio funcional exija literalmente “Máquina genérica”,
  “Máquina específica”, “Cadena científica” o “solo lectura”.
- La validación UI se ejecutará contra la URL/backend y fixture apropiados del
  proyecto, usando el patrón Playwright Dash/SPA vigente y sin inventar datos de
  producción.

## Out of Scope

- Rediseño visual general, cambio de framework, migración de base de datos o
  nuevos roles/permisos.
- Eliminación de modelos de dominio, tablas o APIs de análisis que sean usados
  por otros elementos; solo se retiran componentes redundantes de presentación.
- Nuevas capacidades de análisis distintas de editar resultados de hipótesis.
- Cambios en procesos BPM no necesarios para mostrar el contexto solicitado.

## Acceptance Criteria

| ID | Criterio técnico verificable |
|----|------------------------------|
| AC-21-01 | Playwright navega desde `#/maquinas` a crear máquina y verifica URL de detalle, ausencia de modal y render del formulario; conserva evidencia. |
| AC-21-02 | Playwright intenta asociar una máquina inexistente o una identidad libre como `ffff` y verifica rechazo visible y ausencia de relación; asocia una existente por ID canónico, recarga y verifica persistencia desde `machine_operation_configuration JOIN maquina`. |
| AC-21-03 | Playwright verifica dos tabs accesibles y que alternarlas cambia el panel visible sin render continuo de ambos bloques. |
| AC-21-04 | Playwright entra en `#/contratos`, espera la respuesta inicial y verifica filtro seleccionado y lista correcta sin reload manual. |
| AC-21-05 | Playwright abre una operación, verifica enlaces a contratos, nombres de máquinas, descripción y acción al flujo BPM en el panel derecho. |
| AC-21-06 | Playwright selecciona un proceso y verifica su descripción en la zona del panel derecho; cambia de proceso y verifica actualización. |
| AC-21-07 | Playwright abre un contrato, verifica que la lista asociada excluye máquinas no relacionadas, agrega una disponible mediante selector, guarda y verifica tras recarga. |
| AC-21-08 | Playwright abre el árbol, verifica que el panel señalado no existe y que árbol, selección, zoom y acciones principales siguen operativos. |
| AC-21-09 | Playwright abre análisis y verifica ausencia de “Cadena científica”, controles/modelos visuales asociados y símbolo “solo lectura”, manteniendo árbol y resultados. |
| AC-21-10 | Playwright en análisis abierto edita y guarda un resultado de hipótesis y verifica la respuesta y persistencia tras recarga; en análisis nuevo completa/guarda; en análisis cerrado verifica rechazo y motivo de solo lectura. |
| AC-21-11 | Tests unitarios/integración verifican en backend que máquina inexistente no crea relación, resultados inválidos no escriben parcialmente y análisis cerrado no acepta edición. |
| AC-21-12 | El run Playwright produce `ac-results.json`, capturas/logs requeridos y una correspondencia 1:1 entre AC-21-01..23 y entradas de resultado; no se declara conformidad si falta alguna evidencia. |
| AC-21-13 | Una prueba de contrato intenta enviar `ffff` y cualquier ID inexistente como identidad de máquina; la API responde 4xx con código funcional estable, no crea filas y la UI muestra el error accionable. |
| AC-21-14 | Tras retirar EV02 de una operación que inicialmente contiene EV01 y EV02, una consulta directa confirma la eliminación de la fila canónica de EV02 y, después de recargar, operaciones, panel derecho, editor, APIs, contexto/RCA y agentes muestran únicamente EV01. |
| AC-21-15 | Una prueba de reemplazo con al menos una máquina inválida o incompatible verifica que la transacción falla y que las filas canónicas anterior y posterior permanecen idénticas; no se observa estado parcial. |
| AC-21-16 | Una inspección de payloads y persistencia confirma ausencia de `metadata.data.equipment`, `canonical_ids.maquina_ids` y `operation_machine_assignments` como listas de pertenencia; una prueba de lectura demuestra que no existe fallback de caché o JSON. |
| AC-21-17 | La migración/reconciliación idempotente elimina las claves históricas duplicadas y una consulta de divergencias devuelve cero filas; una segunda ejecución no cambia el resultado ni duplica configuraciones. |
| AC-21-18 | Playwright abre el editor de “Máquinas asociadas” y verifica un desplegable de opciones provenientes del catálogo canónico y un botón visible con nombre accesible “Seleccionar máquina”; no existe una lista permanente de controles para todo el catálogo. |
| AC-21-19 | Con al menos tres máquinas válidas, Playwright selecciona y agrega una por una; verifica que la selección es acumulativa, que el recuadro separado contiene exactamente las tres, que no hay duplicados y que cada ya seleccionada queda excluida o deshabilitada en el desplegable. |
| AC-21-20 | Playwright verifica el estado vacío explícito del recuadro cuando no hay asociaciones, elimina una máquina del recuadro, comprueba su desaparición y la vuelve a agregar desde el desplegable sin sustituir las restantes. |
| AC-21-21 | Con un catálogo de más de 100 máquinas, una prueba UI verifica que el editor no renderiza más de una entrada de control persistente por máquina del conjunto asociado, que el desplegable permite localizar una opción mediante búsqueda/filtrado y que el recuadro solo muestra las asociadas. |
| AC-21-22 | Playwright guarda un conjunto de varias máquinas, recarga la vista y verifica que el recuadro reproduce exactamente el mismo conjunto único; tras eliminar y guardar, una nueva recarga confirma la baja. |
| AC-21-23 | Una prueba de contrato/inspección de persistencia confirma que la selección múltiple usa únicamente IDs del catálogo y que ninguna interacción crea, actualiza, conserva o consulta listas de pertenencia en `metadata.data.equipment`, `canonical_ids.maquina_ids` u `operation_machine_assignments`; una consulta del `machine_operation_configuration JOIN maquina` coincide exactamente con el recuadro tras guardar y recargar. |

## Questions for Clarification

Sin preguntas bloqueantes identificadas a partir de los dos ODT y sus capturas. La
validación humana del presente spec sigue siendo obligatoria antes de planificar o
implementar.

## Decision Log

| Decision | Razon |
|----------|-------|
| Tratar los dos ODT como un único requerimiento `requerimiento_21`. | La petición humana exige corregir conjuntamente todas las incidencias y validarlas con una misma cadena de evidencias. |
| Reutilizar módulos BPM/RCA y vistas SPA existentes. | El contexto técnico confirma que ya poseen contratos para las responsabilidades afectadas. |
| Mantener solo lectura para análisis cerrado. | El backend existente aplica esa regla; la incidencia pide edición en análisis abierto/nuevo, no eliminar la protección de análisis cerrado. |
| Retirar paneles solo de presentación. | El cliente exige no romper otros elementos y los modelos compartidos pueden ser necesarios para árbol/resultados. |
| Gate 1 aprobado por el programador humano mediante la respuesta explícita «validar» el 2026-09-13. | El spec original quedó validado; la enmienda Type B fue validada posteriormente mediante la decisión registrada en la fila siguiente. |
| Gate 1 de `AMD-21-001` aprobado por el programador humano mediante la respuesta explícita «sí» el 2026-09-13. | La enmienda queda validada y el requerimiento puede pasar a `analyze-plan`; no autoriza implementación directa. |
| Clasificar la corrección posterior a NC-005 como AMD-21-002 Type B, no como una nueva NC. | NC-005 ya fue resuelta; esta petición añade criterios UX y de escalabilidad no explicitados en el spec vigente, manteniendo la persistencia canónica ya aprobada. |
| Mantener `machine_operation_configuration JOIN maquina` como única fuente de verdad para la selección múltiple. | La enmienda amplía el flujo de edición visible sin autorizar ninguna representación persistente duplicada ni cambiar el modelo de datos. |

## Amendments

| ID | Fecha | Tipo | Decisión humana / propietario | Cambio |
|----|-------|------|------------------------------|--------|
| AMD-21-001 | 2026-09-13 | Type B | `programador_humano` | La única fuente de verdad de la relación operación–máquina es `machine_operation_configuration JOIN maquina`; se prohíben `metadata.data.equipment` y las demás listas duplicadas, se exige transporte de IDs canónicos, comando dedicado, validación de compatibilidad y atomicidad. La enmienda gobierna la nueva NC de implementación observada en `R12_BU_EVACUACION` (metadata `equipment=[EV01]` frente a relación canónica EV01/EV02 y aceptación de `ffff`). Gate 1 de la enmienda validado explícitamente con «sí» el 2026-09-13; el spec queda en `spec_validada` y el siguiente paso es `analyze-plan`. |
| AMD-21-002 | 2026-09-13 | Type B | `programador_humano` | Tras el cierre de NC-005, se exige que “Máquinas asociadas” use un desplegable del catálogo canónico, botón explícito “Seleccionar máquina”, selección múltiple acumulativa sin duplicados, recuadro separado de asociadas con estado vacío, eliminación y re-agregado, exclusión/deshabilitación de ya seleccionadas, operación con más de 100 máquinas y persistencia/recarga coherente. No cambia la fuente de verdad ni permite representaciones duplicadas. Gate 1 validado explícitamente con «sí» por el programador humano el 2026-09-13; el spec vuelve a `spec_validada` y el siguiente paso es `analyze-plan`. |

### Decisión de la enmienda

La discrepancia observada se resuelve a favor de la relación canónica: cualquier
proyección histórica o payload duplicado se elimina/rechaza y nunca puede
corregir ni sobrescribir `machine_operation_configuration`. La enmienda no crea
tabla, bounded context ni representación persistente adicional.
