// Table Plan Editor JavaScript

// Sicherheits-Utilities
class SecurityUtils {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return String(input);
        return input
            .replace(/[<>'"&]/g, (char) => {
                const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
                return map[char];
            })
            .trim();
    }

    static validateNumber(value, min = 0, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max ? num : null;
    }

    static generateId() {
        return 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Database API Integration
class DatabaseAPI {
    constructor(baseUrl = './api') {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        let url;
        
        // Korrekte URL-Konstruktion für verschiedene Endpunkte
        if (endpoint === '/layouts') {
            url = `${this.baseUrl}/layouts.php`;
        } else if (endpoint.startsWith('/layouts/')) {
            // /layouts/4 wird zu layouts.php?id=4
            const id = endpoint.split('/')[2];
            url = `${this.baseUrl}/layouts.php?id=${id}`;
        } else {
            url = `${this.baseUrl}${endpoint}`;
            if (!url.includes('.php')) {
                url += '.php';
            }
        }
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data.data;
        } catch (error) {
            console.error(`API Request failed: ${url}`, error);
            throw new Error(`Netzwerkfehler: ${error.message}`);
        }
    }

    async getLayouts() { return await this.request('/layouts'); }
    async getLayout(layoutId) { return await this.request(`/layouts/${layoutId}`); }
    async saveLayout(layoutData) { return await this.request('/layouts', { method: 'POST', body: JSON.stringify(layoutData) }); }
    async updateLayout(layoutId, layoutData) { return await this.request(`/layouts/${layoutId}`, { method: 'PUT', body: JSON.stringify(layoutData) }); }
    async deleteLayout(layoutId) { return await this.request(`/layouts/${layoutId}`, { method: 'DELETE' }); }
}

// Canvas Manager für Zoom und Pan-Funktionalität
class CanvasManager {
    constructor() {
        this.canvas = null;
        this.wrapper = null;
        this.zoom = 1;
        this.roomWidth = 10; // Meter
        this.roomHeight = 8; // Meter
        this.pixelsPerMeter = 50; // Default: 1m = 50px
        this.gridVisible = true;
        this.maxZoom = 3;
        this.minZoom = 0.2;
    }

    init(canvasElement, wrapperElement) {
        this.canvas = canvasElement;
        this.wrapper = wrapperElement;
        this.updateCanvasSize();
        this.updateScale();
    }

    updateCanvasSize() {
        if (!this.canvas) return;
        
        const width = this.roomWidth * this.pixelsPerMeter;
        const height = this.roomHeight * this.pixelsPerMeter;
        
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }

    setRoomSize(width, height) {
        this.roomWidth = Math.max(1, Math.min(100, width));
        this.roomHeight = Math.max(1, Math.min(100, height));
        this.updateCanvasSize();
        this.updateScale();
    }

    setZoom(newZoom) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        if (this.canvas) {
            this.canvas.style.transform = `scale(${this.zoom})`;
            this.canvas.style.transformOrigin = 'top left';
        }
        
        this.updateScale();
        
        // Scroll-Position anpassen, um zentriert zu bleiben
        if (this.wrapper && oldZoom !== this.zoom) {
            const rect = this.wrapper.getBoundingClientRect();
            const centerX = this.wrapper.scrollLeft + rect.width / 2;
            const centerY = this.wrapper.scrollTop + rect.height / 2;
            
            const zoomRatio = this.zoom / oldZoom;
            this.wrapper.scrollLeft = centerX * zoomRatio - rect.width / 2;
            this.wrapper.scrollTop = centerY * zoomRatio - rect.height / 2;
        }
    }

    zoomIn() {
        this.setZoom(this.zoom * 1.2);
    }

    zoomOut() {
        this.setZoom(this.zoom / 1.2);
    }

    fitToView() {
        if (!this.wrapper || !this.canvas) return;
        
        const rect = this.wrapper.getBoundingClientRect();
        const canvasWidth = this.roomWidth * this.pixelsPerMeter;
        const canvasHeight = this.roomHeight * this.pixelsPerMeter;
        
        const scaleX = (rect.width - 80) / canvasWidth; // 40px Margin auf jeder Seite
        const scaleY = (rect.height - 80) / canvasHeight;
        const scale = Math.min(scaleX, scaleY, this.maxZoom);
        
        this.setZoom(Math.max(scale, this.minZoom));
        
        // Zentrieren
        setTimeout(() => {
            if (this.wrapper) {
                const scaledWidth = canvasWidth * this.zoom;
                const scaledHeight = canvasHeight * this.zoom;
                
                this.wrapper.scrollLeft = (scaledWidth - rect.width) / 2;
                this.wrapper.scrollTop = (scaledHeight - rect.height) / 2;
            }
        }, 50);
    }

    metersToPixels(meters) {
        return meters * this.pixelsPerMeter * this.zoom;
    }

    pixelsToMeters(pixels) {
        return pixels / (this.pixelsPerMeter * this.zoom);
    }

    updateScale() {
        const scaleElement = document.getElementById('scaleInfo');
        const zoomElement = document.getElementById('zoomLevel');
        
        if (scaleElement) {
            const scale = Math.round(100 / this.zoom);
            scaleElement.textContent = `1:${scale}`;
        }
        
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        if (this.canvas) {
            this.canvas.classList.toggle('grid-background', this.gridVisible);
        }
    }

    getMousePosition(e) {
        if (!this.canvas || !this.wrapper) return { x: 0, y: 0 };
        
        const rect = this.canvas.getBoundingClientRect();
        const wrapperRect = this.wrapper.getBoundingClientRect();
        
        return {
            x: (e.clientX - rect.left) / this.zoom,
            y: (e.clientY - rect.top) / this.zoom
        };
    }

    updateCoordinates(x, y) {
        const coordElement = document.getElementById('coordinates');
        if (coordElement) {
            const metersX = (x / this.pixelsPerMeter).toFixed(1);
            const metersY = (y / this.pixelsPerMeter).toFixed(1);
            coordElement.textContent = `X: ${metersX}m, Y: ${metersY}m`;
        }
    }
}

// Table Manager für Tisch-Operationen
class TableManager {
    constructor(canvasManager, api) {
        this.canvasManager = canvasManager;
        this.api = api;
        this.tables = new Map();
        this.selectedTable = null;
        this.draggedTable = null;
        this.dragOffset = { x: 0, y: 0 };
        this.tempPosition = null;
        this.copiedFormat = null;
        this.collisionDetection = true;
        this.collisionMargin = 2;
        this.nextTableNumber = 1;
    }

    addTable(tableData) {
        const table = {
            id: SecurityUtils.generateId(),
            number: SecurityUtils.sanitizeInput(tableData.number || `T${this.nextTableNumber++}`),
            shape: tableData.shape || 'rectangle',
            width: SecurityUtils.validateNumber(tableData.width, 30, 300) || 80,
            height: SecurityUtils.validateNumber(tableData.height, 30, 300) || 80,
            x: SecurityUtils.validateNumber(tableData.x, 0, 2000) || 50,
            y: SecurityUtils.validateNumber(tableData.y, 0, 2000) || 50,
            rotation: SecurityUtils.validateNumber(tableData.rotation, -180, 180) || 0
        };

        this.tables.set(table.id, table);
        this.createTableElement(table);
        this.showNotification('Tisch hinzugefügt!', 'success');
        return table;
    }

    createTableElement(table) {
        if (!this.canvasManager.canvas) return;

        const element = document.createElement('div');
        element.className = 'table-item' + (table.shape === 'round' ? ' round' : '');
        element.textContent = table.number;
        element.dataset.tableId = table.id;
        
        this.updateTableElement(element, table);
        
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectTable(table.id);
        });
        
        this.canvasManager.canvas.appendChild(element);
    }

    updateTableElement(element, table) {
        if (!element) return;
        
        const widthPx = this.canvasManager.metersToPixels(table.width / 100);
        const heightPx = this.canvasManager.metersToPixels(table.height / 100);
        
        element.style.height = Math.max(15, heightPx) + 'px';
        element.style.width = Math.max(15, widthPx) + 'px';
        element.style.left = table.x + 'px';
        element.style.top = table.y + 'px';
        element.style.transform = `rotate(${table.rotation}deg)`;
        element.textContent = table.number;
        
        const avgSize = (widthPx + heightPx) / 2;
        if (avgSize < 25) {
            element.style.fontSize = '8px';
        } else if (avgSize < 40) {
            element.style.fontSize = '10px';
        } else {
            element.style.fontSize = '12px';
        }
    }

    selectTable(tableId) {
        if (this.selectedTable) {
            const prevElement = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.selectedTable}"]`);
            if (prevElement) prevElement.classList.remove('selected');
        }

        this.selectedTable = tableId;
        const table = this.tables.get(tableId);
        const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${tableId}"]`);
        
        if (element && table) {
            element.classList.add('selected');
            this.showTableControls(table);
        }
    }

    showTableControls(table) {
        const infoElement = document.getElementById('selectedTableInfo');
        const controlsElement = document.getElementById('selectedTableControls');
        
        if (infoElement) infoElement.style.display = 'none';
        if (controlsElement) controlsElement.style.display = 'block';
        
        const numberInput = document.getElementById('selectedTableNumber');
        const widthInput = document.getElementById('selectedTableWidth');
        const heightInput = document.getElementById('selectedTableHeight');
        const rotationInput = document.getElementById('selectedTableRotation');
        
        if (numberInput) numberInput.value = table.number;
        if (widthInput) widthInput.value = table.width;
        if (heightInput) heightInput.value = table.height;
        
        let displayRotation = table.rotation;
        if (displayRotation > 180) {
            displayRotation = displayRotation - 360;
        }
        if (rotationInput) rotationInput.value = displayRotation;
        
        // Enter-Taste Event-Listener für alle Eingabefelder
        [numberInput, widthInput, heightInput, rotationInput].forEach(input => {
            if (input) {
                // Alte Event-Listener entfernen
                input.removeEventListener('keypress', this.handleEnterPress);
                // Neue Event-Listener hinzufügen
                input.addEventListener('keypress', this.handleEnterPress.bind(this));
            }
        });
    }

    handleEnterPress(e) {
        if (e.key === 'Enter') {
            this.updateSelectedTable();
        }
    }

    updateSelectedTable() {
        if (!this.selectedTable) return;

        const table = this.tables.get(this.selectedTable);
        const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.selectedTable}"]`);
        
        if (!table || !element) return;

        const numberInput = document.getElementById('selectedTableNumber');
        const widthInput = document.getElementById('selectedTableWidth');
        const heightInput = document.getElementById('selectedTableHeight');
        const rotationInput = document.getElementById('selectedTableRotation');

        if (numberInput?.value) table.number = SecurityUtils.sanitizeInput(numberInput.value);
        if (widthInput?.value) {
            const width = SecurityUtils.validateNumber(widthInput.value, 30, 300);
            if (width) table.width = width;
        }
        if (heightInput?.value) {
            const height = SecurityUtils.validateNumber(heightInput.value, 30, 300);
            if (height) table.height = height;
        }
        if (rotationInput?.value) {
            let rotation = SecurityUtils.validateNumber(rotationInput.value, -180, 180);
            if (rotation !== null) {
                if (rotation < 0) rotation += 360;
                table.rotation = rotation;
            }
        }

        this.updateTableElement(element, table);
        this.showNotification('Tisch aktualisiert!', 'success');
    }

    deleteSelectedTable() {
        if (!this.selectedTable) return;

        const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.selectedTable}"]`);
        if (element) element.remove();
        
        this.tables.delete(this.selectedTable);
        this.selectedTable = null;
        
        const infoElement = document.getElementById('selectedTableInfo');
        const controlsElement = document.getElementById('selectedTableControls');
        
        if (infoElement) infoElement.style.display = 'block';
        if (controlsElement) controlsElement.style.display = 'none';
        
        this.showNotification('Tisch gelöscht!', 'success');
    }

    checkCollision(excludeTableId, x, y, width, height) {
        if (!this.collisionDetection) return false;
        
        const margin = this.collisionMargin;
        const rect1 = {
            left: x - margin,
            top: y - margin,
            right: x + width + margin,
            bottom: y + height + margin
        };
        
        for (const [tableId, table] of this.tables) {
            if (tableId === excludeTableId) continue;
            
            const tableWidthPx = this.canvasManager.metersToPixels(table.width / 100);
            const tableHeightPx = this.canvasManager.metersToPixels(table.height / 100);
            
            const rect2 = {
                left: table.x,
                top: table.y,
                right: table.x + tableWidthPx,
                bottom: table.y + tableHeightPx
            };
            
            if (rect1.left < rect2.right && rect1.right > rect2.left &&
                rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
                return true;
            }
        }
        
        return false;
    }

    handleMouseDown(e, tableId) {
        if (e.button !== 0) return; // Nur linke Maustaste
        
        this.draggedTable = tableId;
        this.selectTable(tableId);
        
        const element = e.target;
        const rect = element.getBoundingClientRect();
        const canvasRect = this.canvasManager.canvas.getBoundingClientRect();
        
        this.dragOffset = {
            x: (e.clientX - rect.left) / this.canvasManager.zoom,
            y: (e.clientY - rect.top) / this.canvasManager.zoom
        };
        
        element.style.zIndex = '1000';
        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.draggedTable || !this.canvasManager.canvas) return;
        
        const mousePos = this.canvasManager.getMousePosition(e);
        const table = this.tables.get(this.draggedTable);
        const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.draggedTable}"]`);
        
        if (!table || !element) return;
        
        let newX = mousePos.x - this.dragOffset.x;
        let newY = mousePos.y - this.dragOffset.y;
        
        // Canvas-Grenzen berücksichtigen
        const widthPx = this.canvasManager.metersToPixels(table.width / 100);
        const heightPx = this.canvasManager.metersToPixels(table.height / 100);
        const canvasWidth = this.canvasManager.roomWidth * this.canvasManager.pixelsPerMeter;
        const canvasHeight = this.canvasManager.roomHeight * this.canvasManager.pixelsPerMeter;
        
        const clampedX = Math.max(0, Math.min(newX, canvasWidth - widthPx));
        const clampedY = Math.max(0, Math.min(newY, canvasHeight - heightPx));
        
        // Kollisionsprüfung
        const hasCollision = this.checkCollision(this.draggedTable, clampedX, clampedY, widthPx, heightPx);
        
        if (hasCollision) {
            element.style.borderColor = 'var(--danger-color)';
            element.style.opacity = '0.6';
        } else {
            element.style.borderColor = 'var(--primary-color)';
            element.style.opacity = '0.8';
        }

        // Position immer visuell aktualisieren (auch bei Kollision)
        element.style.left = clampedX + 'px';
        element.style.top = clampedY + 'px';
        
        // Temporäre Position für Kollisionsprüfung beim Loslassen
        this.tempPosition = { x: clampedX, y: clampedY };
        
        e.preventDefault();
    }

    handleMouseUp() {
        if (this.draggedTable) {
            const table = this.tables.get(this.draggedTable);
            const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.draggedTable}"]`);
            
            if (table && element && this.tempPosition) {
                const widthPx = this.canvasManager.metersToPixels(table.width / 100);
                const heightPx = this.canvasManager.metersToPixels(table.height / 100);
                
                // Kollisionsprüfung beim Loslassen
                if (this.checkCollision(this.draggedTable, this.tempPosition.x, this.tempPosition.y, widthPx, heightPx)) {
                    // Kollision! Position zurücksetzen
                    element.style.left = table.x + 'px';
                    element.style.top = table.y + 'px';
                    element.style.borderColor = 'var(--primary-color)';
                    element.style.opacity = '1';
                    this.showNotification('Position blockiert - Kollision erkannt!', 'warning');
                } else {
                    // Kein Kollision - Position speichern
                    table.x = this.tempPosition.x;
                    table.y = this.tempPosition.y;
                    element.style.borderColor = 'var(--primary-color)';
                    element.style.opacity = '1';
                }
                
                element.style.zIndex = '';
                this.canvasManager.updateCoordinates(table.x, table.y);
            }
            
            this.draggedTable = null;
            this.tempPosition = null;
        }
    }

    addTableInGrid(startX, startY, count, shape, width, height) {
        const spacingX = width + 20; // 20cm Abstand
        const spacingY = height + 20;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        let tableCount = 0;
        for (let row = 0; row < rows && tableCount < count; row++) {
            for (let col = 0; col < cols && tableCount < count; col++) {
                const x = (startX + col * spacingX) % (this.canvasManager.roomWidth * 100);
                const y = (startY + row * spacingY) % (this.canvasManager.roomHeight * 100);
                
                this.addTable({
                    number: `T${this.nextTableNumber}`,
                    shape: shape,
                    width: width,
                    height: height,
                    x: (x / 100) * this.canvasManager.pixelsPerMeter,
                    y: (y / 100) * this.canvasManager.pixelsPerMeter
                });
                
                tableCount++;
            }
        }
    }

    arrangeTablesInPattern(pattern) {
        const tables = Array.from(this.tables.values());
        if (tables.length === 0) return;
        
        const canvasWidth = this.canvasManager.roomWidth * this.canvasManager.pixelsPerMeter;
        const canvasHeight = this.canvasManager.roomHeight * this.canvasManager.pixelsPerMeter;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        let positions = [];
        
        switch (pattern) {
            case 'circle':
                positions = this.generateCirclePositions(tables.length, centerX, centerY, Math.min(canvasWidth, canvasHeight) * 0.3);
                break;
            case 'grid':
                positions = this.generateGridPositions(tables.length, canvasWidth, canvasHeight);
                break;
            case 'rows':
                positions = this.generateRowPositions(tables.length, canvasWidth, canvasHeight);
                break;
        }
        
        tables.forEach((table, index) => {
            if (positions[index]) {
                table.x = positions[index].x;
                table.y = positions[index].y;
                
                const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${table.id}"]`);
                if (element) {
                    this.updateTableElement(element, table);
                }
            }
        });
        
        this.showNotification(`Tische in ${pattern}-Anordnung arrangiert!`, 'success');
    }

    generateCirclePositions(count, centerX, centerY, radius) {
        const positions = [];
        const angleStep = (2 * Math.PI) / count;
        
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            positions.push({
                x: centerX + Math.cos(angle) * radius - 40, // -40 für Tischzentrum
                y: centerY + Math.sin(angle) * radius - 40
            });
        }
        
        return positions;
    }

    generateGridPositions(count, canvasWidth, canvasHeight) {
        const positions = [];
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        
        const stepX = (canvasWidth - 80) / cols; // 80px Margin
        const stepY = (canvasHeight - 80) / rows;
        
        for (let i = 0; i < count; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            positions.push({
                x: 40 + col * stepX,
                y: 40 + row * stepY
            });
        }
        
        return positions;
    }

    generateRowPositions(count, canvasWidth, canvasHeight) {
        const positions = [];
        const stepSize = 100; // 100px zwischen Tischen
        const directions = [
            { x: 1, y: 0 },   // rechts
            { x: 0, y: 1 },   // unten
            { x: -1, y: 0 },  // links
            { x: 0, y: -1 }   // oben
        ];
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        positions.push({ x: centerX, y: centerY });
        
        if (count > 1) {
            directions.forEach(dir => {
                for (let i = 1; i < Math.ceil(count / 4) + 1 && positions.length < count; i++) {
                    positions.push({
                        x: centerX + (dir.x * i * stepSize),
                        y: centerY + (dir.y * i * stepSize)
                    });
                }
            });
        }
        
        return positions;
    }

    clearAll() {
        if (this.canvasManager.canvas) {
            this.canvasManager.canvas.innerHTML = '';
        }
        this.tables.clear();
        this.selectedTable = null;
        
        const infoElement = document.getElementById('selectedTableInfo');
        const controlsElement = document.getElementById('selectedTableControls');
        
        if (infoElement) infoElement.style.display = 'block';
        if (controlsElement) controlsElement.style.display = 'none';
    }

    getAllTables() {
        return Array.from(this.tables.values());
    }

    loadTables(tablesData) {
        this.clearAll();
        tablesData.forEach(tableData => {
            this.tables.set(tableData.id, tableData);
            this.createTableElement(tableData);
        });
    }

    showNotification(message, type) {
        if (window.layoutManager && window.layoutManager.showNotification) {
            window.layoutManager.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    toggleCollisionDetection() {
        this.collisionDetection = !this.collisionDetection;
        
        const textElement = document.getElementById('collisionText');
        if (textElement) {
            textElement.textContent = `Kollision: ${this.collisionDetection ? 'Ein' : 'Aus'}`;
        }
        
        const button = document.getElementById('toggleCollision');
        if (button) {
            button.style.backgroundColor = this.collisionDetection ? 'var(--success-color)' : 'var(--warning-color)';
        }
    }

    setCollisionMargin(margin) {
        this.collisionMargin = Math.max(0, Math.min(10, margin)); // 0-10px
        this.showNotification(`Kollisions-Abstand: ${this.collisionMargin}px`, 'info');
    }

    copyTableFormat() {
        if (!this.selectedTable) return;
        
        const table = this.tables.get(this.selectedTable);
        if (!table) return;
        
        this.copiedFormat = {
            width: table.width,
            height: table.height,
            rotation: table.rotation,
            shape: table.shape
        };
        
        const pasteBtn = document.getElementById('pasteTableFormat');
        if (pasteBtn) pasteBtn.disabled = false;
        
        this.showNotification('Tisch-Format kopiert!', 'success');
    }

    pasteTableFormat() {
        if (!this.selectedTable || !this.copiedFormat) return;
        
        const table = this.tables.get(this.selectedTable);
        const element = this.canvasManager.canvas?.querySelector(`[data-table-id="${this.selectedTable}"]`);
        
        if (!table || !element) return;

        table.width = this.copiedFormat.width;
        table.height = this.copiedFormat.height;
        table.rotation = this.copiedFormat.rotation;
        table.shape = this.copiedFormat.shape;

        element.className = 'table-item' + (table.shape === 'round' ? ' round' : '');
        this.updateTableElement(element, table);
        this.showTableControls(table);
        this.showNotification('Tisch-Format eingefügt!', 'success');
    }
}

// Layout Manager für Layout-Speicherung und -Verwaltung
class LayoutManager {
    constructor(tableManager, api) {
        this.tableManager = tableManager;
        this.api = api;
        this.layouts = new Map();
        this.isLoading = false;
    }

    async saveLayout() {
        const nameInput = document.getElementById('layoutName');
        const name = nameInput?.value?.trim();
        
        if (!name) {
            this.showNotification('Bitte geben Sie einen Layout-Namen ein!', 'warning');
            return;
        }

        if (this.isLoading) {
            this.showNotification('Speicherung läuft bereits...', 'warning');
            return;
        }

        try {
            this.setLoading(true);
            
            const roomWidthInput = document.getElementById('roomWidth');
            const roomHeightInput = document.getElementById('roomHeight');
            
            const layoutData = {
                name: name,
                roomWidth: SecurityUtils.validateNumber(roomWidthInput?.value, 1, 100) || 10,
                roomHeight: SecurityUtils.validateNumber(roomHeightInput?.value, 1, 100) || 8,
                createdBy: 'system',
                tables: this.tableManager.getAllTables()
            };

            const result = await this.api.saveLayout(layoutData);
            
            const newLayout = {
                id: result.id,
                name: layoutData.name,
                roomWidth: layoutData.roomWidth,
                roomHeight: layoutData.roomHeight,
                tableCount: layoutData.tables.length,
                created: new Date().toISOString(),
                createdBy: layoutData.createdBy
            };
            
            this.layouts.set(result.id, newLayout);
            this.renderLayoutList();
            
            if (nameInput) nameInput.value = '';
            this.showNotification('Layout erfolgreich gespeichert!', 'success');
            
        } catch (error) {
            console.error('Save layout error:', error);
            this.showNotification(`Fehler beim Speichern: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async loadLayout(layoutId) {
        if (this.isLoading) return;

        try {
            this.setLoading(true);
            
            const layoutData = await this.api.getLayout(layoutId);
            
            if (layoutData) {
                // Raumgröße setzen
                this.tableManager.canvasManager.setRoomSize(layoutData.roomWidth || 10, layoutData.roomHeight || 8);
                
                // Eingabefelder aktualisieren
                const roomWidthInput = document.getElementById('roomWidth');
                const roomHeightInput = document.getElementById('roomHeight');
                if (roomWidthInput) roomWidthInput.value = layoutData.roomWidth || 10;
                if (roomHeightInput) roomHeightInput.value = layoutData.roomHeight || 8;
                
                // Tische laden
                this.tableManager.loadTables(layoutData.tables || []);
                
                this.showNotification('Layout erfolgreich geladen!', 'success');
            }
            
        } catch (error) {
            console.error('Load layout error:', error);
            this.showNotification(`Fehler beim Laden: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteLayout(layoutId) {
        if (!confirm('Layout wirklich löschen?')) return;
        
        try {
            await this.api.deleteLayout(layoutId);
            this.layouts.delete(layoutId);
            this.renderLayoutList();
            this.showNotification('Layout gelöscht!', 'success');
        } catch (error) {
            console.error('Delete layout error:', error);
            this.showNotification(`Fehler beim Löschen: ${error.message}`, 'error');
        }
    }

    async loadLayoutList() {
        try {
            const layouts = await this.api.getLayouts();
            this.layouts.clear();
            
            if (Array.isArray(layouts)) {
                layouts.forEach(layout => {
                    this.layouts.set(layout.id, layout);
                });
            }
            
            this.renderLayoutList();
        } catch (error) {
            console.error('Load layout list error:', error);
            this.showNotification('Fehler beim Laden der Layout-Liste', 'error');
        }
    }

    renderLayoutList() {
        const container = document.getElementById('layoutList');
        if (!container) return;
        
        if (this.layouts.size === 0) {
            container.innerHTML = '<p style="padding: 12px; color: var(--text-secondary); font-size: 14px; text-align: center;">Keine Layouts vorhanden</p>';
            return;
        }
        
        const layoutsArray = Array.from(this.layouts.values()).sort((a, b) => 
            new Date(b.created || 0) - new Date(a.created || 0)
        );
        
        container.innerHTML = layoutsArray.map(layout => `
            <div class="layout-item">
                <div>
                    <strong>${SecurityUtils.sanitizeInput(layout.name)}</strong><br>
                    <small style="color: var(--text-secondary);">
                        ${layout.tableCount || 0} Tische, 
                        ${layout.roomWidth || 0}×${layout.roomHeight || 0}m
                    </small>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-primary btn-sm" onclick="window.layoutManager.loadLayout(${layout.id})" title="Laden">
                        📂
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="window.layoutManager.deleteLayout(${layout.id})" title="Löschen">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    setLoading(loading) {
        this.isLoading = loading;
        // Loading-Status UI könnte hier implementiert werden
    }

    showNotification(message, type = 'info') {
        // Einfache Alert-basierte Notification - kann später durch Toast ersetzt werden
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Temporäre Implementierung mit alert für wichtige Meldungen
        if (type === 'error') {
            alert(`Fehler: ${message}`);
        } else if (type === 'warning') {
            alert(`Warnung: ${message}`);
        }
        // Success und info werden nur in Console geloggt
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisiere Tischplan-Editor...');
    
    // Manager-Instanzen erstellen
    const canvasManager = new CanvasManager();
    const api = new DatabaseAPI();
    const tableManager = new TableManager(canvasManager, api);
    const layoutManager = new LayoutManager(tableManager, api);
    
    // Globale Referenzen für Event-Handler
    window.canvasManager = canvasManager;
    window.tableManager = tableManager;
    window.layoutManager = layoutManager;
    
    // DOM-Elemente initialisieren
    setTimeout(() => {
        const canvasElement = document.getElementById('canvas');
        const wrapperElement = document.getElementById('canvasWrapper');
        
        if (canvasElement && wrapperElement) {
            canvasManager.init(canvasElement, wrapperElement);
            console.log('Canvas initialisiert');
        }
        
        // Event-Listener für UI-Elemente
        const updateRoomBtn = document.getElementById('updateRoom');
        const addTableBtn = document.getElementById('addTable');
        const clearCanvasBtn = document.getElementById('clearCanvas');
        const toggleGridBtn = document.getElementById('toggleGrid');
        const toggleCollisionBtn = document.getElementById('toggleCollision');
        const saveLayoutBtn = document.getElementById('saveLayout');
        const updateSelectedTableBtn = document.getElementById('updateSelectedTable');
        const deleteSelectedTableBtn = document.getElementById('deleteSelectedTable');
        const copyTableFormatBtn = document.getElementById('copyTableFormat');
        const pasteTableFormatBtn = document.getElementById('pasteTableFormat');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomResetBtn = document.getElementById('zoomReset');
        
        if (updateRoomBtn) {
            updateRoomBtn.addEventListener('click', () => {
                const widthInput = document.getElementById('roomWidth');
                const heightInput = document.getElementById('roomHeight');
                const width = SecurityUtils.validateNumber(widthInput?.value, 1, 100) || 10;
                const height = SecurityUtils.validateNumber(heightInput?.value, 1, 100) || 8;
                canvasManager.setRoomSize(width, height);
            });
        }
        
        if (addTableBtn) {
            addTableBtn.addEventListener('click', () => {
                const numberInput = document.getElementById('tableNumber');
                const shapeSelect = document.getElementById('tableShape');
                const widthInput = document.getElementById('tableWidth');
                const heightInput = document.getElementById('tableHeight');
                
                tableManager.addTable({
                    number: numberInput?.value || '',
                    shape: shapeSelect?.value || 'rectangle',
                    width: SecurityUtils.validateNumber(widthInput?.value, 30, 300) || 80,
                    height: SecurityUtils.validateNumber(heightInput?.value, 30, 300) || 80
                });
                
                if (numberInput) numberInput.value = '';
            });
        }
        
        if (clearCanvasBtn) {
            clearCanvasBtn.addEventListener('click', () => {
                if (confirm('Alle Tische löschen?')) {
                    tableManager.clearAll();
                }
            });
        }
        
        if (toggleGridBtn) {
            toggleGridBtn.addEventListener('click', () => {
                canvasManager.toggleGrid();
            });
        }
        
        if (toggleCollisionBtn) {
            toggleCollisionBtn.addEventListener('click', () => {
                tableManager.toggleCollisionDetection();
            });
        }
        
        if (saveLayoutBtn) {
            saveLayoutBtn.addEventListener('click', () => {
                layoutManager.saveLayout();
            });
        }
        
        if (updateSelectedTableBtn) {
            updateSelectedTableBtn.addEventListener('click', () => {
                tableManager.updateSelectedTable();
            });
        }
        
        if (deleteSelectedTableBtn) {
            deleteSelectedTableBtn.addEventListener('click', () => {
                tableManager.deleteSelectedTable();
            });
        }
        
        if (copyTableFormatBtn) {
            copyTableFormatBtn.addEventListener('click', () => {
                tableManager.copyTableFormat();
            });
        }
        
        if (pasteTableFormatBtn) {
            pasteTableFormatBtn.addEventListener('click', () => {
                tableManager.pasteTableFormat();
            });
        }
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                canvasManager.zoomIn();
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                canvasManager.zoomOut();
            });
        }
        
        if (zoomResetBtn) {
            zoomResetBtn.addEventListener('click', () => {
                canvasManager.fitToView();
            });
        }
        
        // Mouse-Events für Drag & Drop
        let isDragging = false;
        
        if (canvasElement) {
            canvasElement.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('table-item')) {
                    const tableId = e.target.dataset.tableId;
                    if (tableId) {
                        tableManager.handleMouseDown(e, tableId);
                        isDragging = true;
                    }
                } else {
                    // Deselektieren wenn auf leeren Bereich geklickt wird
                    if (tableManager.selectedTable) {
                        const prevElement = canvasElement.querySelector(`[data-table-id="${tableManager.selectedTable}"]`);
                        if (prevElement) prevElement.classList.remove('selected');
                        tableManager.selectedTable = null;
                        
                        const infoElement = document.getElementById('selectedTableInfo');
                        const controlsElement = document.getElementById('selectedTableControls');
                        if (infoElement) infoElement.style.display = 'block';
                        if (controlsElement) controlsElement.style.display = 'none';
                    }
                }
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    tableManager.handleMouseMove(e);
                }
                
                // Koordinaten aktualisieren
                if (canvasElement.contains(e.target) || e.target === canvasElement) {
                    const mousePos = canvasManager.getMousePosition(e);
                    canvasManager.updateCoordinates(mousePos.x, mousePos.y);
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    tableManager.handleMouseUp();
                    isDragging = false;
                }
            });
            
            // Mouse-Wheel für Zoom
            canvasElement.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    canvasManager.setZoom(canvasManager.zoom * delta);
                }
            }, { passive: false }); // Explizit nicht-passiv für preventDefault()
        }

        // Canvas-Panning
        let isPanning = false;
        let panStart = { x: 0, y: 0 };
        let scrollStart = { x: 0, y: 0 };

        if (canvasManager.wrapper) {
            canvasManager.wrapper.addEventListener('mousedown', (e) => {
                if (e.target === canvasManager.canvas && !e.target.closest('.table-item')) {
                    isPanning = true;
                    panStart = { x: e.clientX, y: e.clientY };
                    scrollStart = { 
                        x: canvasManager.wrapper.scrollLeft, 
                        y: canvasManager.wrapper.scrollTop 
                    };
                    canvasManager.canvas.style.cursor = 'grabbing';
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (isPanning) {
                    const deltaX = e.clientX - panStart.x;
                    const deltaY = e.clientY - panStart.y;
                    canvasManager.wrapper.scrollLeft = scrollStart.x - deltaX;
                    canvasManager.wrapper.scrollTop = scrollStart.y - deltaY;
                }
            });

            document.addEventListener('mouseup', () => {
                if (isPanning) {
                    isPanning = false;
                    canvasManager.canvas.style.cursor = 'grab';
                }
            });
        }
        
        // HIER wird der Kollisions-Abstand-Regler Code eingefügt
        const collisionMarginSlider = document.getElementById('collisionMargin');
        const marginValueDisplay = document.getElementById('marginValue');

        if (collisionMarginSlider && marginValueDisplay && window.tableManager) {
            collisionMarginSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                window.tableManager.setCollisionMargin(value);
                marginValueDisplay.textContent = value + 'px';
            });
        }
        
        // Layout-Liste initial laden
        layoutManager.loadLayoutList();
        
    }, 100);
    
    console.log('Tischplan-Editor erfolgreich initialisiert');
});