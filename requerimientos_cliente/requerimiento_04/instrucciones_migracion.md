# instruccion_migracion.md

# Objetivo

Migrar aplicaciones desarrolladas actualmente en Dash dentro de Dataiku hacia una arquitectura basada en:

* HTML
* CSS
* Javascript
* Python Backend (Flask interno de Dataiku)

manteniendo:

* acceso completo a Dataiku API
* acceso a Datasets
* acceso a SQLExecutor2
* acceso a Managed Folders
* acceso a Variables de Proyecto
* acceso a LLMs y APIs internas

y mejorando:

* escalabilidad UI
* reutilización de componentes
* mantenimiento
* modales complejos
* tabs dinámicas
* multipágina
* experiencia de usuario

---

# Arquitectura objetivo

```text
Frontend
│
├── HTML
├── CSS
├── Javascript
│
└── fetch()
        │
        ▼

Backend Flask (Dataiku)

        │

        ├── Datasets
        ├── SQLExecutor2
        ├── Variables
        ├── Managed Folders
        ├── APIs
        └── Databricks/Postgres
```

---

# Regla principal

La UI nunca debe contener lógica de negocio.

Responsabilidades:

Frontend:

* renderizado
* navegación
* interacción usuario
* validaciones visuales

Backend:

* reglas negocio
* consultas SQL
* transformaciones
* acceso DSS
* seguridad

---

# Estructura recomendada

```text
webapp/

│
├── index.html
│
├── css/
│   ├── app.css
│   ├── layout.css
│   ├── forms.css
│   ├── modal.css
│   └── tables.css
│
├── js/
│
│   ├── app.js
│
│   ├── core/
│   │   ├── state.js
│   │   ├── router.js
│   │   ├── events.js
│   │   └── utils.js
│
│   ├── api/
│   │   ├── checklists.js
│   │   ├── tasks.js
│   │   ├── users.js
│   │   └── machines.js
│
│   ├── views/
│   │   ├── dashboard.js
│   │   ├── checklist.js
│   │   ├── ishikawa.js
│   │   └── tasks.js
│
│   ├── components/
│   │   ├── navbar.js
│   │   ├── sidebar.js
│   │   ├── modal.js
│   │   ├── tabs.js
│   │   ├── table.js
│   │   └── loader.js
│
│   └── services/
│       ├── notifications.js
│       └── permissions.js
│
└── uc_bib_solv/
    ├── app.py
    ├── routes/
    │   ├── checklist.py
    │   ├── task.py
    │   └── machine.py
    │
    ├── services/
    │   ├── checklist_service.py
    │   ├── task_service.py
    │   └── machine_service.py
    │
    ├── repositories/
    │   ├── postgres.py
    │   └── databricks.py
    │
    └── utils/
        └── common.py
```

---

# Patrón de capas obligatorio

Nunca:

```text
Javascript
    ↓
SQL
```

Nunca:

```text
Javascript
    ↓
Dataset
```

Siempre:

```text
Javascript
    ↓
API Flask
    ↓
Service
    ↓
Repository
    ↓
Datasource
```

---

# Backend Flask

Dataiku expone Flask internamente.

Ejemplo:

```python
@app.route("/api/tasks")
def get_tasks():
    return json.dumps(...)
```

---

# Organización Backend

## Routes

Solo reciben requests.

```python
@app.route(...)
```

No contienen lógica.

---

## Services

Contienen:

* reglas negocio
* validaciones
* orquestación

---

## Repositories

Contienen:

* SQL
* acceso datasets
* acceso APIs

---

# Estado global Frontend

Toda aplicación debe tener:

```javascript
const AppState = {
    user: null,
    filters: {},
    currentChecklist: null,
    currentMachine: null
}
```

Nunca almacenar estado distribuido por múltiples componentes.

---

# Componentes reutilizables

Objetivo:

No duplicar HTML.

Ejemplo:

```text
ModalAsignacion
ModalValidacion
ModalConfirmacion
```

todos heredan de:

```text
ModalBase
```

---

# Navegación

No crear:

```text
checklist.html
tasks.html
dashboard.html
```

Crear:

```text
index.html
```

único.

---

Las vistas deben cargarse dinámicamente.

```javascript
showView("tasks")
showView("checklists")
```

---

# HTML dinámico

Evitar:

```javascript
html += "<div>..."
```

cuando la UI crezca.

---

Utilizar:

```javascript
createElement()
```

o templates.

---

# Bootstrap

Framework recomendado.

Aporta:

* grids
* modales
* tabs
* acordeones
* formularios
* responsive

Reducir CSS custom.

---

# AG-Grid

Recomendado para:

* tareas
* checklists
* incidencias
* históricos

Ventajas:

* filtros
* agrupaciones
* edición
* exportación

---

# Modal First Design

Regla:

Toda acción de negocio debe ejecutarse desde modal.

Ejemplos:

* crear checklist
* editar checklist
* asignar tarea
* validar tarea
* crear causa Ishikawa

---

# Comunicación Frontend Backend

Crear capa API.

Nunca:

```javascript
fetch(...)
```

directamente en componentes.

---

Correcto:

```javascript
api/tasks.js
```

```javascript
getTasks()
```

```javascript
createTask()
```

```javascript
deleteTask()
```

---

# Convención endpoints

```text
/api/tasks

GET
POST

/api/tasks/{id}

GET
PUT
DELETE
```

---

# Servicios DSS

Todo acceso DSS debe encapsularse.

Nunca:

```python
dataiku.Dataset(...)
```

repetido por toda la aplicación.

Crear:

```python
DatasetRepository
```

---

# SQLExecutor2

Toda query debe estar centralizada.

```python
repositories/
```

Nunca SQL distribuido por routes.

---

# Gestión de permisos

Crear servicio:

```python
PermissionService
```

Capaz de:

* roles
* grupos
* permisos DSS

---

# Sistema de eventos

Crear EventBus simple.

```javascript
publish(...)
subscribe(...)
```

Permite desacoplar componentes.

---

# Gestión de errores

Backend:

Siempre devolver:

```json
{
    "success": false,
    "message": "...",
    "details": "..."
}
```

---

Frontend:

Crear:

```javascript
NotificationService
```

para:

* success
* warning
* error

---

# Migración Dash

Dash:

```python
Dropdown
Callback
Table
Modal
```

↓

Migración:

Dropdown:

```html
<select>
```

Table:

```text
AG-Grid
```

Modal:

```text
Bootstrap Modal
```

Callback:

```text
Javascript Event
+
API Flask
```

Store:

```text
AppState
```

---

# Casos ideales para esta arquitectura

* Gestión de tareas
* Sistema de checklists
* Solve Ishikawa
* Gestión documental
* Formularios industriales
* Workflows
* MCP Frontends
* Sistemas de validación

---

# Casos donde Dash sigue siendo mejor

* Reporting
* Analítica rápida
* Exploración datos
* Data Science UI
* Visualizaciones simples

---

# Principio final

Construir la WebApp como una aplicación software empresarial.

No construirla como un dashboard analítico.

Cuando exista duda de diseño:

Elegir siempre:

* componente reutilizable
* separación frontend/backend
* estado centralizado
* API desacoplada
* vistas dinámicas

aunque requiera más desarrollo inicial.
