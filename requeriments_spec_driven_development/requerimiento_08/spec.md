# Especificacion tecnica - Requerimiento 08

> **Modo degradado:** este artefacto fue producido por el orquestador tras la
> autorizacion explicita del programador humano porque `requirements-agent` no
> pudo escribirlo. Debe revisarse durante Gate 1.

## Overview

La solucion continuara unicamente sobre `uc_bib_solv/webapp_java`. La webapp
Dash y su codigo asociado dejan de formar parte del producto y deben eliminarse
sin afectar los artefactos SDD. El producto debe permitir CRUD seleccionable en
las paginas Java, gestionar plantillas causales y analisis trazables, y disponer
de un escenario reproducible de datos limpios para validacion.

## Functional Requirements

### FR-01. Java como unica interfaz soportada
- El sistema no debe arrancar, importar ni documentar `app/`, `run.py` ni
  `uc_bib_solv/webapp_dash/` como producto activo.
- El codigo Dash debe eliminarse del producto; se conservan solo los artefactos
  SDD y documentacion historica estrictamente necesaria.

### FR-02. CRUD seleccionable
- Las tablas de procesos, maquinas, contratos y cualquier tabla editable de la
  UI Java deben permitir seleccionar cualquier fila.
- La seleccion debe cargar el registro en el formulario de edicion.
- Actualizar y eliminar deben operar sobre el ID seleccionado, confirmar el
  resultado en UI y refrescar la tabla conservando una seleccion valida.
- El backend debe validar existencia, relaciones y errores de negocio; la UI
  solo gestiona seleccion, formulario, confirmacion y mensajes.

### FR-03. Base de datos limpia
- Debe existir una operacion reproducible para vaciar todas las tablas
  operativas respetando dependencias y reiniciar secuencias cuando aplique.
- La operacion debe ser transaccional, explicita y no ejecutarse implicitamente
  al arrancar la aplicacion.
- La inicializacion posterior debe crear un esquema valido desde cero.

### FR-04. Modelo de maquinas
- El modelo debe soportar familias `maquinas_tipo`, registros de maquina
  individual y una jerarquia de maquina/submaquina.
- La API Python y la UI Java deben soportar alta, edicion, eliminacion y
  navegacion de esos tres niveles.

### FR-05. Plantilla causal
- Un contrato puede tener un arbol causal reutilizable de al menos tres niveles.
- El arbol debe soportar al menos nueve causas y una o dos hipotesis por causa.
- La plantilla no debe almacenar resultados especificos de un analisis.

### FR-06. Apertura y trazabilidad de analisis
- La UI Java debe permitir abrir un analisis desde un contrato plantilla con
  fecha, participantes y motivo/descripcion.
- El analisis debe mostrar la plantilla sin mutarla.
- Para cada causa e hipotesis se deben persistir evidencia, conclusion y estado
  o evaluacion.
- La trazabilidad debe permitir reconstruir el analisis completo a partir del
  analisis, sus resultados y la plantilla usada.
- Inicio debe mostrar analisis abiertos/recientes y enlazarlos a la pagina de
  analisis, no a la plantilla.

### FR-07. Presentacion
- Las tarjetas del arbol y el panel de detalle no deben mostrar IDs tecnicos ni
  metadata de hipotesis al usuario final.
- `causa_detalle_v02` debe mostrar nombres/titulos de contrato y causa.

## Technical Boundaries

- UI: `uc_bib_solv/webapp_java/webapp/js/`.
- HTTP/API: `uc_bib_solv/webapp_java/python-backend/routes/`.
- Casos de uso y validaciones: `services/` y `app/domain/` solo si se reutiliza
  codigo que no dependa de Dash; la nueva funcionalidad Java no debe depender
  de la capa Dash.
- Persistencia: `app/persistence/` o un modulo backend equivalente ya usado por
  Java; DDL y scripts operativos en `db/`.
- La UI no debe contener SQL ni reglas de integridad.

## Acceptance Criteria

- AC-01: `rg` sin referencias ejecutables a `app`/Dash en el arranque Java y la
  carpeta Dash eliminada del producto.
- AC-02: cada tabla editable Java permite seleccionar primera, intermedia y
  ultima fila; cada seleccion carga datos y permite update/delete persistente.
- AC-03: el script de reset deja cero filas en tablas operativas y permite
  ejecutar despues `init_db` sin error.
- AC-04: el modelo de maquinas permite CRUD de tipo, maquina y submaquina.
- AC-05: un fixture crea proceso, maquina, contrato y arbol de 3 niveles/9
  causas con 1-2 hipotesis por causa.
- AC-06: se abre un analisis desde la plantilla con fecha, participantes y
  descripcion, sin escribir resultados en la plantilla.
- AC-07: se guardan y recuperan evidencia, conclusion y evaluacion de causas e
  hipotesis, incluyendo al menos nueve hipotesis verificadas.
- AC-08: Inicio lista analisis recientes y cada enlace abre el analisis correcto.
- AC-09: no aparecen IDs tecnicos en tarjetas, detalle ni panel lateral.
- AC-10: unittest/pytest, compilacion Python y pruebas Java del fixture pasan.

## Constraints and Assumptions

- El programador humano ha aprobado el alcance Java-only, el vaciado de la base
  y el escenario de prueba.
- La base PostgreSQL configurada por `config/settings.py` es la fuente operativa.
- La validacion final requiere prueba humana sobre la webapp Java.
- Este documento se produjo en modo degradado y queda pendiente de Gate 1.

## Out of Scope

- Nuevas funcionalidades para Dash.
- Mantener Dash como fallback.
- Despliegue remoto Dataiku no requerido para la prueba local.

## Decision Log

- 2026-07-18: Java es la unica UI soportada; decision del programador humano.
- 2026-07-18: se autoriza modo degradado por fallo de `requirements-agent`.
- 2026-07-18: se exige reset de base y fixture completo de trazabilidad.

## Questions for Clarification

- Ninguna bloqueante para comenzar; cualquier ajuste posterior debe registrarse
  como enmienda y pasar por Gate 1.
