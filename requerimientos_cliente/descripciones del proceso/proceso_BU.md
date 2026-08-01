descripcion del proceso de fabricacion de BU

mission , fabricacion de BU (bolsa unitaria de producto quimico) para ser aprovisionada al MI.

- un BU en funcion del numero de productos quimicos puede ser monoproducto o multiproducto.
- cada Mezcla fabricada incorporará un numero de BU's defeinidos por la receta de fabricacion, definiendo el numero de BU's y su subreceta (subreceta, subgama)
- si la mezla por ejemplo usa la receta 1332 las BUs seran del tipo BU1332A BU1332B .... 

las BUs se fabrcian en una maquina llamada MACBU.
descripcion de la maquina.
- la maquina consta de un circuito donde un trolley sujeto a una cadena rotatoria realiza el recorrido del circuito.
- en el puesto inicial, es el puesto de fabricacion de bolas de plastico.
este puesto consta de dos maquinas automaticas en serie que realizan la fabricacion de la bolsa de poilietileno a partir de un rollo de este.
- esta maquina se denomina PSA.
- las dos mauinas están en serie, por lo que el ciclo, es una fabrica una bolsa y la pone en el trolley y despues deja pasar un trolley vacio, asi la siguinete PSA deja pasar el trolley que ya tiene bolsa y coloca una bolsa nueva en el trolley vacio.
- tiempo de ciclo de salida de un trolley con bolsa del puesto de las 2 psa 20cmin
- para la fabricacion de la bolsa se dispone de un rollo aprovisionado en la parte posterior de la maquina que se va desenrollando a medida que se consume. se desenrolla a velocidad fija.
- la orden de marcha de este desenrollado la da el detector del compensador en posicion baja.
el compensador permite mantener la tension del plastico para evitar pliegues o arrugas. asegurar la horizontalidad del tensor es clave, ya que un salto en un diente en el circuito del tensor, haciendo que pierda la horizontalidad, puede porvocar un desplazamiento del plastico hacia un lateral, quedando desalineado.
- la maquina tiene marcas de pintura para que indican la posicion por la quedebería de pasar el plastico en una situacion standard y sin alteraciones.
- posteriormente hay un elemento que dobla la lamina de plastico que llega formando un cilindro continuo. en este punto es importante revisar el solapamiento del plastico para asegurar que podrá cerrarse el cilindro mediante una soldadura.
- la revision del solapamiento debe asegurarse en el elemento vertical de soldadura que tinen 1 metro. este debe estar correctamente alineado con la vertical y con la vertical del elemento de soldadura para asegurar que el solapamiento es identico en la zona superior y en la zona inferior. (mismo mm de solapamiento y mismos mm desde el ambos extremos del plastico al punto de soldadura.)
- el cilindro se va soldando por secciones de 1 metro, por lo que es importante asegurar la coincidencia del final de una soldadura y el inicio de la siguiente.
- para la formacion de la bolsa, se realiza una soldadura horizontal que cierra el cilindro y se realiza un corte horizontal.
- en esta maquina es clabe el alineamiento del producto, la presion + tiempo + temperatura de los elementos de soldadura, asi como el control de la intensidad consumida por los mismos (ya que se calienta por una resistencia electrica) y el numero de ciclos de la soldaura, ya que el teflon que recubre el elemnto de soldaura se deteriora con el uso y la polucion.
- a cada trolley se le asigna el tag con la informacion de la BU que se debe fabricar.

- una vez fabricada la bolsa sale de la PSA y va al siguiente puesto

- puesto de basculas.
- hay 6 bascualas en serie con 4 puestos de dosificacion cada una.
los productos quimicos a dosificar/pesar, son aporvisionados en sacas tipo bigbag en el piso superior de la maquina en la tolva correspondiente.
- cada producto tiene asignado su posicion, y esta no se suele cambiar ya que requiere de una limpieza completa del circuito y una verificacion/validacion por parte del encargado de garantia calidad. para asegurar que no hya contaminacion de productos.
- en cada bascual hay 4 puestos estos pueden trabajar de manera individual o en forma maestro-esclavo.
- el metodo maestro-escalvo solo se puede utilizar si en ambos circuitos esta aprovisionado el mismo producto.
- este metodo se utiliza cuando el rango de dosificacion es muy amplio en el referencial de BU, ya que pueden existir BU que necesiten poco producto y con una tolerancia de 10 g y otros que de ese mismo lleven mucho prodcuto con una tolerancia mayor. (la tolerancia es aproximadamente el 1% del porducto con un maximo de 100g)
- por ello se utiliza el metodo maestro-esclavo, donde el maestro es un conducto de dosificacion con menor caudal y por tanto con más precision, y el esclavo es un conducto con mayor caudal
- los conductos son tapices con velocidad variable donde la carga/altura del producto en el tapiz se limita mediante un elemnto mecanico fijo llamado 'trampilla de regualcion'
- la dosificacion del producto se realiza en tres regimentes. regimen1 o de maxima velocidad, donde el tapiz va a la maxima velocidad porgramada para la receta. regimen 2 velocidad den regulacion, la velocidad es propocional al ecart (ecart=peso objteivo-peso actual), V= vmin+K(ecart - retardo) disminuyendo hasta alcanzar la velocidad minima programada para la receta, alcanza la velocidad minima cuando el ecart=retardo. posteriormente continua en regimen3, vmin hasta que el ecart='columna de caida'  donde la comulman de caida es la cantida de producto teorica que esta en el aire, (ha sido dosificada, pero todavia no ha llegado a la bascula, esta todavia callendo sobre ella).
- estos regimenes de dosificacion ademas de las velocidades maximas y minimas como parametros tienen otros 3 parametros importantes. K(ganancia) es la pendiente de deceleracion, Retardo y columna de caida.
estos se optimizan de manera dinamica a cadad ciclo de dosificacion.
la gananica se optimiza mediante comparacion contra el 'tiempo teorico regimen 2' un tiempo teoirico establecido en los paramentros, si el tiempo real de la dosificacion es mayor incrementa el valor de K en 3% y si el tiempo real es menor reduce el valor de K en un 3% para traar siempre de mantener el valor objetivo. a este valor objetivo se le aplica unos limites de +-5% dentro de los cuales no se lleva a cabo ninguna optimizacion.
para el valor del retardo se hace algo similar, se compara en valor real del tiempo en la etapa de dosificacion del regimen 3, contra su tiempo teorico. si real>teorico retardo-3% si teorico>real retardo + 3%.
para la optimizacion de la comlumna de caida se utiliza otro metodo, con una pila movel de las ultimas 5 columnas de caida y su desviacion respecto del valor objetivo, se reacalcula la columna de caida para el siguiente ciclo.
- los parametros se establecen en la aplicacion de 'nivel2' a nivel de producto y rango de peso de dosificacion, siendo por tanto independientes de la referencia de la BU y centrandose solo en el comportamiento del producto dosificado y la cantidad necesaria a dosificar.
para establecer la vmax vmin retardo y K, es necesario llevar a cabo una serie de test para alcanzar el punto optimo. con el objetivo de utilizar la velocidad maxima mas alta posible, que permita una deceleracion controlada en el menor tiempo posible, y una estavilizacion del caudal en vmin para asegurar una columna de caida constante.
asi, se busca una vmin lo sificientemente alta que permita una columna de caidad y un ecart final con un cpk mayor del 1.3,  el tiempo total de los 3 regimenes se busca sea el inferior posible ya que esto impacta en el tiempo de ciclo y la productividad de la maquina.
para establecerr si los K y retardo son ok, se comprueba tambien que los tiempos resultado obtenidos cumplan un cpk>1 para un 2% del tiempo teorio, en estos comparamos la distribucion de tiempos reales para determinar si la dosificacion es estable o no.
con estos datos se puede aumentar las velocidades maximas y minimas y establecer los tiempos adecuados de regimen 2 y 3 para asegurar el mejor tiempo de dosificacion sin probcar ninguna fuera de tolerancia, o el menor nivel posible.
- que es una fuera de tolerancia, una fuera de tolerancia es una dosificacion cuyo ecart final esta fuera de las tolerancias establecidas. si la dosificacion, esta por debajo del limite inferior de tolerancia, la maquina hace un ciclo de impulsos de dosificacion para entrar en los limites. si por el contrario, el ecart a excedido el limite superior de dosificacion, será necesario una intervencion humana para quitar el exceso de porducto, esto impacta altamente en el rendimiento de la maquina, ya que la correccion puede llevar de 3 a 5 min dependiendo donde se encuntre el operador de la zona. por tanto es un suceso a evitar en la parametrizacion.
** situaciones que pueden porvocar deriva en los parametros. (atascos de producto, patinados del tapiz ya que la velocidad se mide en el variador del motor, no en una cuenta rendida, cambio del la placa de regulacion por cambio del pasillo/tapiz en algun mantenimiento, abalancha de producto por cambio en la granulometria del producto u otra causa).

la bolsa ba pasando de bascual en bascula, y en cada una de ellas o pasa de largo o dosifica de manera secuencial los productos disponibles en esta bascula.

al ser un convoy las bolsas no se pueden adelantar, van seguidas, por lo que la parada en una bascula, provoca una acumulacion de trolleys a la espera antes de esa bascula.

se pueden fabricar dos BU's diferentes a la vez en el circuito en proporcion 1:1, esto se llama imbricacion y es una forma de optimizar el tiempo global de porduccion de la maquina.

para una correcta imbricacion, el punto más optimo es elegir un BU multiproducto que dosifique en 5 de las 6 basculas, y un BU monoporducto que dosifique en la basucula no utilizada por el otro BU. 
para el calculo de la bascula cuello, se toma en cada bascula el tiempo mecanico de paso de trolley (10 cmin)+ el tiempo de subida y bajada de bascuala (12 cmin) + tiempos de dosificacion de los dos BU(12-16cmin por cada porducto). siendo el tiempo limitante la bascula con más suma. (los tiempos son aporximados)

con estos tiempos aproximados se puede ver que sera mas ventajoso pesar dos porductos en una bascula a fin de dejar la otra libre para que solo pese el BU monoporducto.

en caso de fabricacion de dos BU multiproducto imbricados (al mismo tiempo) el operador trata de fabricar dos BU con basculas limitantes de cada BU diferentes. asi el tiempo conjunto de las dos, sera inferior al de ellas individualmente.

una vez dosificados los productos estos pasan por la etapa de marcado.

y despues llegan a la etapa de soldadura de cierre y evacuacion.

para la soldadura de cierre y evacuacion hay dos circuitos, uno para cada receta de BU que se esta fabricando.
en la soldadura de cierre, entra el trolley con el producto, una mesa elevadora sube para quedarse en una posicion establecida por los parametros. se suelta la bolsa del trolley, y entran dos fajas accionadas por un mecaismo neumatico para sujetar la bolsa de forma vertical. en esta posicion entra tambien dos soldaduras una por cada lado con un elemneto neumatico para proceder a la soldadura y cierre de la bolsa. una vez cerrada, la mesa baja y se retiran el resto de elementos, y la BU es evacuada al tapiz de evacuaion.

la estacion de soldadura es clave en el proceso, tanto a nivel de rendimiento, como de calidad de porducto.
se debe asegurar que la soldadura es correcta (la bolsa no se abre, y la soldadura no esta quemada ya que eso proboca la rotura de la bolsa por la zona quemada) e impide cualquier perdida de producto, si la soldadura no es correcta se puede perder producto siendo esto una causa de no conformidad y de porducto a tirar a la basura.

puntos clave para una buena soldadura.
- alineamiento de las mordazas de la soldadura. son dos elementos que deben entrar en contacto uno con el otro, si hay un desalineamiento vertical o longitudianl la soldadura no será igual en todos sus puntos porbocando zonas no soldadas o zonas quemadas.
- suelta de bolsa de trolley.  la forma de sujetar la bolsa al trolley es una mmebrana hinchable, para soltar la bolsa se debe pulsar la valvula de la membrana para que se deshinche. por tanto se ha de asegurar la correcta alineacion del pulsador con la boquilla en cada uno de los trolleys. (por lo que la geometria de cada trolley debe ser perfecta con un marge de +- 2mm, la geometria de la membrana y su soporte y la posicion de la boquilla), si en el desinflado falla con un trolley, causa el trolley, si falla con un porta membranas, cuasa el portamembranas, si falla con varios elementos, la boquillas. ese seria una forma de investigar y verificar para cada uno delellos que su geometria es la correcta utilizando las plantillas de verificacion.

si el deshinflado no es correcto, se corre el riesgo de realizar la soldadura con tension en la bolsa, si se realiza una soldadura con tension, esta se rasgara por la temperatura porbocando rotura pordebajo de la soldadura.

un desinfaldo incorrecto puede ser causa de soldar con tenison, pero no es la unica, unas fajas que no esten tensas, o que realenticen su entrada por la suciedad, tambien pueden probocar tension en la bolsa al no estar correctamente posicionada.

parametros la altura de la mesa (en funcion del tamaño del BU la altura debe ser mayor BU pequeño o menor BU grande), el tiempo de soldadura, y la intensidad. (tiempo, intesidad y temperatura son claves en la soldadura), en este punto diferentes BU puden tener diferentes parametros de soldadura debido a la polucion que generan en el interior de la bolsa y que por tanto afectan a la soldadura. en esta soldadura no es una soldadura limpia plastico-plastico, sino que es plastico-prodcuto-producto-plastico, y esa capa de producto puede afectar de forma diferente a la soldadura.
el tiempo de ciclo conjunto de las dos soldaduras es de 22 cmin por BU

los productos son evacuados con un tapiz, y recogidos al final de este por un robot con un cazo, donde coje la BU, y la deposita en un contenedor metalico hasta que este esta lleno. unos 40-60 BU por cajon.

- claves de la porductividad de la maquina
- timepo de ciclo de dosificacion de BU
- fueras de tolerancia en la dosificacion
- defectos y paradas en la zona de soldadura
- defectos y paradas en la zona de PSA
- defectos y paradas en la zona de basculas

defectos y paradas.
- si hay un defecto, solo se para el elemento con defecto, el resto de elementos continua trabajando
- si hay una parada, se para el convoy que desplaza los trolleys, por tanto se para toda la maquina
- en la zona de basculas el operador puede corregir defectos sin probocar parada
- en la zona de soldaduras, el ooperador debe de entrar en un recinto de seguridad que porboca la parada de la maquina.

otrs cuestiones nombradoas.

niveles de informacion y automatismos.
nivel1= plc
nivel2= sistema de gestion de recetas, configuraciones, es una aplicacion de usuario que recopila informacion de usuario y servidores centrales y envia esta informacion al nivel1 para la fabricacion, además el nivel1 le envia todos los resultados al nivel2 para la trazavilidad de la fabricacion.
ademas del nivel2 para registro de resultados, esta el sistema pi-aveva que permite registrar vraibles de automata no tenidas en cuenta en el nivel2

nombres maquinas
MACBU
- psa PSA1 PSA2
- bascualas BA01, BA02...BA06
- soldadura SO1 SO2
- evacaucion EV01 EV02

aporvisionamiento:
el operador aporvisiona los porductos con una carretilla desde el alamcen.
debe realizar una lectura del producto y del puesto para asegurar el 'buen porducto buen puesto', el nivel 2 da confirmacion de que puede cargar el bigbag y lo carga.

entre un big bag y otro, hay un stock en maquina de unos 100kg.