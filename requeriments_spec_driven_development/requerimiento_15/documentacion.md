# Documentacion

## Objetivo

Documentar el cierre de la migración arquitectónica del requerimiento 15 y sus límites operativos.

## Audiencia

- Mantenedores del backend Flask y la SPA JavaScript.
- Revisores humanos del flujo SDD.
- Agentes que continúen el mantenimiento de los bounded contexts.

## Alcance

Incluye T1–T10: inventario, validadores arquitectónicos, límites de plataforma, migración de process modeling, agent tools, causal tree, causal analysis y operational modeling, además del cierre CI, política de shims y Gate 3. Excluye cambios de esquema y despliegues.

## Estado actual

El requerimiento 15 queda `done` tras la aprobación humana de Gate 3. La aplicación mantiene Flask como backend y una SPA estática; los seis bounded contexts tienen módulos canónicos bajo `uc_bib_solv/modules/`. Las fachadas legacy con consumidores activos se conservan como superficies de compatibilidad y tienen propietario, fase y criterio de retirada documentados.

## Estructura

| Ruta | Responsabilidad |
| --- | --- |
| `uc_bib_solv/modules/platform/` | Arranque, health y bootstrap. |
| `uc_bib_solv/modules/process_modeling/` | Dominio y aplicación BPM. |
| `uc_bib_solv/modules/agent_tools/` | Casos de uso y puertos de herramientas. |
| `uc_bib_solv/modules/causal_tree/` | Reglas del árbol causal. |
| `uc_bib_solv/modules/causal_analysis/` | Análisis causal y persistencia canónica. |
| `uc_bib_solv/modules/operational_modeling/` | Procesos, contratos, máquinas y operaciones. |
| `uc_bib_solv/architecture_validators/` | Gates de estructura, nombres, dependencias e implementaciones. |
| `.github/workflows/architecture-validation.yml` | Ejecución CI de los gates arquitectónicos. |

## Decisiones vigentes

| ID | Decisión | Racional | Consecuencia | Estado |
| --- | --- | --- | --- | --- |
| DEC-015-01 | Mantener fachadas legacy con consumidores activos. | Evita romper contratos públicos mientras reference counts sean no nulos. | La retirada requiere una fase posterior con evidencia de cero consumidores. | Vigente |
| DEC-015-02 | Mantener `db_management/schema.sql` inmutable. | El requerimiento es arquitectónico y no modifica el modelo físico. | Persisten las transacciones y SQL existentes detrás de adaptadores. | Vigente |
| DEC-015-03 | Hacer obligatorios los validadores arquitectónicos en CI. | Impide regresiones de estructura y dependencias. | El workflow falla con código no cero ante una infracción. | Vigente |

## Validación

- Validadores de estructura, naming, dependencias y concrete implementations: PASS.
- Tests T9: 3/3 PASS; batería focalizada T6–T8: 20/20 PASS.
- `compileall`, `node --check` y `git diff --check`: PASS.
- La suma de comprobación de `db_management/schema.sql` permanece `f85ab20439d4ebf68bbd0ed49e1f3d0748db00276b58d17cef8ad298c8fe0866`.
- `pytest`, PostgreSQL, smoke e2e y Playwright no se declaran ejecutados con éxito por limitaciones del entorno.

## Limitaciones y troubleshooting

Los checks dependientes de PostgreSQL, servidor o Playwright deben ejecutarse en un entorno con esos servicios. El renderer de diagnósticos contiene un `print` intencional; no se encontraron marcadores de debug/fixme/breakpoint en el perímetro revisado.

## No conformidades y cierre

NC-001 y NC-002 están resueltas según `nc-log.md`. Gate 3 fue aprobado explícitamente por el programador humano. Este documento se generó en modo degradado porque `documentation-agent` y `context-agent` no pudieron iniciar por restricciones de filesystem del runtime; la autorización humana para ese modo quedó registrada en la conversación. No hubo commit ni push.

## Artefactos SDD

- Spec: `spec.md`.
- Plan: `task_plan.md`.
- Evidencias: `t1_evidence.md` a `t9_evidence.md` y reportes T9.
- Contexto: `context.md` raíz.
