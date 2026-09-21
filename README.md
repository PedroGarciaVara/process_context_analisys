# UC_BIB_Solve

**Vídeo explicativo:** [Ver vídeo en Google Drive](https://drive.google.com/file/d/19dTle-i18iq-IXb6DnpCf8gVDWvvJ0nc/view?usp=sharing)

**Repositorio:** [github.com/PedroGarciaVara/process_context_analisys](https://github.com/PedroGarciaVara/process_context_analisys)

Aplicación web local para organizar contexto operativo, analizar causas raíz y
modelar procesos industriales. El producto combina una SPA en
HTML/CSS/JavaScript con una API Flask y persistencia PostgreSQL. Su propuesta de
valor es reunir en un mismo espacio el contexto de procesos, contratos y
máquinas, los árboles causales y el modelado visual de procesos BPM, con
validación de grafos y resultados de análisis trazables.

El frontend ejecutable actual es la SPA JavaScript.

## Valor y originalidad

UC_BIB_Solve está orientado a un escenario industrial de análisis causal y
mejora de procesos. Aporta:

- un contexto operativo compartido para procesos, contratos y máquinas;
- árboles causales reutilizables, hipótesis y sesiones de análisis causa-raíz;
- un BPM Studio para procesos, operaciones, decisiones, stocks y subprocesos;
- validación estructural, jerárquica y de legibilidad del grafo;
- persistencia PostgreSQL y una separación explícita entre UI, casos de uso,
  adaptadores y repositorios.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Interfaz | HTML, CSS y JavaScript modular, SPA con router por hash |
| Backend | Python 3.10+, Flask |
| Persistencia | PostgreSQL mediante `psycopg2-binary` |
| Configuración | `python-dotenv`, variables de entorno y `.env.local` ignorado |
| Pruebas UI | Playwright para Node.js, Chromium |
| Calidad | `unittest`, pruebas de integración/API y validadores arquitectónicos |

## Requisitos previos

- Python 3.10 o superior.
- PostgreSQL accesible desde el entorno local.
- Node.js y npm para Playwright.
- Chromium instalado mediante Playwright para las pruebas E2E.

No hay `pyproject.toml`, `Dockerfile`, `docker-compose.yml` ni un paquete de
despliegue autónomo versionados en este repositorio.

## Instalación

Desde la raíz del repositorio:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
npm install
npx playwright install chromium
```

## Configuración segura

La aplicación carga `.env.local` mediante [`config/settings.py`](config/settings.py).
Ese archivo no debe versionarse ni compartirse. Usa [`.env.example`](.env.example)
como plantilla sin secretos:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `PGHOST` o `DB_HOST` | Sí | Host o socket PostgreSQL |
| `PGDATABASE` o `DB_NAME` | Sí | Base de datos objetivo |
| `PGUSER` o `DB_USER` | Sí | Usuario de conexión |
| `PGPASSWORD` o `DB_PASSWORD` | Sí | Contraseña de conexión |
| `PGPORT` o `DB_PORT` | Sí | Puerto PostgreSQL |
| `APP_PORT` | No | Puerto de compatibilidad; por defecto `8050` |
| `APP_DEBUG` | No | Debug de compatibilidad; por defecto `true` |
| `WEBAPP_JAVA_HOST` | No | Host del servidor local; por defecto `127.0.0.1` |
| `WEBAPP_JAVA_PORT` | No | Puerto del servidor local; por defecto `8050` |
| `WEBAPP_JAVA_DEBUG` | No | Debug del servidor local; el script lo activa por defecto |

No se incluyen credenciales de usuario de la aplicación porque el código
actual no expone un flujo de login verificable. Las credenciales PostgreSQL
son configuración local y nunca deben copiarse al README, al repositorio ni a
capturas públicas.

## Base de datos y despliegue local

1. Crea una base PostgreSQL vacía con el nombre elegido y configura las
   variables anteriores en `.env.local`.
2. Desde la raíz, aplica el DDL canónico:

   ```bash
   . .venv/bin/activate
   python db_management/init_db.py
   ```

   [`db_management/schema.sql`](db_management/schema.sql) es el DDL vigente y
   [`db_management/init_db.py`](db_management/init_db.py) es el script
   soportado de inicialización. La guía operativa está en
   [`db_management/documentacion.md`](db_management/documentacion.md).
3. Antes de ejecutar el DDL sobre datos existentes, realiza un backup y revisa
   las notas de idempotencia y límites de esa guía. No existe un `reset_db.py`
   ni un mecanismo de migraciones incrementales soportado.

### Modelo de datos tipo grafo

El DDL de [`db_management/schema.sql`](db_management/schema.sql) separa la
proyección genérica del grafo de la estructura BPM canónica. La proyección
genérica usa `node`, con `id BIGSERIAL`, `node_type`, `code UNIQUE`, `name`,
`description`, `status` y `metadata JSONB`, y `relationship`, cuyos campos
`parent_node_id` y `child_node_id` son claves foráneas a `node`, junto con
`relationship_type`, `metadata JSONB` e `is_primary`. `relationship` no permite
auto-relaciones y exige `UNIQUE(parent_node_id, child_node_id,
relationship_type)`; esta tabla no representa la relación BPM canónica.

La estructura BPM canónica está formada por `bpm_process`, `pm_process_node` y
`pm_process_transition`. `pm_process_node` usa `node_id UUID`, `process_id`
como clave foránea a `bpm_process`, `node_code` único por proceso y los tipos
`input`, `output`, `operation`, `subprocess`, `decision` y `stock`. Los
subprocesos incluyen `child_process_id`, también vinculado a `bpm_process`.
`pm_process_transition` conecta `source_node_id` con `target_node_id`, ambos
referidos a nodos BPM, y admite `transition_type` `sequence` o `branch`, además
de `label`, `condition` y `properties`.

`machine_operation_configuration.operation_id` apunta a un nodo BPM de tipo
`operation`; el esquema valida además que ese nodo pertenezca al mismo proceso
indicado por `process_id`.

## Ejecución local

```bash
. .venv/bin/activate
bash scripts/run_webapp_java_local.sh
```

La aplicación queda disponible en <http://127.0.0.1:8050>. El script arranca
[`uc_bib_solv/local_server.py`](uc_bib_solv/local_server.py), registra la app
Flask, sirve `uc_bib_solv/webapp/` y expone las APIs bajo `/api/...`.

Para cambiar el puerto del servidor local:

```bash
WEBAPP_JAVA_PORT=8051 bash scripts/run_webapp_java_local.sh
```

## Funcionalidades principales

### Bloque 1: BPM y contexto de máquina, proceso, operación y contrato

El módulo `uc_bib_solv/modules/bpm` concentra el dominio operativo y separa
entidades, casos de uso, puertos y adaptadores. Gestiona procesos industriales
y sus nodos BPM (entrada, salida, operación, subproceso, decisión y stock),
transiciones secuenciales o ramificadas con etiquetas/condiciones y las reglas
de identidad, jerarquía, layout y metadatos del grafo. Sus casos de uso y
servicios de aplicación exponen tanto el catálogo operativo como el modelado
del proceso, mientras que los adaptadores PostgreSQL persisten el proceso, sus
nodos y transiciones.

El mismo bloque relaciona el contexto de máquinas con procesos, operaciones y
contratos: mantiene el catálogo de máquinas y tipos de máquina, las
asociaciones contrato-máquina y la configuración de operación-máquina, con las
validaciones que impiden vincular una operación a un proceso distinto. La SPA
lo presenta en las vistas de procesos y detalle de proceso, operaciones y
detalle de operación, contratos y detalle de contrato, máquinas y detalle de
máquina, además de la vista de contexto estructurado. `bpm-studio.html` y sus
componentes ofrecen el BPM Studio para diseñar el grafo, consultar sus datos y
analizarlo, incluyendo expansión inline de subprocesos, breadcrumbs, relayout,
scroll y fullscreen reversible.

### Bloque 2: análisis RCA, templates y análisis

El módulo `uc_bib_solv/modules/rca_tree` mantiene el árbol causal por contrato
y sus invariantes. Los casos de uso de `causes` crean, actualizan, eliminan y
mueven causas con control de versión y prevención de ciclos; los de
`hypotheses` gestionan hipótesis y sus dependencias; y los de
`reusable_nodes` buscan, crean y enlazan nodos causales reutilizables. La capa
de dominio representa el grafo causal y sus reglas, y los adaptadores
PostgreSQL persisten causas, relaciones, hipótesis y auditoría.

Las templates reutilizables son la base o snapshot con la que se puede abrir
una investigación, pero no son el resultado de esa investigación: los casos
de uso de `analyses` listan templates por proceso, crean y consultan sesiones
de análisis, actualizan su estado (incluida la reapertura explícita) y guardan
resultados por causa o hipótesis. La SPA expone este flujo en las vistas de
árboles RCA, detalle de causa (incluidas hipótesis y nodos reutilizables) y
workspace de análisis; el backend conserva la trazabilidad y las reglas de
validación de los resultados.

## Estructura del proyecto

```text
uc_bib_solv/
├── backend_app.py                  # Fábrica/entrada de la aplicación Flask
├── local_server.py                  # Servidor local que sirve la SPA y la API
├── modules/
│   ├── bpm/                         # Dominio, casos de uso, puertos y PostgreSQL de BPM
│   │   ├── domain/                  # Procesos, operaciones, contratos, máquinas y reglas
│   │   ├── application/             # Servicios, DTO, puertos y casos de uso
│   │   ├── adapters/                # Adaptadores de entrada/salida y persistencia
│   │   └── infrastructure/          # Wiring de dependencias
│   ├── rca_tree/                    # Árbol causal, templates y sesiones/resultados RCA
│   │   ├── domain/                  # Grafo causal, causas, hipótesis y análisis
│   │   ├── application/             # Casos de uso de tree, causes, hypotheses, reusable_nodes y analyses
│   │   ├── adapters/                # HTTP y persistencia PostgreSQL
│   │   └── infrastructure/          # Composición de la aplicación RCA
│   └── platform/                    # Configuración, bootstrap, salud y wiring compartido
├── architecture_validators/         # Comprobaciones estructurales y de dependencias
├── agent_tools/                     # Puertos y herramientas de agentes
├── utils/                           # Utilidades compartidas, incluido HTTP
└── webapp/                          # SPA, vistas, componentes, estilos y clientes API
    ├── js/api/                      # Clientes de BPM, operaciones, causas y análisis
    ├── js/core/                     # Router, estado, eventos y proyecciones
    ├── js/views/                    # Vistas de procesos, operaciones, contratos, máquinas, contexto y RCA
    ├── js/components/               # Componentes de detalle, formularios, árboles y BPM
    ├── css/                         # Estilos de la SPA y del BPM Studio
    ├── index.html                   # Entrada principal de la SPA
    └── bpm-studio.html              # Entrada dedicada del BPM Studio
```

## Pruebas y validación

Pruebas Python unitarias:

```bash
python3 -m unittest discover -s tests/unit -p 'test_*.py'
```

Pruebas Python de integración (requieren PostgreSQL configurado):

```bash
python3 -m unittest discover -s tests/integration -p 'test_*.py'
```

Validadores arquitectónicos:

```bash
python3 -m unittest tests.architecture.test_architecture_validators tests.architecture.test_t9_boundaries
```

Pruebas E2E de Playwright. El script prepara un servidor aislado en el puerto
`8051`, carga el fixture de análisis y conserva los artefactos en
`.playwright-artifacts/test-results/<timestamp>/`:

```bash
bash scripts/run_ui_tests.sh tests/e2e/bpm-studio-parity.spec.js
```

También se puede ejecutar una suite directamente con `npx playwright test`; la
configuración está en [`playwright.config.js`](playwright.config.js) y permite
sobrescribir `UI_TEST_BASE_URL` y `E2E_ARTIFACTS_DIR`.

## Acceso, despliegue y publicación

- **Login y credenciales de prueba:** no hay un flujo de autenticación de
  usuario implementado/verificado en la aplicación local; por tanto no existe
  usuario ni contraseña de demo que publicar.
- **Despliegue público:** no se ha encontrado una URL pública versionada o
  verificable. La ejecución documentada es local en `127.0.0.1:8050`.
- **Vídeo del TFM:** no hay vídeo ni URL pública de vídeo en el repositorio;
  queda pendiente de la entrega humana.
- **Repositorio:**
  [github.com/PedroGarciaVara/process_context_analisys](https://github.com/PedroGarciaVara/process_context_analisys).
  La visibilidad y los permisos deben confirmarse antes de enviar el TFM.

## Slides y material de presentación

El repositorio incluye la presentación editable
[`documentacion/presentacion_proyecto.pptx`](documentacion/presentacion_proyecto.pptx). Como
material auxiliar se incluyen el [guion](slides/guion_presentacion.md), el
[flujo de demo](slides/flujo_demo.md), la [información técnica](slides/informacion_tecnica_presentacion.md),
el [inventario de capturas](slides/inventario_capturas.md) y las
[fuentes](slides/fuentes.md). No se ha encontrado una URL pública de Slides;
el PPTX adjunto es la referencia disponible para la entrega.

## Estado actual y pendientes de entrega

El código y la documentación describen el estado actual de la aplicación
Flask/PostgreSQL y sus pruebas. Permanecen como trabajo técnico o de entrega:

- retirar o justificar las dependencias y textos legacy de Dash;
- confirmar el mecanismo de migraciones de base de datos si se requiere para
  producción;
- completar y verificar el despliegue público, si se decide realizarlo;
- grabar y publicar el vídeo explicativo;
- confirmar visibilidad del repositorio y reunir las URLs finales para el
  formulario del TFM.

Los artefactos SDD y los requerimientos detallados se mantienen separados de
la implementación en `requeriments_spec_driven_development/` y
`requerimientos_cliente/`.
