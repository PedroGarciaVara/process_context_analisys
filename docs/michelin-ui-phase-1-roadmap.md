# Sistema visual Michelin — fase 1 y evolución funcional

Fecha: 2026-09-09  
Alcance aplicado: todas las rutas vigentes de la webapp Java y `studio-procesos`.

## Fase 1 implementada

Esta fase cambia la presentación, no el contrato funcional. Se conservan entidades, campos, tablas, filtros, botones, formularios, eventos, rutas y llamadas de API existentes.

El sistema común incorpora:

- tipografía `Noto Sans`;
- azul Michelin `#27509B`, azul oscuro `#00205B`, azul medianoche `#000C34` y amarillo `#FCE500`;
- barra superior azul medianoche y rail izquierdo compacto con icono y texto inferior;
- cabeceras grandes con fondo tenue de carretera/neumático: gris en Inicio y azul de alto contraste en el resto;
- superficies de trabajo gris claro, tarjetas blancas, bordes sobrios y estados de foco visibles;
- acciones principales amarillas y selección activa azul;
- inspector derecho de 320–380 px; en Árbol y Análisis, 380–440 px;
- paleta equivalente en Studio y navegación compacta hacia Inicio y los demás módulos, sin alterar el editor, el grafo ni su persistencia;
- tratamiento específico del lienzo causal y traslado visual de los filtros de Árbol a una barra de alcance, conservando sus mismos identificadores y eventos.

El distintivo `MI` sigue siendo un marcador de interfaz. Debe sustituirse por un recurso de marca aprobado antes de una distribución corporativa.

## Evolución profunda propuesta por página

Estas propuestas quedan fuera de la fase estética. Cada bloque puede implementarse y validarse de forma independiente.

| Página | Mejora profunda propuesta | Validación funcional posterior |
|---|---|---|
| Inicio | Convertirla en centro de mando por rol, con prioridades, alertas reales, trabajos reanudables, vistas guardadas y actividad reciente procedente del grafo. | Un operario encuentra y reanuda su trabajo prioritario en dos acciones; las cifras coinciden con API y filtros. |
| Máquinas | Búsqueda, filtros y ordenación persistentes; columnas configurables; salud calculada por KPI/telemetría; selección múltiple y operaciones por lote. | Filtros combinados reproducibles por URL; tabla estable con miles de activos; acciones masivas auditadas. |
| Detalle de máquina | Separar identidad, capacidades, controles, etapas, asignaciones y contratos en secciones navegables; guardado fijo, historial, comparación y control de cambios. | Ningún cambio se pierde al navegar; la versión y el autor quedan registrados; relaciones BPM navegables. |
| Procesos | Añadir jerarquía visual, propietario, ciclo de vida, calidad del modelo, búsqueda avanzada, importación y previsualización del grafo. | Se distingue proceso/subproceso y borrador/publicado; filtros y conteos coinciden con el repositorio. |
| Detalle de proceso | Versionado formal, aprobaciones, impacto de cambios y mapa de consumidores: subprocesos, operaciones, máquinas, contratos y análisis. | Antes de publicar se enumeran relaciones afectadas; una versión publicada puede recuperarse y compararse. |
| Operaciones | Catálogo transversal con búsqueda por capacidad, máquina, proceso, contrato y estado de completitud; edición controlada en lote. | Una operación se localiza por cualquier relación de negocio; la edición múltiple valida conflictos antes de guardar. |
| Detalle de operación | Formularios tipados para descripción, capacidad, parámetros, controles, limitaciones y etapas; contexto navegable y procedencia de cada dato. | Los datos dejan de depender de JSON libre; esquema y unidades se validan; máquina/contrato/proceso abren su ficha correcta. |
| Contratos | Constructor de alcance proceso/operación, editor de KPI y tolerancias, matriz de cobertura y conflictos, dependencias e impacto. | No se puede publicar un contrato sin alcance y métrica válidos; conflictos y huecos de cobertura son explicables. |
| Detalle de contrato | Simulación del KPI, asignación versionada de máquinas, dependencias contractuales y análisis de impacto antes de modificarlo. | Los ejemplos de prueba dan el resultado esperado; el cambio muestra y confirma consumidores afectados. |
| Árbol | Lienzo causal especializado descrito en el foco 1. | Escenarios de navegación, edición, escala, accesibilidad y trazabilidad del foco 1. |
| Análisis de causas | Expediente guiado y trazable descrito en el foco 2. | Escenarios de apertura, evaluación, evidencia, conclusión, cierre y auditoría del foco 2. |
| Detalle de causa | Protección frente a cambios sin guardar, búsqueda y vinculación con prevención de duplicados, procedencia, historial e hipótesis comparables. | Aviso de salida con cambios; no se crean duplicados silenciosos; toda vinculación conserva autor, fecha y origen. |
| Contexto estructurado | Sustituir el UUID manual por buscador de proceso/versión; alternar vista negocio/grafo/JSON; exportar y validar la proyección. | El usuario obtiene el mismo contexto desde nombre o UUID; referencias navegables y exportación reproducible. |
| Studio procesos | Colaboración y bloqueo optimista, versiones y comparación visual, validación continua, autosave recuperable y datos de negocio tipados en el inspector. | Dos editores no pisan cambios; se recupera un borrador; diferencias y errores bloqueantes son visibles antes de publicar. |

## Foco 1 — Árbol causal

Objetivo: que el árbol deje de ser sólo una proyección completa y se convierta en una herramienta de investigación navegable incluso con grafos grandes.

### Lote A · Orientación y escala

- minimapa, encuadre de selección y ruta de migas desde el objetivo hasta el nodo activo;
- plegado y expansión por rama, con recuento de descendientes ocultos;
- búsqueda por causa, hipótesis, responsable, máquina y estado, resaltando la ruta encontrada;
- modos de disposición automática horizontal, vertical y por categorías;
- virtualización del renderer para árboles grandes sin alterar el grafo persistido.

Validación: abrir un árbol de al menos 500 nodos, localizar una causa conocida, mostrar su ruta y volver al objetivo sin perder selección ni zoom; interacción fluida y sin solapamientos.

### Lote B · Construcción causal

- inserción directa de causa hija, causa reutilizada o contrato dependiente desde el nodo;
- prevención visible de ciclos y duplicados antes de confirmar;
- deshacer/rehacer de cambios estructurales;
- estados con semántica explícita: pendiente, retenida, descartada, confirmada y resuelta;
- agrupación por 6M u otra taxonomía configurable, sin convertirla en la estructura del grafo.

Validación: construir y deshacer una rama mixta, intentar un ciclo, reutilizar una causa y comprobar que el backend conserva una relación DAG sin duplicar la entidad.

### Lote C · Evidencia y trazabilidad

- evidencia, fuente, fecha, autor y nivel de confianza vinculados a causa o hipótesis;
- superposición opcional de procesos, operaciones, máquinas y contratos afectados;
- historial de decisiones y comparación entre revisiones del árbol;
- accesibilidad completa por teclado y alternativa tabular al lienzo.

Validación: reconstruir quién aceptó o rechazó una hipótesis, con qué evidencia y qué versión del contexto BPM estaba vigente; completar el flujo principal sólo con teclado.

## Foco 2 — Análisis de causas

Objetivo: separar con claridad la plantilla causal reutilizable del expediente de una investigación concreta.

### Lote A · Flujo guiado del expediente

- etapas visibles: preparación, investigación, validación, conclusión y cierre;
- checklist de completitud y siguiente acción recomendada;
- participantes, responsabilidades, fechas objetivo y registro de actividad;
- borrador automático y reapertura con motivo.

Validación: abrir un análisis desde plantilla, abandonarlo y reanudarlo; cerrar sólo cuando se cumplen reglas configurables; reapertura registrada en auditoría.

### Lote B · Evaluación de hipótesis

- matriz de hipótesis frente a evidencias, pruebas, KPI y responsables;
- resultado separado de la plantilla: pendiente, validada, rechazada o inconclusa;
- comparación entre snapshot importado y plantilla actual, con incorporación selectiva de novedades;
- registro de contrapruebas y grado de confianza.

Validación: actualizar la plantilla después de abrir el análisis sin modificar su snapshot; incorporar una causa nueva de forma explícita y conservar ambos historiales.

### Lote C · Conclusión y aprendizaje

- conclusión estructurada con causa raíz, factores contribuyentes y acciones propuestas;
- revisión/aprobación por rol y firma de cierre;
- informe reproducible y vínculos a acciones correctivas futuras;
- búsqueda de análisis similares mediante relaciones del grafo, no sólo texto.

Validación: generar el mismo informe desde el expediente cerrado, verificar aprobadores y navegar desde la conclusión hasta evidencia, causa, máquina, operación y contrato.

## Orden recomendado para validación

1. Árbol A: orientación, plegado y búsqueda.
2. Análisis A: etapas y completitud del expediente.
3. Árbol B + Análisis B: construcción y evaluación trazable.
4. Árbol C + Análisis C: evidencia, aprendizaje e informes.
5. Fichas maestras: operación, máquina, contrato y proceso.
6. Inicio y catálogos como capa de productividad transversal.

Este orden permite validar primero el núcleo causal sin mezclarlo con una remodelación simultánea de los modelos maestros.

## Referencias corporativas

- [Michelin Design System — Colors](https://designsystem.michelin.com/colors)
- [Michelin Design System — Typography](https://designsystem.michelin.com/brand/typography)
- [Michelin Design System — Dashboard principles](https://designsystem.michelin.com/data-visualization/design-guidelines/principles-of-a-dashboard)
