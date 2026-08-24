indings

  1. High: el DDL no arranca sobre una base vacía porque las tablas hijas de hipótesis referencian node(id) antes de que node exista. db_management/schema.sql:65
     crea hypothesis_required_data y hypothesis_expected_evidence con FK a node, pero node no se crea hasta db_management/schema.sql:113. Esto no lo detectan
     compileall ni los unit tests, pero sí rompería init_db/bootstrap real.

  2. High: la nueva relación CAUSE -> CONTRACT no se renderiza realmente en el árbol consumido por la app. La consulta recursiva ya puede recorrer nodos
     contrato y causa, pero app/persistence/graph_query_repo.py:161 filtra rows a solo CAUSE, app/persistence/causa_repo.py:205 descarta cualquier nodo
     cuyo node_type no sea CAUSE, y el payload Java recompone el árbol desde esa lista filtrada en uc_bib_solv/repositories/
     causas_repository.py:128. Resultado: la firma nueva queda aceptada en dominio, pero el caso funcional principal no aparece en UI.

  3. High: el corte a modelo canónico no está completado; siguen activos caminos funcionales basados en columnas legacy. app/persistence/
     graph_sync.py:129 sigue reconstruyendo estructura desde causa.contrato_id y causa.parent_id, app/persistence/graph_query_repo.py:245 mantiene
     fallback de hipótesis por h.causa_id, y el detalle Java sigue resolviendo contexto con hipotesis["causa_id"] y causa["contrato_id"] en uc_bib_solv/
     uc_bib_solv/services/causa_detail_service.py:30. Eso deja el comportamiento dependiendo de datos duplicados y puede producir
     divergencias entre relationship y las FKs legacy tras migración o resync.

  Residual Risk
  No revisé validación funcional real sobre PostgreSQL ni sobre ambas UIs; además, las pruebas reportadas no cubren el bootstrap del esquema ni el
  recorrido visual CONTRACT -> CAUSE -> CONTRACT.