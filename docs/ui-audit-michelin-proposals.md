# Auditoría UI y propuestas Michelin

Fecha de revisión: 2026-09-09  
Superficies auditadas: `Inicio`, `Máquinas`, `Detalle de máquina` y patrón de referencia `Flow Process`.

## Base corporativa contrastada

- Fuente corporativa digital: **Noto Sans**.
- Azul primario: `#27509B`.
- Azul oscuro: `#00205B`.
- Azul medianoche: `#000C34`.
- Amarillo de acento: `#FCE500`.
- Base recomendada para dashboards: fondo gris claro, tarjetas blancas y color reservado para comunicar estado o interacción.
- Referencias oficiales: [colores](https://designsystem.michelin.com/colors), [tipografía](https://designsystem.michelin.com/brand/typography), [principios de dashboard](https://designsystem.michelin.com/data-visualization/design-guidelines/principles-of-a-dashboard).

## Hallazgos de la UI actual

### Transversales

1. La navegación superior y la lateral repiten las mismas ocho rutas. Esto ocupa espacio, aumenta el ruido y no aporta una jerarquía distinta.
2. La geometría cambia según la vista: Inicio usa un lateral de 380 px, Máquinas uno de 280 px y las vistas con contexto añaden 560 px a la derecha. El producto no conserva un marco espacial estable.
3. La paleta actual se aproxima a un azul industrial, pero no usa de forma sistemática los tokens oficiales Michelin; tampoco aparece el amarillo como señal de acción primaria.
4. Se utiliza Inter mientras la fuente oficial publicada por Michelin es Noto Sans.
5. Hay inconsistencias editoriales visibles: `Maquina`, `Arbol`, `Analisis` y nombres de navegación diferentes entre páginas.
6. Los iconos son útiles, pero algunas tarjetas los usan como decoración a baja opacidad. El sistema Michelin recomienda emplearlos para reducir carga cognitiva y acompañarlos de etiquetas.
7. Falta una relación visual directa con Flow Process: cambia la marca, la tipografía, la barra superior, el ritmo espacial y el tratamiento de acciones.

### Inicio

- El bloque de filtros domina la primera pantalla antes de presentar una prioridad o acción principal.
- Los indicadores quedan desconectados de las investigaciones recientes; informan, pero no conducen al trabajo.
- `Hipótesis automáticas: pendiente implementar` expone deuda interna al usuario final.
- La densidad de la cabecera y doble navegación reduce el espacio útil horizontal.

### Máquinas

- El panel contextual de 560 px es útil conceptualmente, pero en 1440 px deja la tabla demasiado estrecha.
- El ancho resultante hace que las acciones de fila se rompan verticalmente, un fallo severo de legibilidad y selección.
- La tabla, las métricas y el panel derecho compiten por atención; no existe una prioridad clara entre explorar, seleccionar y actuar.
- El filtro de proceso muestra valores largos truncados sin un resumen contextual compacto.

### Detalle de máquina

- La edición se presenta como un formulario continuo muy largo, sin pestañas, índice local ni resumen inicial.
- El panel derecho repite el nombre y una operación, pero reserva 560 px casi vacíos.
- `Guardar cambios` queda al final del formulario y desaparece durante la edición.
- Los editores de datos estructurados son funcionales, aunque visualmente tienen el mismo peso que campos básicos y dificultan el escaneo.
- El vínculo entre proceso, operación, contrato y máquina debería mostrarse como contexto navegable, no solo como texto.

## Propuestas

### 01 · Control de planta — recomendada

La opción con mayor continuidad respecto a Flow Process. Conserva una barra superior oscura, sustituye la biblioteca por un rail compacto en las páginas operativas y utiliza una zona de trabajo clara. El amarillo identifica la acción primaria y la selección; no se usa como relleno decorativo.

- Inicio orientado a prioridades y estado del flujo.
- Máquinas en tabla amplia con inspector contextual de 315 px.
- Detalle con resumen, pestañas, formulario y panel de relaciones del grafo.
- Mejor candidata para convertirse en el nuevo shell común del producto.

### 02 · Ruta operativa

Opción con mayor identidad visual. Usa el fondo suave de carretera y huella únicamente en cabeceras editoriales; el resto sigue siendo una superficie de trabajo blanca y gris.

- Inicio narrativo, con acceso inmediato a la operación activa.
- Máquinas como tarjetas comparables por estado y salud.
- Detalle dividido en identidad, especificación y contexto conectado.
- Adecuada cuando el público incluye responsables de planta y usuarios ocasionales.

### 03 · Precisión técnica

Opción de máxima densidad útil. Mantiene filtros persistentes, tabla principal, inspector y códigos de entidad visibles.

- Inicio como consola analítica compacta.
- Máquinas como registro técnico con selección y detalle lateral.
- Detalle en matriz de datos con inspector del grafo de negocio.
- Adecuada para ingeniería, mantenimiento y usuarios intensivos; menos amable para perfiles ocasionales.

## Comparación

| Criterio | 01 Control de planta | 02 Ruta operativa | 03 Precisión técnica |
|---|---:|---:|---:|
| Coherencia con Flow Process | Alta | Media | Alta |
| Identidad Michelin | Alta | Muy alta | Alta |
| Velocidad para usuario experto | Alta | Media | Muy alta |
| Claridad para usuario ocasional | Alta | Muy alta | Media |
| Escalabilidad a otras páginas | Muy alta | Alta | Alta |
| Densidad de información | Media-alta | Media | Muy alta |

## Recomendación

Adoptar **Control de planta** como sistema base. Integrar dos decisiones de las otras opciones:

- La cabecera con fondo tenue de Ruta operativa para Inicio y páginas de entrada, nunca detrás de tablas o formularios.
- El inspector de relaciones y los filtros persistentes de Precisión técnica para vistas complejas.

El resultado sería un único shell Michelin: barra superior azul medianoche, rail compacto, superficies gris claro/blanco, acciones primarias amarillas y panel de contexto adaptable entre 320 y 420 px.

## Dirección combinada seleccionada

Tras la revisión se añade una cuarta variante que materializa la combinación solicitada:

- conserva el rail izquierdo compacto de `Control de planta`, con iconos y etiquetas debajo;
- incorpora una cabecera principal grande con la imagen de carretera y huella de `Ruta operativa`;
- Inicio utiliza una capa gris clara sobre la imagen para transmitir calma y mantener el texto oscuro;
- Máquinas y Detalle utilizan una capa azul Michelin de alto contraste con texto blanco;
- mantiene tablas, formularios y contexto sobre superficies blancas para que la fotografía no interfiera con el trabajo.

Esta variante pasa a ser la dirección preferente para una futura implementación sobre las vistas reales.

## Estado de adopción

La dirección combinada quedó aplicada como fase visual común el 2026-09-09. La implementación y las propuestas funcionales posteriores se detallan en `docs/michelin-ui-phase-1-roadmap.md`.

## Artefactos

- Laboratorio navegable: `uc_bib_solv/webapp/ui-redesign-proposals.html`.
- Estilos: `uc_bib_solv/webapp/css/ui-redesign-proposals.css`.
- Estados de ejemplo: `uc_bib_solv/webapp/js/ui-redesign-proposals.js`.
- Fondo generado: `uc_bib_solv/webapp/assets/ui-proposals/michelin-road-soft.png`.
- Validación visual: `tests/e2e/ui-redesign-proposals.spec.js`.

El distintivo `MI` del prototipo es un marcador conceptual, no una reproducción ni sustitución del logotipo oficial. En producción debe utilizarse únicamente un recurso de marca autorizado por Michelin.
