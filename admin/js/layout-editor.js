// ============================================
// LAYOUT EDITOR - Bestellstation
// Kompletter Rewrite mit Backend-Integration
// ============================================

// Globale Konfiguration
const EditorConfig = {
    API_BASE: 'http://192.168.2.166:8080/api',
    CANVAS_WIDTH: 675,
    CANVAS_HEIGHT: 570,
    DEFAULT_BUTTON_WIDTH: 170,
    DEFAULT_BUTTON_HEIGHT: 100,
    DEFAULT_SPACING: 5
};

// Globaler State
const EditorState = {
    currentEventId: null,
    currentTab: 'tab1',
    selectedButton: null,
    selectedButtons: [],
    isDragging: false,
    draggedElement: null,
    dragStart: { x: 0, y: 0 },
    hasUnsavedChanges: false,
    formatCopyMode: false,
    copiedFormat: null,
    categories: {},
    tabColors: {},
    layoutData: {
        event_id: null,
        canvas: { width: 675, height: 570 },
        settings: {
            button_spacing: 5,
            min_button_size: 50,
            snap_to_grid: true,
            grid_size: 10,
            collision_detection: true
        },
        tabs: [
            { id: 'tab1', name: 'Hauptgerichte', visible: true, buttons: [] },
            { id: 'tab2', name: 'Einzeln', visible: true, buttons: [] }
        ]
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventHandlers();
    loadCategories();
    loadEvents();
    updateCanvasInfo();
    syncTabNames();
});

function initializeEventHandlers() {
    // Header
    document.getElementById('btnBack').addEventListener('click', handleBack);
    document.getElementById('btnSave').addEventListener('click', saveLayout);
    
    // Event Selection
    document.getElementById('btnLoadEvent').addEventListener('click', loadEventLayout);
    
    // Tab Navigation
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.closest('.tab-button').dataset.tab));
    });
    
    // Tab Names
    document.getElementById('tab1Name').addEventListener('input', handleTabNameChange);
    document.getElementById('tab2Name').addEventListener('input', handleTabNameChange);
    
    // Settings
    document.getElementById('snapToGrid').addEventListener('change', (e) => {
        EditorState.layoutData.settings.snap_to_grid = e.target.checked;
        markUnsaved();
    });
    
    document.getElementById('gridSize').addEventListener('change', (e) => {
        EditorState.layoutData.settings.grid_size = parseInt(e.target.value);
        markUnsaved();
    });
    
    document.getElementById('collisionDetection').addEventListener('change', (e) => {
        EditorState.layoutData.settings.collision_detection = e.target.checked;
        markUnsaved();
    });
    
    document.getElementById('spacingValue').addEventListener('change', (e) => {
        EditorState.layoutData.settings.button_spacing = parseInt(e.target.value);
        markUnsaved();
    });
    
    document.getElementById('minButtonSize').addEventListener('change', (e) => {
        EditorState.layoutData.settings.min_button_size = parseInt(e.target.value);
        markUnsaved();
    });
    
    // Format Copy
    document.getElementById('btnFormatCopy').addEventListener('click', toggleFormatCopyMode);
    
    // Label Modal
    document.getElementById('btnCancelLabel').addEventListener('click', closeLabelModal);
    document.getElementById('btnSaveLabel').addEventListener('click', saveLabelEdit);
    
    // Canvas Click für Deselect
    document.getElementById('canvas').addEventListener('click', (e) => {
        if (e.target.id === 'canvas') {
            deselectButton();
        }
    });
    
    // ESC zum Abbrechen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (EditorState.formatCopyMode) {
                deactivateFormatCopyMode();
            }
            if (!document.getElementById('editLabelModal').classList.contains('hidden')) {
                closeLabelModal();
            }
        }
    });
}

// ============================================
// CATEGORIES LADEN (Backend-Integration)
// ============================================

async function loadCategories() {
    try {
        const response = await fetch(`${EditorConfig.API_BASE}/categories`);
        const categories = await response.json();
        
        EditorState.categories = {};
        EditorState.tabColors = {};
        
        categories.forEach(cat => {
            EditorState.categories[cat.id] = {
                bg: cat.color_bg_inactive,
                text: cat.color_font_inactive || '#000000',
                border: darkenColor(cat.color_bg_inactive, 20)
            };
            
            // Tab-Farben: Wenn Category-Name = Tab-Name
            EditorState.tabColors[cat.name] = {
                bg: cat.color_bg_inactive,
                text: cat.color_font_inactive || '#000000'
            };
        });
        
        console.log('Categories geladen:', Object.keys(EditorState.categories).length);
        applyTabColors();
        
    } catch (error) {
        console.error('Fehler beim Laden der Categories:', error);
        setStatus('Fehler beim Laden der Kategorien', 'error');
    }
}

function darkenColor(hex, percent) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);
    
    return '#' + 
        r.toString(16).padStart(2, '0') + 
        g.toString(16).padStart(2, '0') + 
        b.toString(16).padStart(2, '0');
}

function applyTabColors() {
    EditorState.layoutData.tabs.forEach(tab => {
        const tabButton = document.querySelector(`[data-tab="${tab.id}"]`);
        if (!tabButton) return;
        
        if (EditorState.tabColors[tab.name]) {
            const colors = EditorState.tabColors[tab.name];
            tabButton.style.setProperty('--tab-bg-color', colors.bg);
            tabButton.style.setProperty('--tab-text-color', colors.text);
            console.log(`Tab "${tab.name}" → Farbe:`, colors.bg);
        } else {
            tabButton.style.removeProperty('--tab-bg-color');
            tabButton.style.removeProperty('--tab-text-color');
        }
    });
}

function getCategoryColor(categoryId) {
    if (EditorState.categories[categoryId]) {
        return EditorState.categories[categoryId];
    }
    
    // Fallback für category_id: 0 (Meal Sets)
    // Versuche die Farbe vom aktuellen Tab zu holen
    if (categoryId === 0) {
        const currentTabData = EditorState.layoutData.tabs.find(t => t.id === EditorState.currentTab);
        if (currentTabData && EditorState.tabColors[currentTabData.name]) {
            return EditorState.tabColors[currentTabData.name];
        }
        // Wenn kein Tab-Match, dann hellgrau
        return { bg: '#e2e8f0', text: '#1e293b', border: '#cbd5e1' };
    }
    
    return { bg: '#e2e8f0', text: '#1e293b', border: '#cbd5e1' };
}

// ============================================
// EVENT LOADING
// ============================================

async function loadEvents() {
    try {
        const response = await fetch(`${EditorConfig.API_BASE}/admin/events`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const events = await response.json();
        
        // Prüfe ob es ein Array ist
        if (!Array.isArray(events)) {
            console.error('Events ist kein Array:', events);
            setStatus('Fehler: Ungültige Antwort vom Server', 'error');
            return;
        }
        
        const select = document.getElementById('eventSelect');
        select.innerHTML = '<option value="">-- Bitte wählen --</option>';
        
        events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = `${event.name}${event.is_active ? ' ✓ (Aktiv)' : ''}`;
            select.appendChild(option);
        });
        
        console.log('Events geladen:', events.length);
        
    } catch (error) {
        console.error('Fehler beim Laden der Events:', error);
        setStatus('Fehler beim Laden der Events: ' + error.message, 'error');
    }
}

async function loadEventLayout() {
    const eventId = document.getElementById('eventSelect').value;
    
    if (!eventId) {
        alert('Bitte wähle ein Event aus!');
        return;
    }
    
    if (EditorState.hasUnsavedChanges) {
        if (!confirm('Es gibt ungespeicherte Änderungen. Wirklich wechseln?')) {
            return;
        }
    }
    
    EditorState.currentEventId = parseInt(eventId);
    
    try {
        const response = await fetch(`${EditorConfig.API_BASE}/admin/order-station-layout/${eventId}`);
        
        if (response.ok) {
            EditorState.layoutData = await response.json();
            setStatus('Layout geladen', 'success');
        } else {
            await generateDefaultLayout(eventId);
            setStatus('Neues Layout generiert', 'success');
        }
        
        renderCanvas();
        syncTabNames();
        EditorState.hasUnsavedChanges = false;
        updateUnsavedIndicator();
    } catch (error) {
        console.error('Fehler:', error);
        await generateDefaultLayout(eventId);
        renderCanvas();
        syncTabNames();
    }
}

async function generateDefaultLayout(eventId) {
    try {
        const [mealSets, ingredients] = await Promise.all([
            fetch(`${EditorConfig.API_BASE}/meal-sets`).then(r => r.json()),
            fetch(`${EditorConfig.API_BASE}/ingredients`).then(r => r.json())
        ]);
        
        EditorState.layoutData.tabs[0].buttons = generateButtonLayout(
            mealSets.map(ms => ({
                type: 'meal_set',
                linked_id: ms.id,
                label: ms.name,
                category_id: 0
            }))
        );
        
        EditorState.layoutData.tabs[1].buttons = generateButtonLayout(
            ingredients.map(ing => ({
                type: 'ingredient',
                linked_id: ing.id,
                label: ing.name,
                category_id: ing.category_id,
                radio_group_id: ing.radio_group_id || 0
            }))
        );
        
        EditorState.layoutData.event_id = eventId;
    } catch (error) {
        console.error('Fehler beim Generieren:', error);
        throw error;
    }
}

function generateButtonLayout(items) {
    const buttons = [];
    const spacing = EditorState.layoutData.settings.button_spacing;
    const buttonWidth = EditorConfig.DEFAULT_BUTTON_WIDTH;
    const buttonHeight = EditorConfig.DEFAULT_BUTTON_HEIGHT;
    
    const cols = Math.floor((EditorConfig.CANVAS_WIDTH - spacing) / (buttonWidth + spacing));
    
    items.forEach((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = spacing + col * (buttonWidth + spacing);
        const y = spacing + row * (buttonHeight + spacing);
        
        if (x + buttonWidth <= EditorConfig.CANVAS_WIDTH && y + buttonHeight <= EditorConfig.CANVAS_HEIGHT) {
            buttons.push({
                id: `btn_${item.type}_${item.linked_id}`,
                type: item.type,
                linked_id: item.linked_id,
                x: x,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                label: item.label,
                category_id: item.category_id || 0,
                radio_group_id: item.radio_group_id || 0
            });
        }
    });
    
    return buttons;
}

// ============================================
// CANVAS RENDERING
// ============================================

function renderCanvas() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    const currentTabData = EditorState.layoutData.tabs.find(t => t.id === EditorState.currentTab);
    if (!currentTabData) return;
    
    currentTabData.buttons.forEach(btnData => {
        const btnElement = createButtonElement(btnData);
        canvas.appendChild(btnElement);
    });
    
    updateCanvasInfo();
}

function createButtonElement(btnData) {
    const btn = document.createElement('div');
    btn.className = 'canvas-button';
    btn.dataset.id = btnData.id;
    btn.style.left = btnData.x + 'px';
    btn.style.top = btnData.y + 'px';
    btn.style.width = btnData.width + 'px';
    btn.style.height = btnData.height + 'px';
    btn.textContent = btnData.label;
    
    // Farbe aus category_id - FIXED: !== undefined
    if (btnData.category_id !== undefined) {
        const colors = getCategoryColor(btnData.category_id);
        btn.style.backgroundColor = colors.bg;
        btn.style.color = colors.text;
        btn.style.borderColor = colors.border;
        btn.style.borderWidth = '3px';
        btn.style.borderStyle = 'solid';
    }
    
    // Event Handlers
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        if (EditorState.formatCopyMode && EditorState.copiedFormat) {
            applyFormatToButton(btnData);
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            toggleButtonSelection(btnData);
            return;
        }
        
        handleButtonMouseDown(e, btnData);
    });
    
    btn.addEventListener('dblclick', () => openLabelModal(btnData));
    
    btn.appendChild(createResizeHandle('right', btnData));
    btn.appendChild(createResizeHandle('bottom', btnData));
    btn.appendChild(createResizeHandle('corner', btnData));
    
    return btn;
}

function createResizeHandle(position, btnData) {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${position}`;
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startResize(e, btnData, position);
    });
    return handle;
}

// ============================================
// DRAG & DROP
// ============================================

function handleButtonMouseDown(e, btnData) {
    selectButton(btnData);
    
    if (EditorState.selectedButtons.length > 0) {
        startMultiDrag(e);
    } else {
        startDrag(e, btnData);
    }
}

function startDrag(e, btnData) {
    EditorState.isDragging = true;
    EditorState.draggedElement = document.querySelector(`[data-id="${btnData.id}"]`);
    
    const rect = EditorState.draggedElement.getBoundingClientRect();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    
    EditorState.dragStart.x = e.clientX - rect.left;
    EditorState.dragStart.y = e.clientY - rect.top;
    
    EditorState.draggedElement.style.zIndex = '1000';
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
}

function startMultiDrag(e) {
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    EditorState.selectedButtons.forEach(btn => {
        const el = document.querySelector(`[data-id="${btn.id}"]`);
        if (el) {
            btn._groupDragStartX = btn.x;
            btn._groupDragStartY = btn.y;
        }
    });
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    function handleMultiDrag(e) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        EditorState.selectedButtons.forEach(btn => {
            let newX = btn._groupDragStartX + deltaX;
            let newY = btn._groupDragStartY + deltaY;
            
            if (EditorState.layoutData.settings.snap_to_grid) {
                const grid = EditorState.layoutData.settings.grid_size;
                newX = Math.round(newX / grid) * grid;
                newY = Math.round(newY / grid) * grid;
            }
            
            newX = Math.max(0, Math.min(newX, EditorConfig.CANVAS_WIDTH - btn.width));
            newY = Math.max(0, Math.min(newY, EditorConfig.CANVAS_HEIGHT - btn.height));
            
            btn.x = newX;
            btn.y = newY;
            
            const el = document.querySelector(`[data-id="${btn.id}"]`);
            if (el) {
                el.style.left = newX + 'px';
                el.style.top = newY + 'px';
            }
        });
    }
    
    function stopMultiDrag() {
        document.removeEventListener('mousemove', handleMultiDrag);
        document.removeEventListener('mouseup', stopMultiDrag);
        
        EditorState.selectedButtons.forEach(btn => {
            delete btn._groupDragStartX;
            delete btn._groupDragStartY;
        });
        
        markUnsaved();
        setStatus(`${EditorState.selectedButtons.length} Buttons verschoben`, 'success');
    }
    
    document.addEventListener('mousemove', handleMultiDrag);
    document.addEventListener('mouseup', stopMultiDrag);
}

function handleDrag(e) {
    if (!EditorState.isDragging || !EditorState.selectedButton || !EditorState.draggedElement) return;
    
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    let newX = e.clientX - canvasRect.left - EditorState.dragStart.x;
    let newY = e.clientY - canvasRect.top - EditorState.dragStart.y;
    
    if (EditorState.layoutData.settings.snap_to_grid) {
        const grid = EditorState.layoutData.settings.grid_size;
        newX = Math.round(newX / grid) * grid;
        newY = Math.round(newY / grid) * grid;
    }
    
    newX = Math.max(0, Math.min(newX, EditorConfig.CANVAS_WIDTH - EditorState.selectedButton.width));
    newY = Math.max(0, Math.min(newY, EditorConfig.CANVAS_HEIGHT - EditorState.selectedButton.height));
    
    EditorState.selectedButton.x = newX;
    EditorState.selectedButton.y = newY;
    
    EditorState.draggedElement.style.left = newX + 'px';
    EditorState.draggedElement.style.top = newY + 'px';
    
    if (EditorState.layoutData.settings.collision_detection) {
        const hasCollision = checkCollision(EditorState.selectedButton.id, newX, newY, EditorState.selectedButton.width, EditorState.selectedButton.height);
        EditorState.draggedElement.style.borderColor = hasCollision ? '#ef4444' : 'rgba(0, 0, 0, 0.2)';
        EditorState.draggedElement.style.opacity = hasCollision ? '0.7' : '1';
    }
}

function stopDrag() {
    if (!EditorState.isDragging) return;
    
    EditorState.isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    if (EditorState.draggedElement) {
        EditorState.draggedElement.style.zIndex = '';
        EditorState.draggedElement.style.borderColor = 'rgba(0, 0, 0, 0.2)';
        EditorState.draggedElement.style.opacity = '1';
        
        if (EditorState.layoutData.settings.collision_detection) {
            const hasCollision = checkCollision(
                EditorState.selectedButton.id,
                EditorState.selectedButton.x,
                EditorState.selectedButton.y,
                EditorState.selectedButton.width,
                EditorState.selectedButton.height
            );
            if (hasCollision) {
                setStatus('⚠️ Warnung: Button überlappt mit anderen!', 'warning');
            }
        }
    }
    
    EditorState.draggedElement = null;
    updateSelectedButtonInfo();
    markUnsaved();
}

// ============================================
// RESIZE
// ============================================

function startResize(e, btnData, position) {
    e.stopPropagation();
    selectButton(btnData);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = btnData.width;
    const startHeight = btnData.height;
    
    function handleResize(e) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
        if (position === 'right' || position === 'corner') {
            newWidth = startWidth + deltaX;
        }
        
        if (position === 'bottom' || position === 'corner') {
            newHeight = startHeight + deltaY;
        }
        
        if (EditorState.layoutData.settings.snap_to_grid) {
            const grid = EditorState.layoutData.settings.grid_size;
            newWidth = Math.round(newWidth / grid) * grid;
            newHeight = Math.round(newHeight / grid) * grid;
        }
        
        const minSize = EditorState.layoutData.settings.min_button_size;
        newWidth = Math.max(minSize, Math.min(newWidth, EditorConfig.CANVAS_WIDTH - btnData.x));
        newHeight = Math.max(minSize, Math.min(newHeight, EditorConfig.CANVAS_HEIGHT - btnData.y));
        
        if (EditorState.layoutData.settings.collision_detection) {
            const collision = checkCollision(btnData.id, btnData.x, btnData.y, newWidth, newHeight);
            if (collision) {
                const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
                if (btnElement) {
                    btnElement.style.borderColor = '#ef4444';
                    btnElement.style.opacity = '0.7';
                }
                return;
            }
        }
        
        btnData.width = newWidth;
        btnData.height = newHeight;
        
        const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
        if (btnElement) {
            btnElement.style.width = newWidth + 'px';
            btnElement.style.height = newHeight + 'px';
            btnElement.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            btnElement.style.opacity = '1';
        }
        
        updateSelectedButtonInfo();
        markUnsaved();
    }
    
    function stopResize() {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        
        const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
        if (btnElement) {
            btnElement.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            btnElement.style.opacity = '1';
        }
    }
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

// ============================================
// COLLISION DETECTION
// ============================================

function checkCollision(excludeId, x, y, width, height) {
    const currentTabData = EditorState.layoutData.tabs.find(t => t.id === EditorState.currentTab);
    
    return currentTabData.buttons.some(btn => {
        if (btn.id === excludeId) return false;
        
        return !(
            x + width <= btn.x ||
            x >= btn.x + btn.width ||
            y + height <= btn.y ||
            y >= btn.y + btn.height
        );
    });
}

// ============================================
// BUTTON SELECTION
// ============================================

function toggleButtonSelection(btnData) {
    if (EditorState.selectedButton && EditorState.selectedButtons.length === 0) {
        EditorState.selectedButtons.push(EditorState.selectedButton);
        const firstElement = document.querySelector(`[data-id="${EditorState.selectedButton.id}"]`);
        if (firstElement) {
            firstElement.classList.remove('selected');
            firstElement.classList.add('multi-selected');
        }
        EditorState.selectedButton = null;
    }
    
    const index = EditorState.selectedButtons.indexOf(btnData);
    const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
    
    if (index > -1) {
        EditorState.selectedButtons.splice(index, 1);
        btnElement.classList.remove('multi-selected');
        
        if (EditorState.selectedButtons.length === 1) {
            const lastBtn = EditorState.selectedButtons[0];
            const lastElement = document.querySelector(`[data-id="${lastBtn.id}"]`);
            if (lastElement) {
                lastElement.classList.remove('multi-selected');
                lastElement.classList.add('selected');
            }
            EditorState.selectedButton = lastBtn;
            EditorState.selectedButtons = [];
        }
    } else {
        EditorState.selectedButtons.push(btnData);
        btnElement.classList.add('multi-selected');
    }
    
    updateSelectedButtonInfo();
}

function selectButton(btnData) {
    EditorState.selectedButtons.forEach(btn => {
        const el = document.querySelector(`[data-id="${btn.id}"]`);
        if (el) {
            el.classList.remove('selected');
            el.classList.remove('multi-selected');
        }
    });
    EditorState.selectedButtons = [];
    
    if (EditorState.selectedButton) {
        const prevBtn = document.querySelector(`[data-id="${EditorState.selectedButton.id}"]`);
        if (prevBtn) {
            prevBtn.classList.remove('selected');
            prevBtn.classList.remove('multi-selected');
        }
    }
    
    EditorState.selectedButton = btnData;
    
    const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
    btnElement.classList.add('selected');
    
    updateSelectedButtonInfo();
}

function deselectButton() {
    EditorState.selectedButtons.forEach(btn => {
        const el = document.querySelector(`[data-id="${btn.id}"]`);
        if (el) {
            el.classList.remove('selected');
            el.classList.remove('multi-selected');
        }
    });
    EditorState.selectedButtons = [];
    
    if (EditorState.selectedButton) {
        const btnElement = document.querySelector(`[data-id="${EditorState.selectedButton.id}"]`);
        if (btnElement) {
            btnElement.classList.remove('selected');
            btnElement.classList.remove('multi-selected');
        }
        EditorState.selectedButton = null;
    }
    updateSelectedButtonInfo();
}

function updateSelectedButtonInfo() {
    const infoDiv = document.getElementById('selectedButtonInfo');
    
    if (EditorState.selectedButtons.length > 0) {
        infoDiv.innerHTML = `
            <p><strong style="color: #3b82f6;">${EditorState.selectedButtons.length} Buttons ausgewählt</strong></p>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                📦 Verschieben: Klicken + Ziehen<br>
                ➕ Mehr hinzufügen: STRG+Klick<br>
                ➖ Einzeln entfernen: STRG+Klick<br>
                ❌ Alle abwählen: Leerfläche klicken
            </p>
        `;
        return;
    }
    
    if (!EditorState.selectedButton) {
        infoDiv.innerHTML = `
            <p class="no-selection">Kein Button ausgewählt</p>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                💡 Tipp: STRG+Klick für Mehrfachauswahl
            </p>
        `;
        return;
    }
    
    infoDiv.innerHTML = `
        <p><strong>Label:</strong> ${EditorState.selectedButton.label}</p>
        <p><strong>Typ:</strong> ${EditorState.selectedButton.type}</p>
        <p><strong>Position:</strong> ${EditorState.selectedButton.x}, ${EditorState.selectedButton.y}</p>
        <p><strong>Größe:</strong> ${EditorState.selectedButton.width} × ${EditorState.selectedButton.height}</p>
        ${EditorState.selectedButton.radio_group_id ? `<p><strong>Radio Group:</strong> ${EditorState.selectedButton.radio_group_id}</p>` : ''}
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
            💡 STRG+Klick auf weitere Buttons für Mehrfachauswahl
        </p>
    `;
}

// ============================================
// FORMAT ÜBERTRAGEN
// ============================================

function toggleFormatCopyMode() {
    if (!EditorState.selectedButton) {
        alert('Bitte erst einen Button auswählen!');
        return;
    }
    
    if (!EditorState.formatCopyMode) {
        EditorState.formatCopyMode = true;
        EditorState.copiedFormat = {
            width: EditorState.selectedButton.width,
            height: EditorState.selectedButton.height
        };
        
        const btn = document.getElementById('btnFormatCopy');
        btn.textContent = '✓ Format übertragen aktiv (ESC zum Beenden)';
        btn.style.background = 'var(--success-color)';
        btn.style.color = 'white';
        
        document.getElementById('canvas').style.cursor = 'copy';
        
        setStatus(`Format kopiert (${EditorState.copiedFormat.width}×${EditorState.copiedFormat.height}px) - Klicke auf Buttons oder ESC`, 'success');
    } else {
        deactivateFormatCopyMode();
    }
}

function deactivateFormatCopyMode() {
    EditorState.formatCopyMode = false;
    EditorState.copiedFormat = null;
    
    const btn = document.getElementById('btnFormatCopy');
    btn.textContent = '📋 Format übertragen';
    btn.style.background = '';
    btn.style.color = '';
    
    document.getElementById('canvas').style.cursor = '';
    
    setStatus('Format-Übertrag deaktiviert', 'info');
}

function applyFormatToButton(btnData) {
    if (!EditorState.copiedFormat) return;
    
    btnData.width = EditorState.copiedFormat.width;
    btnData.height = EditorState.copiedFormat.height;
    
    const btnElement = document.querySelector(`[data-id="${btnData.id}"]`);
    if (btnElement) {
        btnElement.style.width = btnData.width + 'px';
        btnElement.style.height = btnData.height + 'px';
    }
    
    markUnsaved();
    setStatus(`Format übertragen auf "${btnData.label}"`, 'success');
}

// ============================================
// LABEL EDITING
// ============================================

function openLabelModal(btnData) {
    selectButton(btnData);
    
    const modal = document.getElementById('editLabelModal');
    const input = document.getElementById('editLabelInput');
    
    input.value = btnData.label;
    modal.classList.remove('hidden');
    input.focus();
    input.select();
    
    input.onkeyup = (e) => {
        if (e.key === 'Enter') saveLabelEdit();
        if (e.key === 'Escape') closeLabelModal();
    };
}

function closeLabelModal() {
    document.getElementById('editLabelModal').classList.add('hidden');
}

function saveLabelEdit() {
    if (!EditorState.selectedButton) return;
    
    const newLabel = document.getElementById('editLabelInput').value.trim();
    
    if (!newLabel) {
        alert('Label darf nicht leer sein!');
        return;
    }
    
    EditorState.selectedButton.label = newLabel;
    
    const btnElement = document.querySelector(`[data-id="${EditorState.selectedButton.id}"]`);
    btnElement.textContent = '';
    btnElement.appendChild(document.createTextNode(newLabel));
    
    btnElement.appendChild(createResizeHandle('right', EditorState.selectedButton));
    btnElement.appendChild(createResizeHandle('bottom', EditorState.selectedButton));
    btnElement.appendChild(createResizeHandle('corner', EditorState.selectedButton));
    
    closeLabelModal();
    updateSelectedButtonInfo();
    markUnsaved();
}

// ============================================
// TAB MANAGEMENT
// ============================================

function switchTab(tabId) {
    if (EditorState.currentTab === tabId) return;
    
    EditorState.currentTab = tabId;
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    deselectButton();
    renderCanvas();
}

function handleTabNameChange(e) {
    const tabIndex = e.target.id === 'tab1Name' ? 0 : 1;
    const newName = e.target.value;
    
    EditorState.layoutData.tabs[tabIndex].name = newName;
    document.getElementById(`tab${tabIndex + 1}Label`).textContent = newName;
    
    applyTabColors();
    markUnsaved();
}

function syncTabNames() {
    document.getElementById('tab1Name').value = EditorState.layoutData.tabs[0].name;
    document.getElementById('tab2Name').value = EditorState.layoutData.tabs[1].name;
    document.getElementById('tab1Label').textContent = EditorState.layoutData.tabs[0].name;
    document.getElementById('tab2Label').textContent = EditorState.layoutData.tabs[1].name;
    
    applyTabColors();
}

// ============================================
// SAVE & UTILITY
// ============================================

async function saveLayout() {
    if (!EditorState.currentEventId) {
        alert('Kein Event ausgewählt!');
        return;
    }
    
    EditorState.layoutData.event_id = EditorState.currentEventId;
    
    try {
        const response = await fetch(
            `${EditorConfig.API_BASE}/admin/order-station-layout/${EditorState.currentEventId}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(EditorState.layoutData)
            }
        );
        
        if (response.ok) {
            EditorState.hasUnsavedChanges = false;
            updateUnsavedIndicator();
            setStatus('Layout gespeichert', 'success');
        } else {
            throw new Error('Fehler beim Speichern');
        }
    } catch (error) {
        console.error('Fehler:', error);
        setStatus('Fehler beim Speichern', 'error');
        alert('Fehler beim Speichern des Layouts!');
    }
}

function markUnsaved() {
    EditorState.hasUnsavedChanges = true;
    updateUnsavedIndicator();
}

function updateUnsavedIndicator() {
    const indicator = document.getElementById('unsavedChanges');
    indicator.classList.toggle('hidden', !EditorState.hasUnsavedChanges);
}

function updateCanvasInfo() {
    const currentTabData = EditorState.layoutData.tabs.find(t => t.id === EditorState.currentTab);
    const count = currentTabData ? currentTabData.buttons.length : 0;
    
    document.getElementById('canvasSize').textContent = 
        `${EditorConfig.CANVAS_WIDTH}x${EditorConfig.CANVAS_HEIGHT}px`;
    document.getElementById('buttonCount').textContent = count;
}

function setStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    
    statusEl.style.color = type === 'error' ? 'var(--danger-color)' : 
                          type === 'success' ? 'var(--success-color)' : 
                          type === 'warning' ? 'var(--warning-color)' :
                          'var(--text-primary)';
    
    setTimeout(() => {
        if (statusEl.textContent === message) {
            statusEl.textContent = 'Bereit';
            statusEl.style.color = 'var(--text-primary)';
        }
    }, 5000);
}

function handleBack() {
    if (EditorState.hasUnsavedChanges) {
        if (!confirm('Es gibt ungespeicherte Änderungen. Wirklich zurück?')) {
            return;
        }
    }
    window.location.href = 'admin-interface.html';
}