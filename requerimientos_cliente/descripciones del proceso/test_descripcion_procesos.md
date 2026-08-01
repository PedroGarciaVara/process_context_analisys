# test para testear la estrucutra de la base de datos y su render
 obejtivos: 
 - testear los modelos definidos para el proyeto 
 - testear las funciones para integrar los datos
 - testear el renderizado desde la UI
 - testear la creacion de todo los elemntos desde la UI

 # Descripcion del proceso.

proceso : Fabricacion de mezclas de caucho para la fabricacion de neumaticos.
entradas: Materias primas. (caucho, cargas reforzantes, productos quimicos, azufre bulcanizante)
salida: mezclas para fabricacion de neumaticos que cumplen con el cdc (cuaderno de cargas)
cuaderno de cargas de fabricacion de una mezcla:
- respetar la composicion de la receta de fabricacion de forma cuantitativa y cualitativa en lo que a materias utilizadas para cada mezcla se refiere.
- respetar las receta de fabricacion en cuanto a parametros, temperaturas teimpos, (en adelante marcha mecanica, la cual define la configuracion dion de una mezclae las diferentes maquinas y su metodo de funcionamiento para la produccion de una mezcla)
metodo de validacion: una mezcla será conforme si cumple con estas dos premisas. para su verificacion, la ficha de mezcla de la cuenta rendida de todos los parametros debe estar dentro de las tolerancias definidas, y el analisis de composicion "mcc" debe de estar entre las tolerancias definidas

etapas:
- stock de materias primas
- preparacion de cauchos
- preparacion de porductos quimicos
- preparacion de cargas reforzantes 
- preparacion de aceites
- preparacion de bloques de azufre
- fabricacion de Mezcla
- stock de mezclas.

# descripcion de preparacion de cauchos
objteivo: poner a disposicion de la etapa siguiente un batch con las materias primas de caucho cumpliendo la formula de forma cualitativa y cuantitativa.
etapas:
- aprovisionamiento de cajones a la RPS: para un determinado NIP (referencia de la materia prima a nivel de denominacion. hay varias referencias de NIP pdentro de cuachos, cargas porductos quimicos...) respetando las reglas de blocaje. (una regla de blocaje define cuantos cajones de diferentes lotes de un NIP son necesarios de aprovisionar a la vez para mantener la homogeniedad del proudcto en el tiempo.)
- RPS fabricacion de un batch de un NIP: RPS robot automatico que toma x elementos de cada cajon para confeccionar un batch de un NIP
    - validar cajones que cumplen blocaje
    - definir numero de elementos por cajon para crear batch
    - fase de despaletizado: sacar foto y usar cordenadas para localizar el elemento y depositarlo de uno en uno en el tapiz colector
    - pesado del elemento
    - trnasporte del elemento hasta tapiz de confeccion de bath
    - cuando ultimo elemento llega batch formado.
- se dispone de 3 RPS cada una con 12 puestos de cajones.
- se dispone de 5 tapices de confeccion de batch.
- desde la confeccion de bath los bathc avanzan mediante tapices hasta las "previereos"
- "previeros", en estas maquinas se lleva a cabo la operacion de troceado y talcado del producto
previeros DN3 y DN4 trocean cauchos naturales a un tamaño maximo de 140 mm
previeros DS1 DS2 y DS5 trocean cauchos siteticos a un tamaño maximo de 100 mm
- operacion de talcado, todo caucho debe ser talcado para evitar que se pegue en los tapices de stock, pero debe de respetar unas cantidades maximas de talcado. el talco se añade en dos puntos en las previereos y en los toneles de blocaje.
- despues de las previeros el producto se dirige a los toneles de blocaje, cuya mision es homogeneizar el producto introducido, para lo cual se establece un tiempo de blocaje de 6min.
- una vez blocado y talcado el producto se descarga en tapices de stokage/dosificacion 
existen 12 básculas con 2 tapices de dosificacion cada una.
en las bascuals se lleva a cabo la "dosifiacion de productos", 
- cada bascula ira preparando las cantidades de cada NIP que sean necesarias para la fabricacion de la mezcla en curso. (una mezcla es una combinacion de entre 1 a 3 NIPs diferentes)
- el producto se descarga en balancelas (convoy aereo) y se llevan hasta la entrada al porceso de fabricion de mezclas.

# proceso de fabricacion de mezclas:
- etapa de verificacion de productos entrantes conformes: todos los porductos se verifica su peso y su referencia. (para asegurar que no hay equivocacion)
- introduccion en Mezclador y homogenizacion de productos. (el mezclador es una maquina): mision mezclas los productos cumpleindo con la receta de fabricacion establecida en los parametros
- paso por HA (HA otra maquina): misison: descenso de temperatura para poder introducir los azufre
- aprovisionamiento de azufre
- paso por HF (HF otra maquina): homogeneizar el azufre con el resto de productos, aportar "trabajo" a la mezcla para conseguir valores de fluidez.
- pesado de mezcla: verificacion del peso de la mezcla final si OK conforme sino no conforme
- etapa de puesta en forma: pasa por la maquina de perfilado, donde el material se exrtruye y sale en una lamina continua, la cual hay que marcar con tinta la infromacion del producto, aplicar anticolante para evitar que se pegue cuando se paletize, hay un tunel de refrigeracion y secado, para evaporar el agua del anticolante y terminar de bajar la temperatura de la mezcla
- apilar el producto en paletas.

---

# Anexo — Clasificación, carga y validación del proceso

Fecha de validación: 2026-07-20.

## Resultado de la clasificación

La descripción en lenguaje natural se clasificó en tres niveles:

1. **Proceso principal:** `PROCESO_MEZCLAS_CAUCHO_NEUMATICOS` — Fabricación de mezclas de caucho para neumáticos.
2. **Subproceso:** `PROC_MEZCLAS_CAUCHO_PREPARACION` — Preparación de cauchos.
3. **Subproceso:** `PROC_MEZCLAS_CAUCHO_FABRICACION` — Fabricación de mezclas.

Las etapas y operaciones se representaron mediante nodos `input`, `output`, `operation`, `subprocess`, `decision` y `stock`. Las secuencias se representaron mediante transiciones `sequence`; la conformidad se representó con una decisión y las ramas `Sí`/`No`.

## Entrada persistida en la aplicación y PostgreSQL

La carga se realizó mediante la API real de modelado de procesos y quedó validada desde PostgreSQL:

- 3 procesos y 3 versiones `draft`.
- 27 nodos y 24 transiciones.
- Stock de mezclas y stock intermedio para dosificación.
- Ramas de decisión `Sí` → salida `normal` y `No` → salida `waste`.
- Parámetros de máquinas, capacidades, tiempos, materiales y notas de origen almacenados en `properties` JSONB.

Identificadores de la carga:

- Proceso raíz: `06757b45-a08d-4493-8012-db03325399c8`.
- Preparación de cauchos: `0c5a2655-a7ab-4377-90ff-c6500388450a`.
- Fabricación de mezclas: `d9034ddb-6ede-49e6-9ad6-e2904a894a14`.

La expansión del nodo `PREP_CAUCHO` se verificó correctamente: muestra el subproceso hijo, mantiene los breadcrumbs y no modifica el grafo padre.

## Verificaciones ejecutadas

- Tests de dominio: 8/8 correctos.
- Tests de servicio, API e integración PostgreSQL: 8/8 correctos.
- Playwright UI: 2/2 correctos para acceso al módulo y apertura del proceso persistido.
- Validación API de los tres grafos: válida.

Durante la prueba se detectó y corrigió un error en la comprobación de ciclos jerárquicos: la API rechazaba como cíclica una relación válida entre un proceso padre y un subproceso hijo.

## Información aún no formalizada

La descripción no define todavía entidades, tablas ni contratos específicos para:

- Recetas versionadas, cantidades y tolerancias.
- CDC y resultados del análisis de composición `MCC`.
- Maestro de materias primas, NIP, lotes y trazabilidad.
- Reglas formales de blocaje.
- Tolerancias de pesado y cantidades máximas de talco.
- Parámetros objetivo de mezclador, HA, HF y túnel de refrigeración/secado.
- Fotografías y coordenadas del despaletizado.
- Gestión y disposición de producto no conforme.
- Modelo detallado de máquinas, sensores y capacidades.

Estos datos se han dejado documentados en `properties` como valores `null`, marcas `details_missing` o valores `provisional`. Esta ubicación permite conservar la información de origen, pero no sustituye la futura ampliación del modelo de datos con entidades y validaciones específicas.

## Enmienda — subprocesos paralelos de preparación

Fecha: 2026-07-20.

Se corrige la interpretación del grafo principal. Las preparaciones de caucho, productos químicos, cargas reforzantes, aceites y bloques de azufre son **subprocesos independientes que se ejecutan en paralelo**. No forman una cadena serial.

La estructura corregida es:

```text
                         ┌─ Preparación de cauchos ─┐
                         ├─ Preparación de químicos ─┤
Materias primas ─────────┼─ Preparación de cargas ───┼──► Fabricación de mezclas
                         ├─ Preparación de aceites ──┤
                         └─ Preparación de azufre ───┘
```

Correcciones aplicadas en la aplicación y PostgreSQL:

- `PREP_CAUCHO`, `PREP_QUIM`, `PREP_CARGAS`, `PREP_ACEITES` y `PREP_AZUFRE` son nodos `subprocess` independientes.
- Cada subproceso tiene su propio proceso hijo y versión inicial.
- Se eliminaron las transiciones seriales entre las preparaciones.
- Se crearon ramas desde `MP` hacia cada subproceso.
- La salida de cada subproceso converge en `FAB_MEZCLA`.
- El grafo corregido contiene 10 transiciones y pasa la validación de dominio/API.

Los detalles operativos de químicos, cargas, aceites y azufre siguen pendientes de enriquecimiento; su clasificación estructural ya queda preparada para ampliarse sin volver a convertirlos en operaciones seriales.

## Enmienda — corrección del render BPM

Fecha: 2026-07-20.

Se verificó y corrigió el renderizado del grafo paralelo:

- Las etiquetas rojas `Entrada de materia prima` y `Salida de subproceso` procedían de mostrar en el lienzo las etiquetas de transiciones `sequence`. Ahora solo se dibujan sobre el BPM las etiquetas de ramas `branch` —por ejemplo, `Sí` y `No`—; el resto de metadatos permanece en la lista accesible de relaciones.
- Se corrigió el centrado de los nodos únicos respecto al ancho total de las ramas paralelas.
- Se añadió la transición final `FAB_MEZCLA → STOCK_MEZCLAS`, que faltaba tras reconstruir el grafo paralelo. El stock aparece ahora después de fabricación y centrado bajo ella.

Verificación Playwright real: `renderiza las preparaciones en paralelo y centra el stock final` — 1/1 correcto. El grafo queda validado con 11 transiciones.
