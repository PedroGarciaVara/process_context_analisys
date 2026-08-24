# Requerimiento 13 — Fuente de contexto BPM

- **Objetivo único:** crear y validar una fuente de contexto BPM robusta en entorno TEST con la solución mínima necesaria.
- **Estado:** `spec_pendiente_validacion`.
- **Actores:** usuario humano, agente y componentes frontend/backend/persistencia existentes.
- **Alcance:** contexto BPM general con los tipos actuales `input`, `output`, `operation`, `subprocess`, `decision` y `stock`.
- **Fuera de alcance:** BU, MACBU y cualquier capacidad no estrictamente necesaria para demostrar BPM como fuente de contexto.

## Decisiones funcionales

- Se reutilizarán los seis tipos actuales y sus validaciones existentes; no se crearán tipos nuevos.
- Las descripciones podrán estar vacías. No se añadirá catálogo ni versionado de `incomplete_reason`.
- Se conservarán de forma simple el contexto y la procedencia disponible, incluido actor y `trace_id` cuando los proporcionen las interfaces existentes.
- Los datos incompatibles se conservarán con sus procedencias y se marcarán como incompatibles; no se fusionarán.
- No habrá prioridad automática, scoring ni resolución automática de conflictos.
- Guardar dejará el contexto disponible/publicado directamente. No habrá estados `draft`, `review`, `approved` ni workflow de publicación.
- El agente leerá y escribirá mediante las interfaces y permisos existentes; no se crearán tools, roles ni scopes nuevos.
- Se permitirán peticiones repetidas sin añadir idempotencia específica.
- Se reutilizarán persistencia y modelos existentes. No habrá migración destructiva ni eliminación de modelos antiguos.

## Responsabilidades

- **Frontend:** presentará captura, resultado, validaciones e incompatibilidades con UI y mensajes en español, reutilizando las interfaces existentes.
- **Backend/dominio:** aplicará la validación final, permisos existentes, conservación de contexto/procedencia y reglas de incompatibilidad.
- **Persistencia:** reutilizará conexión, modelos y repositorios existentes, sin rediseño ni esquema nuevo salvo necesidad estricta demostrada durante la implementación.

## Requisitos no funcionales mínimos

- El entorno de validación será TEST y cubrirá como máximo 20 usuarios/agentes concurrentes.
- La retención será indefinida solo si ya está prevista por la persistencia existente; no se diseñará una política nueva.
- Los mensajes visibles para usuario estarán en español.

## Criterios técnicos mínimos

- **AC-00-01:** una validación de los contratos existentes cubre los seis tipos y mantiene sus reglas actuales.
- **AC-00-02:** un contexto válido con descripción vacía puede guardarse sin catálogo/versionado de `incomplete_reason`.
- **AC-00-03:** guardar conserva el contexto y la procedencia disponible y lo deja disponible/publicado directamente.
- **AC-00-04:** los datos incompatibles permanecen separados, con procedencia e incompatibilidad marcada.
- **AC-00-05:** el flujo usa interfaces, permisos, persistencia y modelos existentes, sin tools, roles, scopes, idempotencia adicional ni migración destructiva.
- **AC-00-06:** la validación en TEST respeta el máximo de 20 usuarios/agentes concurrentes y muestra mensajes en español.

## Preguntas para aclaración

No quedan preguntas; las decisiones necesarias fueron cerradas por el programador humano.

## Registro de decisiones

- **2026-08-06 — programador humano:** objetivo único, entorno TEST y solución mínima.
- **2026-08-06 — programador humano:** tipos actuales, validaciones existentes y descripciones vacías.
- **2026-08-06 — programador humano:** sin catálogo/versionado de `incomplete_reason`, workflow de publicación, scoring, prioridades automáticas ni resolución automática.
- **2026-08-06 — programador humano:** guardar publica/deja disponible directamente; las incompatibilidades no se fusionan.
- **2026-08-06 — programador humano:** reutilización de interfaces, permisos, persistencia y modelos, sin nuevas tools, roles, scopes, idempotencia adicional, migración destructiva ni eliminación de modelos antiguos.
- **2026-08-06 — programador humano:** máximo de 20 usuarios/agentes concurrentes, retención indefinida solo si ya existe y UI/mensajes en español.
