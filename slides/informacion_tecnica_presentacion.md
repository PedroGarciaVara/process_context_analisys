# Información técnica necesaria para completar la presentación

> Esta guía reúne la información y las evidencias que deben completarse mediante un análisis del repositorio. No constituye por sí misma una confirmación de funcionalidades, resultados técnicos o componentes implementados.

## Objetivo

Completar la presentación con un análisis verificable del software implementado, su arquitectura, la base de datos y el grado real de preparación para una evolución agentiva. La extracción debe distinguir con claridad entre funcionalidad existente, prototipos, ampliaciones previstas e hipótesis de futuro.

## 1. Alcance funcional implementado

- Módulos y casos de uso disponibles para BPM, contratos industriales y RCA.
- Flujo completo que puede ejecutar hoy un técnico: alta y edición de procesos, navegación por niveles, asociación de máquinas, definición de contratos, apertura de análisis y evaluación de hipótesis.
- Funciones pendientes, simuladas o limitadas a datos de demostración.
- Perfiles de usuario, permisos y controles de acceso existentes.

## 2. Arquitectura del software

- Diagrama de componentes con frontend, backend, persistencia y servicios auxiliares.
- Tecnologías, versiones y responsabilidad de cada componente.
- Organización por capas o módulos y reglas de dependencia entre ellos.
- Puntos de entrada de la aplicación, APIs disponibles y formato de sus contratos.
- Mecanismos de configuración, despliegue local y gestión de entornos.

## 3. Modelo de datos y base de datos

- Motor de base de datos, versión, migraciones y estrategia de inicialización.
- Inventario de tablas con propósito, claves primarias, claves externas, índices y restricciones.
- Relaciones que forman la estructura tipo grafo: proceso, nodo, arista, subproceso, máquina, operación, contrato, plantilla RCA, análisis e hipótesis.
- Tratamiento de coordenadas visuales y separación entre identidad de negocio, identidad de persistencia y posición en el lienzo.
- Campos JSON o JSONB: esquema esperado, validación, ejemplos reales y criterio para decidir qué permanece estructurado.
- Integridad transaccional, borrados protegidos, cascadas y reglas de versionado.
- Volumen actual o estimado de datos y consultas más relevantes para rendimiento.

## 4. Trazabilidad del contexto

- Cómo se enlaza cada dato descriptivo con el proceso, nodo, activo, contrato o análisis correspondiente.
- Identificadores usados para recorrer relaciones entre niveles.
- Evidencia de que un análisis RCA conserva el contrato incumplido y el contexto operativo que lo originó.
- Historial, auditoría y procedencia de cambios o resultados, si existen.
- Límites actuales de la trazabilidad y relaciones todavía no implementadas.

## 5. Implementación BPM

- Tipos de nodos y aristas admitidos y reglas de validación del grafo.
- Creación, edición, eliminación, reconexión y navegación por subprocesos.
- Persistencia de disposición visual y mecanismo de actualización de estado.
- Reglas que impiden grafos incoherentes, relaciones inválidas o pérdida de referencias.
- Pruebas automáticas y escenarios de usuario que demuestran estas funciones.

## 6. Implementación de contratos industriales

- Entidades implicadas y relación con procesos, operaciones, máquinas o productos.
- Atributos que representan tolerancias, calidad, tiempo de ciclo y otros resultados.
- Reglas para detectar o registrar un incumplimiento.
- Dependencias que bloquean la eliminación o modificación de un contrato.
- Ejemplos de contratos reales o de demostración, indicando su procedencia.

## 7. Implementación RCA

- Estructura de plantillas, hipótesis, evidencias, justificaciones y resultados.
- Estados del análisis y transiciones admitidas.
- Método para seleccionar, descartar o confirmar causas.
- Vinculación del árbol RCA con el contrato y con los elementos del BPM.
- Cálculos existentes, cálculos manuales y automatizaciones previstas.
- Medidas para evitar conclusiones prematuras y conservar hipótesis alternativas.

## 8. Integraciones y fuentes futuras

- Interfaces existentes o previstas con bases de datos de señales de proceso, historiadores, MES, ERP, calidad o mantenimiento.
- Frecuencia, formato, identificadores y reglas de calidad de los datos de señales y resultados.
- Documentos candidatos para RAG, metadatos disponibles, permisos y política de actualización.
- Estrategia para vincular cada fragmento documental con entidades del modelo operativo.
- Separación entre datos confirmados, documentos recuperados, cálculos e inferencias generadas.

## 9. Preparación para agentes e IA

- Operaciones que podrían exponerse como herramientas seguras para un agente.
- Contexto mínimo necesario para cada herramienta y límites de autorización.
- Controles humanos antes de escribir datos, cerrar una causa o ejecutar una acción operativa.
- Registro de prompts, herramientas invocadas, fuentes consultadas y decisiones propuestas.
- Evaluaciones necesarias: exactitud de recuperación, trazabilidad, consistencia causal, seguridad y tasa de aceptación humana.
- Riesgos de alucinación, datos obsoletos, acceso indebido y automatización de decisiones críticas.

## 10. Calidad, seguridad y operación

- Inventario de pruebas unitarias, integración, API y extremo a extremo, con sus resultados actuales.
- Validaciones de entrada, manejo de errores y observabilidad.
- Autenticación, autorización, secretos, cifrado y copias de seguridad.
- Rendimiento medido, límites conocidos y estrategia de escalado.
- Procedimiento de despliegue, reversión y recuperación ante fallos.

## 11. Evidencias recomendadas para las diapositivas

- Un diagrama de arquitectura basado en componentes reales del repositorio.
- Un diagrama entidad-relación simplificado con las relaciones clave.
- Una secuencia de extremo a extremo: contrato incumplido, apertura de RCA, evaluación y causa confirmada.
- Dos o tres métricas verificadas, por ejemplo número de entidades, endpoints, pruebas o tiempos medidos. No usar cifras estimadas como si fueran resultados.
- Capturas actuales con datos legibles y un caso coherente entre BPM, contrato y RCA.
- Una tabla breve que separe «implementado», «en preparación» y «visión futura».

## 12. Formato de entrega del análisis del código

Para cada afirmación técnica se recomienda registrar:

1. Afirmación concisa.
2. Estado: implementado, parcial, simulado o previsto.
3. Evidencia: archivo, clase, función, migración, tabla o prueba.
4. Ejemplo de ejecución o captura.
5. Limitaciones y riesgos.
6. Propuesta de diapositiva donde se utilizará.

## Preguntas que debe responder el análisis final

- ¿Qué problema industrial resuelve hoy el sistema de principio a fin?
- ¿Qué parte del contexto está normalizada y qué parte reside en JSON?
- ¿Cómo representa la base relacional un grafo y qué ventajas aporta en este caso?
- ¿Qué evidencias unen un incumplimiento, su análisis RCA y la causa confirmada?
- ¿Qué necesitaría un agente para consultar el contexto sin perder trazabilidad?
- ¿Qué decisiones deben seguir bajo control humano?
- ¿Qué integraciones y pruebas faltan antes de una explotación agentiva real?
