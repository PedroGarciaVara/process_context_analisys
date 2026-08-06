# descripcion del porceso de fabricacion de mezclas de caucho.

objetivo: fabricar mezclas de caucho para neumaticos mezclan den las proporceiones marcada pos la receta productos de caucho (cauchos naturales, cauchos sinteticos), cargas reforzantes (negro de humo de diferentes granulometrias y longitudes de cadeca, silice), productos quimicos con diferentes funciones (ceras, acidos estarico oxido de zinc, resinas), silano si la mezcla lleva silice, aceties, y azufre.

# LIneas de fabricacion de mezclas.
- en la zona de fabricacion se dispone de cuatro lineas paralelas de fabricacion.
- cada linea: mezclador, HomoAlimentador, Conjunto De HomoFinalizador, bascuala, calandra, refrigerador, apilador.



# aprovisionamiento de productos
- todos los productos deben aprovisionarse al mezclador.
- todos los productos deben ser identificados, y verificada su correspondencia cualitativa (el buen producto) y cuantitativa (ern el peso correcto marcado por la receta dentro de las tolerancias de peso)
- cada porducto se aprovisiona al MI de una forma diferente.

# aprovsionamiento de BU.
- los BU's que han sido fabricados en otro proceso, son aprovisionados en cajones con 40-60 BUs a la plataforma del MI
- estos cajones son desplazados por los operadores con carretillas y puestos en las zonas adecuadas.
- los BU's son sacados de uno en uno del cajon, y aporvisionados en un tapiz de pasos, cada BU o conjunto de BU's en un paso.
- un paso son los BU's correspondientes para una Mezcla.
- los tapices tienen tamaño variable entre 6 y 10 pasos dependiendo del tapiz.
- los BU's aporvisionados en el tapiz avanzan hasta la bascula, en la bascula se verifica su peso, si es No OK, el BU se desehcha de forma automatica al cajon de deshecho, si es OK el producto avanza hasta el puesto de introduccion.
- en el puesto de introduccion es equivalente a un paso, y la bascuala tambien es equivalente a un paso.

descripcion linea 1.
- en la linea uno para el MI10, hay dos circuitos de aprovisionamiento de BU BU11 y BU12
- en la linea 2 para el MI20, hay tres cricuitos de aprovisionamiento de BU BU21, BU22, BU23
- en la linea 3 para el MI30, hay 2 circuitos de aprovisionamiento de BU BU31 y BU32
- en la linea 4 para el MI40, hay dos circuitos de aprovisionamiento de BU BU41 y BU42

particularidades.
- en la linea 4, no hay salida automatica a deshecho, por lo que cualquier BU fuera de tolerancia debe ser retirado manulamente por el operador de la bascula, por lo que puede existir impacto de perdida de rendicmiento en el MI debido a no disponer de porductos, por el tiempo de atencion del operador.

# aprovisionamiento de cauchos.
los cauchos preparados en el porceso anterior, son aprovisionados en balancelas mediante un convoy aereo.
en cada linea, las balancelas tiene un buffer/stock de 17-20 balalancelas.
cada balancela es la mezcla de cauchos para una mezcla.
las balancelas son abiertas sobre una tolva-bascula donde se verifica su peso
esta carga se descarga al tapiz de introdducion del MI.
si es NO OK, el tapiz da marcha atras y tira a deshecho el porducto, si es OK, espera en el tapiz a la orden de introduccion.

solo existe una linea de introduccion de caudho por MI.

en la linea 4, existe la posibilidad de fabricar en metodod 'fraccionado' donde el caucho en vez de introducirse de una unica vez, se introduce de dos veces, por tanto en vez de una balancela por mezcla, tiene 2 balancelas por mezcla.

para poder verificar las dos balancelas para dar el OK de producto preparado, a la evacuacion de la tolva-bascual en vez de disponer solo de un tapiz, se dispone de dos tapices, uno para la carga de cada balancela situados en serie.

# aprovisionamiento de cargas (negro de humo y silice)
los productos se dosifican desde unos silos pesadores.
- cada silo pesador contiene un tipo de producto, una referencia de negro de humo, oi una referecnia de silice.
- en la parte inferior de los silos se encuentra el sistema de extraccion y dosificaion, para dosificar el producto sobre la tolva-bascula para las cargas.
- la dosificacion se realiza sobre la bascula, si al termino de la dosificacion, el peso esta dentro de las tolerancias, la carga se descaraga a la tolva de introduccion. si la dosificacion no es OK, si es menor el extractor entra en ciclo de impulsos para llegar al peso OK, si es mayor que el limite superior, el operador debe acceder a la bacula de negro y retirar con un cazo la cantidad de prodcuto correspondiente.
- al ser una tarea manual que requiere de avisar de un defecto, cualquier dosificacion fuera de tolerancia en más, proboca una parada en el MI por no tener los productos OK.

tecnologias de extraccion/dosificacion:
1. extraccion con vis rotativo de gran caudal y pequeño caudal: sistema de extraccion que dispone de dos vises rotativos de extraccion uno de un diametro grande y otro de un diametro pequeño (gran caudal y pequeño caudal)
2. extraccion con vis unico.
3. extraccion con tapiz unico.This client is no longer supported for Gemini Code Assist for individuals. To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google Learn more

grafect en el PLC.

el sistema de dosificacion es similar para las tres tecnologias de dosificacion.
en el plc el sistema de dosificacion tiene tres etapas, regimen1,2,3 de dosificacion con varios parametros vmax, vmin, K (gananacia), Retardo, columnacaida.

dosificar: el extractor echa producto sobre la bascula de manera continua, va leyendo el peso que marca la bascuala y calcula el ecart al peso final objetivo, ecart=peso final objetivo- peso real.

regimen 1: dosificacion a vmax programada
regimen 2: dosificacion a velocidad variable. v = vmin + K (ecart - retardo) * vmin
regimen 3: dosificacion a vmin hasta stop cuando ecart=columna caida

* en el sistema 1. de extraccion con 2 vis, regimen 3 solo con vis de pequeño caudal.

optimizacion de constantes.
se utilizan tiempos modelo de los regimes 2 y 3 para establecer los objetivos de duracion de estas dos etapas.
los parametros de K y retardo se optimizan para respetar que el tiempo real es igual al tiempo teorico. modificando el valor de K y retardo en +- 3% entre ciclos.

la columna de caida (cantidad de producto en el aire), se optimiza mediante una media movil de las ultimas 5 dosificaciones teniendo en cuenta el valor de la columna de caida y el ecart final de cada dosificación.

objetivos de las dosificaciones de Negro:
- tiempo de ciclo dentro del tiempo de ciclo de fabricacion de una mezcla, para no ser etapa limitante.
- cp, cpk del ecart final >1,3 para dosificaciones de más de 50kg, >1 para menores de 50 kg
- minimo numero de fueras de tolerancia en más que requieran intervencion manual para corregir.

las cuatro lineas constan de dos báculas de dosificacion cada una. 
linea 1: BN11, BN12
linea 2: BN21, BN22
linea 3: BN31, BN32
linea 4: BN41, BN42

en todas las basculas es posible realizar dos dosificaciones acumuladas, dosificando los productos en serie, primero uno y despues otro. para completar los productos demandados en la receta.

# aprovisionamiento de silano.
el silano se aprovisiona mediante inyeccion directa en el MI, midiendo la cantidad de producto mediante un MDM. el cual es capaz de medir la cantidad de liquido introducido de forma continua por la bomba en la inyeccion.
MDM: mide el paso de flujo por 'coriolis' muy importante.

al igual que otros sistemas de dosificacion tiene los mismo 3 regimnes de dosificacion, con los mismos parametros y el mismo metodo de optimizacion.

en linea 2: SI21
en linea 3: SI31
en linea 4: SI43

# aprovisionamiento de aceties

los acetites pueden ser aporvisionados utilizando dos tecnologias de dosificacion.
1. inyeccion directa con MDM (medida mediante coriolis)
2. dosificacion en una tolva-bascula y una vez verificado el peso OK, inyeccion al MI.

- para la dosifiacion en caso en la dosificacion a bascula, lo que se regula no es la velocidad de la bomba, sino el % de apertura de la valvula, ya que el acetie esta circulando de forma continua en un circuito cerrado. 
pero dispone igualmente los 3 regimenes y los mismo procesos de optimizacion.
- en las bascualas la correccion de las fueras de tolerancia en más se corrigen en automatio, ya que se dispone de un picaje de desehcho en la bascula.

* un punto importante a asegurar en las basculas de aceite es la temperatura del producto y de la tolva, que debe de ser de 60C para asegurar una buena fluidez del aceite, permitiendo así la buena dosificacion y tambien que la bascula descargue todo el producto sin dejar restos en la tolva, lo cual probocaría un defecto de cero.

* un defecto de cero, se porduce cuando el peso de la bascula despues de la descarga no es el mismo que el peso antes de la dosificacion. (lo cual quiere decir que hay retencion de producto)


# operacion de mezclado en MI.
- el mezclado se realiza en un mezclador interno. (se puede consultar informacion de estos elementos en la marca farrel u otros fabircantes)

etapa1:aporvisionamiento de productos.
- el MI demanda el inicicio del aprovisionamiento de productos.
- todos los productos de la receta inician su ciclo de aprovisionamiento. (se pesan, verifica, dan el OK en peso, y avanzan hasta los puestos de introduccion)
- una vez el MI recive el OK de todos los productos listos y dispuesto inicia el ciclo

etapa2: ciclo.
se inicia el ciclo de mezclado a tiempo 0 cmin.
etapa 2.1: introduccion de porductos
los productos se introduciran segun esten porgramados, pudiendo estar porgramado por tiempo de ciclo, temperatura de la mezcal o a energía consumidad desde el inicio de ciclo.

cuando se introduce el caucho, empieza a subir la temperatura registrada en el interior del MI, ya que el caucho es el producto de mayor volumen, y que mayor rozamiento/trabajo recibe contra las paredes del MI y entre las palas rotatorias del interior del MI haciendo que suba la temperatura.

los productos se iran introduccion segun marque la secuencia especificada por el tecnico.

varios ejemplos de tecnicas de introduccion de porductos.
1. caucho y cargas a tiempo=0cmin. se introducen a la vez, favorece la dispersion.
2. caucho a timepo=0cmin y negro a cierta temperatura. se introduce primero el caucho solo, se denomina 'comasticacion' del caucho, permite trabajar el caucho rompiendo cadenas de elastomeros. normalemnte se realiza con cauchos naturales donde las cadenas de elastomeros son más largas y ramificadas.

introduccion del aceite, siempre sera a un tiempo mayor que cero a una cierta temperatura, se debe asegurar que el MI ya tenga producto, para no impregnar las paredes o paletas del MI, ya que eso puede porbocar pegados y retencion del producto al finalizar la evacuacion.

las BU's se pueden introducir a tiempo 0, o en otro parametro segun convenga. 
al disponer de varios circuitos de BU's, cada circuito de BU se puede porgramar su introduccion de forma independiente.

etapa 2.2: etapa ciclo
los porductos se van mezclando dentro del MI, el cual los hace moverse al disponer de dos paletas en su interior que obligan a los porductos a circular entre las paleteas y la pared, y entre las dos paletas. lo cual proboca trabajo y faborece la dispersion del producto, porbocando el aumento de temperatura.

en el MI se dispone de otra parte movil, llamada PILON, este es el elemento de cierre de la zona superior por donde se introducen los productos.
este elemento esta conectado a un sistema hidrahulico que genera presion para hacer deescender el pilon hasta su posicion más baja de cierre.
en este punto el volumne disponible dentro del MI es el minimo posible, por lo que el trabajo es mayor.
cuando el pilon se levanta el volumen disponible aumenta, y el trabajo es menor, este movimiento permite hacer 'respirar la mezcla' la mezcal tiende a ascender por el hueco liberado permitiendo una redistribucion de los productos en el interior del MI. 
durante un ciclo de fabricacion se suelen realizar de 3-6 movimientos de pilosn (subidas y bajadas)

etapa 3: evacucacion
cuando la mezcla alcanza una temperatura establecida en la receta, el elemento denominado 'silla' del MI se abre, este elemento es una compuerta en la parte inferior del mezclador. al abrirse el producto cae por gravedad al elemento siguiente. ademas en este ciclo, se suele realizar una acelaracion de la velocidad de las paletas del MI para intentar que no se quede producto retenido en el interior.
si se queda porducto retenido en el interior, esto es una no conformidad, ya que no se respetaria la proporcion de productos en la etapa siguiente que es la introduccion de azufre.

la mezcal es evacuada a un elemento intermedio llamado goulote, que es un elemento de espera.

cuando el Homoalimentador, HA, que es el elemento siguiente, esta libre, la goulote se abre y descarga el producto sobre este.
en un ciclo normal, el tiempo en goulote debe ser 0-2 cmin.

una vez finalizada la evacuacion y MI y goulotte estan libres. inicia de nuevo el ciclo.

# 
