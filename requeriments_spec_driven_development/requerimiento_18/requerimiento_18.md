# Requerimiento 18 — Editor de información de operaciones BPM

**Estado:** `spec_pendiente_validacion`
**Origen:** requerimiento directo del cliente, 2026-08-20

## Contexto

En el editor de Modelado de procesos, una operación BPM puede tener información
semántica persistida en propiedades JSON y en metadatos JSON. El modal actual de
edición del nodo permite cambiar nombre y descripción, mientras que el modal de
metadatos solo presenta las propiedades existentes de `metadata.data`.

## Objetivo

Permitir que el modal de edición de una operación muestre los campos mínimos de
información de la operación, aunque se persistan dentro de JSON, y que el usuario
pueda añadir campos adicionales con título y descripción que también queden
persistidos dentro del JSON.

## Actor e historia de usuario

Como usuario del editor de operaciones BPM,
quiero editar la información mínima y añadir campos descriptivos adicionales desde
el modal de la operación,
para conservar una ficha operativa completa sin editar JSON manualmente.

## Alcance

- Modal de edición de una operación BPM existente.
- Presentación de descripción, entradas, salidas, parámetros y los demás campos
  mínimos que el proyecto confirme como parte del contrato de operación.
- Alta, edición y persistencia de campos adicionales con título y descripción.
- Recuperación de los valores al volver a abrir la operación.

## Fuera de alcance

- Cambiar el tipo de nodo, sus relaciones, etapas, geometría o versionado.
- Cambiar restricciones SQL/DDL sin una decisión posterior.
- Inventar o migrar nombres de propiedades no presentes en el contrato actual.

## Criterios funcionales

1. CUANDO el usuario abra el modal de edición de una operación, EL SISTEMA DEBERÁ
   mostrar los campos mínimos confirmados para la operación y sus valores actuales.
2. EL SISTEMA DEBERÁ conservar los valores JSON con su forma y tipo compatibles
   con el contrato persistente.
3. CUANDO el usuario añada un campo adicional indicando título y descripción,
   EL SISTEMA DEBERÁ incorporarlo al JSON de la operación.
4. CUANDO el usuario guarde cambios válidos, EL SISTEMA DEBERÁ persistirlos y
   recuperarlos al reabrir el modal.
5. SI falta la decisión sobre el conjunto exacto de campos mínimos o su ubicación
   dentro del contrato JSON, EL SISTEMA NO DEBERÁ inventar nombres ni duplicar
   fuentes de verdad.

## Ambigüedad pendiente

Debe confirmarse si los campos mínimos editables son exactamente los proyectados
por el visor actual (`description`, `inputs`, `outputs`, `parameters`, `controls`
y `contracts/assignments`) o si algunos son solo de consulta, y si los campos
adicionales se guardan en `pm_process_node_metadata.metadata.data` o en
`pm_process_node.properties`.

