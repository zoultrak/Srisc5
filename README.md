RISC-V Simulador 
Un simulador visual interactivo de arquitectura RISC-V con visualización del datapath en 
tiempo real. Ejecuta código ensamblador RISC-V paso a paso y observa cómo los datos fluyen
a través de los módulos del procesador.

Características

Visualización del Datapath: Diagrama SVG interactivo que muestra la ruta de datos completa del procesador
Ejecución Paso a Paso: Ejecuta instrucciones una por una con control total
Animaciones Cometa: Efectos visuales que rastrean el flujo de datos en tiempo real
Soporte Multi-Tipo de Instrucciones:

Tipo R (operaciones entre registros)
Tipo I (operaciones inmediatas)
Tipo L (cargas de memoria)
Tipo S (escrituras en memoria)
Tipo B (saltos condicionales)
Tipo J (saltos incondicionales)


Editor de Código Integrado: Edita y carga código ASM directamente
Monitor en Tiempo Real:

Estado del PC (Program Counter)
Valores de todos los registros (x0-x31)
Contenido de memoria de datos
Log de ejecución detallado


Temas: Modo Moderno y Modo Hacker (estilo retro)
Controles de Zoom y Pan: Navega el datapath fácilmente
Responsive Design: Funciona en desktop, tablet y móvil
Tooltips Interactivos: Información detallada de cables y módulos

 Inicio Rápido
Requisitos

Navegador web moderno (Chrome, Firefox, Safari, Edge)
Sin dependencias externas requeridas

Cómo Usar
Cargar Código

Opción A: Pega código directamente en el editor
Opción B: Usa "🔓 Abrir" para cargar un archivo .asm o .s
Opción C: Arrastra y suelta un archivo sobre el editor

Ejecutar

Paso: Ejecuta una instrucción por vez
Ejecutar: Ejecuta todo el programa (puedes detenerlo en cualquier momento)
Reset: Reinicia el simulador

Monitorear

Registros: Visualiza todos los registros x0-x31 con sus valores
Memoria: Observa las primeras 32 posiciones de memoria
Log: Sigue el historial de ejecución con detalles de cada instrucción
Datapath: Mira cómo fluyen los datos por el circuito

 Instrucciones Soportadas
Tipo R (Registro-Registro)
add, sub, and, or, xor, sll, srl, sra, slt, sltu
Tipo I (Inmediato)
addi, andi, ori, xori, slti, sltiu, slli, srli, srai
Tipo L (Load/Carga)
lw, lh, lb, lhu, lbu
Tipo S (Store/Escritura)
sw, sh, sb
Tipo B (Branch/Salto Condicional)
beq, bne, blt, bge, bltu, bgeu
🎨 Temas
Cambia entre tema moderno y hacker usando el botón en la esquina superior derecha:

Moderno: Interfaz azul/cian futurista
Hacker: Estilo retro verde oscuro (80s)

⌨️ Atajos de Teclado

Escape: Cierra el modal del editor
Rueda del ratón: Zoom en/out del datapath
Click + Arrastrar: Movimiento libre en el datapath