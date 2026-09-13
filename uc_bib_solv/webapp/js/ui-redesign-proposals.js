const concepts = {
  command: {
    number: "PROPUESTA 01",
    name: "Control de planta",
    description: "Continuidad máxima con Flow Process: barra oscura, superficies claras y acciones Michelin Yellow.",
    fit: "Recomendada · coherencia 9/10",
  },
  route: {
    number: "PROPUESTA 02",
    name: "Ruta operativa",
    description: "Más narrativa y visual: la ruta industrial guía la entrada sin perder precisión en las pantallas de trabajo.",
    fit: "Diferencial · identidad 9/10",
  },
  precision: {
    number: "PROPUESTA 03",
    name: "Precisión técnica",
    description: "Máxima densidad útil para ingeniería y mantenimiento: filtros persistentes, tablas y panel contextual.",
    fit: "Experta · productividad 9/10",
  },
  hybrid: {
    number: "DIRECCIÓN SELECCIONADA",
    name: "Navegación + ruta visual",
    description: "Rail compacto de Control de planta y cabeceras fotográficas de Ruta operativa, con contraste adaptado a cada página.",
    fit: "Combinación solicitada · 10/10",
  },
};

const navLabels = ["Inicio", "Máquinas", "Procesos", "Contratos", "Causas", "Flow Process"];
const machines = [
  { name: "BA01", area: "Preparación de productos químicos", operation: "Dosificación", health: "98%", status: "Operativa" },
  { name: "BA02", area: "Preparación de productos químicos", operation: "Dosificación", health: "96%", status: "Operativa" },
  { name: "PSA1", area: "Preparación de productos químicos", operation: "Fabricación de bolsa", health: "91%", status: "Revisión" },
  { name: "PSA2", area: "Preparación de productos químicos", operation: "Fabricación de bolsa", health: "94%", status: "Operativa" },
];

const icon = (name) => `<span class="material-symbols-rounded">${name}</span>`;
const activeNav = (label, screen) => (screen === "home" && label === "Inicio") || (screen !== "home" && label === "Máquinas");

function commandChrome(screen, content) {
  return `<section class="concept-shell command-shell" data-proposal="command" data-proposal-screen="${screen}">
    <header class="command-topbar">
      <div class="app-brand"><span class="brand-emblem">MI</span><span><strong>Industrial Intelligence</strong><small>UC BIB Solve</small></span></div>
      <nav class="command-topnav">${navLabels.map((label) => `<span class="${activeNav(label, screen) ? "active" : ""}">${label}</span>`).join("")}</nav>
      <div class="command-actions"><button class="icon-button" aria-label="Buscar">${icon("search")}</button><button class="icon-button" aria-label="Notificaciones">${icon("notifications")}</button><div class="command-user"><i>JP</i><span>J. Pérez</span></div></div>
    </header>
    <div class="command-body">
      <aside class="command-rail">
        ${[["space_dashboard","Resumen"],["precision_manufacturing","Activos"],["conversion_path","Flujos"],["account_tree","Causas"],["query_stats","Análisis"]].map(([glyph,label], index) => `<button class="rail-tool ${index === (screen === "home" ? 0 : 1) ? "active" : ""}">${icon(glyph)}<span>${label}</span></button>`).join("")}
      </aside>
      <main class="command-main">${content}</main>
    </div>
  </section>`;
}

function commandHome() {
  return commandChrome("home", `<div class="command-header"><div><span class="eyebrow">Centro operativo</span><h1 class="page-title">Buenos días, Javier</h1><p class="page-lead">Estado de los procesos, activos e investigaciones de la planta.</p></div><div class="command-header-actions"><button class="secondary-action">${icon("tune")} Configurar panel</button><button class="primary-action">${icon("add")} Nueva investigación</button></div></div>
    <section class="metric-row"><article class="metric"><span>Procesos activos</span><strong>8</strong><small>100% disponibles</small></article><article class="metric"><span>Máquinas supervisadas</span><strong>24</strong><small>22 operativas</small></article><article class="metric"><span>Investigaciones abiertas</span><strong>3</strong><small>1 prioritaria</small></article><article class="metric"><span>Conformidad de flujo</span><strong>96%</strong><small>+2,4% semana</small></article></section>
    <section class="command-grid"><article class="surface-card"><div class="panel-head"><h2>Trabajo prioritario</h2><a>Ver todas</a></div><div class="work-list">${[["priority_high","Fallo de válvula de seguridad · Unidad 4","Evidencia pendiente · hace 18 min","Crítica"],["account_tree","Caída de presión hidráulica · Línea C","5 hipótesis abiertas · hace 4 h","Activa"],["build_circle","Revisión de PSA1","Mantenimiento preventivo · mañana","Planificada"]].map(([g,t,s,b],i)=>`<div class="work-row"><span>${icon(g)}</span><div><strong>${t}</strong><small>${s}</small></div><span class="tag ${i===0?"warn":i===1?"blue":""}">${b}</span></div>`).join("")}</div></article>
    <article class="surface-card"><div class="panel-head"><h2>Flujo en curso</h2><a>Abrir Flow Process</a></div><div class="flow-preview"><div class="flow-line"></div><div class="flow-nodes"><div class="flow-node start">Inicio</div><div class="flow-node">Dosificación</div><div class="flow-node alert">Verificación</div><div class="flow-node">Evacuación</div></div><div class="progress"><i style="width:68%"></i></div></div></article></section>`);
}

function machineRows() {
  return machines.map((m, index) => `<tr class="${index===0?"is-selected":""}"><td><span class="machine-name"><span class="machine-icon">${icon("precision_manufacturing")}</span>${m.name}</span></td><td>${m.operation}</td><td>${m.area}</td><td><span class="tag ${m.status==="Operativa"?"good":"warn"}"><i class="status-dot"></i>${m.status}</span></td><td><strong>${m.health}</strong></td><td>•••</td></tr>`).join("");
}

function commandMachines() {
  return commandChrome("machines", `<div class="command-header"><div><span class="eyebrow">Activos industriales</span><h1 class="page-title">Máquinas</h1><p class="page-lead">Gestiona equipos y consulta su contexto dentro de los procesos BPM.</p></div><div class="command-header-actions"><button class="secondary-action">${icon("download")} Exportar</button><button class="primary-action">${icon("add")} Nueva máquina</button></div></div>
    <section class="surface-card filter-bar"><div class="filter-control">${icon("search")}<span>Buscar máquina, área u operación…</span></div><div class="filter-control">${icon("conversion_path")}<span>Preparación químicos</span></div><div class="filter-control">${icon("fact_check")}<span>Todos los estados</span></div><button class="secondary-action">Limpiar</button></section>
    <section class="machines-layout"><div class="surface-card" style="overflow:hidden"><div class="panel-head"><h2>24 máquinas <span class="tag blue">4 visibles</span></h2><a>Última actualización: ahora</a></div><table class="proposal-table"><thead><tr><th>Máquina</th><th>Operación</th><th>Área</th><th>Estado</th><th>Salud</th><th></th></tr></thead><tbody>${machineRows()}</tbody></table></div>
    <aside class="surface-card machine-preview"><span class="eyebrow">Selección actual</span><h2>BA01</h2><p>Báscula automática de dosificación</p><div class="definition-list"><div><span>Proceso</span><strong>Preparación de productos químicos</strong></div><div><span>Operación BPM</span><strong>Dosificación</strong></div><div><span>Contrato</span><strong>Contrato 3</strong></div><div><span>Última revisión</span><strong>08 sep 2026</strong></div></div><div class="progress"><i style="width:98%"></i></div><div style="display:flex;gap:7px;margin-top:14px"><button class="primary-action" style="flex:1">Abrir ficha</button><button class="secondary-action">${icon("more_horiz")}</button></div></aside></section>`);
}

function detailForm() {
  return `<div class="mini-form form-grid"><label>Nombre<input value="BA01" /></label><label>Tipo de máquina<input value="Báscula automática" /></label><label>Principio de funcionamiento<textarea>Dosificación gravimétrica controlada por PLC.</textarea></label><label>Descripción técnica<textarea>Dosifica productos químicos en bolsa durante el avance.</textarea></label><label>Capacidad nominal<input value="25 kg / ciclo" /></label><label>Sistema de control<input value="PLC Siemens S7" /></label></div>`;
}

function commandDetail() {
  return commandChrome("detail", `<div class="command-header" style="align-items:center"><div><span class="eyebrow">Máquinas / BA01</span><p class="page-lead">Ficha operativa y contexto de negocio</p></div><div class="command-header-actions"><button class="secondary-action">${icon("arrow_back")} Volver</button><button class="primary-action">${icon("save")} Guardar cambios</button></div></div>
    <section class="surface-card detail-hero"><div class="detail-ident"><span class="machine-icon">${icon("precision_manufacturing")}</span><div><span class="tag good"><i class="status-dot"></i>Operativa</span><h1>BA01</h1><p>Báscula automática · Preparación de productos químicos</p></div></div><div class="metric-row" style="grid-template-columns:repeat(3,105px)"><div class="metric"><span>Salud</span><strong>98%</strong></div><div class="metric"><span>Etapas</span><strong>4</strong></div><div class="metric"><span>Contratos</span><strong>1</strong></div></div></section>
    <section class="detail-grid"><article class="surface-card"><div class="tabs"><span class="active">Información técnica</span><span>Parámetros</span><span>Etapas BPM</span><span>Historial</span></div><div class="form-section"><h3>Máquina genérica y específica</h3>${detailForm()}</div></article><aside style="display:grid;gap:12px;align-content:start"><article class="surface-card context-card"><span class="eyebrow">Contexto conectado</span><h3>Relaciones del grafo</h3><div class="definition-list"><div><span>Proceso</span><strong>Preparación de productos químicos</strong></div><div><span>Operación</span><strong>Dosificación</strong></div><div><span>Contrato</span><strong>Contrato 3</strong></div></div><button class="secondary-action" style="width:100%">${icon("conversion_path")} Ver en Flow Process</button></article><article class="surface-card context-card"><h3>Actividad reciente</h3><div class="timeline"><div class="timeline-row"><i></i><div><strong>Parámetros verificados</strong><small>Hoy · 08:42</small></div></div><div class="timeline-row"><i></i><div><strong>Contrato vinculado</strong><small>Ayer · 16:18</small></div></div><div class="timeline-row"><i></i><div><strong>Equipo creado</strong><small>21 ago 2026</small></div></div></div></article></aside></section>`);
}

function routeChrome(screen, content) {
  const items = [["home","Inicio"],["precision_manufacturing","Máquinas"],["conversion_path","Procesos"],["description","Contratos"],["account_tree","Análisis"],["hub","Flow Process"]];
  return `<section class="concept-shell route-shell" data-proposal="route" data-proposal-screen="${screen}"><aside class="route-sidebar"><div class="app-brand"><span class="brand-emblem">MI</span><span><strong>Industrial Intelligence</strong><small>UC BIB Solve</small></span></div><nav class="route-nav">${items.map(([g,l])=>`<span class="${activeNav(l,screen)?"active":""}">${icon(g)}${l}</span>`).join("")}</nav><div class="route-sidebar-foot"><strong>Planta Valladolid</strong><small>Sistemas conectados · 24/24</small></div></aside><div class="route-content"><header class="route-topbar"><div class="route-breadcrumb">Planta / <strong>${screen==="home"?"Resumen":screen==="machines"?"Máquinas":"Máquinas / BA01"}</strong></div><div class="route-top-actions"><span class="tag good"><i class="status-dot"></i>Sistema operativo</span><button class="icon-button">${icon("search")}</button><button class="icon-button">${icon("notifications")}</button><button class="icon-button">${icon("account_circle")}</button></div></header><main class="route-main">${content}</main></div></section>`;
}

function routeHome() {
  return routeChrome("home", `<section class="route-hero"><span class="eyebrow">Martes, 9 de septiembre</span><h1>La operación industrial, de un vistazo.</h1><p>Procesos, máquinas e investigaciones conectados sobre el mismo contexto de negocio.</p><div class="route-hero-actions"><button class="primary-action">${icon("play_arrow")} Abrir operación activa</button><button class="secondary-action">Explorar Flow Process</button></div></section><section class="route-kpis"><article class="route-kpi"><span>Eficiencia de planta</span><strong>96,4%</strong></article><article class="route-kpi"><span>Máquinas disponibles</span><strong>22 / 24</strong></article><article class="route-kpi"><span>Flujos conformes</span><strong>7 / 8</strong></article><article class="route-kpi"><span>Alertas prioritarias</span><strong>1</strong></article></section><section class="route-grid"><article class="surface-card"><div class="panel-head"><h2>Salud de máquinas</h2><a>Ver parque completo</a></div><div class="machine-health-list">${machines.map((m)=>`<div class="health-row"><span class="machine-icon">${icon("precision_manufacturing")}</span><div><strong>${m.name} · ${m.operation}</strong><small>${m.area}</small></div><div class="health-value">${m.health}</div></div>`).join("")}</div></article><article class="surface-card"><div class="panel-head"><h2>Ruta prioritaria</h2><span class="tag warn">1 pendiente</span></div><div class="work-list"><div class="work-row"><span>${icon("warning")}</span><div><strong>Verificar PSA1</strong><small>Revisión de soldadura de cierre</small></div><span class="tag warn">Hoy</span></div><div class="work-row"><span>${icon("account_tree")}</span><div><strong>INV-402</strong><small>Caída de presión · Línea C</small></div><span class="tag blue">Activa</span></div></div></article></section>`);
}

function routeMachines() {
  return routeChrome("machines", `<section class="route-machine-head"><div><span class="eyebrow" style="color:#fce500">Parque industrial</span><h1>Máquinas</h1><p>24 equipos conectados a procesos y operaciones BPM.</p></div><button class="primary-action">${icon("add")} Nueva máquina</button></section><div class="route-segments"><button class="active">Todos · 24</button><button>Operativas · 22</button><button>Revisión · 2</button><button>Preparación de químicos</button><button>${icon("tune")} Más filtros</button></div><section class="machine-card-grid">${machines.map((m,i)=>`<article class="surface-card machine-card ${i===0?"selected":""}"><div class="machine-card-head"><span class="machine-icon">${icon("precision_manufacturing")}</span><span class="tag ${m.status==="Operativa"?"good":"warn"}">${m.status}</span></div><h3>${m.name}</h3><p>${m.operation}<br>${m.area}</p><div class="progress" style="margin-top:12px"><i style="width:${m.health}"></i></div><div class="machine-card-foot"><span>Salud <strong>${m.health}</strong></span><strong>Abrir →</strong></div></article>`).join("")}</section>`);
}

function routeDetail() {
  return routeChrome("detail", `<section class="route-detail-hero"><span class="eyebrow">Ficha operativa</span><h1>BA01</h1><p>Báscula automática · Preparación de productos químicos</p><div class="route-detail-stats"><div><strong>98%</strong><span>Salud técnica</span></div><div><strong>25 kg</strong><span>Capacidad / ciclo</span></div><div><strong>4</strong><span>Etapas operativas</span></div><div><strong>PLC S7</strong><span>Sistema de control</span></div></div></section><section class="route-detail-grid"><article class="surface-card route-detail-card"><h3>Identidad de máquina</h3><div class="mini-form"><label>Nombre<input value="BA01" /></label><label>Descripción<textarea>Dosifica los productos químicos en la bolsa mientras avanza por la báscula.</textarea></label><label>Contrato<select><option>Contrato 3</option></select></label></div></article><article class="surface-card route-detail-card"><h3>Especificación técnica</h3><div class="definition-list"><div><span>Tecnología</span><strong>Gravimétrica</strong></div><div><span>Capacidad</span><strong>25 kg / ciclo</strong></div><div><span>Control</span><strong>PLC Siemens S7</strong></div><div><span>Tolerancia</span><strong>± 5 g</strong></div></div><button class="secondary-action" style="width:100%">Editar parámetros</button></article><article class="surface-card route-detail-card"><span class="eyebrow">Grafo de negocio</span><h3 style="margin-top:6px">Contexto conectado</h3><div class="timeline"><div class="timeline-row"><i></i><div><strong>Preparación de productos químicos</strong><small>Proceso</small></div></div><div class="timeline-row"><i></i><div><strong>Dosificación</strong><small>Operación BPM</small></div></div><div class="timeline-row"><i></i><div><strong>Contrato 3</strong><small>Contrato</small></div></div></div><button class="primary-action" style="width:100%;margin-top:16px">Guardar cambios</button></article></section>`);
}

function precisionChrome(screen, content, rail = "") {
  return `<section class="concept-shell precision-shell" data-proposal="precision" data-proposal-screen="${screen}"><div class="precision-stripe"></div><header class="precision-topbar"><div class="precision-brand">Industrial Intelligence <small>UC BIB Solve</small></div><nav class="precision-nav">${navLabels.map(l=>`<span class="${activeNav(l,screen)?"active":""}">${l}</span>`).join("")}</nav><div class="precision-top-actions"><span class="tag good"><i class="status-dot"></i>Online</span><button class="icon-button">${icon("notifications")}</button><button class="icon-button">${icon("account_circle")}</button></div></header><div class="precision-body"><aside class="precision-filter-rail">${rail || precisionRail(screen)}</aside><main class="precision-main">${content}</main></div></section>`;
}

function precisionRail(screen) {
  return `<h2>${screen==="home"?"Alcance operativo":"Filtros persistentes"}</h2><p>Los criterios se conservan al navegar por el contexto.</p>${[["Proceso",["Todos","Preparación químicos","Fabricación mezclas"]],["Estado",["Operativa","Revisión","Fuera de servicio"]],["Contexto",["Con contrato","Con operación BPM","Con investigación"]]].map(([title,values])=>`<div class="filter-block"><strong>${title}</strong>${values.map((v,i)=>`<div class="filter-choice ${i===0?"active":""}"><span>${v}</span><i></i></div>`).join("")}</div>`).join("")}`;
}

function precisionHome() {
  return precisionChrome("home", `<div class="precision-commandbar"><div class="search">${icon("search")} Buscar proceso, máquina, contrato o investigación</div><button>Exportar</button><button class="primary">+ Nueva investigación</button></div><div class="precision-header"><div><span class="eyebrow">Resumen de planta</span><h1>Estado operativo</h1><p>Datos consolidados · actualización hace 2 minutos</p></div><span class="technical-id">PLANT-VLL-01</span></div><section class="precision-metrics"><div class="precision-metric"><span>Procesos</span><strong>8</strong></div><div class="precision-metric"><span>Máquinas operativas</span><strong>22 / 24</strong></div><div class="precision-metric"><span>Análisis abiertos</span><strong>3</strong></div><div class="precision-metric"><span>Conformidad</span><strong>96,4%</strong></div></section><section class="precision-grid"><article class="precision-panel"><div class="precision-panel-head"><h2>Disponibilidad por proceso</h2><span>Últimas 24 h</span></div><div class="bar-list">${[["Preparación químicos",96],["Fabricación mezclas",92],["Preparación cauchos",88],["Preparación aceites",98]].map(([n,v])=>`<div class="bar-item"><span>${n}</span><div class="progress"><i style="width:${v}%"></i></div><strong>${v}%</strong></div>`).join("")}</div></article><article class="precision-panel"><div class="precision-panel-head"><h2>Excepciones</h2><span>3 elementos</span></div><div class="work-list"><div class="work-row"><span>${icon("warning")}</span><div><strong>PSA1</strong><small>Revisión próxima</small></div><span class="tag warn">24 h</span></div><div class="work-row"><span>${icon("account_tree")}</span><div><strong>INV-415</strong><small>Evidencia pendiente</small></div><span class="tag blue">Abierta</span></div></div></article></section><section class="precision-panel" style="margin-top:10px"><div class="precision-panel-head"><h2>Actividad reciente</h2><span>Ordenada por prioridad</span></div><table class="proposal-table"><thead><tr><th>Elemento</th><th>Tipo</th><th>Proceso</th><th>Estado</th><th>Actualizado</th></tr></thead><tbody><tr><td><strong>INV-415</strong></td><td>Investigación</td><td>Unidad 4</td><td><span class="tag warn">Crítica</span></td><td>18 min</td></tr><tr><td><strong>BA01</strong></td><td>Máquina</td><td>Preparación químicos</td><td><span class="tag good">Operativa</span></td><td>2 h</td></tr></tbody></table></section>`);
}

function precisionMachines() {
  return precisionChrome("machines", `<div class="precision-commandbar"><div class="search">${icon("search")} Buscar por ID, nombre, operación o área</div><button>Columnas</button><button>Exportar CSV</button><button class="primary">+ Nueva máquina</button></div><div class="precision-header"><div><span class="eyebrow">Registro técnico</span><h1>Máquinas</h1><p>24 registros · 22 operativos · 2 en revisión</p></div><span class="technical-id">DATASET: MACHINE-CATALOG</span></div><section class="precision-table-wrap precision-split"><div><table class="proposal-table"><thead><tr><th>ID / Máquina</th><th>Operación BPM</th><th>Estado</th><th>Salud</th><th>Contrato</th></tr></thead><tbody>${machines.map((m,i)=>`<tr class="${i===0?"is-selected":""}"><td><strong>${String(i+5).padStart(3,"0")} · ${m.name}</strong></td><td>${m.operation}</td><td><span class="tag ${m.status==="Operativa"?"good":"warn"}">${m.status}</span></td><td>${m.health}</td><td>${i<2?"Contrato 3":"—"}</td></tr>`).join("")}</tbody></table></div><aside class="precision-aside"><span class="technical-id">MACHINE-005</span><h2>BA01</h2><p>Báscula automática de dosificación</p><div class="definition-list"><div><span>Área</span><strong>Preparación químicos</strong></div><div><span>Operación</span><strong>Dosificación</strong></div><div><span>Salud</span><strong>98%</strong></div><div><span>Modificado</span><strong>09/09/2026</strong></div></div><button class="primary-action" style="width:100%">Abrir detalle</button></aside></section>`, precisionRail("machines"));
}

function precisionDetail() {
  return precisionChrome("detail", `<div class="precision-commandbar"><div class="search">${icon("arrow_back")} Volver a máquinas</div><button>Historial</button><button>Validar JSON</button><button class="primary">Guardar cambios</button></div><section class="precision-detail"><div class="precision-detail-main"><header class="precision-detail-header"><div><span class="technical-id">MACHINE-005</span><h1>BA01 · Báscula automática</h1><p>Preparación de productos químicos / Dosificación</p></div><span class="tag good"><i class="status-dot"></i>Operativa</span></header><div class="precision-data-grid"><section class="precision-section"><h3>Identificación</h3><div class="data-row"><span>Nombre</span><strong>BA01</strong></div><div class="data-row"><span>Tipo</span><strong>Báscula automática</strong></div><div class="data-row"><span>Contrato</span><strong>Contrato 3</strong></div></section><section class="precision-section"><h3>Capacidad nominal</h3><div class="data-row"><span>Valor</span><strong>25 kg</strong></div><div class="data-row"><span>Ciclo</span><strong>20 cmin</strong></div><div class="data-row"><span>Tolerancia</span><strong>± 5 g</strong></div></section><section class="precision-section"><h3>Sistema de control</h3><div class="data-row"><span>Controlador</span><strong>PLC Siemens S7</strong></div><div class="data-row"><span>Modo</span><strong>Maestro / esclavo</strong></div><div class="data-row"><span>Estado</span><strong>En servicio</strong></div></section><section class="precision-section"><h3>Etapas BPM</h3><div class="data-row"><span>01</span><strong>Recepción de bolsa</strong></div><div class="data-row"><span>02</span><strong>Dosificación gravimétrica</strong></div><div class="data-row"><span>03</span><strong>Verificación de peso</strong></div></section></div></div><aside class="precision-inspector"><span class="eyebrow">Inspector de contexto</span><h2>Relaciones del negocio</h2><div class="timeline"><div class="timeline-row"><i></i><div><strong>Preparación de productos químicos</strong><small>PROCESS · ID 2</small></div></div><div class="timeline-row"><i></i><div><strong>Dosificación</strong><small>OPERATION · R12_BU_DOSIFICACION</small></div></div><div class="timeline-row"><i></i><div><strong>BA01</strong><small>MACHINE · ID 5</small></div></div><div class="timeline-row"><i></i><div><strong>Contrato 3</strong><small>CONTRACT · ID 3</small></div></div></div><button class="secondary-action" style="width:100%;margin-top:18px">${icon("conversion_path")} Localizar en Flow Process</button></aside></section>`, `<h2>Ficha técnica</h2><p>Navegación por secciones de la entidad.</p><div class="filter-block"><strong>Secciones</strong>${["Resumen","Máquina genérica","Máquina específica","Etapas BPM","Contratos","Historial"].map((v,i)=>`<div class="filter-choice ${i===0?"active":""}"><span>${v}</span><i></i></div>`).join("")}</div>`);
}

function hybridChrome(screen, content) {
  const railItems = [["space_dashboard","Inicio"],["precision_manufacturing","Máquinas"],["conversion_path","Procesos"],["description","Contratos"],["account_tree","Causas"],["hub","Flow"]];
  return `<section class="concept-shell hybrid-shell" data-proposal="hybrid" data-proposal-screen="${screen}">
    <header class="hybrid-topbar"><div class="app-brand"><span class="brand-emblem">MI</span><span><strong>Industrial Intelligence</strong><small>UC BIB Solve</small></span></div><div class="hybrid-context"><span class="status-dot"></span> Planta Valladolid · datos actualizados</div><div class="hybrid-actions"><button class="icon-button">${icon("search")}</button><button class="icon-button">${icon("notifications")}</button><div class="command-user"><i>JP</i><span>J. Pérez</span></div></div></header>
    <div class="hybrid-body"><aside class="hybrid-rail">${railItems.map(([glyph,label],index)=>`<button class="rail-tool ${index === (screen === "home" ? 0 : 1) ? "active" : ""}">${icon(glyph)}<span>${label}</span></button>`).join("")}</aside><main class="hybrid-main">${content}</main></div>
  </section>`;
}

function hybridHero({ tone, eyebrow, title, description, actions = "", stats = "" }) {
  return `<section class="hybrid-hero hybrid-hero-${tone}"><div class="hybrid-hero-copy"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p>${actions ? `<div class="hybrid-hero-actions">${actions}</div>` : ""}</div>${stats ? `<div class="hybrid-hero-stats">${stats}</div>` : ""}</section>`;
}

function hybridHome() {
  const hero = hybridHero({ tone: "light", eyebrow: "Centro operativo", title: "Buenos días, Javier", description: "Procesos, activos e investigaciones conectados sobre un mismo contexto industrial.", actions: `<button class="primary-action">${icon("add")} Nueva investigación</button><button class="secondary-action">Abrir Flow Process</button>`, stats: `<div><strong>96,4%</strong><span>Conformidad de flujo</span></div><div><strong>22 / 24</strong><span>Máquinas operativas</span></div>` });
  return hybridChrome("home", `${hero}<section class="hybrid-kpis"><article><span>Procesos activos</span><strong>8</strong><small>Todos disponibles</small></article><article><span>Investigaciones abiertas</span><strong>3</strong><small>1 requiere atención</small></article><article><span>Contratos conectados</span><strong>14</strong><small>100% trazables</small></article></section><section class="command-grid hybrid-content-grid"><article class="surface-card"><div class="panel-head"><h2>Trabajo prioritario</h2><a>Ver todo</a></div><div class="work-list"><div class="work-row"><span>${icon("priority_high")}</span><div><strong>Fallo de válvula · Unidad 4</strong><small>Evidencia pendiente · hace 18 min</small></div><span class="tag warn">Crítica</span></div><div class="work-row"><span>${icon("account_tree")}</span><div><strong>Caída de presión · Línea C</strong><small>5 hipótesis abiertas</small></div><span class="tag blue">Activa</span></div><div class="work-row"><span>${icon("build_circle")}</span><div><strong>Revisión de PSA1</strong><small>Mantenimiento preventivo · mañana</small></div><span class="tag">Planificada</span></div></div></article><article class="surface-card"><div class="panel-head"><h2>Flujo en curso</h2><a>Abrir</a></div><div class="flow-preview"><div class="flow-line"></div><div class="flow-nodes"><div class="flow-node start">Inicio</div><div class="flow-node">Dosificación</div><div class="flow-node alert">Verificación</div><div class="flow-node">Evacuación</div></div><div class="progress"><i style="width:68%"></i></div></div></article></section>`);
}

function hybridMachines() {
  const hero = hybridHero({ tone: "blue", eyebrow: "Parque industrial", title: "Máquinas", description: "24 equipos conectados a sus procesos, operaciones BPM y contratos.", actions: `<button class="primary-action">${icon("add")} Nueva máquina</button><button class="hybrid-ghost-action">${icon("download")} Exportar</button>`, stats: `<div><strong>22</strong><span>Operativas</span></div><div><strong>2</strong><span>En revisión</span></div>` });
  return hybridChrome("machines", `${hero}<section class="surface-card filter-bar hybrid-filter"><div class="filter-control">${icon("search")}<span>Buscar máquina, área u operación…</span></div><div class="filter-control">${icon("conversion_path")}<span>Preparación de productos químicos</span></div><div class="filter-control">${icon("fact_check")}<span>Todos los estados</span></div><button class="secondary-action">Limpiar</button></section><section class="machines-layout hybrid-machines-layout"><div class="surface-card" style="overflow:hidden"><div class="panel-head"><h2>Máquinas del alcance <span class="tag blue">4 visibles</span></h2><a>Actualizado ahora</a></div><table class="proposal-table"><thead><tr><th>Máquina</th><th>Operación</th><th>Área</th><th>Estado</th><th>Salud</th><th></th></tr></thead><tbody>${machineRows()}</tbody></table></div><aside class="surface-card machine-preview"><span class="eyebrow">Selección actual</span><h2>BA01</h2><p>Báscula automática de dosificación</p><div class="definition-list"><div><span>Proceso</span><strong>Preparación de productos químicos</strong></div><div><span>Operación BPM</span><strong>Dosificación</strong></div><div><span>Contrato</span><strong>Contrato 3</strong></div></div><div class="progress"><i style="width:98%"></i></div><button class="primary-action" style="width:100%;margin-top:14px">Abrir ficha técnica</button></aside></section>`);
}

function hybridDetail() {
  const hero = hybridHero({ tone: "blue", eyebrow: "Máquinas / Ficha operativa", title: "BA01", description: "Báscula automática · Preparación de productos químicos / Dosificación", actions: `<button class="primary-action">${icon("save")} Guardar cambios</button><button class="hybrid-ghost-action">${icon("history")} Historial</button>`, stats: `<div><strong>98%</strong><span>Salud técnica</span></div><div><strong>25 kg</strong><span>Capacidad / ciclo</span></div><div><strong>4</strong><span>Etapas BPM</span></div>` });
  return hybridChrome("detail", `${hero}<section class="detail-grid hybrid-detail-grid"><article class="surface-card"><div class="tabs"><span class="active">Información técnica</span><span>Parámetros</span><span>Etapas BPM</span><span>Historial</span></div><div class="form-section"><h3>Máquina genérica y específica</h3>${detailForm()}</div></article><aside style="display:grid;gap:12px;align-content:start"><article class="surface-card context-card"><span class="eyebrow">Contexto conectado</span><h3>Relaciones del grafo</h3><div class="timeline"><div class="timeline-row"><i></i><div><strong>Preparación de productos químicos</strong><small>Proceso</small></div></div><div class="timeline-row"><i></i><div><strong>Dosificación</strong><small>Operación BPM</small></div></div><div class="timeline-row"><i></i><div><strong>BA01</strong><small>Máquina específica</small></div></div><div class="timeline-row"><i></i><div><strong>Contrato 3</strong><small>Contrato</small></div></div></div><button class="secondary-action" style="width:100%;margin-top:14px">${icon("conversion_path")} Ver en Flow Process</button></article></aside></section>`);
}

const renderers = {
  command: { home: commandHome, machines: commandMachines, detail: commandDetail },
  route: { home: routeHome, machines: routeMachines, detail: routeDetail },
  precision: { home: precisionHome, machines: precisionMachines, detail: precisionDetail },
  hybrid: { home: hybridHome, machines: hybridMachines, detail: hybridDetail },
};

let currentConcept = "hybrid";
let currentScreen = "home";

function render() {
  const meta = concepts[currentConcept];
  document.querySelector("#concept-number").textContent = meta.number;
  document.querySelector("#concept-name").textContent = meta.name;
  document.querySelector("#concept-description").textContent = meta.description;
  document.querySelector("#concept-fit").textContent = meta.fit;
  const stage = document.querySelector("#proposal-stage");
  stage.dataset.conceptView = currentConcept;
  stage.innerHTML = renderers[currentConcept][currentScreen]();
}

document.querySelectorAll("[data-concept]").forEach((button) => button.addEventListener("click", () => {
  currentConcept = button.dataset.concept;
  document.querySelectorAll("[data-concept]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
  });
  render();
}));

document.querySelectorAll("[data-screen]").forEach((button) => button.addEventListener("click", () => {
  currentScreen = button.dataset.screen;
  document.querySelectorAll("[data-screen]").forEach((item) => item.classList.toggle("is-active", item === button));
  render();
}));

render();
