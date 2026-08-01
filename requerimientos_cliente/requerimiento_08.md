# tareas.
1. quitar metadata de 'hipotesis' en las tarjtas renderizadas del arbol
2. quirar metadata de 'hipotesis' en el panel lateral izquierdo de detalle
3. en causa_detalle_v02:
    3.1. en el textbox de 'contrato' mostrar el titulo del contrato, no el ID
    3.2. en el textbox de 'causa' quitar el ID, dejar solo el titulo de causa
4. en inicio 'investigaciones recientes' debe de poblarse con 'analisis de cuasas' abiertos
5. la pagina 'arbol' es solo para guardar la plantilla causal, por tanto no debe de mostrarse ni permitirse utilizar los botones de (validar/descartar hipotesis)
6. 'analisis causas' debe ser la pagina para abrir un nuevo analisis a partir de una plantilla: por tanto debe de existir un sub-formulario que permita seleccionar el contrato a utilizar como plantilla para el analisis, indicar fecha de apertura, participantes, descripcion del porque de la apertura... y boton de iniciar analisis, donde se desplegaŕa la plantilla del arbol para que se pueda completar.
6.1 los resultados del analisis no deben guardarse en la plantilla, sino en un nuevo modelo de datos trazavilidad_analisis, que permita reconstruir el analisis realizado a partir de estos datos y de la plantilla.
6.2 en el analisis sera necesario registrar para las cuasas y para las hipotesis la 'evidencia' y la 'conclusion'
6.3. los enlaces desde la pagina de 'inicio' 'analisis recientes' deberan redirigir a 'analisis causas'
7. Modificar Maquinas. 
7.1. modificar modelo de datos de maquinas. tres nuevos modelos de datos para maquinas 'maquinas_tipo' para crear familias de maquinas y su descripcion y detalle. registro_maquina con maquina_id, nombre_maquina_individual, maquina_tipo, y un modelo de maquina - sub-maquina (similar al arbol de causas, pero para la descomposicion de elementos de la maquina)
7.3 adaptar la UI 'maquina' para poder añadir/editar/borrar elementos de estos tres modelos
8. en 'procesos' la tabla de registro de procesos, no permite seleccionar registros. seleccionado el primero por defecto.

