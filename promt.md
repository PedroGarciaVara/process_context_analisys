lo principal que debemos definir es el objetivo y la funcionalidad esperada del proyecto. sin entrar en el codigo y la implementacion.

me imagino el proyecto en dos etapas.
etapa_1: soporte de analisis para tecnicos_humanos
etapa_2: soporte de analisis para tecnicos_humanos y agentes

la mission:
analizar un proceso.

que hay que analizar, todo? parte?
los puntos de analisis los definiran los contratos, que serán las metricas que defininan el proceso y sus operaciones/etpas.
ejemplo de metrica: 
- tasa de tiempo de produccion/parada
- numero de defectos/dia
- produccion/dia
- timepo de ciclo
- % de productos nc
- ... La independencia reduce el riesgo de regresiones, pero también deja pendiente definir cómo se relacionan formalmente un nodo BPM, una operación, un contrato, una máquina, una causa y una hipótesis.
un contrato, será una metrica calculable que permita identificar si el proceso u operacion esta en los niveles esperados o no.

una vez se identifica un contrato que no se cumple, se debe de abrir un analisis de cuasas.
para este analisis de causas es importante conocer el proceso y sus operaciones, para poder analizar que elementos aguas arriba u aguas abajo pueden probocar ese impaco, y que operaciones/etapas dentro de ese porceso/operacion pueden producir un impacto en el contrato.

como los contratos son estables en el tiempo (solo cambia el objetivo), los analisis de causas serán tambien constantes, debiendo el tecnico/agente revisar todos los elementos identificados como posible causa efecto, y completar el analisis causasl, con nuevas evidencias e hipotesis que sean necesarias a partir de los analisis llevados a cabo, o de una analisis más profuno del flujo del proceso de cara a identificar nuevos parametros con posible efecto y dejarlo trazado para el futuro.

por ello es importante poder conectar/fusionar el conocieminto de BPM y del resto, ya que es un unico conocimiento representado de dos formas diferentes.

aqui es donde aparacen las dificultades a la hora de poder implemntar la descripcion de maquinas, puestos y diferencias entre maquinas que ejecutan un mismo proceso.

hazme preguntas de una en una para continuar aclarando el objetivo y la funcionalidad. esta es la fase clave. (no entrar en codificacion e implementacion)