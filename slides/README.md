# Material base para la presentación del TFM

Este directorio reúne material verificable para preparar las diapositivas de la aplicación **UC_BIB_Solve**. Incluye capturas nuevas del flujo local y capturas históricas reutilizadas; no se han generado imágenes artificiales.

## Índice

- [Presentación Markdown](presentacion_tfm.md): versión estructurada con notas del presentador.
- [Presentación HTML](presentacion_tfm.html): deck navegable, sin dependencias externas y apto para impresión/PDF.
- [Presentación PDF](presentacion_tfm.pdf): exportación para importar o compartir, si está disponible.
- [Guion de presentación](guion_presentacion.md): propuesta de relato y fuentes por diapositiva.
- [Inventario de capturas](inventario_capturas.md): correspondencia entre cada imagen, lo que demuestra y cómo reproducirla.
- [Fuentes](fuentes.md): documentos y módulos consultados, hechos verificados y asuntos pendientes.
- [Flujo demo](flujo_demo.md): secuencia, IDs y bloqueos de la ejecución real.
- `capturas/`: imágenes PNG de la presentación.

## Estado de las capturas

Flask respondió en `127.0.0.1:8051` con PostgreSQL local y se crearon datos `TFM_DEMO_*`. El proceso documentado es `TFM_DEMO_1788104782421_PROC` (`process_id` `4cda3697-8024-41ce-aaeb-a0988eff073a`). Las capturas `01`–`06` son nuevas evidencias Playwright; `modelado_bpm_*` sigue siendo evidencia histórica reutilizada. El servidor temporal fue detenido.

El proceso se creó desde la UI. Como la UI de un proceso vacío exige un nodo padre, `OP-001`, `OP-002` y `OP-003` se crearon mediante API Playwright. La máquina `352` se creó con descripción y contrato `216`, pero sus tres configuraciones máquina–operación devolvieron `409 persistence_error` y quedaron no persistidas.

La única fase incompleta es la asociación máquina–operación: la aplicación devolvió `409 persistence_error` y la captura 03 conserva ese estado sin ocultarlo.

## Criterio de uso

Antes de la presentación final conviene sustituir o complementar estas evidencias con capturas tomadas contra una ejecución validada de la versión que se vaya a defender, especialmente para las vistas sin imagen disponible.

## Uso rápido de la presentación

Abrir `presentacion_tfm.html` en Chrome/Chromium. Usar `←`/`→`, `Inicio`/`Fin` o los botones inferiores para navegar; el botón `PDF` abre el diálogo de impresión para guardar el deck. La impresión aplica una diapositiva por página. Las imágenes se cargan desde `capturas/`, por lo que conviene conservar la carpeta junto al HTML al importarlo o compartirlo.
