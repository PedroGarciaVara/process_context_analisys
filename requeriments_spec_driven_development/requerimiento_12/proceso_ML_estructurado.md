# Fixture/estructuración del proceso ML de Fabricación de Mezclas de Caucho — cobertura y desglose BPM para requerimiento_12

> **Clasificación obligatoria:** este documento es una estructuración formal del proceso de fabricación de mezclas de caucho (`proceso_ML.md`) para validar la cobertura del contexto estructurado generalista de `requerimiento_12`. **NO sustituye el esquema generalista relacional ni crea un bounded context o tablas exclusivas de ML.** Sus conceptos y nodos se mapean directamente al BPM relacional (`pm_process_definition`, `pm_process_version`, `pm_process_node`, `pm_process_transition`) y al detalle JSON/JSONB generalista compartido por todos los procesos del sistema.

---

## 0. Metadatos y alcance

- **Estado:** Estructura consolidada para cobertura y trazabilidad BPM; pendiente de validación humana junto con `spec.md`.
- **Fecha:** 2026-08-04.
- **Fuente primaria:** `requeriments_spec_driven_development/requerimiento_12/proceso_ML.md`.
- **Fuente funcional relacionada:** `requerimientos_cliente/requerimiento_12.md`.
- **Autor:** `execute-agent` / `requirements-agent`.
- **El archivo fuente original `proceso_ML.md` no se modifica.** Este documento lo estructura y complementa con metadatos y modelado BPM.
- **Objetivo:** Mapear de forma exhaustiva la fabricación de mezclas de caucho al modelo BPM generalista del backend, conservando el 100% de la información técnica, física, algorítmica y de negocio.

### Trazabilidad AMD-002

- `AMD-002` reestructura el spec para un sistema generalista aplicable a más de 1000 procesos.
- Este documento conserva todo el conocimiento del proceso ML (mezclas de caucho), pero sus identificadores, nodos y atributos se registran como datos de configuración en la estructura BPM relacional y JSONB generalista.
- Los gaps identificados deben registrarse como gaps del contrato generalista o como configuración de proceso; no se permite la creación de tablas o repositorios dedicados exclusivos de ML.

### Estados de trazabilidad

| Estado | Significado |
|---|---|
| **actual** | Hay evidencia en la aplicación o en su modelo/documentación actual. No implica telemetría industrial real. |
| **req12** | Requerimiento_12 contempla el concepto o la relación, pero su implementación concreta para ML debe definirse o ejecutarse. |
| **no identificado** | No se ha localizado soporte ni contrato suficiente. |
| **requiere confirmación** | La fuente admite varias interpretaciones o falta una decisión del responsable. |

---

## 1. Misión y resultado

El objetivo principal del proceso es **fabricar mezclas de caucho para neumáticos**, mezclando en las proporciones exactas marcadas por la receta los siguientes componentes:
- **Cauchos:** Cauchos naturales (NR) y cauchos sintéticos (SR).
- **Cargas Reforzantes:** Negro de humo de diferentes granulometrías y longitudes de cadena, y Sílice.
- **Productos Químicos:** Ceras, ácido esteárico, óxido de zinc, resinas con funciones específicas.
- **Silano:** Requerido si la mezcla incorpora sílice.
- **Aceites:** Para plastificación y procesabilidad.
- **Azufre:** Para la vulcanización posterior (incorporado/finalizado en etapas posteriores o en el conjunto HA).

| Información de negocio | Estado | Observación |
|---|---|---|
| Proceso ML como proceso/subproceso navegable | actual + req12 | La aplicación modela procesos BPM navegables; el proceso ML se registra como `PROCESO_ML_FABRICACION`. |
| Receta de mezcla, proporciones y tolerancia de peso | req12 | Deben ser datos versionados y vinculables a operaciones y ejecuciones. |
| Trazabilidad de lotes de materias primas y BUs | no identificado | Necesidad ML-N-001. |
| Integración de señales de autómata (PLC/Nivel 2/PI-AVEVA) | req12 | Explotación automática reservada a Fase 2. |

---

## 2. Líneas de fabricación y flujo general

En la zona de fabricación se dispone de **cuatro líneas paralelas de fabricación**:

### 2.1 Equipos por Línea

Cada una de las cuatro líneas consta de la siguiente secuencia de equipos principales:
1. **Mezclador Interno (MI):** Mezclador de paletas rotatorias con pilón hidráulico y compuerta de descarga ("silla").
2. **Goulotte:** Elemento intermedio de espera y transferencia por gravedad.
3. **HomoAlimentador (HA):** Mezclador/homogeneizador secundario alimentado por la Goulotte.
4. **Conjunto De HomoFinalizador:** Homogeneización y acondicionado final.
5. **Báscula:** Control ponderal post-homogeneización.
6. **Calandra:** Laminación de la mezcla de caucho.
7. **Refrigerador:** Enfriamiento continuo de la banda de caucho.
8. **Apilador:** Plegado y apilado en palets para aprovisionamiento a etapas posteriores.

### 2.2 Nomenclatura e identificadores de línea

| Nivel / Elemento | Línea 1 | Línea 2 | Línea 3 | Línea 4 |
|---|---|---|---|---|
| **Mezclador Interno** | MI10 | MI20 | MI30 | MI40 |
| **Circuitos de BU** | BU11, BU12 | BU21, BU22, BU23 | BU31, BU32 | BU41, BU42 |
| **Básculas de Cargas (BN)** | BN11, BN12 | BN21, BN22 | BN31, BN32 | BN41, BN42 |
| **Inyección de Silano** | N/A | SI21 | SI31 | SI43 |

---

## 3. Aprovisionamiento de BUs (Bolsas Unitarias)

### 3.1 Flujo de aprovisionamiento de BUs
- Las BUs (bolsas de productos químicos fabricadas en la máquina MACBU) se aprovisionan en la plataforma del MI en **cajones metálicos con 40 a 60 BUs**.
- Los operadores desplazan los cajones con carretillas y los ubican en las posiciones asignadas.
- Las BUs se extraen de una en una del cajón y se posicionan en un **tapiz de pasos**.
- **Paso:** Se define como el conjunto de BUs correspondientes a **una Mezcla**.
- La capacidad de los tapices varía entre **6 y 10 pasos** según el tapiz.
- Las BUs avanzan por el tapiz hacia una **báscula de verificación**:
  - **Peso OK:** El producto avanza al puesto de introducción (que equivale a 1 paso; la báscula equivale a otro paso).
  - **Peso No OK (Líneas 1, 2 y 3):** Se desecha automáticamente hacia el cajón de desecho.

### 3.2 Circuitos por línea y particularidad de Línea 4
- **Línea 1 (MI10):** 2 circuitos de aprovisionamiento (`BU11`, `BU12`).
- **Línea 2 (MI20):** 3 circuitos de aprovisionamiento (`BU21`, `BU22`, `BU23`).
- **Línea 3 (MI30):** 2 circuitos de aprovisionamiento (`BU31`, `BU32`).
- **Línea 4 (MI40):** 2 circuitos de aprovisionamiento (`BU41`, `BU42`).
- **Particularidad crítica de Línea 4:** En la Línea 4 **NO existe salida automática a desecho**. Cualquier BU fuera de tolerancia debe ser retirada manualmente por el operador de la báscula. Esto acarrea un riesgo alto de impacto en el rendimiento del MI por falta de producto (espera del operador).

| Elemento / Regla | Estado | Observación |
|---|---|---|
| BUs por mezcla y circuitos de tapiz | actual + req12 | Modelable como nodo de operación de aprovisionamiento. |
| Báscula de verificación y desecho automático | req12 | Regla de decisión de calidad post-pesaje. |
| Retención manual en Línea 4 y pérdida de ciclo | req12 | Incidente y cuello de botella operativo. ML-N-002. |

---

## 4. Aprovisionamiento de Cauchos (Naturales y Sintéticos)

### 4.1 Flujo de caucho estándar
- Los cauchos preparados en la etapa anterior son transportados mediante un **convoy aéreo en balancelas**.
- Cada línea dispone de un **buffer/stock de 17 a 20 balancelas**.
- Cada balancela contiene la masa total de cauchos para **una Mezcla**.
- Las balancelas se abren sobre una **tolva-báscula** donde se verifica cuantitativamente su peso:
  - **Peso OK:** Se descarga al tapiz de introducción del MI y espera la orden de carga.
  - **Peso NO OK:** El tapiz invierte el sentido de marcha (da marcha atrás) y evacua a desecho la masa de caucho.
- Existe **únicamente una línea de introducción de caucho por MI**.

### 4.2 Caucho fraccionado (Línea 4)
- En la **Línea 4** existe la capacidad de fabricar mediante el método **fraccionado**:
  - En lugar de introducir todo el caucho en una única balancela por mezcla, el caucho se divide en **2 balancelas por mezcla**.
  - Para permitir la verificación y OK de ambas balancelas antes de la orden de introducción, la evacuación de la tolva-báscula dispone de **dos tapices en serie** (uno para la carga de cada balancela).

| Elemento / Regla | Estado | Observación |
|---|---|---|
| Convoy aéreo y stock de 17-20 balancelas | actual + req12 | Representable como nodo `stock` en la cadena BPM. |
| Marcha atrás del tapiz para desecho de caucho | req12 | Control de calidad y flujo de devolución. |
| Método fraccionado (2 balancelas, 2 tapices serie) | req12 | Configuración particular de la Línea 4. ML-N-003. |

---

## 5. Aprovisionamiento de Cargas Reforzantes (Negro de Humo y Sílice)

### 5.1 Silos pesadores y básculas
- Los productos se dosifican desde **silos pesadores** dedicados a cada tipo/referencia de negro de humo o sílice.
- En la parte inferior de los silos se sitúa el sistema de extracción y dosificación hacia la tolva-báscula de cargas.
- **Básculas de cargas (2 por línea):**
  - **Línea 1:** BN11, BN12.
  - **Línea 2:** BN21, BN22.
  - **Línea 3:** BN31, BN32.
  - **Línea 4:** BN41, BN42.
- En todas las básculas es posible realizar **dos dosificaciones acumuladas** en serie (primer producto, luego segundo producto) para completar la receta.

### 5.2 Tecnologías de extracción y dosificación
Se utilizan 3 tecnologías de extracción:
1. **Extracción con 2 vis rotativos:** Un vis de gran diámetro (gran caudal) y un vis de pequeño diámetro (pequeño caudal).
2. **Extracción con vis único.**
3. **Extracción con tapiz único.**

### 5.3 Algoritmo PLC de dosificación (3 Regímenes)
El control en el PLC es análogo para las 3 tecnologías y se divide en 3 etapas:
- **Ecart:** $$\text{ecart} = \text{peso final objetivo} - \text{peso real}$$

1. **Régimen 1 (Máxima velocidad):** Dosificación a $v_{\max}$ programada de la receta.
2. **Régimen 2 (Velocidad de regulación):** Velocidad variable decreciente:
   $$v = v_{\min} + K \cdot (\text{ecart} - \text{retardo}) \cdot v_{\min}$$
3. **Régimen 3 (Velocidad mínima):** Dosificación a $v_{\min}$ constante hasta el corte (stop) cuando:
   $$\text{ecart} = \text{columna de caída}$$
   *(En la tecnología 1 de 2 vis, el Régimen 3 se realiza exclusivamente con el vis de pequeño caudal).*

### 5.4 Optimización dinámica de constantes
- **Ganancia $K$ y Retardo:** Se optimizan ciclo a ciclo en $\pm 3\%$ para equiparar el tiempo real de dosificación con los tiempos teóricos modelo de los regímenes 2 y 3.
- **Columna de caída (producto en vuelo):** Se recalcula en cada ciclo mediante una **media móvil de los últimos 5 ciclos**, evaluando la columna de caída previa y el ecart final resultante.
- **Criterios de calidad y Cpk:**
  - $C_{pk} > 1{,}3$ para dosificaciones de más de 50 kg.
  - $C_{pk} > 1{,}0$ para dosificaciones menores de 50 kg.
- **Tratamiento de Fueras de Tolerancia:**
  - **Por defecto (menor peso):** El extractor entra en ciclo de impulsos automáticos hasta alcanzar el rango OK.
  - **Por exceso (mayor peso):** El operador debe acceder físicamente a la báscula de negro y retirar manualmente con un cazo la cantidad sobrante. Al requerir intervención manual, **provoca una parada inmediata en el MI** por indisponibilidad de carga OK.

---

## 6. Aprovisionamiento de Silano y Aceites

### 6.1 Silano
- Inyección directa en la cámara del MI.
- **Medición continua:** Mediante medidor dinámico de masa (**MDM por efecto Coriolis**).
- **Algoritmo PLC:** Ejecuta los mismos 3 regímenes, parámetros ($v_{\max}, v_{\min}, K, \text{Retardo}, \text{columna}$) y optimización dinámica de $\pm 3\%$ y media móvil.
- **Circuitos:** Línea 2 (`SI21`), Línea 3 (`SI31`), Línea 4 (`SI43`).

### 6.2 Aceites
Se aprovisionan mediante 2 tecnologías:
1. **Inyección directa con MDM (Coriolis).**
2. **Dosificación en tolva-báscula:** Tras verificación del peso OK, se inyecta al MI.

**Particularidades de dosificación de aceite:**
- En la dosificación a báscula, el aceite circula en un **circuito cerrado**. Se regula el **% de apertura de la válvula** (no la velocidad de la bomba), aplicando el algoritmo de 3 regímenes.
- **Corrección automática:** A diferencia de las cargas sólidas, la báscula de aceite dispone de un **picaje de desecho**, permitiendo purgar automáticamente las fueras de tolerancia por exceso.
- **Temperatura crítica a 60 °C:** El aceite y la tolva deben mantenerse strictly a **60 °C** para garantizar la fluidez requerida.
- **Defecto de Cero:** Si la temperatura baja de 60 °C, el aceite queda retenido en la tolva y no descarga completamente, provocando un *defecto de cero* (diferencia entre el peso de la báscula tras la descarga y el tara inicial).

---

## 7. Operación de Mezclado en Mezclador Interno (MI)

La mezcla se elabora en un **Mezclador Interno (MI)** (tecnología Farrel o equivalente) siguiendo 3 etapas secuenciales:
linea 1: MI10
linea 2: MI20
linea 3: MI30
linea 4: MI40

### Etapa 1: Aprovisionamiento y Validación de Entrada
1. El MI solicita la orden de inicio de aprovisionamiento.
2. Todos los subsistemas (BUs, caucho, cargas, silano, aceites) dosifican, verifican pesajes y mueven el material a los puestos de introducción.
3. El ciclo de mezclado arranca únicamente tras recibir la señal de **OK de todos los productos listos**.

### Etapa 2: Ciclo de Mezclado Interno ($t = 0 \text{ cmin}$)

#### 2.1 Introducción de materias primas
La introducción se desencadena por **tiempo de ciclo**, **temperatura de masa** o **energía consumida acumulada**:
- **Evolución térmica:** La entrada del caucho genera un incremento rápido de temperatura por el trabajo de cizallamiento de las paletas rotatorias sobre la masa viscoelástica.
- **Técnicas de adición:**
  - *Caucho + Cargas a $t=0\text{ cmin}$:* Favorece la dispersión inicial.
  - *Comasticación ($t=0\text{ cmin}$ caucho solo, cargas a $T$ determinada):* Rompe cadenas poliméricas (típico en caucho natural NR) antes de añadir el negro de humo.
  - *Aceite ($t > 0$ a temperatura $T$):* Debe inyectarse siempre cuando la cámara ya contiene masa de caucho para evitar la impregnación directa de paletas/paredes (lo que causaría pegado y retención en la evacuación).
  - *BUs ($t=0$ o programado):* Cada circuito de BU se programa de forma independiente según la receta.

#### 2.2 Mezclado y Respiros de Pilón
- Dos paletas rotatorias fuerzan la circulación del material entre ellas y contra la pared de la cámara.
- **PILÓN (Elemento de cierre superior):** Accionado hidráulicamente.
  - *Posición baja:* Volumen mínimo, trabajo máximo sobre la mezcla.
  - *Levantamiento del pilón ("Respiro"):* Aumenta el volumen disponible, permitiendo que la mezcla ascienda y se redistribuya en la cámara.
  - Durante un ciclo estándar se programan de **3 a 6 respiros de pilón**.

### Etapa 3: Evacuación y Transferencia
1. **Apertura de Silla:** Al alcanzar la temperatura de consigna de la receta, se abre la compuerta inferior ("silla") del MI y la mezcla cae por gravedad.
2. **Aceleración de paletas:** Se acelera el giro de las paletas para expulsar cualquier resto.
   - *No Conformidad:* La retención de caucho en la cámara altera las proporciones en la etapa subsiguiente de azufre (HomoAlimentador HA).
3. **Goulotte (Tolva intermedia):** Recibe la mezcla evacuada. El tiempo estándar de permanencia en Goulotte es de **0 a 2 cmin** ($0\text{ a }1{,}2\text{ segundos}$).
4. **HomoAlimentador (HA):** Cuando el HA se libera, la Goulotte descarga la mezcla sobre él. Libres el MI y la Goulotte, arranca de inmediato el siguiente ciclo de mezclado.

---

## 8. Desglose de Nodos y Transiciones BPM

### 8.1 Nodos BPM del Proceso ML (`PROCESO_ML_FABRICACION`)

| Código del Nodo | Tipo de Nodo | Nombre del Nodo | Descripción / Misión | Rol Salida |
|---|---|---|---|---|
| `INPUT_ML` | `input` | Demanda de Receta ML | Inicio del ciclo de fabricación; recepción de orden y receta de mezcla. | `normal` |
| `BU_APROV` | `operation` | Aprovisionamiento de BUs | Verificación en báscula y avance por tapiz de pasos (circuitos BU11..BU42). | `normal` |
| `CAUCHO_APROV` | `operation` | Aprovisionamiento de Caucho | Recepción en balancelas, verificación en tolva-báscula (opción fraccionado L4). | `normal` |
| `CARGAS_DOSIF` | `operation` | Dosificación Cargas PLC | Dosificación de negro/sílice en BN11..BN42 con algoritmo PLC de 3 regímenes. | `normal` |
| `SILANO_DOSIF` | `operation` | Inyección de Silano | Inyección directa medida por Coriolis MDM (Líneas 2, 3 y 4). | `normal` |
| `ACEITE_DOSIF` | `operation` | Dosificación Aceites 60°C | Inyección MDM o tolva-báscula a 60°C con picaje de desecho automático. | `normal` |
| `MI_MEZCLADO` | `operation` | Mezclado Interno MI | Mezclado en cámara con paletas, comasticación, adiciones y 3-6 respiros de pilón. | `normal` |
| `GOULOTTE_ESPERA` | `stock` | Intermedia Goulotte | Tolva de espera y transferencia por gravedad (permanencia 0-2 cmin). | `normal` |
| `HA_HOMOALIMENTADOR` | `operation` | Homogeneizado HA | Mezclado secundario y adición final en HomoAlimentador. | `normal` |
| `DECISION_CALIDAD` | `decision` | Control Ponderal y Calidad | Evaluación de conformidad de pesos, temperaturas y viscosidad de mezcla. | `normal` |
| `OUTPUT_MEZCLA` | `output` | Mezcla de Caucho Terminada | Salida conforme del proceso hacia calandra, refrigerador y apilador. | `normal` |
| `DESECHO_MATERIAL` | `output` | Evacuación a Desecho | Salida no conforme: rechazo automático de caucho/BU o desecho de masa. | `waste` |

### 8.2 Transiciones BPM del Proceso ML

| Transición ID | Nodo Origen (`source`) | Nodo Destino (`target`) | Tipo | Condición / Etiqueta |
|---|---|---|---|---|
| `TR_01` | `INPUT_ML` | `BU_APROV` | `sequence` | `Inicio orden de mezcla` |
| `TR_02` | `INPUT_ML` | `CAUCHO_APROV` | `sequence` | `Inicio orden de mezcla` |
| `TR_03` | `INPUT_ML` | `CARGAS_DOSIF` | `sequence` | `Inicio orden de mezcla` |
| `TR_04` | `INPUT_ML` | `SILANO_DOSIF` | `sequence` | `Inicio orden de mezcla` |
| `TR_05` | `INPUT_ML` | `ACEITE_DOSIF` | `sequence` | `Inicio orden de mezcla` |
| `TR_06` | `BU_APROV` | `MI_MEZCLADO` | `sequence` | `BU pesada OK` |
| `TR_07` | `BU_APROV` | `DESECHO_MATERIAL` | `conditional` | `BU fuera de tolerancia (desecho auto)` |
| `TR_08` | `CAUCHO_APROV` | `MI_MEZCLADO` | `sequence` | `Caucho pesado OK` |
| `TR_09` | `CAUCHO_APROV` | `DESECHO_MATERIAL` | `conditional` | `Caucho fuera de tolerancia (marcha atrás)` |
| `TR_10` | `CARGAS_DOSIF` | `MI_MEZCLADO` | `sequence` | `Cargas pesadas OK` |
| `TR_11` | `SILANO_DOSIF` | `MI_MEZCLADO` | `sequence` | `Silano inyectado OK` |
| `TR_12` | `ACEITE_DOSIF` | `MI_MEZCLADO` | `sequence` | `Aceite inyectado OK (60°C)` |
| `TR_13` | `MI_MEZCLADO` | `GOULOTTE_ESPERA` | `sequence` | `Evacuación por silla` |
| `TR_14` | `GOULOTTE_ESPERA` | `HA_HOMOALIMENTADOR` | `sequence` | `Descarga a HA (0-2 cmin)` |
| `TR_15` | `HA_HOMOALIMENTADOR` | `DECISION_CALIDAD` | `sequence` | `Mezcla finalizada hacia control` |
| `TR_16` | `DECISION_CALIDAD` | `OUTPUT_MEZCLA` | `conditional` | `Parámetros y peso OK` |
| `TR_17` | `DECISION_CALIDAD` | `DESECHO_MATERIAL` | `conditional` | `Mezcla fuera de especificación` |

---

## 9. Niveles de información e integración

- **Nivel 1 (PLC / Autómata):** Control en tiempo real de dosificaciones (algoritmo 3 regímenes), accionamientos de pilón, silla, MDM Coriolis, y velocidades de tapiz.
- **Nivel 2 (MES / SCADA):** Gestión de recetas de mezcla, secuencias de adición, parámetros teóricos, registro de pesajes efectivos y trazabilidad por lote.
- **PI-AVEVA:** Historización de alta frecuencia para variables continuas (curvas de temperatura del MI, potencia consumida por paletas, presión de pilón y caudales MDM).

---

## 10. Modelo de conocimiento recomendado

1. **Definición Versionada BPM:** Registro formal del diagrama de procesos, operaciones, stocks y salidas en `pm_process_definition`, `pm_process_version`, `pm_process_node` y `pm_process_transition`.
2. **Detalle Semántico por Nodo (JSONB):** Descripción detallada de parámetros ($v_{\max}, v_{\min}, K$, respiros de pilón, 60 °C en aceite), objetivos y equipos asignados en `pm_process_node_metadata`.
3. **Contexto de Ejecución y Evidencia:** Captura estructurada de ejecuciones de mezcla, lotes de caucho/negro, desviaciones y paradas mediante `pm_context_record`.

---

## 11. Necesidades prioritarias para requerimiento_12

| Prioridad | ID Necesidad | Descripción del Requerimiento / Gap Faltante |
|---|---|---|
| **Alta** | `ML-N-001` | Identidad unificada y trazabilidad de lotes de caucho, negro, sílice, aceites y BUs. |
| **Alta** | `ML-N-002` | Registro y alerta de retención manual de BUs en la báscula de Línea 4. |
| **Alta** | `ML-N-003` | Configuración del modo fraccionado en Línea 4 (2 balancelas en 2 tapices serie). |
| **Alta** | `ML-N-004` | Histórico de autoajustes de constantes PLC ($K$, retardo $\pm 3\%$, media móvil de 5 en columna). |
| **Media** | `ML-N-005` | Monitorización continua de la temperatura a 60 °C en básculas de aceite para prevenir el defecto de cero. |
| **Media** | `ML-N-006` | Registro de curvas de respiros de pilón (3-6 subidas/bajadas) y correlación con temperatura/energía. |
| **Media** | `ML-N-007` | Captura de eventos de aceleración de paletas y verificación de no-retención en la compuerta silla del MI. |

---

## 12. Términos y fragmentos pendientes

- **Respiro de Pilón:** Movimiento ascendente del pilón superior para aliviar presión y redistribuir la mezcla en la cámara.
- **Comasticación:** Molienda/mezclado previo del caucho natural a $t=0\text{ cmin}$ sin cargas para romper cadenas y reducir viscosidad.
- **Defecto de Cero:** Desviación de tara en la báscula de aceite producida por adherencia/retención del producto por debajo de 60 °C.
- **Goulotte:** Tolva de transferencia por gravedad entre el MI y el HomoAlimentador (HA) con tiempo de permanencia objetivo de 0-2 cmin.
- **Silla:** Compuerta abatible de evacuación en la parte inferior del mezclador interno.

---

## 13. Cobertura y control de cambios

- Se ha cubierto la totalidad del contenido funcional y técnico de `proceso_ML.md`:
  - 4 líneas paralelas de fabricación y sus secuencias de equipos.
  - Circuitos de BU (BU11..BU42), tapiz de pasos, báscula y desecho manual en Línea 4.
  - Convoy aéreo de caucho, buffer de 17-20 balancelas, inversión de marcha y fraccionado en Línea 4.
  - Cargas reforzantes con silos, 3 tecnologías de extracción y algoritmo PLC de 3 regímenes con auto-corrección $\pm 3\%$, media móvil de 5 y Cpk > 1.3 / > 1.
  - Inyección de Silano por MDM Coriolis (SI21, SI31, SI43).
  - Aceites a 60 °C, picaje de desecho y prevención del defecto de cero.
  - Etapas de mezclado en MI, comasticación, adición de aceite a $T > 0$, pilón con 3-6 respiros, compuerta silla y descarga a Goulotte (0-2 cmin) y HA.
- **Historial:**
  - 2026-08-04: Creación del documento estructurado `proceso_ML_estructurado.md` respetando la plantilla y metadatos de `proceso_BU_estructurado.md` en cumplimiento del Requerimiento 12.

## 14. Evidencia de carga del fixture ML — execute-agent

### Artefacto reproducible

- Script: `scripts/seed_req12_ml_fixture.py`.
- Proceso BPM esperado: `process_code=PROCESO_ML_FABRICACION`, `name=PROCESO_ML_FABRICACION`.
- Versión determinista de test: `version_number=1`, estado `draft`, con UUID derivado del seed `R12_ML_FIXTURE_V1`.
- Comandos previstos: `python3 scripts/seed_req12_ml_fixture.py --dry-run --json` y `python3 scripts/seed_req12_ml_fixture.py --json`.
- La carga usa únicamente `pm_process_definition`, `pm_process_version`, `pm_process_node`, `pm_process_transition`, `pm_process_node_metadata`, `pm_context_record`, `proceso`, `maquina`, `contrato`, `contrato_maquina` y `machine_operation_configuration`.
- La limpieza está acotada a la versión determinista y a la procedencia `R12_ML_FIXTURE_V1`; no borra contratos, máquinas ni datos ajenos.

### Resultado de ejecución en esta sesión

| Comprobación | Resultado | Evidencia / observación |
|---|---|---|
| Compilación del script | OK | `python3 -m py_compile scripts/seed_req12_ml_fixture.py` |
| Auditoría contractual offline | OK | `python3 scripts/seed_req12_ml_fixture.py --contract`; 12 nodos, 17 transiciones, 26 recursos, 7 operaciones y 12 gaps explícitos. |
| Tests de contrato offline | OK | `python3 -m unittest tests.unit.test_req12_ml_fixture tests.unit.test_req12_fixture_seed tests.unit.test_req12_stages tests.unit.test_req12_machine_projection` → 31 OK. |
| Acceso PostgreSQL configurado | BLOQUEADO | El socket `/var/run/postgresql/.s.PGSQL.5432` devuelve `Operation not permitted`; los intentos por socket, `127.0.0.1` y `localhost` no completan conexión. |
| `--dry-run --json` | NO EJECUTADO | No fue posible abrir la conexión para validar/contar la definición y versión. |
| Primera carga | NO EJECUTADA | No se afirma que existan filas cargadas. |
| Segunda carga/idempotencia | NO EJECUTADA | Pendiente de PostgreSQL accesible. |
| Conteos, huérfanos, descripciones y relaciones | NO VERIFICADOS | Requieren ejecutar el script contra la BD configurada. |

### Puntos no registrados o no soportados

| ID | Sección | Punto | Tratamiento |
|---|---|---|---|
| `ML-N-001` | §3-§6 | Identidad y trazabilidad de lotes de caucho, negro, sílice, aceites y BUs | No registrado; el contrato generalista actual no aporta un hecho de lote industrial. |
| `ML-N-002` | §3.2 | Retención manual y alerta de BUs en Línea 4 | No registrado; queda como declaración/gap. |
| `ML-N-003` | §4.2 | Modo fraccionado de Línea 4 | Registrable solo como detalle declarativo; no se crea modelo especializado. |
| `ML-N-004` | §5.3-§5.4 | Histórico de autoajustes PLC | No registrado; no se inventan lecturas ni telemetría. |
| `ML-N-005` | §6.2 | Temperatura continua a 60 °C y defecto de cero | No registrado; el script solo conserva parámetros declarativos. |
| `ML-N-006` | §7 | Curvas de respiros de pilón y correlación energética | No registrado; no existe fuente de hechos conectada. |
| `ML-N-007` | §7 | Aceleración de paletas y retención en silla | No registrado; no existe telemetría PLC/MES/PI-AVEVA disponible. |
| `ML-LOAD-001` | §9 | Carga real e idempotencia contra PostgreSQL | Bloqueado por inaccesibilidad del socket/endpoint configurado en esta sesión; requiere reejecución con la BD disponible. |
| `ML-N-008` | §2.1 | Equipos posteriores a HA como nodos independientes | Solo aparecen en la descripción de salida; no se crean nodos artificiales. |
| `ML-N-009` | §1/§5 | Recetas, proporciones, tolerancias y lotes | No persistidos; la necesidad queda en metadata declarativa. |
| `ML-N-010` | §5.3-§5.4/§6 | Fórmulas, Cpk, ajustes y curvas | Metadata declarativa; no se persisten muestras ni resultados calculados. |
| `ML-N-011` | §3.2/§4.2/§6.2/§7 | Intervenciones manuales, fraccionado y retención | Labels/controles declarativos; no hechos industriales ni alertas. |

La ausencia de ejecución de BD es un bloqueo operativo de esta sesión, no evidencia de que el modelo no soporte el fixture. El requerimiento permanece pendiente de validación humana y no se marca como `done`.
