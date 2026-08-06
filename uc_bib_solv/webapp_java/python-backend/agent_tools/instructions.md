# Instrucciones para consumidores agente

1. Descubre primero `ToolRegistry.manifest()` y usa únicamente nombres
   registrados.
2. Selecciona un `version_id` BPM antes de pedir `context.get`; filtra por
   `node_id`, `family` o `record_type` cuando sea posible.
3. Trata `process`, `version`, `node`, `transition` y las relaciones causales
   como identificadores estructurales. No reconstruyas relaciones a partir de
   texto, HTML, SVG o coordenadas.
4. `declaration`, `fact` y `evidence` tienen significados distintos: un hecho
   no sustituye una declaración y una evidencia debe conservar su soporte.
5. Usa `causal.tree` para árboles existentes y respeta la metodología causal;
   no infieras conclusiones ni reglas AND/OR.
6. Usa `machine.context` para recorrer máquina → operación BPM → proceso,
   versión, contrato y asignaciones.
7. `kpi.calculate` requiere `values` y `version`; su resultado es efímero y
   debe conservarse solo en la respuesta del consumidor si necesita auditarlo.
8. Propaga `trace.trace_id` y no envíes secretos, SQL, credenciales o trazas
   internas como argumentos.
