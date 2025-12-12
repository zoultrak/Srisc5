// ============================================
// RISC-V Simulador
// ============================================

class RISCVSimulatorRedesigned {
    constructor() {
        // Estado del simulador
        // PC ahora siempre está en unidades de BYTES (0, 4, 8, 12...)
        this.pc = 0;
        this.registers = new Array(32).fill(0);
        this.memory = new Array(256).fill(0);
        this.instructions = [];
        this.currentInstruction = null;
        this.isRunning = false;
        this.signalStates = {};
        this.animationFrame = null;
        
        // Delay entre instrucciones (en milisegundos)
        this.executionDelay = 2000;
        
        // Tema actual
        this.currentTheme = localStorage.getItem('riscvTheme') || 'modern';
        this.applyTheme(this.currentTheme);
        
        // Tooltips y cables
        this.tooltip = null;
        this.wireData = {};
        this.currentTimeouts = [];
        
        // Lista maestra de módulos para highlighting
        this.todosLosModulos = [
            'mod_pc', 'mod_adder_pc', 'mod_mux_pc', 'mod_mem_instr',
            'mod_ordenamiento', 'mod_adder_branch', 'mod_and_gate', 'mod_mux_br',
            'mod_mux_imm_type', 'mod_imm_gen',
            'mod_banco_reg', 'mod_mux_alu', 'mod_alu', 'mod_uno_solo',
            'mod_mem_data', 'mod_mux_wb', 'mod_alu_ctrl'
        ];
        
        // Mapa de cables - Actualizado para el nuevo diseño del datapath
        this.wireMap = {
            // PC y flujo
            'pc_to_instr': { ids: ['wire_pc_to_instr'] },
            'pc_plus_4': { ids: ['wire_pc_plus_4'] },
            'pc_out': { ids: ['wire_pc_out'] },
            'pc_to_adder': { ids: ['wire_pc_to_adder'] },
            'mux_to_pc': { ids: ['wire_mux_to_pc'] },
            
            // Instrucciones
            'opcode': { ids: ['wire_opcode'] },
            'rs1': { ids: ['wire_rs1'] },
            'rs2': { ids: ['wire_rs2'] },
            'rd': { ids: ['wire_rd'] },
            
            // Inmediatos
            'imm_i': { ids: ['wire_imm_i'] },
            'imm_s': { ids: ['wire_imm_s'] },
            'mux_to_ext': { ids: ['wire_mux_to_ext'] },
            'ext_out': { ids: ['wire_ext_out'] },
            
            // Registros
            'reg_do1': { ids: ['wire_reg_do1'] },
            'reg_do2': { ids: ['wire_reg_do2'] },
            'do2_to_alu_mux': { ids: ['wire_do2_to_alu_mux'] },
            'do2_to_mem': { ids: ['wire_do2_to_mem'] },
            
            // ALU
            'alu_mux_out': { ids: ['wire_alu_mux_out'] },
            'alu_result': { ids: ['wire_alu_result'] },
            'alu_to_mem_addr': { ids: ['wire_alu_to_mem_addr'] },
            'alu_to_wb': { ids: ['wire_alu_to_wb'] },
            'alu_to_zero': { ids: ['wire_alu_to_zero'] },
            
            // Memoria
            'mem_read': { ids: ['wire_mem_read'] },
            'wb_data': { ids: ['wire_wb_data'] },
            
            // Branch
            'ord_out': { ids: ['wire_ord_out'] },
            'branch_offset': { ids: ['wire_branch_offset'] },
            'pc4_to_branch': { ids: ['wire_pc4_to_branch'] },
            'branch_target': { ids: ['wire_branch_target'] },
            'zero_flag': { ids: ['wire_zero_flag'] },
            'and_out': { ids: ['wire_and_out'] },
            'pc_src': { ids: ['wire_pc_src'] },
            
            // Control
            'ctrl_alu_op': { ids: ['wire_ctrl_alu_op'] },
            'ctrl_reg_we': { ids: ['wire_ctrl_reg_we'] },
            'ctrl_mem_we': { ids: ['wire_ctrl_mem_we'] },
            'ctrl_mem_rd': { ids: ['wire_ctrl_mem_rd'] },
            'ctrl_alu_src': { ids: ['wire_ctrl_alu_src'] },
            'ctrl_imm_src': { ids: ['wire_ctrl_imm_src'] },
            'ctrl_branch': { ids: ['wire_ctrl_branch'] }
        };
        
        // Módulos activos por tipo de instrucción
        this.activeModules = {
            'R': ['mod_pc', 'mod_mem_instr', 'mod_banco_reg', 'mod_mux_alu', 'mod_alu', 'mod_mux_wb', 'mod_alu_ctrl'],
            'I': ['mod_pc', 'mod_mem_instr', 'mod_mux_imm_type', 'mod_imm_gen', 'mod_banco_reg', 'mod_mux_alu', 'mod_alu', 'mod_mux_wb', 'mod_alu_ctrl'],
            'L': ['mod_pc', 'mod_mem_instr', 'mod_mux_imm_type', 'mod_imm_gen', 'mod_banco_reg', 'mod_mux_alu', 'mod_alu', 'mod_mem_data', 'mod_mux_wb', 'mod_alu_ctrl'],
            'S': ['mod_pc', 'mod_mem_instr', 'mod_mux_imm_type', 'mod_imm_gen', 'mod_banco_reg', 'mod_mux_alu', 'mod_alu', 'mod_mem_data', 'mod_alu_ctrl'],
            'B': ['mod_pc', 'mod_adder_pc', 'mod_mux_pc', 'mod_mem_instr', 'mod_ordenamiento', 'mod_adder_branch', 'mod_and_gate', 'mod_mux_br', 'mod_banco_reg', 'mod_alu', 'mod_uno_solo', 'mod_alu_ctrl']
        };
        
        // Zoom y pan para el SVG
        this.svg = document.getElementById('datapathSVG');
        this.svgContainer = document.getElementById('canvasContainer');
        this.zoom = 1.0;
        this.minZoom = 0.4;
        this.maxZoom = 2.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Registros y memoria modificados para resaltar
        this.lastModifiedRegister = -1;
        this.lastModifiedMemory = -1;
        
        this.createTooltip();
        this.setupEventListeners();
        this.initializeUI();
        this.setupThemeToggle();
        this.updateTimeDisplay();
        this.setupSVGInteraction();
    }
    
    // ============================================
    // GESTIÓN DE TEMAS
    // ============================================
    
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('riscvTheme', theme);
        
        const themeLabel = document.getElementById('currentTheme');
        if (themeLabel) {
            themeLabel.textContent = theme === 'modern' ? 'Moderno' : 'Hacker';
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'modern' ? 'hacker' : 'modern';
        this.applyTheme(newTheme);
    }
    
    setupThemeToggle() {
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    updateTimeDisplay() {
        const updateTime = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('es-MX', { hour12: false });
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = time;
            }
        };
        updateTime();
        setInterval(updateTime, 1000);
    }
    
    // ============================================
    // TOOLTIP
    // ============================================
    
    createTooltip() {
        this.tooltip = document.getElementById('wireTooltip');
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.id = 'wireTooltip';
            this.tooltip.className = 'tooltip';
            document.body.appendChild(this.tooltip);
        }
    }
    
    showTooltip(x, y, content) {
        if (!content) {
            this.hideTooltip();
            return;
        }
        
        this.tooltip.innerHTML = content.replace(/\n/g, '<br>');
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (x + 15) + 'px';
        this.tooltip.style.top = (y + 15) + 'px';
        
        const rect = this.tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.tooltip.style.left = (x - rect.width - 15) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.tooltip.style.top = (y - rect.height - 15) + 'px';
        }
    }
    
    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
    
    // ============================================
    // INTERACCIÓN CON SVG - CORREGIDO
    // ============================================
    
    setupSVGInteraction() {
        this.svgGroup = document.getElementById('datapathGroup');
        
        this.svgContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseDrag(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        this.svgContainer.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Tooltip en SVG - mousemove y click
        this.svg.addEventListener('mousemove', (e) => this.handleSVGMouseMove(e));
        this.svg.addEventListener('mouseleave', () => this.hideTooltip());
        this.svg.addEventListener('click', (e) => this.handleSVGClick(e));
        
        this.applyTransform();
    }
    
    applyTransform() {
        if (this.svgGroup) {
            const viewBox = this.svg.viewBox.baseVal;
            const centerX = viewBox.width / 2;
            const centerY = viewBox.height / 2;
            
            this.svgGroup.setAttribute('transform', 
                `translate(${centerX + this.panX}, ${centerY + this.panY}) scale(${this.zoom}) translate(${-centerX}, ${-centerY})`
            );
        }
    }
    
    handleSVGMouseMove(e) {
        const target = e.target;
        const wireId = target.id;
        
        if (wireId && this.wireData[wireId]) {
            this.showTooltip(e.clientX, e.clientY, this.wireData[wireId]);
            target.style.cursor = 'pointer';
        } else if (wireId && wireId.startsWith('wire_')) {
            // Cable sin datos asignados aún
            target.style.cursor = 'pointer';
            this.showTooltip(e.clientX, e.clientY, 'Sin valor asignado');
        } else {
            this.hideTooltip();
        }
    }
    
    handleSVGClick(e) {
        const target = e.target;
        const wireId = target.id;
        
        // Solo procesar clics en cables
        if (wireId && wireId.startsWith('wire_')) {
            e.stopPropagation();
            
            const data = this.wireData[wireId];
            if (data) {
                // Mostrar tooltip fijo con la información del cable
                this.showTooltipFixed(e.clientX, e.clientY, data, wireId);
            } else {
                this.showTooltipFixed(e.clientX, e.clientY, 'Cable: ' + wireId.replace('wire_', '').replace(/_/g, ' '), wireId);
            }
        }
    }
    
    showTooltipFixed(x, y, text, wireId) {
        const tooltip = this.tooltip;
        tooltip.innerHTML = `
            <div class="tooltip-header">${wireId.replace('wire_', '').replace(/_/g, ' ').toUpperCase()}</div>
            <div class="tooltip-value">${text}</div>
            <div class="tooltip-hint">Click en otro lugar para cerrar</div>
        `;
        tooltip.style.left = (x + 15) + 'px';
        tooltip.style.top = (y + 15) + 'px';
        tooltip.style.display = 'block';
        tooltip.classList.add('tooltip-fixed');
        
        // Cerrar al hacer clic en otro lugar
        const closeHandler = (ev) => {
            if (!tooltip.contains(ev.target)) {
                tooltip.classList.remove('tooltip-fixed');
                this.hideTooltip();
                document.removeEventListener('click', closeHandler);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    handleMouseDown(e) {
        if (e.button === 0 && !e.target.id?.startsWith('wire_')) {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.svgContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }
    
    handleMouseDrag(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.panX += deltaX / this.zoom;
            this.panY += deltaY / this.zoom;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.applyTransform();
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
        if (this.svgContainer) {
            this.svgContainer.style.cursor = 'grab';
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            this.applyTransform();
            this.updateZoomDisplay();
        }
    }
    
    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.zoom * 100) + '%';
        }
    }
    
    setupEventListeners() {
        document.getElementById('loadBtn').addEventListener('click', () => this.loadCode());
        document.getElementById('stepBtn').addEventListener('click', () => this.step());
        document.getElementById('runBtn').addEventListener('click', () => this.run());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('exportBinBtn').addEventListener('click', () => this.exportBinary());
        document.getElementById('clearCodeBtn').addEventListener('click', () => this.clearCode());
        document.getElementById('viewCodeBtn').addEventListener('click', () => this.openCodeModal());
        
        // Modal buttons
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeCodeModal());
        document.getElementById('cancelModalBtn').addEventListener('click', () => this.closeCodeModal());
        document.getElementById('saveModalBtn').addEventListener('click', () => this.saveCodeFromModal());
        
        // Cerrar modal con click fuera
        document.getElementById('codeModal').addEventListener('click', (e) => {
            if (e.target.id === 'codeModal') this.closeCodeModal();
        });
        
        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeCodeModal();
        });
        
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('zoomResetBtn').addEventListener('click', () => this.zoomReset());
        
        const speedSlider = document.getElementById('speedSlider');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.executionDelay = parseInt(e.target.value);
                document.getElementById('speedValue').textContent = (this.executionDelay / 1000).toFixed(1);
            });
        }
        
        // Setup file upload
        this.setupFileUpload();
    }
    
    clearCode() {
        const editor = document.getElementById('codeEditor');
        if (editor.value.trim() && !confirm('¿Seguro que deseas limpiar el código?')) {
            return;
        }
        editor.value = '';
        document.getElementById('fileName').textContent = 'Arrastra .asm aquí';
        document.getElementById('fileName').classList.remove('file-loaded');
        this.addLog('Editor limpiado', 'success');
    }
    
    openCodeModal() {
        const modal = document.getElementById('codeModal');
        const fullEditor = document.getElementById('codeEditorFull');
        const smallEditor = document.getElementById('codeEditor');
        
        fullEditor.value = smallEditor.value;
        modal.classList.add('active');
        fullEditor.focus();
    }
    
    closeCodeModal() {
        const modal = document.getElementById('codeModal');
        modal.classList.remove('active');
    }
    
    saveCodeFromModal() {
        const fullEditor = document.getElementById('codeEditorFull');
        const smallEditor = document.getElementById('codeEditor');
        
        smallEditor.value = fullEditor.value;
        this.closeCodeModal();
        this.addLog('Código guardado desde editor', 'success');
    }
    
    // ============================================
    // CARGA DE ARCHIVOS .ASM / .S
    // ============================================
    
    setupFileUpload() {
        const fileInput = document.getElementById('fileInput');
        const fileBtn = document.getElementById('fileBtn');
        const fileName = document.getElementById('fileName');
        
        if (fileBtn && fileInput) {
            fileBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadFile(file);
                    if (fileName) {
                        fileName.textContent = file.name;
                        fileName.classList.add('file-loaded');
                    }
                }
            });
        }
        
        // Drag and drop support
        const codeEditor = document.getElementById('codeEditor');
        if (codeEditor) {
            codeEditor.addEventListener('dragover', (e) => {
                e.preventDefault();
                codeEditor.classList.add('drag-over');
            });
            
            codeEditor.addEventListener('dragleave', () => {
                codeEditor.classList.remove('drag-over');
            });
            
            codeEditor.addEventListener('drop', (e) => {
                e.preventDefault();
                codeEditor.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];
                    if (this.isValidAsmFile(file)) {
                        this.loadFile(file);
                        const fileName = document.getElementById('fileName');
                        if (fileName) {
                            fileName.textContent = file.name;
                            fileName.classList.add('file-loaded');
                        }
                    } else {
                        this.addLog('Archivo no válido. Use .asm, .s o .txt', 'error');
                    }
                }
            });
        }
    }
    
    isValidAsmFile(file) {
        const validExtensions = ['.asm', '.s', '.txt'];
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext));
    }
    
    loadFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            const codeEditor = document.getElementById('codeEditor');
            
            if (codeEditor) {
                // Preprocesar el contenido del archivo
                const processedContent = this.preprocessAsmFile(content);
                codeEditor.value = processedContent;
                this.addLog(`Archivo cargado: ${file.name}`, 'success');
            }
        };
        
        reader.onerror = () => {
            this.addLog('Error al leer el archivo', 'error');
        };
        
        reader.readAsText(file);
    }
    
    preprocessAsmFile(content) {
        // Procesar el archivo ASM para hacerlo compatible
        let lines = content.split('\n');
        let processedLines = [];
        
        for (let line of lines) {
            // Remover comentarios estilo ;
            line = line.split(';')[0];
            
            // Remover espacios extra
            line = line.trim();
            
            // Ignorar directivas del ensamblador (.text, .data, .globl, etc.)
            if (line.startsWith('.') || line.startsWith('@')) {
                continue;
            }
            
            // Ignorar etiquetas (palabras seguidas de :)
            if (line.match(/^\w+:\s*$/)) {
                continue;
            }
            
            // Si la línea tiene etiqueta y instrucción, quitar la etiqueta
            if (line.match(/^\w+:\s+/)) {
                line = line.replace(/^\w+:\s+/, '');
            }
            
            // Convertir registros con nombre a número (ra->x1, sp->x2, etc.)
            line = this.convertNamedRegisters(line);
            
            // Si queda algo, agregarlo
            if (line.length > 0) {
                processedLines.push(line);
            }
        }
        
        return processedLines.join('\n');
    }
    
    convertNamedRegisters(line) {
        // Mapa de nombres de registros ABI a números
        const regMap = {
            'zero': 'x0',
            'ra': 'x1',
            'sp': 'x2',
            'gp': 'x3',
            'tp': 'x4',
            't0': 'x5',
            't1': 'x6',
            't2': 'x7',
            's0': 'x8',
            'fp': 'x8',  // frame pointer es alias de s0
            's1': 'x9',
            'a0': 'x10',
            'a1': 'x11',
            'a2': 'x12',
            'a3': 'x13',
            'a4': 'x14',
            'a5': 'x15',
            'a6': 'x16',
            'a7': 'x17',
            's2': 'x18',
            's3': 'x19',
            's4': 'x20',
            's5': 'x21',
            's6': 'x22',
            's7': 'x23',
            's8': 'x24',
            's9': 'x25',
            's10': 'x26',
            's11': 'x27',
            't3': 'x28',
            't4': 'x29',
            't5': 'x30',
            't6': 'x31'
        };
        
        // Reemplazar cada registro nombrado
        for (const [name, num] of Object.entries(regMap)) {
            // Usar regex para reemplazar solo palabras completas
            const regex = new RegExp(`\\b${name}\\b`, 'gi');
            line = line.replace(regex, num);
        }
        
        return line;
    }
    
    // ============================================
    // EXPORTAR A BINARIO
    // ============================================
    
    exportBinary() {
        const code = document.getElementById('codeEditor').value;
        const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
        
        if (lines.length === 0) {
            this.addLog('No hay código para exportar', 'error');
            return;
        }
        
        let binaryOutput = [];
        let errors = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;
            
            try {
                const binary = this.instructionToBinary(line);
                binaryOutput.push(binary);
            } catch (e) {
                errors.push(`Línea ${i + 1}: ${e.message}`);
                binaryOutput.push('00000000000000000000000000000000'); // NOP en caso de error
            }
        }
        
        if (errors.length > 0) {
            this.addLog(`Errores en ${errors.length} líneas`, 'error');
            errors.forEach(e => this.addLog(e, 'error'));
        }
        
        // Crear el contenido del archivo
        const content = binaryOutput.join('\n');
        
        // Descargar archivo
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'programa_riscv.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addLog(`Exportado: ${binaryOutput.length} instrucciones a binario`, 'success');
    }
    
    instructionToBinary(line) {
        // Limpiar comentarios inline
        line = line.split('#')[0].trim();
        
        // Parsear la instrucción
        const parts = line.replace(/,/g, ' ').replace(/\(/g, ' ').replace(/\)/g, ' ').split(/\s+/).filter(p => p);
        const op = parts[0].toLowerCase();
        
        // Extraer número de registro
        const regNum = (r) => {
            if (!r) return 0;
            const match = r.match(/x(\d+)/i);
            return match ? parseInt(match[1]) : 0;
        };
        
        // Convertir a binario con padding
        const toBin = (num, bits) => {
            if (num < 0) {
                // Complemento a 2 para negativos
                num = (1 << bits) + num;
            }
            return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
        };
        
        // Codificar según tipo de instrucción
        switch (op) {
            // Tipo R: add, sub, and, or, xor, sll, srl, sra, slt, sltu
            case 'add': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '000' + toBin(rd, 5) + '0110011';
            }
            case 'sub': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return '0100000' + toBin(rs2, 5) + toBin(rs1, 5) + '000' + toBin(rd, 5) + '0110011';
            }
            case 'and': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '111' + toBin(rd, 5) + '0110011';
            }
            case 'or': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '110' + toBin(rd, 5) + '0110011';
            }
            case 'xor': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '100' + toBin(rd, 5) + '0110011';
            }
            case 'sll': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '001' + toBin(rd, 5) + '0110011';
            }
            case 'srl': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '101' + toBin(rd, 5) + '0110011';
            }
            case 'sra': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return '0100000' + toBin(rs2, 5) + toBin(rs1, 5) + '101' + toBin(rd, 5) + '0110011';
            }
            case 'slt': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '010' + toBin(rd, 5) + '0110011';
            }
            case 'sltu': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const rs2 = regNum(parts[3]);
                return toBin(0, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '011' + toBin(rd, 5) + '0110011';
            }
            
            // Tipo I: addi, andi, ori, xori, slti, sltiu, slli, srli, srai
            case 'addi': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '000' + toBin(rd, 5) + '0010011';
            }
            case 'andi': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '111' + toBin(rd, 5) + '0010011';
            }
            case 'ori': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '110' + toBin(rd, 5) + '0010011';
            }
            case 'xori': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '100' + toBin(rd, 5) + '0010011';
            }
            case 'slti': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '010' + toBin(rd, 5) + '0010011';
            }
            case 'sltiu': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const imm = parseInt(parts[3]);
                return toBin(imm, 12) + toBin(rs1, 5) + '011' + toBin(rd, 5) + '0010011';
            }
            case 'slli': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const shamt = parseInt(parts[3]);
                return '0000000' + toBin(shamt, 5) + toBin(rs1, 5) + '001' + toBin(rd, 5) + '0010011';
            }
            case 'srli': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const shamt = parseInt(parts[3]);
                return '0000000' + toBin(shamt, 5) + toBin(rs1, 5) + '101' + toBin(rd, 5) + '0010011';
            }
            case 'srai': {
                const rd = regNum(parts[1]);
                const rs1 = regNum(parts[2]);
                const shamt = parseInt(parts[3]);
                return '0100000' + toBin(shamt, 5) + toBin(rs1, 5) + '101' + toBin(rd, 5) + '0010011';
            }
            
            // Load: lw, lh, lb, lhu, lbu
            case 'lw': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                return toBin(offset, 12) + toBin(rs1, 5) + '010' + toBin(rd, 5) + '0000011';
            }
            case 'lh': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                return toBin(offset, 12) + toBin(rs1, 5) + '001' + toBin(rd, 5) + '0000011';
            }
            case 'lb': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                return toBin(offset, 12) + toBin(rs1, 5) + '000' + toBin(rd, 5) + '0000011';
            }
            case 'lhu': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                return toBin(offset, 12) + toBin(rs1, 5) + '101' + toBin(rd, 5) + '0000011';
            }
            case 'lbu': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                return toBin(offset, 12) + toBin(rs1, 5) + '100' + toBin(rd, 5) + '0000011';
            }
            
            // Store: sw, sh, sb
            case 'sw': {
                const rs2 = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                const imm11_5 = (offset >> 5) & 0x7F;
                const imm4_0 = offset & 0x1F;
                return toBin(imm11_5, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '010' + toBin(imm4_0, 5) + '0100011';
            }
            case 'sh': {
                const rs2 = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                const imm11_5 = (offset >> 5) & 0x7F;
                const imm4_0 = offset & 0x1F;
                return toBin(imm11_5, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '001' + toBin(imm4_0, 5) + '0100011';
            }
            case 'sb': {
                const rs2 = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                const imm11_5 = (offset >> 5) & 0x7F;
                const imm4_0 = offset & 0x1F;
                return toBin(imm11_5, 7) + toBin(rs2, 5) + toBin(rs1, 5) + '000' + toBin(imm4_0, 5) + '0100011';
            }
            
            // Branch: beq, bne, blt, bge, bltu, bgeu
            case 'beq': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '000');
            }
            case 'bne': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '001');
            }
            case 'blt': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '100');
            }
            case 'bge': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '101');
            }
            case 'bltu': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '110');
            }
            case 'bgeu': {
                const rs1 = regNum(parts[1]);
                const rs2 = regNum(parts[2]);
                const offset = parseInt(parts[3]);
                return this.encodeBranch(offset, rs2, rs1, '111');
            }
            
            // JAL y JALR
            case 'jal': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]);
                return this.encodeJal(offset, rd);
            }
            case 'jalr': {
                const rd = regNum(parts[1]);
                const offset = parseInt(parts[2]) || 0;
                const rs1 = regNum(parts[3]);
                const toBin = (num, bits) => {
                    if (num < 0) num = (1 << bits) + num;
                    return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
                };
                return toBin(offset, 12) + toBin(rs1, 5) + '000' + toBin(rd, 5) + '1100111';
            }
            
            // LUI y AUIPC
            case 'lui': {
                const rd = regNum(parts[1]);
                const imm = parseInt(parts[2]);
                const toBin = (num, bits) => {
                    if (num < 0) num = (1 << bits) + num;
                    return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
                };
                return toBin(imm, 20) + toBin(rd, 5) + '0110111';
            }
            case 'auipc': {
                const rd = regNum(parts[1]);
                const imm = parseInt(parts[2]);
                const toBin = (num, bits) => {
                    if (num < 0) num = (1 << bits) + num;
                    return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
                };
                return toBin(imm, 20) + toBin(rd, 5) + '0010111';
            }
            
            // NOP (pseudo-instrucción)
            case 'nop':
                return '00000000000000000000000000010011'; // addi x0, x0, 0
            
            default:
                throw new Error(`Instrucción no soportada: ${op}`);
        }
    }
    
    encodeBranch(offset, rs2, rs1, funct3) {
        const toBin = (num, bits) => {
            if (num < 0) num = (1 << bits) + num;
            return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
        };
        
        // Branch offset encoding: imm[12|10:5] rs2 rs1 funct3 imm[4:1|11] opcode
        const imm = offset;
        const imm12 = (imm >> 12) & 0x1;
        const imm10_5 = (imm >> 5) & 0x3F;
        const imm4_1 = (imm >> 1) & 0xF;
        const imm11 = (imm >> 11) & 0x1;
        
        return toBin(imm12, 1) + toBin(imm10_5, 6) + toBin(rs2, 5) + toBin(rs1, 5) + funct3 + toBin(imm4_1, 4) + toBin(imm11, 1) + '1100011';
    }
    
    encodeJal(offset, rd) {
        const toBin = (num, bits) => {
            if (num < 0) num = (1 << bits) + num;
            return (num >>> 0).toString(2).padStart(bits, '0').slice(-bits);
        };
        
        // JAL offset encoding: imm[20|10:1|11|19:12] rd opcode
        const imm = offset;
        const imm20 = (imm >> 20) & 0x1;
        const imm10_1 = (imm >> 1) & 0x3FF;
        const imm11 = (imm >> 11) & 0x1;
        const imm19_12 = (imm >> 12) & 0xFF;
        
        return toBin(imm20, 1) + toBin(imm10_1, 10) + toBin(imm11, 1) + toBin(imm19_12, 8) + toBin(rd, 5) + '1101111';
    }
    
    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom * 1.2);
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    zoomReset() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    initializeUI() {
        this.updatePCDisplay();
        this.updateCurrentInstruction();
        this.updateRegisterDisplay();
        this.updateMemoryDisplay();
        this.updateZoomDisplay();
    }
    
    // ============================================
    // SIMULADOR
    // ============================================
    
    loadCode() {
        const code = document.getElementById('codeEditor').value;
        const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
        
        this.instructions = lines.map((line, index) => {
            const trimmed = line.trim();
            return {
                raw: trimmed,
                address: index * 4,  // Dirección en bytes
                parsed: this.parseInstruction(trimmed)
            };
        });
        
        this.reset();
        this.addLog('Código cargado: ' + this.instructions.length + ' instrucciones', 'success');
    }
    
    parseInstruction(line) {
        line = line.trim();
        const parts = line.split(/[\s,()]+/).filter(p => p);
        
        if (parts.length === 0) return null;
        
        const op = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        return {
            opcode: op,
            args: args.map(arg => {
                if (arg.startsWith('x')) return parseInt(arg.substring(1));
                return parseInt(arg);
            })
        };
    }
    
    step() {
        // PC está en bytes, convertir a índice de instrucción
        const instIndex = this.pc / 4;
        
        if (instIndex >= this.instructions.length) {
            this.addLog('Programa terminado', 'error');
            return;
        }
        
        this.executeInstruction();
        this.updatePCDisplay();
        this.updateCurrentInstruction();
        this.updateRegisterDisplay();
        this.updateMemoryDisplay();
    }
    
    async run() {
        if (this.isRunning) {
            this.isRunning = false;
            this.addLog('Ejecución detenida', 'error');
            return;
        }
        
        this.isRunning = true;
        document.getElementById('runBtn').textContent = 'Detener';
        this.addLog('Ejecutando programa...', 'success');
        
        while (this.isRunning && (this.pc / 4) < this.instructions.length) {
            this.step();
            await new Promise(resolve => setTimeout(resolve, this.executionDelay));
        }
        
        this.isRunning = false;
        document.getElementById('runBtn').textContent = 'Ejecutar';
        
        if ((this.pc / 4) >= this.instructions.length) {
            this.addLog('Programa finalizado', 'success');
        }
    }
    
    reset() {
        this.pc = 0;  // PC en bytes
        this.registers.fill(0);
        this.memory.fill(0);
        this.currentInstruction = null;
        this.signalStates = {};
        this.isRunning = false;
        this.wireData = {};
        this.lastModifiedRegister = -1;
        this.lastModifiedMemory = -1;
        document.getElementById('runBtn').textContent = 'Ejecutar';
        
        this.updatePCDisplay();
        this.updateCurrentInstruction();
        this.updateRegisterDisplay();
        this.updateMemoryDisplay();
        this.limpiarCables();
        this.resaltarModulosActivos(this.todosLosModulos);
        
        this.addLog('Simulador reiniciado', 'success');
    }
    
    // Validar índice de registro
    validarRegistro(idx) {
        if (typeof idx !== 'number' || isNaN(idx) || idx < 0 || idx > 31) {
            this.addLog(`Error: Registro inválido x${idx}`, 'error');
            return false;
        }
        return true;
    }
    
    // Validar dirección de memoria
    validarDireccionMemoria(addr) {
        const idx = Math.floor(addr / 4);
        if (idx < 0 || idx >= this.memory.length) {
            this.addLog(`Error: Dirección de memoria fuera de rango: ${addr}`, 'error');
            return false;
        }
        return true;
    }
    
    executeInstruction() {
        const instIndex = this.pc / 4;
        if (instIndex >= this.instructions.length) return;
        
        this.currentInstruction = this.instructions[instIndex];
        const inst = this.currentInstruction.parsed;
        
        if (!inst) {
            this.pc += 4;
            return;
        }
        
        this.limpiarCables();
        this.wireData = {};
        
        const op = inst.opcode;
        const args = inst.args;
        
        this.signalStates = {
            type: null,
            regWrite: 0,
            aluSrc: 0,
            memRead: 0,
            memWrite: 0,
            branch: 0,
            alu_op: null,
            aluResult: 0,
            immediate: 0
        };
        
        // Ejecutar según opcode
        if (op === 'add' || op === 'sub' || op === 'and' || op === 'or' || op === 'xor' || 
            op === 'sll' || op === 'srl' || op === 'sra') {
            this.ejecutarTipoR(op, args);
        } else if (op === 'addi' || op === 'andi' || op === 'ori' || op === 'xori' || 
                   op === 'slti' || op === 'slli' || op === 'srli' || op === 'srai') {
            this.ejecutarTipoI(op, args);
        } else if (op === 'lw') {
            this.ejecutarTipoL(op, args);
        } else if (op === 'sw') {
            this.ejecutarTipoS(op, args);
        } else if (op === 'beq' || op === 'bne' || op === 'blt' || op === 'bge') {
            this.ejecutarTipoB(op, args);
        } else {
            this.addLog(`Instrucción no reconocida: ${op}`, 'error');
            this.pc += 4;
        }
    }
    
    // ============================================
    // TIPOS DE INSTRUCCIONES - IMPLEMENTACIÓN CORREGIDA
    // ============================================
    
    ejecutarTipoR(op, args) {
        if (args.length < 3) {
            this.addLog(`Error: Argumentos insuficientes para ${op}`, 'error');
            this.pc += 4;
            return;
        }
        
        const rdIdx = args[0];
        const rs1Idx = args[1];
        const rs2Idx = args[2];
        
        // Validar registros
        if (!this.validarRegistro(rdIdx) || !this.validarRegistro(rs1Idx) || !this.validarRegistro(rs2Idx)) {
            this.pc += 4;
            return;
        }
        
        this.signalStates.type = 'R';
        this.resaltarModulosActivos(this.activeModules['R']);
        
        const valRs1 = this.registers[rs1Idx];
        const valRs2 = this.registers[rs2Idx];
        
        let resultado = 0;
        const shiftAmt = valRs2 & 0x1F;
        
        switch (op) {
            case 'add': resultado = valRs1 + valRs2; break;
            case 'sub': resultado = valRs1 - valRs2; break;
            case 'sll': resultado = valRs1 << shiftAmt; break;
            case 'xor': resultado = valRs1 ^ valRs2; break;
            case 'srl': resultado = valRs1 >>> shiftAmt; break;
            case 'sra': resultado = valRs1 >> shiftAmt; break;
            case 'or':  resultado = valRs1 | valRs2; break;
            case 'and': resultado = valRs1 & valRs2; break;
            case 'slt': resultado = (valRs1 < valRs2) ? 1 : 0; break;  // Signed
            case 'sltu': resultado = ((valRs1 >>> 0) < (valRs2 >>> 0)) ? 1 : 0; break;  // Unsigned
        }
        
        resultado = resultado | 0;  // Convertir a 32-bit signed
        
        // x0 siempre es 0
        if (rdIdx !== 0) {
            this.registers[rdIdx] = resultado;
            this.lastModifiedRegister = rdIdx;
        }
        
        this.signalStates.regWrite = 1;
        this.signalStates.alu_op = op.toUpperCase();
        this.signalStates.aluResult = resultado;
        
        // Tooltips
        this.asignarTooltip('pc_to_instr', `PC: ${this.pc}`);
        this.asignarTooltip('opcode', `OpCode: ${op.toUpperCase()}`);
        this.asignarTooltip('rs1', `Rs1: x${rs1Idx}`);
        this.asignarTooltip('rs2', `Rs2: x${rs2Idx}`);
        this.asignarTooltip('rd', `Rd: x${rdIdx}`);
        this.asignarTooltip('reg_do1', `Rs1 Data: ${valRs1}\nBin: ${this.toBin(valRs1)}`);
        this.asignarTooltip('reg_do2', `Rs2 Data: ${valRs2}\nBin: ${this.toBin(valRs2)}`);
        this.asignarTooltip('do2_to_alu_mux', `To ALU Mux: ${valRs2}`);
        this.asignarTooltip('alu_mux_out', `ALU Input B: ${valRs2}`);
        this.asignarTooltip('ctrl_alu_op', `ALU Op: ${op.toUpperCase()}`);
        this.asignarTooltip('alu_result', `ALU Result: ${resultado}\nHex: 0x${this.toHex(resultado)}`);
        this.asignarTooltip('alu_to_wb', `To WB Mux: ${resultado}`);
        this.asignarTooltip('wb_data', `Write Data: ${resultado}`);
        this.asignarTooltip('ctrl_reg_we', "RegWrite: 1");
        
        this.animarSecuencia([
            ['pc_out', 'pc_to_instr', 'opcode'],
            ['rs1', 'rs2', 'rd'],
            ['reg_do1', 'reg_do2', 'do2_to_alu_mux', 'ctrl_alu_op', 'ctrl_alu_src'],
            ['alu_mux_out', 'alu_result'],
            ['alu_to_wb', 'wb_data', 'ctrl_reg_we']
        ], 'wire-type-r');
        
        this.addLog(`${op.toUpperCase()} x${rdIdx}, x${rs1Idx}, x${rs2Idx} → x${rdIdx} = ${resultado}`, 'success');
        this.pc += 4;
    }
    
    ejecutarTipoI(op, args) {
        if (args.length < 3) {
            this.addLog(`Error: Argumentos insuficientes para ${op}`, 'error');
            this.pc += 4;
            return;
        }
        
        const rdIdx = args[0];
        const rs1Idx = args[1];
        const inmediato = args[2];
        
        // Validar registros
        if (!this.validarRegistro(rdIdx) || !this.validarRegistro(rs1Idx)) {
            this.pc += 4;
            return;
        }
        
        this.signalStates.type = 'I';
        this.resaltarModulosActivos(this.activeModules['I']);
        
        const valRs1 = this.registers[rs1Idx];
        
        let resultado = 0;
        const shamt = inmediato & 0x1F;
        
        switch (op) {
            case 'addi': resultado = valRs1 + inmediato; break;
            case 'andi': resultado = valRs1 & inmediato; break;
            case 'ori':  resultado = valRs1 | inmediato; break;
            case 'xori': resultado = valRs1 ^ inmediato; break;
            case 'slti': resultado = (valRs1 < inmediato) ? 1 : 0; break;
            case 'sltiu': resultado = ((valRs1 >>> 0) < (inmediato >>> 0)) ? 1 : 0; break;  // Unsigned
            case 'slli': resultado = valRs1 << shamt; break;
            case 'srli': resultado = valRs1 >>> shamt; break;
            case 'srai': resultado = valRs1 >> shamt; break;
        }
        
        resultado = resultado | 0;
        
        if (rdIdx !== 0) {
            this.registers[rdIdx] = resultado;
            this.lastModifiedRegister = rdIdx;
        }
        
        this.signalStates.regWrite = 1;
        this.signalStates.aluSrc = 1;
        this.signalStates.alu_op = op.toUpperCase();
        this.signalStates.immediate = inmediato;
        this.signalStates.aluResult = resultado;
        
        // Tooltips
        this.asignarTooltip('pc_to_instr', `PC: ${this.pc}`);
        this.asignarTooltip('opcode', `OpCode: ${op.toUpperCase()}`);
        this.asignarTooltip('rs1', `Rs1: x${rs1Idx}`);
        this.asignarTooltip('rd', `Rd: x${rdIdx}`);
        this.asignarTooltip('imm_i', `Immediate: ${inmediato}`);
        this.asignarTooltip('mux_to_ext', `To Sign Ext: ${inmediato}`);
        this.asignarTooltip('ext_out', `Extended to ALU: ${inmediato}\nBin: ${this.toBin(inmediato)}`);
        this.asignarTooltip('reg_do1', `Rs1 Data: ${valRs1}`);
        this.asignarTooltip('ctrl_alu_src', "ALUSrc: 1 (Imm)");
        this.asignarTooltip('alu_mux_out', `ALU Input B: ${inmediato}`);
        this.asignarTooltip('ctrl_alu_op', `ALU Op: ${op.toUpperCase()}`);
        this.asignarTooltip('alu_result', `ALU Result: ${resultado}\nHex: 0x${this.toHex(resultado)}`);
        this.asignarTooltip('alu_to_wb', `To WB Mux: ${resultado}`);
        this.asignarTooltip('wb_data', `Write Data: ${resultado}`);
        this.asignarTooltip('ctrl_reg_we', "RegWrite: 1");
        
        this.animarSecuencia([
            ['pc_out', 'pc_to_instr', 'opcode'],
            ['rs1', 'rd', 'imm_i'],
            ['mux_to_ext', 'ext_out', 'reg_do1'],
            ['ctrl_alu_src', 'alu_mux_out', 'ctrl_alu_op'],
            ['alu_result', 'alu_to_wb'],
            ['wb_data', 'ctrl_reg_we']
        ], 'wire-type-i');
        
        this.addLog(`${op.toUpperCase()} x${rdIdx}, x${rs1Idx}, ${inmediato} → x${rdIdx} = ${resultado}`, 'success');
        this.pc += 4;
    }
    
    ejecutarTipoL(op, args) {
        if (args.length < 3) {
            this.addLog(`Error: Argumentos insuficientes para ${op}`, 'error');
            this.pc += 4;
            return;
        }
        
        const rdIdx = args[0];
        const offset = args[1];
        const rs1Idx = args[2];
        
        // Validar registros
        if (!this.validarRegistro(rdIdx) || !this.validarRegistro(rs1Idx)) {
            this.pc += 4;
            return;
        }
        
        this.signalStates.type = 'L';
        this.resaltarModulosActivos(this.activeModules['L']);
        
        const valRs1 = this.registers[rs1Idx];
        const direccionMemoria = valRs1 + offset;
        
        // Validar dirección de memoria
        if (!this.validarDireccionMemoria(direccionMemoria)) {
            this.pc += 4;
            return;
        }
        
        // Usar shift derecho para división entera sin signo
        const indiceMem = (direccionMemoria >= 0) ? Math.floor(direccionMemoria / 4) : 0;
        
        let valorLeido = 0;
        if (indiceMem >= 0 && indiceMem < this.memory.length) {
            valorLeido = this.memory[indiceMem];
        }
        
        if (rdIdx !== 0) {
            this.registers[rdIdx] = valorLeido;
            this.lastModifiedRegister = rdIdx;
        }
        
        this.signalStates.regWrite = 1;
        this.signalStates.aluSrc = 1;
        this.signalStates.memRead = 1;
        this.signalStates.alu_op = 'ADD';
        this.signalStates.immediate = offset;
        this.signalStates.aluResult = direccionMemoria;
        
        // Tooltips
        this.asignarTooltip('pc_to_instr', `PC: ${this.pc}`);
        this.asignarTooltip('opcode', `OpCode: LW`);
        this.asignarTooltip('rs1', `Base: x${rs1Idx}`);
        this.asignarTooltip('rd', `Dest: x${rdIdx}`);
        this.asignarTooltip('imm_i', `Offset: ${offset}`);
        this.asignarTooltip('ext_out', `Offset Extended to ALU: ${offset}`);
        this.asignarTooltip('reg_do1', `Base Address: ${valRs1}`);
        this.asignarTooltip('ctrl_alu_src', "ALUSrc: 1");
        this.asignarTooltip('alu_result', `Address: ${direccionMemoria}`);
        this.asignarTooltip('alu_to_mem_addr', `Mem Address: ${direccionMemoria} (index: ${indiceMem})`);
        this.asignarTooltip('ctrl_mem_rd', "MemRead: 1");
        this.asignarTooltip('mem_read', `Data Read: ${valorLeido}\nHex: 0x${this.toHex(valorLeido)}`);
        this.asignarTooltip('wb_data', `Write Data: ${valorLeido}`);
        this.asignarTooltip('ctrl_reg_we', "RegWrite: 1");
        
        this.animarSecuencia([
            ['pc_out', 'pc_to_instr', 'opcode'],
            ['rs1', 'rd', 'imm_i'],
            ['mux_to_ext', 'ext_out', 'reg_do1'],
            ['ctrl_alu_src', 'alu_mux_out', 'alu_result'],
            ['alu_to_mem_addr', 'ctrl_mem_rd'],
            ['mem_read', 'wb_data', 'ctrl_reg_we']
        ], 'wire-type-l');
        
        this.addLog(`LW x${rdIdx}, ${offset}(x${rs1Idx}) → x${rdIdx} = mem[${indiceMem}] = ${valorLeido}`, 'success');
        this.pc += 4;
    }
    
    ejecutarTipoS(op, args) {
        if (args.length < 3) {
            this.addLog(`Error: Argumentos insuficientes para ${op}`, 'error');
            this.pc += 4;
            return;
        }
        
        const rs2Idx = args[0];
        const offset = args[1];
        const rs1Idx = args[2];
        
        // Validar registros
        if (!this.validarRegistro(rs1Idx) || !this.validarRegistro(rs2Idx)) {
            this.pc += 4;
            return;
        }
        
        this.signalStates.type = 'S';
        this.resaltarModulosActivos(this.activeModules['S']);
        
        const valRs1 = this.registers[rs1Idx];
        const valRs2 = this.registers[rs2Idx];
        const direccionMemoria = valRs1 + offset;
        
        // Validar dirección de memoria
        if (!this.validarDireccionMemoria(direccionMemoria)) {
            this.pc += 4;
            return;
        }
        
        const indiceMem = (direccionMemoria >= 0) ? Math.floor(direccionMemoria / 4) : 0;
        
        if (indiceMem >= 0 && indiceMem < this.memory.length) {
            this.memory[indiceMem] = valRs2;
            this.lastModifiedMemory = indiceMem;
        }
        
        this.signalStates.aluSrc = 1;
        this.signalStates.memWrite = 1;
        this.signalStates.alu_op = 'ADD';
        this.signalStates.immediate = offset;
        this.signalStates.aluResult = direccionMemoria;
        
        // Tooltips
        this.asignarTooltip('pc_to_instr', `PC: ${this.pc}`);
        this.asignarTooltip('opcode', `OpCode: SW`);
        this.asignarTooltip('rs1', `Base: x${rs1Idx}`);
        this.asignarTooltip('rs2', `Source: x${rs2Idx}`);
        this.asignarTooltip('imm_s', `Offset: ${offset}`);
        this.asignarTooltip('ext_out', `Offset Extended to ALU: ${offset}`);
        this.asignarTooltip('reg_do1', `Base Address: ${valRs1}`);
        this.asignarTooltip('reg_do2', `Data to Store: ${valRs2}`);
        this.asignarTooltip('do2_to_mem', `To Memory: ${valRs2}\nHex: 0x${this.toHex(valRs2)}`);
        this.asignarTooltip('ctrl_alu_src', "ALUSrc: 1");
        this.asignarTooltip('alu_result', `Address: ${direccionMemoria}`);
        this.asignarTooltip('alu_to_mem_addr', `Mem Address: ${direccionMemoria} (index: ${indiceMem})`);
        this.asignarTooltip('ctrl_mem_we', "MemWrite: 1");
        
        this.animarSecuencia([
            ['pc_out', 'pc_to_instr', 'opcode'],
            ['rs1', 'rs2', 'imm_s'],
            ['mux_to_ext', 'ext_out', 'reg_do1', 'reg_do2'],
            ['ctrl_alu_src', 'alu_mux_out', 'alu_result', 'do2_to_mem'],
            ['alu_to_mem_addr', 'ctrl_mem_we']
        ], 'wire-type-s');
        
        this.addLog(`SW x${rs2Idx}, ${offset}(x${rs1Idx}) → mem[${indiceMem}] = ${valRs2}`, 'success');
        this.pc += 4;
    }
    
    ejecutarTipoB(op, args) {
        if (args.length < 3) {
            this.addLog(`Error: Argumentos insuficientes para ${op}`, 'error');
            this.pc += 4;
            return;
        }
        
        const rs1Idx = args[0];
        const rs2Idx = args[1];
        const offset = args[2];  // Offset en bytes
        
        // Validar registros
        if (!this.validarRegistro(rs1Idx) || !this.validarRegistro(rs2Idx)) {
            this.pc += 4;
            return;
        }
        
        this.signalStates.type = 'B';
        this.resaltarModulosActivos(this.activeModules['B']);
        
        const valRs1 = this.registers[rs1Idx];
        const valRs2 = this.registers[rs2Idx];
        
        let tomarSalto = false;
        switch (op) {
            case 'beq':  tomarSalto = (valRs1 === valRs2); break;
            case 'bne':  tomarSalto = (valRs1 !== valRs2); break;
            case 'blt':  tomarSalto = (valRs1 < valRs2);   break;
            case 'bge':  tomarSalto = (valRs1 >= valRs2);  break;
            case 'bltu': tomarSalto = ((valRs1 >>> 0) < (valRs2 >>> 0));  break; // Unsigned
            case 'bgeu': tomarSalto = ((valRs1 >>> 0) >= (valRs2 >>> 0)); break; // Unsigned
        }
        
        const pcActual = this.pc;  // PC ya está en bytes
        const pcMas4 = pcActual + 4;
        const pcSalto = pcActual + offset;
        
        // Tooltips
        this.asignarTooltip('pc_to_instr', `PC: ${pcActual}`);
        this.asignarTooltip('opcode', `OpCode: ${op.toUpperCase()}`);
        this.asignarTooltip('rs1', `Rs1: x${rs1Idx}`);
        this.asignarTooltip('rs2', `Rs2: x${rs2Idx}`);
        this.asignarTooltip('reg_do1', `Rs1 Data: ${valRs1}`);
        this.asignarTooltip('reg_do2', `Rs2 Data: ${valRs2}`);
        this.asignarTooltip('do2_to_alu_mux', `Compare: ${valRs2}`);
        this.asignarTooltip('ctrl_alu_op', `ALU Op: SUB (Compare)`);
        this.asignarTooltip('alu_result', `Diff: ${valRs1 - valRs2}`);
        this.asignarTooltip('alu_to_zero', `To Zero Detect`);
        this.asignarTooltip('zero_flag', `Condition: ${tomarSalto ? "TRUE" : "FALSE"}`);
        this.asignarTooltip('ctrl_branch', `Branch: ${op.toUpperCase()}`);
        this.asignarTooltip('and_out', `Take Branch: ${tomarSalto ? "YES" : "NO"}`);
        this.asignarTooltip('ord_out', `Offset: ${offset}`);
        this.asignarTooltip('branch_offset', `Offset to Adder: ${offset}`);
        this.asignarTooltip('pc4_to_branch', `PC to Adder: ${pcActual}`);
        this.asignarTooltip('branch_target', `Target PC: ${pcSalto}`);
        this.asignarTooltip('pc_plus_4', `PC+4: ${pcMas4}`);
        this.asignarTooltip('pc_src', `Next PC: ${tomarSalto ? pcSalto : pcMas4}`);
        this.asignarTooltip('mux_to_pc', `To PC: ${tomarSalto ? pcSalto : pcMas4}`);
        
        this.animarSecuencia([
            ['pc_out', 'pc_to_instr', 'opcode', 'pc_to_adder', 'pc_plus_4'],
            ['rs1', 'rs2', 'ord_out', 'branch_offset'],
            ['reg_do1', 'reg_do2', 'do2_to_alu_mux'],
            ['ctrl_alu_op', 'alu_result', 'alu_to_zero'],
            ['zero_flag', 'ctrl_branch', 'and_out'],
            ['pc4_to_branch', 'branch_target', 'pc_src', 'mux_to_pc']
        ], 'wire-type-b');
        
        this.signalStates.branch = 1;
        this.signalStates.alu_op = 'SUB';
        this.signalStates.immediate = offset;
        
        // Detectar HALT (beq x0, x0, 0 = loop infinito)
        if (op === 'beq' && rs1Idx === 0 && rs2Idx === 0 && offset === 0) {
            this.addLog(`HALT detectado (beq x0, x0, 0) - Programa terminado`, 'success');
            this.isRunning = false;
            document.getElementById('runBtn').textContent = 'Ejecutar';
            return;
        }
        
        // Actualizar PC
        if (tomarSalto) {
            this.pc = pcSalto;
            this.addLog(`${op.toUpperCase()} x${rs1Idx}, x${rs2Idx}, ${offset} → SALTO a PC=${pcSalto}`, 'success');
        } else {
            this.pc = pcMas4;
            this.addLog(`${op.toUpperCase()} x${rs1Idx}, x${rs2Idx}, ${offset} → NO SALTO, PC=${pcMas4}`, 'success');
        }
    }
    
    // ============================================
    // ANIMACIÓN Y VISUALIZACIÓN - EFECTO COMETA/ECG
    // ============================================
    
    asignarTooltip(nombreLogico, texto) {
        if (this.wireMap[nombreLogico] && this.wireMap[nombreLogico].ids) {
            this.wireMap[nombreLogico].ids.forEach(id => {
                this.wireData[id] = texto;
            });
        }
    }
    
    // Obtener color según tipo de instrucción
    obtenerColorTipo(claseColor) {
        const colores = {
            'wire-type-r': '#00e676',
            'wire-type-i': '#00bcd4',
            'wire-type-l': '#ffab00',
            'wire-type-s': '#f50057',
            'wire-type-b': '#d500f9'
        };
        return colores[claseColor] || '#00ff88';
    }
    
    // Crear efecto cometa con rastro en un cable
    animarCometaEnCable(wireId, color, duracion = 1200, delay = 0) {
        const wire = document.getElementById(wireId);
        if (!wire) return;
        
        // Agregar al grupo de datapath para que la transformación aplique
        const svgGroup = document.getElementById('datapathGroup') || this.svg;
        const svgNS = "http://www.w3.org/2000/svg";
        
        // Obtener longitud del cable
        let pathLength;
        try {
            pathLength = wire.getTotalLength();
        } catch (e) {
            pathLength = 100;
        }
        
        // Crear grupo para el efecto cometa
        const cometGroup = document.createElementNS(svgNS, "g");
        cometGroup.classList.add("comet-group");
        cometGroup.style.opacity = "0";
        
        // Obtener los puntos del cable
        const points = wire.getAttribute("points");
        if (!points) return;
        
        const pathData = this.polylineToPath(points);
        
        // 1. RASTRO - Línea que se va "dibujando"
        const trail = document.createElementNS(svgNS, "polyline");
        trail.setAttribute("points", points);
        trail.setAttribute("fill", "none");
        trail.setAttribute("stroke", color);
        trail.setAttribute("stroke-width", "4");
        trail.setAttribute("stroke-linecap", "round");
        trail.setAttribute("stroke-linejoin", "round");
        trail.style.filter = `drop-shadow(0 0 3px ${color})`;
        
        // El rastro empieza invisible y se va "dibujando"
        trail.style.strokeDasharray = pathLength;
        trail.style.strokeDashoffset = pathLength;
        
        // 2. RASTRO DESVANECIDO - El trail que queda después
        const trailFade = document.createElementNS(svgNS, "polyline");
        trailFade.setAttribute("points", points);
        trailFade.setAttribute("fill", "none");
        trailFade.setAttribute("stroke", color);
        trailFade.setAttribute("stroke-width", "3");
        trailFade.setAttribute("stroke-linecap", "round");
        trailFade.setAttribute("stroke-linejoin", "round");
        trailFade.style.opacity = "0.4";
        trailFade.style.filter = `drop-shadow(0 0 6px ${color})`;
        trailFade.style.strokeDasharray = pathLength;
        trailFade.style.strokeDashoffset = pathLength;
        
        // 3. CABEZA DEL COMETA - Círculo brillante
        const cometHead = document.createElementNS(svgNS, "circle");
        cometHead.setAttribute("r", "6");
        cometHead.setAttribute("fill", "#ffffff");
        cometHead.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 15px ${color}) drop-shadow(0 0 25px #ffffff)`;
        
        // 4. NÚCLEO BRILLANTE
        const cometCore = document.createElementNS(svgNS, "circle");
        cometCore.setAttribute("r", "3");
        cometCore.setAttribute("fill", color);
        cometCore.style.filter = `drop-shadow(0 0 4px #ffffff)`;
        
        // Añadir al grupo
        cometGroup.appendChild(trailFade);
        cometGroup.appendChild(trail);
        cometGroup.appendChild(cometHead);
        cometGroup.appendChild(cometCore);
        
        // Animación de movimiento para la cabeza
        const animateHead = document.createElementNS(svgNS, "animateMotion");
        animateHead.setAttribute("dur", `${duracion}ms`);
        animateHead.setAttribute("repeatCount", "1");
        animateHead.setAttribute("fill", "freeze");
        animateHead.setAttribute("path", pathData);
        animateHead.setAttribute("begin", `${delay}ms`);
        cometHead.appendChild(animateHead.cloneNode(true));
        cometCore.appendChild(animateHead.cloneNode(true));
        
        // Agregar al grupo del datapath (importante para que el zoom funcione)
        svgGroup.appendChild(cometGroup);
        
        // Iniciar animación después del delay
        setTimeout(() => {
            cometGroup.style.opacity = "1";
            
            // Animar el dibujo del rastro
            trail.animate([
                { strokeDashoffset: pathLength },
                { strokeDashoffset: 0 }
            ], {
                duration: duracion,
                easing: 'linear',
                fill: 'forwards'
            });
            
            // El rastro desvanecido aparece un poco después
            setTimeout(() => {
                trailFade.animate([
                    { strokeDashoffset: pathLength },
                    { strokeDashoffset: 0 }
                ], {
                    duration: duracion * 0.8,
                    easing: 'linear',
                    fill: 'forwards'
                });
            }, duracion * 0.1);
            
        }, delay);
        
        // Desvanecer la cabeza al final
        setTimeout(() => {
            cometHead.animate([
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(0.3)' }
            ], {
                duration: 300,
                easing: 'ease-out',
                fill: 'forwards'
            });
            cometCore.animate([
                { opacity: 1 },
                { opacity: 0 }
            ], {
                duration: 300,
                fill: 'forwards'
            });
        }, delay + duracion);
        
        // Guardar referencia para limpieza
        if (!this.activeComets) this.activeComets = [];
        this.activeComets.push(cometGroup);
        
        // Marcar el cable original como activo
        setTimeout(() => {
            wire.classList.add('wire-active', 'wire-traced');
            wire.style.stroke = color;
            wire.style.strokeWidth = '3px';
            wire.style.opacity = '0.6';
            wire.style.filter = `drop-shadow(0 0 4px ${color})`;
        }, delay + duracion);
        
        return cometGroup;
    }
    
    // Convertir puntos de polyline a path para animateMotion
    polylineToPath(points) {
        const pointArray = points.trim().split(/\s+/).map(p => {
            const coords = p.split(',');
            return { x: parseFloat(coords[0]), y: parseFloat(coords[1]) };
        });
        
        if (pointArray.length === 0) return "";
        
        let path = `M ${pointArray[0].x},${pointArray[0].y}`;
        for (let i = 1; i < pointArray.length; i++) {
            path += ` L ${pointArray[i].x},${pointArray[i].y}`;
        }
        return path;
    }
    
    // Animar secuencia con efecto cometa ramificado
    animarSecuencia(etapas, claseColor) {
        // Limpiar todo antes
        this.limpiarCables();
        
        const color = this.obtenerColorTipo(claseColor);
        const duracionBase = Math.max(400, Math.min(800, this.executionDelay / etapas.length));
        
        let tiempoAcumulado = 0;
        
        etapas.forEach((grupoCables, etapaIndex) => {
            // Cada cable del grupo inicia casi al mismo tiempo (efecto ramificación)
            grupoCables.forEach((nombreLogico, cableIndex) => {
                const info = this.wireMap[nombreLogico];
                if (info && info.ids) {
                    info.ids.forEach(idFisico => {
                        // Pequeño delay entre cables del mismo grupo para efecto cascada
                        const delayInterno = cableIndex * 80;
                        
                        const t = setTimeout(() => {
                            this.animarCometaEnCable(idFisico, color, duracionBase, 0);
                            
                            // Añadir clase de tipo al cable
                            const wire = document.getElementById(idFisico);
                            if (wire) {
                                setTimeout(() => {
                                    wire.classList.add(claseColor);
                                }, duracionBase);
                            }
                        }, tiempoAcumulado + delayInterno);
                        
                        this.currentTimeouts.push(t);
                    });
                }
            });
            
            // Tiempo para la siguiente etapa
            tiempoAcumulado += duracionBase + 100;
        });
    }
    
    limpiarEstilosCables() {
        // Limpiar cables
        Object.values(this.wireMap).forEach(info => {
            if (info.ids) {
                info.ids.forEach(idFisico => {
                    const el = document.getElementById(idFisico);
                    if (el) {
                        el.classList.remove(
                            'wire-active', 
                            'wire-traced',
                            'wire-type-r',
                            'wire-type-i',
                            'wire-type-l',
                            'wire-type-s',
                            'wire-type-b'
                        );
                        el.style.stroke = '';
                        el.style.strokeWidth = '';
                        el.style.opacity = '';
                        el.style.filter = '';
                        el.style.strokeDasharray = '';
                        el.style.strokeDashoffset = '';
                    }
                });
            }
        });
        
        // Remover todos los grupos de cometas
        const comets = document.querySelectorAll('.comet-group');
        comets.forEach(c => c.remove());
        
        if (this.activeComets) {
            this.activeComets.forEach(c => {
                if (c.parentNode) c.remove();
            });
            this.activeComets = [];
        }
    }
    
    limpiarCables() {
        this.currentTimeouts.forEach(t => clearTimeout(t));
        this.currentTimeouts = [];
        this.limpiarEstilosCables();
    }
    
    resaltarModulosActivos(listaActivos) {
        this.todosLosModulos.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (listaActivos.includes(id)) {
                    el.classList.remove('module-dimmed');
                    el.classList.add('module-active');
                } else {
                    el.classList.add('module-dimmed');
                    el.classList.remove('module-active');
                }
            }
        });
    }
    
    // ============================================
    // UI
    // ============================================
    
    updatePCDisplay() {
        const pcElement = document.getElementById('pcValue');
        const pcElementTop = document.getElementById('pcValueTop');
        if (pcElement) pcElement.textContent = this.pc;
        if (pcElementTop) pcElementTop.textContent = this.pc;
    }
    
    updateCurrentInstruction() {
        const elem = document.getElementById('currentInstruction');
        const elemTop = document.getElementById('currentInstrTop');
        const text = this.currentInstruction ? this.currentInstruction.raw : 'Sin instrucción';
        
        if (elem) {
            elem.textContent = text;
            if (this.currentInstruction) {
                elem.classList.add('instruction-highlight');
                setTimeout(() => elem.classList.remove('instruction-highlight'), 500);
            }
        }
        if (elemTop) {
            elemTop.textContent = text;
        }
    }
    
    updateRegisterDisplay() {
        const container = document.getElementById('registerList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Nombres ABI para los registros
        const abiNames = [
            'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
            's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
            'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
            's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'
        ];
        
        // Mostrar TODOS los 32 registros
        for (let i = 0; i < 32; i++) {
            const div = document.createElement('div');
            div.className = 'register-item';
            
            const value = this.registers[i];
            
            // Clases según estado
            if (i === 0) {
                div.classList.add('reg-zero');
            } else if (value !== 0) {
                div.classList.add('reg-nonzero');
            }
            
            if (i === this.lastModifiedRegister) {
                div.classList.add('reg-updated');
            }
            
            div.innerHTML = `
                <span class="register-name">x${i}</span>
                <span class="register-value">${value}</span>
            `;
            div.title = `${abiNames[i]} (x${i}) = ${value}`;
            
            container.appendChild(div);
        }
    }
    
    updateMemoryDisplay() {
        const container = document.getElementById('memoryList');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Mostrar las primeras 32 posiciones de memoria (128 bytes)
        const memToShow = 32;
        
        for (let i = 0; i < memToShow && i < this.memory.length; i++) {
            const div = document.createElement('div');
            div.className = 'memory-item';
            
            const value = this.memory[i];
            const addr = i * 4;
            
            if (value === 0) {
                div.classList.add('mem-zero');
            } else {
                div.classList.add('mem-nonzero');
            }
            
            if (i === this.lastModifiedMemory) {
                div.classList.add('mem-updated');
            }
            
            div.innerHTML = `
                <span class="memory-addr">${addr}</span>
                <span class="memory-value">${value}</span>
            `;
            div.title = `Dirección ${addr} (índice ${i}) = ${value}`;
            
            container.appendChild(div);
        }
    }
    
    addLog(message, type = '') {
        const container = document.getElementById('executionLog');
        if (!container) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
        
        // Limitar entradas del log
        while (container.children.length > 50) {
            container.removeChild(container.firstChild);
        }
    }
    
    // ============================================
    // UTILIDADES
    // ============================================
    
    toHex(num) { 
        return (num >>> 0).toString(16).toUpperCase().padStart(8, '0'); 
    }
    
    toBin(num) { 
        return (num >>> 0).toString(2).padStart(32, '0'); 
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

let simulator;

window.addEventListener('DOMContentLoaded', () => {
    simulator = new RISCVSimulatorRedesigned();
    
    const exampleCode = `
addi x5, x0, 10
addi x6, x0, 0
addi x7, x0, 1
add x6, x6, x7
addi x7, x7, 1
bne x7, x5, -8
sw x6, 0(x0)
lw x10, 0(x0)`;
    
    document.getElementById('codeEditor').value = exampleCode;
});