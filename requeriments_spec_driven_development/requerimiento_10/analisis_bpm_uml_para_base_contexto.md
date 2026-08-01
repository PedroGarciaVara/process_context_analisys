# Análisis BPM/UML para la base de contexto del proceso

## Propósito

Este documento identifica qué capacidades BPM, UML y de edición web deben analizarse o implementarse mientras se representa el proceso industrial descrito en:

[`test_descripcion_procesos.md`](./test_descripcion_procesos.md)

El objetivo principal no es construir un editor gráfico genérico, sino crear una base de contexto del proceso suficientemente precisa para que agentes y usuarios puedan comprender:

- qué ocurre en cada etapa;
- qué entradas, salidas, máquinas y materiales intervienen;
- qué condiciones determinan cada rama;
- qué datos son necesarios para validar una mezcla;
- qué relaciones son secuenciales, paralelas, condicionales o de sincronización;
- qué información todavía no está formalizada.

Las decisiones de implementación deben surgir al intentar representar el proceso real, no de añadir símbolos BPMN/UML sin una necesidad semántica comprobable.

## Referencias normativas

- [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/)
- [OMG UML 2.5.1](https://www.omg.org/spec/UML/)
- [W3C WAI: accesibilidad visual](https://www.w3.org/WAI/people-use-web/abilities-barriers/visual/)
- [W3C WCAG: funcionamiento mediante teclado](https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible.html)

BPMN y UML comparten algunos símbolos, pero no siempre comparten semántica. Debe evitarse mezclar `DecisionNode`, `MergeNode`, `Gateway`, `Fork` y `Join` como si fueran el mismo concepto.

## Capacidades ya cubiertas

- Nodos tipados básicos: `input`, `output`, `operation`, `subprocess`, `decision` y `stock`.
- Transiciones `sequence` y `branch`.
- Decisiones con ramas `Sí`/`No`.
- Subprocesos jerárquicos con breadcrumbs y expansión inline.
- Layout determinista, centrado y con lanes por rama.
- Recalculo tras expansión, contracción, resize y fullscreen.
- Conectores ortogonales y reducción de líneas redundantes en la proyección visual.
- Scroll normal y fullscreen.
- Zoom y ajuste al contenido.
- Lista accesible de transiciones.
- Capturas y validación Playwright de los procesos representados.

## Capacidades pendientes de analizar o implementar

### P0 — Semántica de decisiones y convergencias

1. Diferenciar tipos de gateway BPMN:
   - exclusivo XOR;
   - paralelo AND;
   - inclusivo OR;
   - basado en eventos;
   - complejo.

2. Diferenciar explícitamente:
   - decisión: divide el flujo;
   - merge: reúne alternativas;
   - fork: divide trabajo paralelo;
   - join: sincroniza ramas paralelas.

3. Formalizar las guardas:
   - condición visible junto al conector;
   - condiciones mutuamente excluyentes;
   - cobertura completa de las posibilidades;
   - rama por defecto cuando sea necesaria.

4. Validar decisiones:
   - entradas y salidas permitidas;
   - ramas sin destino;
   - ramas inalcanzables;
   - transiciones redundantes;
   - conectores que atraviesan nodos no incidentes;
   - secuencias posteriores que contradicen una rama.

5. Identificar cuándo una convergencia necesita sincronización y no solo una unión visual.

### P1 — Elementos BPMN

6. Eventos de inicio, intermedios y fin.

7. Eventos especializados:
   - temporizador;
   - mensaje;
   - error;
   - señal;
   - escalado;
   - compensación.

8. Actividades especializadas:
   - task;
   - user task;
   - service task;
   - manual task;
   - script task;
   - call activity;
   - subprocess colapsado/expandido.

9. Pools y lanes para representar participantes, áreas, máquinas o responsabilidades.

10. Message Flow diferenciado de Sequence Flow.

11. Objetos de datos:
    - data object;
    - data store;
    - data input/output;
    - asociaciones de datos.

12. Artefactos:
    - anotaciones;
    - grupos;
    - documentación;
    - reglas y políticas.

### P1 — UML Activity Diagram

13. Diferenciar `DecisionNode` y `MergeNode`.

14. Incorporar `ForkNode` y `JoinNode` con barras de sincronización.

15. Añadir nodos iniciales y finales UML.

16. Diferenciar `Activity`, `Action`, `ObjectNode`, `ObjectFlow` y `ControlFlow`.

17. Representar guardas con notación UML `[condición]` cuando el contexto sea UML.

18. Añadir particiones UML por actor, rol, máquina o componente.

19. Representar excepciones e interrupciones.

20. Definir el alcance del producto:
    - BPMN industrial;
    - UML Activity;
    - metamodelo híbrido con proyecciones independientes.

### P1 — Base contextual del proceso

21. Formalizar recetas versionadas, cantidades y tolerancias.

22. Modelar CDC y resultados MCC.

23. Modelar materias primas, NIP, lotes y trazabilidad.

24. Formalizar reglas de blocaje.

25. Modelar tolerancias de pesado y cantidades máximas de talco.

26. Formalizar parámetros de mezclador, HA, HF y túnel de refrigeración/secado.

27. Modelar fotografías y coordenadas del despaletizado.

28. Modelar producto no conforme y su disposición.

29. Modelar máquinas, sensores, capacidades, tiempos y estados.

30. Mantener la distinción entre:
    - descripción del proceso;
    - reglas de negocio;
    - datos observados;
    - datos calculados;
    - decisiones de ejecución;
    - evidencias de validación.

### P1 — Editor web y navegación

31. Minimap con indicador de la zona visible.

32. Pan mediante ratón, trackpad y teclado.

33. Centrado automático en el nodo seleccionado.

34. Navegación desde la lista de transiciones hacia origen y destino.

35. Resaltado de la ruta completa seleccionada.

36. Vista de estructura simplificada para ocultar textos extensos.

37. Impresión y exportación a SVG, PNG y PDF.

38. Exportación semántica BPMN 2.0 XML y, si se adopta UML, XMI.

39. Undo/redo.

40. Copia y pegado de subgrafos.

41. Selección múltiple, alineación y distribución manual opcional.

### P1 — Accesibilidad

42. Navegación secuencial por nodos y conectores.

43. Relación accesible explícita entre origen, destino, tipo y condición.

44. Anuncio de expansión y contracción a lectores de pantalla.

45. Estados ARIA para seleccionado, expandido y contraído.

46. No depender exclusivamente del color para distinguir tipos de flujo.

47. Patrones visuales diferentes para sequence flow, message flow, error flow y branch flow.

48. Áreas de interacción suficientemente grandes para nodos, ramas y controles.

### P2 — Calidad y escalabilidad

49. Pruebas con grafos de 100, 500 y más nodos.

50. Medición del tiempo de cálculo y renderizado.

51. Renderizado incremental o virtualización cuando sea necesario.

52. Detección de ciclos, nodos aislados y destinos inalcanzables.

53. Validación de puertos de entrada y salida.

54. Comparación visual entre versiones.

55. Auditoría de cambios de ramas, condiciones, gateways y subprocesos.

## Orden recomendado de trabajo

1. Representar completamente el proceso de fabricación de mezclas descrito en `test_descripcion_procesos.md`.
2. Registrar las ambigüedades semánticas que aparezcan durante esa representación.
3. Resolver primero gateways, decisiones, merges, joins y guardas.
4. Formalizar recetas, CDC, MCC, NIP, lotes, blocaje y tolerancias.
5. Añadir eventos, máquinas, datos y responsabilidades solo cuando el proceso los necesite.
6. Separar la proyección BPMN de una posible proyección UML.
7. Completar navegación, accesibilidad y exportación.
8. Medir rendimiento con grafos reales antes de introducir virtualización.

## Criterio de aceptación de la base contextual

La base de contexto será válida cuando un agente pueda responder, usando el modelo y sus evidencias:

- qué proceso se está ejecutando;
- en qué etapa se encuentra;
- qué materiales y datos necesita;
- qué máquina o rol interviene;
- qué condición provoca cada rama;
- qué salida produce cada camino;
- cómo se valida la conformidad;
- qué ocurre con el producto no conforme;
- qué información es conocida, provisional o todavía falta.

La calidad visual del BPM/UML es necesaria, pero subordinada a que la semántica, la trazabilidad y el contexto del proceso sean recuperables por agentes.
