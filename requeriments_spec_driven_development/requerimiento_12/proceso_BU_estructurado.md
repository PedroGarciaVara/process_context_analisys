# Fixture/test BU en MACBU — cobertura y gap discovery para requerimiento_12

> **Clasificación obligatoria:** este documento es un fixture de prueba y descubrimiento de gaps para validar la cobertura del contexto estructurado generalista de `requerimiento_12`. **NO es el modelo del producto, NO es un bounded context de MACBU/BU y NO define un esquema, tablas, entidades ni repositorios especializados.** Sus conceptos solo sirven como datos de prueba que deberán mapearse al BPM relacional y al detalle JSON/JSONB generalista compartidos por todos los procesos.

## 0. Metadatos y alcance

- Estado: fixture/test consolidado para cobertura y gap discovery; pendiente de validación humana junto con `spec.md`.
- Fecha: 2026-08-01.
- Fuente primaria: requerimientos_cliente/descripciones del proceso/proceso_BU.md.
- Fuente funcional relacionada: requerimientos_cliente/requerimiento_12.md.
- Autor: `requirements-agent`; actualización de `AMD-002` realizada el 2026-08-01.
- El archivo fuente original no se modifica. Este documento lo estructura y no lo sustituye.
- Objetivo: ejercitar el contrato generalista con un proceso complejo, detectar claves/bloques/gaps de cobertura y comprobar trazabilidad BPM/causal/RAG. No prescribe un modelo dedicado de producto para BU/MACBU.

### Trazabilidad AMD-002

- `AMD-002` reestructura el spec para un sistema generalista aplicable a más de 1000 procesos.
- Este fixture conserva el conocimiento del caso BU, pero sus nombres y detalles son datos de prueba configurables, no requisitos de especialización.
- Los gaps identificados aquí deberán registrarse como gaps del contrato generalista o como configuración de proceso; no podrán resolverse creando tablas, modelos o bounded contexts exclusivos de BU/MACBU.

### Estados de trazabilidad

| Estado | Significado |
|---|---|
| actual | Hay evidencia en la aplicación o en su modelo/documentación actual. No implica telemetría industrial real. |
| req12 | Requerimiento_12 contempla el concepto o la relación, pero su implementación concreta para MACBU debe definirse o ejecutarse. |
| no identificado | No se ha localizado soporte ni contrato suficiente. |
| requiere confirmación | La fuente admite varias interpretaciones o falta una decisión del responsable. |

La etiqueta actual se reserva para capacidades encontradas en el producto actual, como modelado de procesos, nodos semánticos, versionado y vínculos causales. No se ha confirmado una conexión de la aplicación con PLC, Nivel 2 o PI-AVEVA.

## 1. Misión y resultado

MACBU fabrica bolsas unitarias de producto químico, BU, para aprovisionar al MI.

- Una BU puede ser monoproducto o multiproducto según el número de productos químicos.
- Cada mezcla fabricada incorpora un número de BU definido por la receta.
- La receta define el número de BU y su subreceta o subgama.
- Si la mezcla usa la receta 1332, las BU pueden ser BU1332A, BU1332B, etc.
- Cada trolley recibe un tag con la información de la BU que debe fabricar.

| Información | Estado | Observación |
|---|---|---|
| Proceso como proceso/subproceso navegable | actual + req12 | La aplicación modela procesos y subprocesos; falta cargar este proceso industrial. |
| Tipo de BU, receta, subreceta y secuencia | req12 | Deben ser datos versionados y vinculables a operaciones y ejecuciones. |
| Identidad de BU concreta y tag del trolley | no identificado | Necesidad BU-N-001. |
| Relación BU, mezcla, receta y MI | requiere confirmación | Falta confirmar identificadores maestros y significado de MI. |

## 2. MACBU y flujo general

MACBU es una máquina con un circuito donde un trolley sujeto a una cadena rotatoria recorre los puestos.

Flujo descrito:

PSA1/PSA2, fabricación de bolsa -> BA01..BA06, dosificación -> marcado -> SO1/SO2, soldadura de cierre y evacuación -> EV01/EV02, evacuación -> robot -> cajón metálico.

La bolsa pasa de báscula en báscula. En cada una pasa de largo o dosifica secuencialmente los productos disponibles. El convoy no permite adelantar bolsas; una parada en una báscula acumula trolleys antes de ella.

Se pueden fabricar dos BU distintas simultáneamente en proporción 1:1; se denomina imbricación.

| Elemento | Estado | Observación |
|---|---|---|
| MACBU, equipos y composición | actual + req12 | Se puede representar como máquina/recursos y relacionarlo con proceso. |
| Secuencia y precedencia del circuito | actual + req12 | Hay soporte de flujo; req12 exige relaciones explícitas y versionadas. |
| Posición física del trolley, cola y acumulación | no identificado | Necesidad BU-N-002. |
| Estado en tiempo real de cada puesto | no identificado | Necesidad BU-N-003. |
| Imbricación y parejas de BU | req12 | Deben definirse entidad, reglas, cálculo y ejecución. Necesidad BU-N-004. |

### Nombres de equipos

| Nivel | Identificadores |
|---|---|
| Máquina | MACBU |
| Fabricación de bolsa | PSA, PSA1, PSA2 |
| Básculas | BA01, BA02, BA03, BA04, BA05, BA06 |
| Soldadura | SO1, SO2 |
| Evacuación | EV01, EV02 |

## 3. PSA: fabricación de la bolsa

### 3.1 Secuencia

- El puesto inicial fabrica bolsas de plástico.
- Consta de dos máquinas automáticas en serie, llamadas PSA.
- Fabrican la bolsa desde un rollo de polietileno.
- Una PSA fabrica una bolsa y la coloca en el trolley; deja pasar un trolley vacío; la siguiente PSA deja pasar el trolley con bolsa y coloca una bolsa nueva en el trolley vacío.
- El ciclo de salida de un trolley con bolsa del conjunto de dos PSA se indica como 20 cmin. La unidad requiere confirmación.
- Después la bolsa sale de PSA y pasa a básculas.

### 3.2 Rollo, desenrollado y compensador

- El rollo se aprovisiona detrás de la máquina y se desenrolla a velocidad fija.
- El detector del compensador en posición baja da la orden de marcha del desenrollado.
- El compensador mantiene la tensión para evitar pliegues y arrugas.
- La horizontalidad del tensor es crítica.
- Un salto en un diente del circuito del tensor puede hacerle perder horizontalidad, desplazar el plástico lateralmente y desalinearlo.
- Marcas de pintura indican el recorrido estándar del plástico.

### 3.3 Cilindro y soldadura longitudinal

- Un elemento dobla la lámina formando un cilindro continuo.
- Se debe revisar el solapamiento para asegurar el cierre mediante soldadura.
- La revisión se realiza en el elemento vertical de soldadura, de 1 metro.
- Debe estar alineado con la vertical y con la vertical del elemento de soldadura.
- El solapamiento debe ser igual arriba y abajo: mismos milímetros de solapamiento y mismos milímetros desde ambos extremos hasta el punto de soldadura.
- El cilindro se suelda en secciones de 1 metro; debe coincidir el final de una soldadura con el inicio de la siguiente.

### 3.4 Bolsa y controles

- Una soldadura horizontal cierra el cilindro y después se realiza un corte horizontal.
- Son críticos el alineamiento del plástico, presión, tiempo y temperatura de soldadura, intensidad consumida por las resistencias y número de ciclos.
- El teflón que recubre el elemento se deteriora con el uso y la polución.

| Dato o evento | Estado | Necesidad |
|---|---|---|
| PSA1/PSA2 como puestos | actual + req12 | Se puede representar como operación/equipo; falta cargar MACBU. |
| Receta de bolsa asociada al trolley | req12 | Vincular tag, BU, receta y ejecución. |
| Rollo: identidad, lote, consumo y cambio | no identificado | BU-N-005. |
| Detector, compensador y orden de desenrollado | no identificado | BU-N-006. |
| Tensor, salto de diente y posición del plástico | no identificado | BU-N-007. |
| Marcas y comprobación de alineación | requiere confirmación | Determinar si es inspección periódica, arranque o ambas. |
| Solapamiento, alineación y continuidad de soldadura | no identificado | BU-N-008. |
| Presión, tiempo, temperatura, intensidad, ciclos y teflón | req12 para definir; no identificado para capturar | BU-N-009. |
| Defectos y paradas PSA | req12 conceptualmente; no identificado como captura | BU-N-010. |

## 4. Básculas y dosificación

### 4.1 Disposición y aprovisionamiento

- Hay seis básculas en serie, cada una con cuatro puestos de dosificación.
- Los productos químicos llegan en bigbags, en el piso superior, en la tolva correspondiente.
- Cada producto tiene una posición asignada, que normalmente no cambia.
- Cambiarla exige limpieza completa del circuito y verificación/validación de Garantía de Calidad para evitar contaminación.
- La bolsa pasa de báscula en báscula; en cada una pasa de largo o dosifica secuencialmente los productos disponibles.

### 4.2 Individual y maestro-esclavo

- Los cuatro puestos pueden trabajar individualmente o maestro-esclavo.
- Maestro-esclavo solo se usa si ambos circuitos tienen el mismo producto.
- Se usa cuando el rango de dosificación de un referencial es amplio: una BU puede necesitar poca cantidad con tolerancia de 10 g y otra mucha cantidad con tolerancia mayor.
- La tolerancia es aproximadamente 1 % del producto, con máximo de 100 g.
- Maestro: conducto de menor caudal y mayor precisión.
- Esclavo: conducto de mayor caudal.

### 4.3 Conductos y regímenes

Los conductos son tapices de velocidad variable. La carga/altura del producto se limita con una pieza fija llamada trampilla de regulación.

1. Régimen 1 o máxima velocidad: el tapiz usa la máxima velocidad programada para la receta.
2. Régimen 2 o velocidad de regulación: V = vmin + K por (ecart - retardo), donde ecart = peso objetivo - peso actual. La velocidad decrece hasta vmin y llega a vmin cuando ecart = retardo.
3. Régimen 3 o velocidad mínima: el tapiz continúa en vmin hasta que ecart alcanza la columna de caída.

La columna de caída es la cantidad teórica que está en el aire: ya fue dosificada, pero aún no llegó a la báscula.

Parámetros: vmax, vmin, K o ganancia, retardo, columna de caída y tiempos teóricos de régimen 2 y 3.

### 4.4 Optimización dinámica

- Los parámetros se optimizan en cada ciclo.
- K se compara con el tiempo teórico de régimen 2. Si el tiempo real es mayor, K aumenta 3 %; si es menor, disminuye 3 %.
- No se optimiza dentro de límites de +/-5 % del objetivo.
- Retardo se compara con el tiempo real de régimen 3. El original indica retardo -3 % si real > teórico y retardo +3 % si teórico > real; esta regla requiere validación.
- La columna de caída usa una pila móvil de las últimas cinco columnas y su desviación respecto al objetivo para recalcular el siguiente ciclo.

### 4.5 Nivel de parametrización y tests

- Los parámetros se establecen en Nivel 2 por producto y rango de peso.
- Son independientes de la referencia BU y dependen del comportamiento del producto y de la cantidad.
- Se realizan tests para encontrar vmax, vmin, retardo y K óptimos.
- Se busca vmax tan alta como sea posible con deceleración controlada, menor tiempo y estabilización del caudal en vmin.
- Se busca vmin suficientemente alta para columna de caída y ecart final con cpk mayor que 1,3.
- El tiempo total de los tres regímenes debe ser mínimo para mejorar ciclo y productividad.
- Para K y retardo se comprueba cpk mayor que 1 para un 2 % del tiempo teórico, según la redacción original.
- Se comparan distribuciones de tiempos reales y, con esos datos, se ajustan velocidades y tiempos sin fueras de tolerancia o reduciendo su nivel.

### 4.6 Fuera de tolerancia y deriva

Una fuera de tolerancia es una dosificación cuyo ecart final está fuera de los límites.

- Por debajo del límite inferior, la máquina ejecuta impulsos para entrar en límites.
- Por encima del límite superior, una persona debe retirar el exceso.
- Retirar el exceso puede tardar de 3 a 5 minutos según dónde esté el operador y afecta mucho al rendimiento.
- Se debe evitar especialmente la sobredosificación.

Causas posibles de deriva: atascos, patinado del tapiz porque la velocidad se mide en el variador y no en un contador real, cambio de placa de regulación por cambio de pasillo/tapiz en mantenimiento y avalancha por cambio de granulometría u otra causa.

| Dato o regla | Estado | Necesidad |
|---|---|---|
| BA01..BA06 y cuatro puestos | actual + req12 | Representable; falta instancia y contrato. |
| Producto por posición/tolva | req12 | Entidad de posición, producto, compatibilidad y autorización. BU-N-011. |
| Bigbag, lote, lectura de producto y puesto | no identificado | BU-N-012. |
| Limpieza, validación de Calidad y cambio de posición | req12 para evidencia; no identificado para flujo | BU-N-013. |
| Maestro-esclavo y condición de mismo producto | req12 | Regla de compatibilidad y ejecución. BU-N-014. |
| Parámetros de Nivel 2 | req12 conceptualmente; no identificado como integración | BU-N-015. |
| vmax, vmin, K, retardo, columna y tiempos | req12 como modelo; no identificado como datos conectados | BU-N-016. |
| Autoajustes 3 %, ventana 5 % y pila de 5 | req12 | Decidir si se guarda cada ajuste, configuración final o ambos. |
| Cpk y distribuciones | req12 | BU-N-017: muestras, fórmula, periodo y evidencia. |
| Ecart, objetivos, pesos y resultado final | no identificado | BU-N-018. |
| Impulsos correctivos y exceso retirado | no identificado | BU-N-019. |
| Atasco, patinado, placa y granulometría | req12 para causalidad; no identificado como captura | BU-N-020. |
| Parada y acumulación antes de báscula | req12 como incidente; no identificado como señal | BU-N-021. |

## 5. Imbricación de BU

Se fabrican dos BU distintas al mismo tiempo, en proporción 1:1, para optimizar el tiempo global.

- El patrón más óptimo descrito es una BU multiproducto que dosifica en cinco de seis básculas y una BU monoproducto que usa la báscula restante.
- Para calcular la báscula cuello se suma en cada báscula: paso mecánico de trolley 10 cmin + subida/bajada 12 cmin + dosificaciones de ambos BU, aproximadamente 12–16 cmin por producto.
- La báscula limitante es la de mayor suma.
- Puede ser ventajoso pesar dos productos en una báscula para dejar otra libre para el monoproducto.
- Con dos BU multiproducto, el operador intenta que las básculas limitantes sean diferentes; el tiempo conjunto puede ser menor que la suma de tiempos individuales.

| Dato | Estado | Necesidad |
|---|---|---|
| Pareja y proporción 1:1 | req12 | BU-N-004. |
| Ocupación de básculas | req12 | Configuración explicable, no solo resultado visual. |
| Cálculo de cuello | no identificado | BU-N-022: conservar entradas, fórmula, versión y resultado. |
| Decisión del operador | no identificado | BU-N-023: regla automática, recomendación o decisión manual. |

## 6. Marcado, soldadura de cierre y evacuación

### 6.1 Marcado

Después de dosificar, las bolsas pasan por marcado. No se describen contenido, tecnología, posición, validación ni datos registrados. No debe interpretarse esta ausencia como ausencia de etapa.

Estado requiere confirmación. Necesidad BU-N-024.

### 6.2 Soldadura de cierre

- Hay dos circuitos, uno por receta de BU fabricada.
- Entra el trolley con producto.
- Una mesa elevadora sube a una posición parametrizada.
- Se suelta la bolsa del trolley.
- Dos fajas neumáticas sujetan verticalmente la bolsa.
- Dos soldaduras, una por cada lado, entran con un elemento neumático para cerrar.
- La mesa baja, se retiran los elementos y la BU sale al tapiz de evacuación.
- El ciclo conjunto de las dos soldaduras es 22 cmin por BU; la unidad requiere confirmación.

### 6.3 Calidad

La soldadura es crítica para rendimiento y calidad. Debe impedir apertura y no quedar quemada, porque una zona quemada rompe la bolsa y causa pérdida de producto, no conformidad y posible descarte.

Puntos clave: alineamiento de mordazas, contacto correcto, ausencia de desalineación vertical o longitudinal, uniformidad sin zonas no soldadas o quemadas, altura de mesa según tamaño de BU —mayor para BU pequeña y menor para BU grande—, tiempo, intensidad y temperatura.

Cada BU puede tener parámetros distintos por la polución interior. No es soldadura plástico-plástico limpia: es plástico-producto-producto-plástico y la capa de producto afecta de forma diferente.

### 6.4 Suelta, geometría y tensión

- La bolsa está sujeta al trolley por una membrana hinchable.
- Se suelta pulsando la válvula para deshinchar.
- Hay que alinear pulsador y boquilla en cada trolley.
- La geometría del trolley debe ser correcta con margen +/-2 mm; también la geometría de membrana, soporte y posición de boquilla.
- Si falla un trolley, se investiga el trolley; si falla un portamembranas, el portamembranas; si fallan varios elementos, la boquilla.
- Plantillas de verificación permiten comprobar geometrías.
- Un desinflado incorrecto puede producir soldadura con tensión y rotura por debajo de la soldadura.
- También pueden causar tensión unas fajas sin tensión o ralentizadas por suciedad.

| Dato o evento | Estado | Necesidad |
|---|---|---|
| SO1/SO2, EV01/EV02 y circuitos | actual + req12 | Se pueden representar; falta instancia. |
| Tiempos, intensidad y resultado por BU | req12 como medición; no identificado como captura | BU-N-025. |
| Altura de mesa por tamaño | req12 | BU-N-026: parámetro, orden enviada y valor real. |
| Mordazas y defectos de soldadura | no identificado | BU-N-027. |
| Membrana, pulsador, boquilla, trolley y portamembranas | req12 para causalidad; no identificado como activos | BU-N-028. |
| Plantillas, +/-2 mm y verificaciones | no identificado | BU-N-029. |
| Suciedad y tensión de fajas | req12 como causa; no identificado como inspección | BU-N-030. |
| Defecto, pérdida, descarte y no conformidad | req12 como incidente/evidencia; no identificado como flujo | BU-N-031. |
| Robot, cazo, cajón y 40–60 BU por cajón | no identificado | BU-N-032. |

## 7. Productividad, defectos y paradas

Indicadores identificados:

- tiempo de ciclo de dosificación de BU;
- fueras de tolerancia;
- defectos y paradas en soldadura;
- defectos y paradas en PSA;
- defectos y paradas en básculas.

Reglas operativas:

- Un defecto para solo el elemento defectuoso; el resto continúa.
- Una parada detiene el convoy y toda la máquina.
- En básculas el operador puede corregir sin parada.
- En soldadura debe entrar en recinto de seguridad, provocando parada.

| Elemento | Estado | Necesidad |
|---|---|---|
| Taxonomía defecto/parada | req12 | Evento explícito y no solo texto. BU-N-033. |
| Equipo, puesto, convoy, BU y periodo afectados | req12 | Relación explícita con alcance. |
| Inicio, fin, duración, causa, corrección y responsable | no identificado | BU-N-034. |
| KPI de ciclo, fuera de tolerancia, defectos y paradas | req12 | BU-N-035: contrato, fuente y cálculo. |
| Corrección sin parada en básculas | requiere confirmación | Cómo se registra la intervención y BU afectada. |
| Recinto de seguridad en soldadura | no identificado | BU-N-036: señal, parada y usuario. |

## 8. Niveles de información

- Nivel 1: PLC.
- Nivel 2: gestión de recetas y configuraciones; recopila información de usuarios y servidores centrales, la envía al Nivel 1 y recibe resultados para trazabilidad.
- PI-AVEVA: registra variables del autómata no contempladas en Nivel 2.

| Sistema o relación | Estado | Necesidad |
|---|---|---|
| Sistemas como fuentes de procedencia | req12 | El marco admite procedencia y evidencias; no se ha identificado integración. |
| Receta/configuración Nivel 2 -> Nivel 1 | no identificado | BU-N-037. |
| Resultado Nivel 1 -> Nivel 2 | no identificado | BU-N-038. |
| Variables exclusivas de PI-AVEVA | no identificado | BU-N-039: catálogo y fuente prioritaria. |
| Timestamp, versión y calidad del dato | req12 | Obligatorio en mediciones y hechos de ejecución. |

## 9. Aprovisionamiento

- El operador aprovisiona con carretilla desde almacén.
- Lee producto y puesto para asegurar “buen producto, buen puesto”.
- Nivel 2 confirma que se puede cargar el bigbag.
- Tras la confirmación, lo carga.
- Entre bigbags queda un stock en máquina aproximado de 100 kg.

| Dato | Estado | Necesidad |
|---|---|---|
| Operador, carretilla, almacén y puesto | no identificado | BU-N-040. |
| Lecturas de producto y puesto | req12 como hecho; no identificado como integración | BU-N-041. |
| Autorización Nivel 2 | req12 | Guardar solicitud, respuesta, usuario, fecha, posición, producto y lote. |
| Bigbag, lote, cantidad y stock residual | no identificado | BU-N-042. |
| Contaminación y liberación de Calidad | req12 | Vincular requisito, evidencia y decisión. |

## 10. Modelo de conocimiento recomendado

Para técnicos y agentes conviene separar:

1. Definición versionada: procesos, etapas, operaciones, stocks, equipos, puestos, receta, subreceta, BU, productos, posiciones, parámetros, límites y reglas, relacionada mediante el BPM existente.
2. Detalle de nodo: misión, objetivo, descripción de operación, modo de funcionamiento, principales parámetros, principales KPI y contrato de operación si existe, mediante el JSONB generalista existente por nodo.
3. Contexto/evidencia: orden/lote, pareja imbricada, trolley, tag, secuencia, receta efectiva, configuración enviada, estados y valores aportados cuando formen parte del alcance; no constituye un modelo persistente MACBU/BU nuevo.
4. Evidencia: lecturas, inspecciones, plantillas, validaciones, gráficas, fotografías y documentos con origen y fecha.
5. Incidente: defecto, parada, fuera de tolerancia, atasco, patinado, soldadura defectuosa, tensión, corrección, descarte y causa.
6. Trazabilidad causal: vínculo explícito entre nodo BPM, puesto, medición, incidente, hipótesis, evidencia, causa y conclusión.
7. Conocimiento técnico: significado del parámetro, ajuste, síntomas de deriva, comprobación y evidencia esperada.

La aplicación actual ofrece soporte implementado para procesos versionados, nodos, relaciones explícitas y análisis causal. La continuidad obligatoria reutiliza `bpm_process`, `pm_process_version`, `pm_process_node`, `pm_process_transition` y `pm_process_node_metadata`; requerimiento_12 solo asegura las relaciones correctas y el detalle semántico por nodo. No se crea un modelo persistente paralelo de MACBU/BU ni se ha localizado ingestión de Nivel 1, Nivel 2 o PI.

## 11. Necesidades prioritarias para requerimiento_12

| Prioridad | IDs | Resultado faltante |
|---|---|---|
| Alta | BU-N-001, BU-N-005, BU-N-012, BU-N-015, BU-N-018, BU-N-025, BU-N-037, BU-N-038 | Identidad de BU/trolley, materiales/lotes, parámetros efectivos, resultados e intercambio de niveles. |
| Alta | BU-N-010, BU-N-021, BU-N-033, BU-N-034, BU-N-035 | Detalle de defectos, paradas, alcance y acumulación; los KPI solo se describen o calculan bajo demanda. |
| Alta | BU-N-027, BU-N-028, BU-N-029, BU-N-031 | Calidad, geometría, plantillas, descarte y causalidad. |
| Media | BU-N-004, BU-N-022, BU-N-023 | Imbricación, cuello y decisión del operador. |
| Media | BU-N-016, BU-N-017, BU-N-020 | Autoajuste, muestras, cpk y deriva. |
| Media | BU-N-024, BU-N-032, BU-N-040 a BU-N-042 | Marcado, robot/cajón y aprovisionamiento. |

## 12. Resolución consolidada de preguntas Q-BU

Las respuestas humanas incorporadas en este archivo permiten cerrar la mayor parte de las preguntas Q-BU. A partir de esta consolidación ya no debe presentarse `Q-BU-005` como la “siguiente pregunta”; las respuestas de `Q-BU-003` y `Q-BU-005..Q-BU-014` quedan integradas abajo con su estado residual real.

### Decisión Q-BU-001 — resuelta

La unidad cmin significa **centésimas de minuto**. Por tanto, 1 cmin = 0,6 segundos.

Conversiones de los tiempos citados:

- 20 cmin = 12 segundos.
- 10 cmin = 6 segundos.
- 12 cmin = 7,2 segundos.
- 22 cmin = 13,2 segundos.

Esta decisión permite utilizar esos valores como contexto para ciclos y cuellos de botella; los KPI y la productividad se calcularán bajo demanda en fase 2 y no se persistirán.

### Decisión Q-BU-002 — resuelta

- **MI:** máquina del mezclador, dentro de la operación de mezclado del proceso de fabricación de mezclas.
- **Mezcla:** unidad de fabricación del proceso de fabricación de mezclas; es el proceso principal.
- **Código de producto y receta:** una mezcla tiene una receta determinada por el código de producto y la línea de fabricación. Ejemplo: código de producto `19656X01`, receta `011336Z05`.
- **Estructura de receta:** en `011336Z05`, `01` identifica la línea de fabricación, `1336` identifica el código de receta —con parámetros de fabricación y productos utilizados— y `Z05` identifica la versión 5.
- **Subgama:** nombre de la receta de los productos utilizados para fabricar mezclas.
- **Ejemplo de subgama:** `BU1336A` indica que se utiliza la BU1336A; `N550`, Negro de humo 550; `G1336`, la receta de gomas G1336.
- **Lote:** conjunto de productos fabricados en un mismo periodo y con las mismas materias primas. El número de lote cambia cuando cambia el producto en la línea de fabricación.

Esta decisión define la relación de negocio: proceso principal de mezclas → mezcla → código de producto/receta versionada → subgama y materias primas → lote; la fabricación de BU consume o materializa la información de la mezcla mediante sus BU y subrecetas.

### Decisión Q-BU-003 — resuelta en alcance, con contrato de identidad aún abierto

Los identificadores concretos de mezcla, lote, BU, trolley, receta y bigbag se definirán más adelante, de forma individual. No obstante, se confirma desde ahora que todos ellos son información necesaria para el conocimiento y la trazabilidad.

Además, el tag es una **pastilla RFID colocada en el trolley** en la que se guarda una ID para que cada puesto sepa qué BU está circulando. Ese tag RFID:

- se usa dentro de esa máquina;
- es independiente del identificador único maestro de BU, receta o bigbag;
- debe poder relacionarse con BU, trolley, receta, mezcla, lote y ejecución.

Requerimiento_12 deberá contemplar cómo guardar, aunque el formato final aún no esté decidido:

- identidad estable del objeto;
- tipo de objeto y sistema que lo origina;
- valor o código operativo cuando exista;
- relación con mezcla, lote, receta, subgama, BU, puesto, trolley, tag RFID y ejecución;
- procedencia, fecha/hora y versión;
- alias o identificadores externos si el mismo objeto tiene códigos distintos en MI, MACBU, Nivel 2 o bigbag.

La necesidad se mantiene abierta como `BU-N-043`: definir el contrato exacto de identidad y detalle de cada objeto trazable sin bloquear el modelado actual del proceso ni crear modelos persistentes específicos.

### Decisión Q-BU-004 — resuelta para el alcance actual

- Las fuentes identificadas son **Databricks** y **PI-AVEVA**.
- La explotación automática de esas fuentes queda fuera de la fase actual y se reserva para la **fase 2**.
- La fase actual se centra en estructurar la información y guardar dentro de la aplicación todo el contexto necesario para comprender el proceso.
- No se debe interpretar la existencia de estas fuentes como autorización para implementar todavía conectores, sincronización, consultas automáticas ni ingestión periódica.

La necesidad se actualiza como `BU-N-044`: definir el modelo de contexto y procedencia que permita registrar posteriormente datos de Databricks y PI-AVEVA sin rediseñar las entidades principales cuando llegue la fase 2.

### Consolidado Q-BU-005 .. Q-BU-014

| ID | Respuesta consolidada | Estado residual |
|---|---|---|
| Q-BU-005 | Los datos de ciclo a nivel de BU podrán formar parte del contexto o evidencia del proceso. Los KPI agregados por día/receta podrán calcularse mediante endpoints futuros, pero no se persisten en esta aplicación. | **Abierto no bloqueante:** contrato exacto de fuentes y entradas de cálculo en fase 2. |
| Q-BU-006 | Un defecto puede ser informativo, de parada de ciclo del elemento o de parada total de máquina. La acumulación es el efecto visible de trolleys detenidos en el cuello de botella o delante de un elemento con defecto. La corrección es la acción humana de retirar producto en una dosificación pasada de peso para volver al objetivo. | **Abierto no bloqueante:** `microparada` y `espera` no quedaron definidos formalmente. |
| Q-BU-007 | Las intervenciones por defecto son manuales. El operador debe identificar la causa primera; el sistema no sustituye ese juicio. | **Abierto no bloqueante:** no se detalló todavía el payload exacto que el operador debe registrar por tipo de intervención. |
| Q-BU-008 | La imbricación la decide el operador. | **Cerrada para fase 1.** No se confirmó obligación de guardar alternativas descartadas. |
| Q-BU-009 | La tolerancia impuesta es el **1 % sobre el peso final**. Las tolerancias de tiempos de ciclo (`±5 %`) y la referencia del `2 %` para columna de caída se usan como indicadores orientativos. | **Abierto no bloqueante:** la regla exacta del ajuste `±3 %` y la formulación final de Cpk siguen necesitando precisión si se automatizan en fase 2. |
| Q-BU-010 | En PI-AVEVA se consideran señales del PLC. En Nivel 2 existen tiempos de ciclo de elementos, timestamps de inicio y fin de operación, números de serie de rollos de polietileno y parámetros utilizados en soldadura en su valor teórico. | **Abierto no bloqueante:** no existe todavía un catálogo exhaustivo de señales por subsistema para fase 2. |
| Q-BU-011 | Debe verificarse la correcta soldadura de las BU de salida en la **primera BU de cada receta** y **cada 50 BU** posteriores. | **Abierto no bloqueante:** falta concretar rol exacto y formato mínimo de evidencia. |
| Q-BU-012 | Si la BU defectuosa es multiproducto, es desecho. Si es monoproducto, puede recuperarse en el proceso como materia prima. | **Cerrada para fase 1.** |
| Q-BU-013 | Todo producto aprovisionado a la máquina debe leerse mediante su etiqueta identificativa proporcionada por el proveedor. | **Abierto no bloqueante:** quedan por detallar versionado e identidad de rollo, posición de producto y cambio de placa/tapiz. |
| Q-BU-014 | Técnicos y agentes deben acceder al mismo conocimiento de proceso: el necesario para conocerlo, enriquecerlo y mejorar indicadores de producción como BU/día, tiempo de ciclo, tiempo de parada, número de defectos y BU a desecho. | **Cerrada en alcance funcional.** |

### Lectura resultante para el modelo de contexto

La consolidación de respuestas no obliga a crear nuevos modelos específicos. El alcance confirmado reutiliza el modelo BPM relacional y el detalle JSONB generalista existente:

- relaciones entre procesos, operaciones, etapas, stocks y demás elementos en el modelo relacional BPM ya validado;
- detalles de cada nodo en el JSONB generalista existente, con campos como misión, objetivo, descripción de operación, modo de funcionamiento, principales parámetros, principales KPI y contrato de operación si existe;
- hechos, identidades, estados y eventos estructurados y trazables cuando formen parte del alcance;
- evidencias, inspecciones, plantillas y documentación técnica como artefactos vinculados con procedencia.

Los KPI mencionados en el detalle son descripciones declarativas de indicadores de interés. La aplicación no persiste métricas ni KPI calculados; la fase 2 podrá ofrecer endpoints para calcularlos bajo demanda.

El alcance confirmado exige **combinación**:

- hechos, identidades, parámetros, mediciones, estados y eventos como información estructurada y trazable;
- evidencias, inspecciones, plantillas y documentación técnica como artefactos vinculados con procedencia.

Esta conclusión se deriva del propio `requerimiento_12.md` y de las respuestas humanas ya incorporadas; no queda como pregunta BU bloqueante adicional.


## 13. Términos y fragmentos pendientes

- “bolas de plástico” frente a “bolsa de polietileno”: el contexto indica bolsa; confirmar término oficial.
- ecart: se interpreta como peso objetivo menos peso actual; validar nombre y signo.
- retardo -3 % / +3 %: validar si la operación se aplica al parámetro o a una corrección temporal.
- cpk mayor de 1,3 y cpk mayor de 1 para un 2 %: confirmar característica, muestra y cálculo.
- “cuenta rendida”: probablemente medida real del desplazamiento; conservar como duda.
- placa de regulación, pasillo/tapiz: confirmar nombres oficiales y relación causal.
- “suelta de bolsa”, membrana, portamembranas, boquilla y pulsador: confirmar nombres de activos y códigos.
- “dos circuitos, uno por receta”: confirmar si son físicos fijos o configurables.
- cajón/contenedor metálico y 40–60 BU: confirmar nombre, capacidad nominal y criterio de lleno.
- “producto a tirar a la basura”: confirmar si el tratamiento formal es descarte, residuo, reproceso o no conformidad.
- polución: confirmar si significa polvo de producto, contaminación del elemento u otra condición.
- La regla del retardo puede contener una inversión; validarla contra Nivel 2.

### Estado de apertura real tras la consolidación

- **No queda ninguna pregunta Q-BU bloqueante** para redactar `spec.md`.
- **Siguen abiertos como no bloqueantes**: política de retención de hechos de ejecución, taxonomía formal de `microparada` y `espera`, payload exacto de intervención manual, catálogo exhaustivo de señales PLC/PI-AVEVA, contrato exacto de identidad/versionado de rollo/posición/placa-tapiz y nombres oficiales de varios términos de planta.
- La decisión global de `requerimiento_12` sobre varias hipótesis queda resuelta para este anexo: el técnico decide manualmente la conclusión de causa. Deben conservarse la justificación, la fecha, el autor y la trazabilidad hacia las hipótesis evaluadas, sus evidencias, la causa y la rama. No se define ninguna regla automática `AND`/`OR`.

## 14. Cobertura y control de cambios

Se ha cubierto misión, tipos de BU, receta/subreceta, MACBU, trolley, PSA, rollo, compensador, tensor, solapamiento, soldaduras, corte, parámetros, básculas, bigbags, posiciones, maestro-esclavo, regímenes, autoajustes, cpk, fueras de tolerancia, deriva, convoy, imbricación, marcado, soldadura de cierre, evacuación, robot, cajones, productividad, defectos/paradas, niveles 1/2/PI-AVEVA y aprovisionamiento.

Las frases incompletas o posiblemente erróneas no se han convertido en decisiones cerradas; se han trasladado a necesidades, términos y preguntas.

No se ha modificado requerimientos_cliente/descripciones del proceso/proceso_BU.md.

Toda incorporación posterior a requerimiento_12.md debe enlazar los IDs BU-N-* y conservar la fuente de cada regla, medición o decisión.

### Decisiones incorporadas

| ID | Fecha | Tipo | Decisión | Estado |
|---|---|---|---|---|
| Q-BU-001 | 2026-07-31 | cmin significa centésimas de minuto; 1 cmin equivale a 0,6 segundos. | Confirmada por el programador humano |
| Q-BU-002 | 2026-07-31 | MI es la máquina de mezclado; mezcla es la unidad principal; la receta codifica línea, receta y versión; subgama identifica los productos usados; lote agrupa producción por periodo y materias primas y cambia al cambiar el producto. | Confirmada por el programador humano |
| Q-BU-003 | 2026-07-31 / 2026-08-01 | Los identificadores concretos de mezcla, lote, BU, trolley, tag y bigbag se definirán más adelante, pero todos son información necesaria y requerimiento_12 debe definir cómo conservar su identidad, procedencia y relaciones. El tag es una pastilla RFID en el trolley, independiente del identificador maestro de BU, receta o bigbag. | Alcance confirmado; contrato exacto pendiente |
| Q-BU-004 | 2026-07-31 | Las fuentes son Databricks y PI-AVEVA; su explotación automática se reserva para fase 2. La fase actual solo estructura y conserva el contexto dentro de la aplicación. | Confirmada por el programador humano |
| Q-BU-005 | 2026-08-01 | Los datos de ciclo pueden formar parte del contexto o evidencia; los KPI agregados por día/receta (media, desviación estándar, Cp, Cpk, percentiles) son calculables bajo demanda y no valores persistidos. | Confirmada en alcance; contrato de cálculo pendiente |
| Q-BU-006 | 2026-08-01 | Defecto = evento categorizable, incluso informativo, parada de ciclo o parada total; acumulación = efecto visible de trolleys detenidos; corrección = retirada manual de exceso de producto. | Confirmada en alcance; microparada/espera pendientes |
| Q-BU-007 | 2026-08-01 | Las intervenciones por defecto son manuales y requieren juicio del operador sobre la causa primera. | Confirmada en alcance; payload pendiente |
| Q-BU-008 | 2026-08-01 | La imbricación la decide el operador. | Confirmada por el programador humano |
| Q-BU-009 | 2026-08-01 | La única tolerancia impuesta es 1 % al peso final; `±5 %` y `2 %` se usan como referencias orientativas para indicadores. | Confirmada en alcance; detalle de cálculo pendiente |
| Q-BU-010 | 2026-08-01 | PI-AVEVA conserva señales de PLC; Nivel 2 conserva tiempos de ciclo, timestamps operativos, números de serie de rollos y parámetros teóricos de soldadura. | Confirmada en alcance; catálogo exhaustivo pendiente |
| Q-BU-011 | 2026-08-01 | La soldadura de salida se verifica en la primera BU de cada receta y cada 50 BU. | Confirmada en alcance; rol/evidencia pendiente |
| Q-BU-012 | 2026-08-01 | La BU multiproducto defectuosa es desecho; la monoproducto puede recuperarse como materia prima. | Confirmada por el programador humano |
| Q-BU-013 | 2026-08-01 | Todo producto aprovisionado debe leerse mediante la etiqueta identificativa del proveedor. | Confirmada en alcance; versionado pendiente |
| Q-BU-014 | 2026-08-01 | Técnicos y agentes deben ver el mismo conocimiento útil para conocer, enriquecer y mejorar el proceso y sus KPI. | Confirmada por el programador humano |
| R12-CAUSA-001 | 2026-08-01 | Cuando existan varias hipótesis relacionadas con una causa, el técnico decide manualmente la conclusión de causa; se conserva justificación, fecha, autor y trazabilidad hacia hipótesis, evidencias, causa y rama. No se define una regla automática `AND`/`OR`. | Decisión humana confirmada; pendiente de validación de `spec.md` |

| AMD-001 | 2026-08-01 | B | Se conserva el modelo BPM y causalidad validado. Las relaciones usan el modelo relacional existente y los detalles de nodo el JSONB generalista existente. La aplicación no persiste métricas ni KPI calculados; la fase 2 podrá calcularlos mediante endpoints. | Actualización realizada por `requirements-agent` en sesión aislada de Codex; estado `spec_pendiente_validacion` |

## 15. Historial de elaboración

- 2026-07-31: borrador inicial estructurado, sin completar la consolidación de respuestas Q-BU.
- 2026-08-01: consolidación realizada por `requirements-agent`, retirando pendientes obsoletos y dejando preparado el artefacto técnico `spec.md`.
- 2026-08-01: decisión humana incorporada por `requirements-agent`: la conclusión de causa ante varias hipótesis la decide manualmente el técnico, sin regla automática `AND`/`OR`.
- 2026-08-01: AMD-001 actualizada por `requirements-agent` en sesión aislada de Codex: continuidad del BPM/causalidad validado, detalle JSONB generalista sin modelos específicos nuevos y no persistencia de métricas/KPI; estado `spec_pendiente_validacion`.
- El archivo fuente original `requerimientos_cliente/descripciones del proceso/proceso_BU.md` se conserva sin modificación.
