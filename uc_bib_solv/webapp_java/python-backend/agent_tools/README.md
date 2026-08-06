# Agent tools del backend

`agent_tools` es la frontera de adaptación para consumidores agente. Expone un
catálogo autodocumentado y contratos JSON estables, pero delega la semántica en
los servicios/repositorios actuales. No es una nueva aplicación Flask ni una
nueva fuente de verdad.

## Uso

```python
from agent_tools import build_default_registry

registry = build_default_registry()
registry.manifest()                 # descubrimiento
result = registry.invoke("bpm.version", version_id="...")
result.to_dict()                    # data + trace
```

Tools incluidos: `process.catalog`, `process.get`, `bpm.version`,
`context.get`, `causal.tree`, `machine.context`, `contract.list` y
`kpi.calculate`. Las entradas son validadas antes de llegar al gateway. El
gateway de producción reutiliza `process_modeling_service`, `causas_repository`,
`operational_repository` y `machine_model_repository`; los tests pueden inyectar
un doble en memoria.

Las tools son de lectura desde el punto de vista del catálogo. `kpi.calculate`
es una consulta bajo demanda y no persiste resultados. Los datos devueltos
conservan los identificadores y la procedencia de los contratos existentes.
