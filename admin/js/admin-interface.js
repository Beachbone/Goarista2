// ============================================
// QR-Bestellsystem - Admin Interface
// ============================================

// Global State
let currentPage = 'dashboard';
let currentEditId = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin Interface initializing...');
    checkServerStatus();
    initializeNavigation();
    loadPage('dashboard');
    setInterval(checkServerStatus, 30000);
});

// ============================================
// SERVER STATUS
// ============================================
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (response.ok) {
            if (statusIndicator) statusIndicator.classList.add('online');
            if (statusText) statusText.textContent = 'Online';
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (statusIndicator) statusIndicator.classList.remove('online');
        if (statusText) statusText.textContent = 'Offline';
    }
}

// ============================================
// NAVIGATION
// ============================================
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            if (page) {
                loadPage(page);
                navItems.forEach(nav => nav.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    });
}

function loadPage(page) {
    currentPage = page;
    
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'ingredients':
            loadIngredients();
            break;
        case 'mealsets':
            loadMealSets();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'events':
            loadEvents();
            break;
        case 'radiogroups':
            loadRadioGroups();
            break;
        default:
            document.getElementById('mainContent').innerHTML = '<h2>Seite nicht gefunden</h2>';
    }
}

// ============================================
// EVENT HELPER FUNCTIONS
// ============================================
async function getActiveEventIngredientIds() {
    try {
        const activeEvent = await CRUD.events.getActive();
        
        if (!activeEvent || activeEvent.length === 0) {
            return null;
        }
        
        const event = activeEvent[0];
        const eventDetails = await CRUD.events.getById(event.id);
        
        if (!eventDetails.meal_sets || eventDetails.meal_sets.length === 0) {
            return [];
        }
        
        const ingredientIds = new Set();
        
        for (const mealSetId of eventDetails.meal_sets) {
            try {
                const response = await fetch(`${API_BASE_URL}/meal-sets/${mealSetId}`);
                if (response.ok) {
                    const details = await response.json();
                    if (Array.isArray(details)) {
                        details.forEach(item => {
                            if (item.ingredient_id) {
                                ingredientIds.add(item.ingredient_id);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`Error loading meal set ${mealSetId}:`, error);
            }
        }
        
        return Array.from(ingredientIds);
    } catch (error) {
        console.error('Error getting active event ingredients:', error);
        return null;
    }
}

async function getActiveEventIngredientNames() {
    const allowedIds = await getActiveEventIngredientIds();
    
    if (allowedIds === null) {
        return null;
    }
    
    if (allowedIds.length === 0) {
        return [];
    }
    
    try {
        const allIngredients = await CRUD.ingredients.getAll();
        return allIngredients
            .filter(ing => allowedIds.includes(ing.id))
            .map(ing => ing.name);
    } catch (error) {
        console.error('Error getting ingredient names:', error);
        return null;
    }
}

function formatEventDate(dateString) {
    if (!dateString) return 'Kein Datum';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('de-DE', options);
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Dashboard</h2>
            <p>Übersicht über das Bestellsystem</p>
        </div>
        
        <div class="card" style="border-left: 4px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0;">🎪 Aktives Event</h3>
                <button class="btn btn-primary btn-sm" onclick="loadPage('events')">
                    Zur Event-Verwaltung →
                </button>
            </div>
            <div id="dashboardActiveEvent">
                <div class="spinner"></div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h4>Heutige Bestellungen</h4>
                <div class="value" id="todayOrders">-</div>
            </div>
            <div class="stat-card">
                <h4>Offene Bestellungen</h4>
                <div class="value" id="openOrders">-</div>
            </div>
            <div class="stat-card">
                <h4>Heutiger Umsatz</h4>
                <div class="value" id="todayRevenue">-</div>
            </div>
            <div class="stat-card">
                <h4>Gesamt Umsatz</h4>
                <div class="value" id="totalRevenue">-</div>
            </div>
        </div>
        
        <div class="card">
            <h3>📦 Lagerbestandsverwaltung</h3>
            <div id="inventoryDashboard">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    await loadDashboardActiveEvent();
    await loadDashboardStats();
    await loadInventoryDashboard();
}

async function loadDashboardActiveEvent() {
    const container = document.getElementById('dashboardActiveEvent');
    if (!container) return;
    
    try {
        const activeEvent = await CRUD.events.getActive();
        
        if (activeEvent && activeEvent.length > 0) {
            const event = activeEvent[0];
            const formattedDate = formatEventDate(event.event_date);
            
            container.innerHTML = `
                <div style="padding: 16px; background: rgba(37, 99, 235, 0.05); border-radius: 6px; border: 1px solid rgba(37, 99, 235, 0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span class="badge badge-success">✓ Aktiv</span>
                                <strong style="font-size: 18px; color: var(--primary-color);">${escapeHtml(event.name)}</strong>
                            </div>
                            ${event.description ? `
                                <p style="color: var(--text-secondary); font-size: 14px; margin: 8px 0;">
                                    ${escapeHtml(event.description)}
                                </p>
                            ` : ''}
                            <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 14px; color: var(--text-secondary);">
                                <span>📅 ${formattedDate}</span>
                                <span>🍽️ ${event.meal_set_count || 0} Gerichte verfügbar</span>
                            </div>
                        </div>
                        <button class="btn btn-warning btn-sm" onclick="quickDeactivateEvent()" title="Event deaktivieren">
                            Deaktivieren
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="padding: 16px; background: var(--background); border-radius: 6px; border: 1px solid var(--border-color); text-align: center;">
                    <p style="color: var(--text-secondary); margin-bottom: 12px;">
                        Kein Event aktiv - Alle Gerichte und Zutaten sind verfügbar
                    </p>
                    <button class="btn btn-primary btn-sm" onclick="loadPage('events')">
                        Event aktivieren
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading active event for dashboard:', error);
        container.innerHTML = `
            <div style="padding: 16px; background: rgba(220, 38, 38, 0.05); border-radius: 6px; border: 1px solid rgba(220, 38, 38, 0.2);">
                <p style="color: var(--danger-color);">
                    ⚠️ Fehler beim Laden des aktiven Events
                </p>
            </div>
        `;
    }
}

async function quickDeactivateEvent() {
    if (!confirm('Event deaktivieren?\n\nAlle Gerichte und Zutaten werden wieder verfügbar.')) {
        return;
    }
    
    try {
        await CRUD.events.deactivate();
        showToast('Event deaktiviert', 'success');
        loadDashboardActiveEvent();
    } catch (error) {
        console.error('Error deactivating event:', error);
        showToast('Fehler beim Deaktivieren: ' + error.message, 'error');
    }
}

async function loadDashboardStats() {
    try {
        const todayOrders = await CRUD.orders.getTodayOrders();
        const pendingOrders = await CRUD.orders.filterByStatus('pending');
        const preparingOrders = await CRUD.orders.filterByStatus('preparing');
        const openOrders = [...pendingOrders, ...preparingOrders];
        
        const todayRevenue = await CRUD.orders.getTodayRevenue();
        const totalRevenue = await CRUD.orders.getTotalRevenue();
        
        document.getElementById('todayOrders').textContent = todayOrders.length;
        document.getElementById('openOrders').textContent = openOrders.length;
        document.getElementById('todayRevenue').textContent = `€${todayRevenue.toFixed(2)}`;
        document.getElementById('totalRevenue').textContent = `€${totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Fehler beim Laden der Dashboard-Daten', 'error');
    }
}

async function loadInventoryDashboard() {
    try {
        const inventory = await CRUD.inventory.getAll();
        const allowedIngredientIds = await getActiveEventIngredientIds();
        
        let trackedItems = inventory.filter(item => item.track_inventory);
        
        if (allowedIngredientIds !== null && allowedIngredientIds.length > 0) {
            trackedItems = trackedItems.filter(item => allowedIngredientIds.includes(item.id));
        }
        
        if (trackedItems.length === 0) {
            const message = allowedIngredientIds !== null && allowedIngredientIds.length === 0
                ? 'Keine Zutaten mit Lagerbestandsverfolgung im aktiven Event'
                : 'Keine Zutaten mit Lagerbestandsverfolgung vorhanden';
            document.getElementById('inventoryDashboard').innerHTML = 
                `<p style="color: var(--text-secondary);">${message}</p>`;
            return;
        }
        
        const criticalCount = trackedItems.filter(item => 
            item.stock_quantity <= item.min_warning_level
        ).length;
        
        document.getElementById('inventoryDashboard').innerHTML = `
            ${allowedIngredientIds !== null ? `
                <div style="padding: 8px 12px; background: rgba(37, 99, 235, 0.1); border-left: 3px solid var(--primary-color); border-radius: 4px; margin-bottom: 12px; font-size: 13px;">
                    <strong>🎪 Event-Modus:</strong> Zeige nur Zutaten des aktiven Events (${trackedItems.length} von ${inventory.filter(i => i.track_inventory).length})
                </div>
            ` : ''}
            ${criticalCount > 0 ? `
                <div style="padding: 12px; background: rgba(220, 38, 38, 0.1); border-left: 4px solid var(--danger-color); border-radius: 6px; margin-bottom: 16px;">
                    <strong>⚠️ Warnung:</strong> ${criticalCount} Zutat${criticalCount > 1 ? 'en' : ''} unter der Warnschwelle!
                </div>
            ` : ''}
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Zutat</th>
                        <th>Lagerbestand</th>
                        <th>Warnschwelle</th>
                        <th>Heute verkauft</th>
                        <th>Tageslimit</th>
                        <th>Status</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${trackedItems.map(item => {
                        const isCritical = item.stock_quantity <= item.min_warning_level;
                        const isOut = item.stock_quantity === 0;
                        const rowClass = isCritical ? 'ingredient-unavailable' : '';
                        
                        let statusBadge = '';
                        if (isOut) {
                            statusBadge = '<span class="badge badge-danger">Ausverkauft</span>';
                        } else if (isCritical) {
                            statusBadge = '<span class="badge badge-warning">Niedrig</span>';
                        } else {
                            statusBadge = '<span class="badge badge-success">OK</span>';
                        }
                        
                        return `
                        <tr class="${rowClass}">
                            <td><strong>${escapeHtml(item.name)}</strong></td>
                            <td style="font-size: 16px; font-weight: 600;">${item.stock_quantity}</td>
                            <td>${item.min_warning_level}</td>
                            <td>${item.sold_today || 0}</td>
                            <td>${item.max_daily_limit > 0 ? item.max_daily_limit : '∞'}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="quickRefillStock(${item.id}, '${escapeHtml(item.name)}')">
                                    Auffüllen
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div style="margin-top: 16px;">
                <button class="btn btn-warning btn-sm" onclick="resetDailySold()">
                    Tagesverkäufe zurücksetzen
                </button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading inventory dashboard:', error);
        document.getElementById('inventoryDashboard').innerHTML = 
            '<p style="color: var(--danger-color);">Fehler beim Laden der Lagerbestände</p>';
    }
}

async function quickRefillStock(ingredientId, ingredientName) {
    const amount = prompt(`Menge zum Auffüllen für "${ingredientName}":`);
    if (amount && !isNaN(amount) && parseInt(amount) > 0) {
        try {
            const inventory = await CRUD.inventory.getAll();
            const item = inventory.find(i => i.id === ingredientId);
            if (item) {
                const newStock = item.stock_quantity + parseInt(amount);
                await CRUD.inventory.updateStock(ingredientId, newStock);
                showToast(`${ingredientName} aufgefüllt (+${amount})`, 'success');
                loadInventoryDashboard();
                loadDashboardStats();
            }
        } catch (error) {
            showToast('Fehler beim Auffüllen: ' + error.message, 'error');
        }
    }
}

async function resetDailySold() {
    if (!confirm('Tagesverkäufe für alle Artikel zurücksetzen?'))
        return;
    
    try {
        await CRUD.inventory.resetDaily();
        showToast('Tagesverkäufe zurückgesetzt', 'success');
        loadInventoryDashboard();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// CATEGORIES
// ============================================
async function loadCategories() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Kategorien</h2>
            <p>Verwalten Sie Produktkategorien und Farben</p>
        </div>
        <div class="card">
            <button class="btn btn-primary" onclick="showCategoryForm()">+ Neue Kategorie</button>
            <div id="categoryList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const categories = await CRUD.categories.getAll();
        
        document.getElementById('categoryList').innerHTML = categories.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Farbe Inaktiv</th>
                        <th>Farbe Aktiv</th>
                        <th>Reihenfolge</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(cat => `
                        <tr>
                            <td><strong>${escapeHtml(cat.name)}</strong></td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 30px; height: 30px; background: ${cat.color_bg_inactive}; border-radius: 4px; border: 1px solid var(--border-color);"></div>
                                    <code>${cat.color_bg_inactive}</code>
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 30px; height: 30px; background: ${cat.color_bg_active}; border-radius: 4px; border: 1px solid var(--border-color);"></div>
                                    <code>${cat.color_bg_active}</code>
                                </div>
                            </td>
                            <td>${cat.sort_order || 0}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="editCategory(${cat.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteCategory(${cat.id})">Löschen</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Kategorien vorhanden</p>';
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Fehler beim Laden der Kategorien', 'error');
    }
}

async function showCategoryForm(categoryId = null) {
    currentEditId = categoryId;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="categoryName">Name</label>
            <input type="text" id="categoryName" required>
        </div>
        <div class="form-group">
            <label for="colorBgInactive">Hintergrundfarbe (Inaktiv)</label>
            <input type="color" id="colorBgInactive" value="#83BCBA">
        </div>
        <div class="form-group">
            <label for="colorBgActive">Hintergrundfarbe (Aktiv)</label>
            <input type="color" id="colorBgActive" value="#99E0F3">
        </div>
        <div class="form-group">
            <label for="colorFontInactive">Schriftfarbe (Inaktiv)</label>
            <input type="color" id="colorFontInactive" value="#000000">
        </div>
        <div class="form-group">
            <label for="colorFontActive">Schriftfarbe (Aktiv)</label>
            <input type="color" id="colorFontActive" value="#FFFFFF">
        </div>
        <div class="form-group">
            <label for="categorySortOrder">Reihenfolge</label>
            <input type="number" id="categorySortOrder" value="0" min="0">
        </div>
    `;
    
    if (categoryId) {
        const categories = await CRUD.categories.getAll();
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('categoryName').value = category.name;
            document.getElementById('colorBgInactive').value = category.color_bg_inactive;
            document.getElementById('colorBgActive').value = category.color_bg_active;
            document.getElementById('colorFontInactive').value = category.color_font_inactive;
            document.getElementById('colorFontActive').value = category.color_font_active;
            document.getElementById('categorySortOrder').value = category.sort_order || 0;
        }
    }
    
    showModal(categoryId ? 'Kategorie bearbeiten' : 'Neue Kategorie');
    document.getElementById('modalSubmit').onclick = saveCategoryForm;
}

async function saveCategoryForm() {
    const data = {
        name: document.getElementById('categoryName').value,
        color_bg_inactive: document.getElementById('colorBgInactive').value,
        color_bg_active: document.getElementById('colorBgActive').value,
        color_font_inactive: document.getElementById('colorFontInactive').value,
        color_font_active: document.getElementById('colorFontActive').value,
        sort_order: parseInt(document.getElementById('categorySortOrder').value)
    };
    
    if (!data.name) {
        showToast('Bitte Name eingeben', 'error');
        return;
    }
    
    try {
        if (currentEditId) {
            await CRUD.categories.update(currentEditId, data);
            showToast('Kategorie aktualisiert', 'success');
        } else {
            await CRUD.categories.create(data);
            showToast('Kategorie erstellt', 'success');
        }
        closeModal();
        loadCategories();
    } catch (error) {
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function editCategory(id) {
    await showCategoryForm(id);
}

async function deleteCategory(id) {
    if (!confirm('Kategorie wirklich löschen?'))
        return;
    
    try {
        await CRUD.categories.delete(id);
        showToast('Kategorie gelöscht', 'success');
        loadCategories();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// INGREDIENTS
// ============================================
async function loadIngredients() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Zutaten</h2>
            <p>Verwalten Sie Einzelzutaten und Preise</p>
        </div>
        <div class="card">
            <button class="btn btn-primary" onclick="showIngredientForm()">+ Neue Zutat</button>
            <div id="ingredientList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const ingredients = await CRUD.ingredients.getAll();
        
        document.getElementById('ingredientList').innerHTML = ingredients.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Preis</th>
                        <th>Kategorie</th>
                        <th>Verfügbar</th>
                        <th>Lagerbestand</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${ingredients.map(ing => {
                        const isUnavailable = !ing.available || (ing.track_inventory && ing.stock_quantity === 0);
                        const rowClass = isUnavailable ? 'ingredient-unavailable' : '';
                        
                        return `
                        <tr class="${rowClass}">
                            <td><strong>${escapeHtml(ing.name)}</strong></td>
                            <td>€${parseFloat(ing.price).toFixed(2)}</td>
                            <td>${escapeHtml(ing.category_name || '-')}</td>
                            <td>${ing.available ? '✓' : '✗'}</td>
                            <td>${ing.track_inventory ? ing.stock_quantity || 0 : 'N/A'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="editIngredient(${ing.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteIngredient(${ing.id})">Löschen</button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Zutaten vorhanden</p>';
    } catch (error) {
        console.error('Error loading ingredients:', error);
        showToast('Fehler beim Laden der Zutaten', 'error');
    }
}

async function showIngredientForm(ingredientId = null) {
    currentEditId = ingredientId;
    
    const categories = await CRUD.categories.getAll();
    const radioGroups = await CRUD.radioGroups.getAll();
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="ingredientName">Name</label>
            <input type="text" id="ingredientName" required>
        </div>
        <div class="form-group">
            <label for="ingredientPrice">Preis (€)</label>
            <input type="number" id="ingredientPrice" step="0.01" min="0" required>
        </div>
        <div class="form-group">
            <label for="ingredientCategory">Kategorie</label>
            <select id="ingredientCategory">
                ${categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="ingredientRadioGroup">Radio Group (optional)</label>
            <select id="ingredientRadioGroup">
                <option value="0">Keine - Zutat ist unabhängig</option>
                ${radioGroups.map(rg => `<option value="${rg.id}">${escapeHtml(rg.name)}</option>`).join('')}
            </select>
            <small class="form-text">Nur eine Zutat pro Radio Group kann gleichzeitig ausgewählt werden</small>
        </div>
        <div class="form-group">
            <label>Verfügbar</label>
            <div class="checkbox-wrapper">
                <input type="checkbox" id="ingredientAvailable" checked>
                <label for="ingredientAvailable">Zutat ist verfügbar</label>
            </div>
        </div>
        <div class="form-group">
            <label>Lagerbestand</label>
            <div class="checkbox-wrapper">
                <input type="checkbox" id="ingredientTrackInventory">
                <label for="ingredientTrackInventory">Lagerbestand verfolgen</label>
            </div>
        </div>
        <div class="form-group" id="inventoryFields" style="display: none;">
            <label for="ingredientStock">Lagerbestand</label>
            <input type="number" id="ingredientStock" value="0" min="0">
            
            <label for="ingredientMinWarning">Warnschwelle</label>
            <input type="number" id="ingredientMinWarning" value="5" min="0">
            
            <label for="ingredientMaxDaily">Tageslimit</label>
            <input type="number" id="ingredientMaxDaily" value="0" min="0">
        </div>
        <div class="form-group">
            <label for="ingredientSortOrder">Reihenfolge</label>
            <input type="number" id="ingredientSortOrder" value="0" min="0">
        </div>
    `;
    
    document.getElementById('ingredientTrackInventory').addEventListener('change', (e) => {
        document.getElementById('inventoryFields').style.display = e.target.checked ? 'block' : 'none';
    });
    
    if (ingredientId) {
        const ingredients = await CRUD.ingredients.getAll();
        const ingredient = ingredients.find(i => i.id === ingredientId);
        if (ingredient) {
            document.getElementById('ingredientName').value = ingredient.name;
            document.getElementById('ingredientPrice').value = ingredient.price;
            document.getElementById('ingredientCategory').value = ingredient.category_id;
            document.getElementById('ingredientRadioGroup').value = ingredient.radio_group_id || 0;
            document.getElementById('ingredientAvailable').checked = ingredient.available;
            document.getElementById('ingredientTrackInventory').checked = ingredient.track_inventory;
            document.getElementById('ingredientStock').value = ingredient.stock_quantity || 0;
            document.getElementById('ingredientMinWarning').value = ingredient.min_warning_level || 5;
            document.getElementById('ingredientMaxDaily').value = ingredient.max_daily_limit || 0;
            document.getElementById('ingredientSortOrder').value = ingredient.sort_order || 0;
            
            if (ingredient.track_inventory) {
                document.getElementById('inventoryFields').style.display = 'block';
            }
        }
    }
    
    showModal(ingredientId ? 'Zutat bearbeiten' : 'Neue Zutat');
    document.getElementById('modalSubmit').onclick = saveIngredientForm;
}

async function saveIngredientForm() {
    const trackInventory = document.getElementById('ingredientTrackInventory').checked;
    const radioGroupId = parseInt(document.getElementById('ingredientRadioGroup').value);
    
    const data = {
        name: document.getElementById('ingredientName').value,
        price: parseFloat(document.getElementById('ingredientPrice').value),
        category_id: parseInt(document.getElementById('ingredientCategory').value),
        available: document.getElementById('ingredientAvailable').checked,
        radio_group_id: radioGroupId > 0 ? radioGroupId : 0,
        track_inventory: trackInventory,
        stock_quantity: trackInventory ? parseInt(document.getElementById('ingredientStock').value) : 0,
        min_warning_level: trackInventory ? parseInt(document.getElementById('ingredientMinWarning').value) : 5,
        max_daily_limit: trackInventory ? parseInt(document.getElementById('ingredientMaxDaily').value) : 0,
        sort_order: parseInt(document.getElementById('ingredientSortOrder').value)
    };
    
    if (!data.name || isNaN(data.price)) {
        showToast('Bitte alle Pflichtfelder ausfüllen', 'error');
        return;
    }
    
    try {
        if (currentEditId) {
            await CRUD.ingredients.update(currentEditId, data);
            showToast('Zutat aktualisiert', 'success');
        } else {
            await CRUD.ingredients.create(data);
            showToast('Zutat erstellt', 'success');
        }
        closeModal();
        loadIngredients();
    } catch (error) {
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function editIngredient(id) {
    await showIngredientForm(id);
}

async function deleteIngredient(id) {
    if (!confirm('Zutat wirklich löschen?')) return;
    
    try {
        await CRUD.ingredients.delete(id);
        showToast('Zutat gelöscht', 'success');
        loadIngredients();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// MEAL SETS
// ============================================
async function loadMealSets() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Komplettgerichte</h2>
            <p>Verwalten Sie vordefinierte Menü-Kombinationen</p>
        </div>
        <div class="card">
            <button class="btn btn-primary" onclick="showMealSetForm()">+ Neues Komplettgericht</button>
            <div id="mealSetList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const mealSets = await CRUD.mealSets.getAll();
        
        document.getElementById('mealSetList').innerHTML = mealSets.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Beschreibung</th>
                        <th>Zutaten</th>
                        <th>Preis</th>
                        <th>Verfügbar</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${mealSets.map(ms => {
                        const finalPrice = ms.price > 0 ? ms.price : (ms.calculated_price || 0);
                        const priceInfo = ms.price > 0 
                            ? `<span title="Festpreis">€${parseFloat(ms.price).toFixed(2)}</span>`
                            : `<span title="Summe der Zutaten">€${parseFloat(ms.calculated_price || 0).toFixed(2)}</span>`;
                        
                        return `
                        <tr>
                            <td><strong>${escapeHtml(ms.name)}</strong></td>
                            <td>${escapeHtml(ms.description || '-')}</td>
                            <td>${ms.ingredient_count || 0} Zutaten</td>
                            <td>${priceInfo}</td>
                            <td>${ms.available ? '✓' : '✗'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="editMealSet(${ms.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteMealSet(${ms.id})">Löschen</button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Komplettgerichte vorhanden</p>';
    } catch (error) {
        console.error('Error loading meal sets:', error);
        showToast('Fehler beim Laden der Komplettgerichte', 'error');
    }
}

async function showMealSetForm(mealSetId = null) {
    currentEditId = mealSetId;
    
    const ingredients = await CRUD.ingredients.getAll();
    const categories = await CRUD.categories.getAll();
    
    const ingredientsByCategory = {};
    categories.forEach(cat => {
        ingredientsByCategory[cat.id] = {
            name: cat.name,
            items: ingredients.filter(ing => ing.category_id === cat.id)
        };
    });
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="mealSetName">Name</label>
            <input type="text" id="mealSetName" required>
        </div>
        <div class="form-group">
            <label for="mealSetDescription">Beschreibung</label>
            <textarea id="mealSetDescription" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label for="mealSetPrice">Festpreis (€)</label>
            <input type="number" id="mealSetPrice" step="0.01" min="0" value="0" placeholder="0.00">
            <small class="form-text">Wenn 0,00€, wird die Summe der Zutatenpreise verwendet</small>
        </div>
        <div class="form-group">
            <label>Verfügbar</label>
            <div class="checkbox-wrapper">
                <input type="checkbox" id="mealSetAvailable" checked>
                <label for="mealSetAvailable">Komplettgericht ist verfügbar</label>
            </div>
        </div>
        <div class="form-group">
            <label for="mealSetSortOrder">Reihenfolge</label>
            <input type="number" id="mealSetSortOrder" value="0" min="0">
        </div>
        
        <hr style="margin: 20px 0;">
        
        <div class="form-group">
            <label>Zutaten auswählen</label>
            <div id="ingredientSelection" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 12px;">
                ${Object.keys(ingredientsByCategory).map(catId => {
                    const category = ingredientsByCategory[catId];
                    if (category.items.length === 0) return '';
                    
                    return `
                        <div style="margin-bottom: 16px;">
                            <h4 style="font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">
                                ${escapeHtml(category.name)}
                            </h4>
                            ${category.items.map(ing => `
                                <div class="checkbox-wrapper" style="margin-bottom: 4px;">
                                    <input 
                                        type="checkbox" 
                                        id="ing_${ing.id}" 
                                        class="ingredient-checkbox" 
                                        data-ingredient-id="${ing.id}"
                                        data-ingredient-price="${ing.price}"
                                        onchange="updateCalculatedPrice()">
                                    <label for="ing_${ing.id}">
                                        ${escapeHtml(ing.name)} (€${parseFloat(ing.price).toFixed(2)})
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <div class="form-group">
            <div style="padding: 12px; background: var(--background); border-radius: var(--border-radius); border: 1px solid var(--border-color);">
                <strong>Berechneter Preis (Summe):</strong> 
                <span id="calculatedPrice" style="color: var(--primary-color); font-size: 16px; font-weight: 600;">€0.00</span>
                <br>
                <strong>Endpreis:</strong> 
                <span id="finalPrice" style="color: var(--success-color); font-size: 18px; font-weight: 700;">€0.00</span>
                <br>
                <small class="form-text" id="priceInfo">Summe der ausgewählten Zutaten</small>
            </div>
        </div>
    `;
    
    if (mealSetId) {
        const mealSets = await CRUD.mealSets.getAll();
        const mealSet = mealSets.find(ms => ms.id === mealSetId);
        
        if (mealSet) {
            document.getElementById('mealSetName').value = mealSet.name;
            document.getElementById('mealSetDescription').value = mealSet.description || '';
            document.getElementById('mealSetPrice').value = mealSet.price || 0;
            document.getElementById('mealSetAvailable').checked = mealSet.available;
            document.getElementById('mealSetSortOrder').value = mealSet.sort_order || 0;
            
            try {
                const response = await fetch(`${API_BASE_URL}/meal-sets/${mealSetId}`);
                if (response.ok) {
                    const details = await response.json();
                    if (Array.isArray(details) && details.length > 0) {
                        details.forEach(row => {
                            const checkbox = document.getElementById(`ing_${row.ingredient_id}`);
                            if (checkbox) {
                                checkbox.checked = true;
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading meal set ingredients:', error);
            }
        }
    }
    
    updateCalculatedPrice();
    document.getElementById('mealSetPrice').addEventListener('input', updateCalculatedPrice);
    
    showModal(mealSetId ? 'Komplettgericht bearbeiten' : 'Neues Komplettgericht');
    document.getElementById('modalSubmit').onclick = saveMealSetForm;
}

function updateCalculatedPrice() {
    const checkboxes = document.querySelectorAll('.ingredient-checkbox:checked');
    const customPrice = parseFloat(document.getElementById('mealSetPrice').value) || 0;
    
    let calculatedPrice = 0;
    checkboxes.forEach(cb => {
        calculatedPrice += parseFloat(cb.dataset.ingredientPrice) || 0;
    });
    
    const finalPrice = customPrice > 0 ? customPrice : calculatedPrice;
    
    document.getElementById('calculatedPrice').textContent = `€${calculatedPrice.toFixed(2)}`;
    document.getElementById('finalPrice').textContent = `€${finalPrice.toFixed(2)}`;
    
    if (customPrice > 0) {
        document.getElementById('priceInfo').textContent = 'Festpreis wird verwendet';
        document.getElementById('finalPrice').style.color = 'var(--warning-color)';
    } else {
        document.getElementById('priceInfo').textContent = 'Summe der ausgewählten Zutaten';
        document.getElementById('finalPrice').style.color = 'var(--success-color)';
    }
}

async function saveMealSetForm() {
    const selectedIngredients = [];
    document.querySelectorAll('.ingredient-checkbox:checked').forEach(cb => {
        selectedIngredients.push(parseInt(cb.dataset.ingredientId));
    });
    
    const data = {
        name: document.getElementById('mealSetName').value,
        description: document.getElementById('mealSetDescription').value,
        price: parseFloat(document.getElementById('mealSetPrice').value) || 0,
        available: document.getElementById('mealSetAvailable').checked,
        sort_order: parseInt(document.getElementById('mealSetSortOrder').value),
        ingredients: selectedIngredients
    };
    
    if (!data.name) {
        showToast('Bitte Name eingeben', 'error');
        return;
    }
    
    if (selectedIngredients.length === 0) {
        showToast('Bitte mindestens eine Zutat auswählen', 'error');
        return;
    }
    
    try {
        if (currentEditId) {
            await CRUD.mealSets.update(currentEditId, data);
            showToast('Komplettgericht aktualisiert', 'success');
        } else {
            await CRUD.mealSets.create(data);
            showToast('Komplettgericht erstellt', 'success');
        }
        closeModal();
        loadMealSets();
    } catch (error) {
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function editMealSet(id) {
    await showMealSetForm(id);
}

async function deleteMealSet(id) {
    if (!confirm('Komplettgericht wirklich löschen?'))
        return;
    
    try {
        await CRUD.mealSets.delete(id);
        showToast('Komplettgericht gelöscht', 'success');
        loadMealSets();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Bestellungen</h2>
            <p>Übersicht aller Bestellungen</p>
        </div>
        <div class="card">
            <div id="ordersList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const orders = await CRUD.orders.getAll();
        
        document.getElementById('ordersList').innerHTML = orders.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Bestellnummer</th>
                        <th>Tisch</th>
                        <th>Status</th>
                        <th>Betrag</th>
                        <th>Erstellt</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td><strong>${escapeHtml(order.order_number || '-')}</strong></td>
                            <td>${escapeHtml(order.table_number || '-')}</td>
                            <td>
                                <select class="btn btn-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ausstehend</option>
                                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>In Bearbeitung</option>
                                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Fertig</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Abgeschlossen</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Storniert</option>
                                </select>
                            </td>
                            <td>€${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                            <td>${new Date(order.created_at).toLocaleString('de-DE')}</td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${order.id})">Details</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Bestellungen vorhanden</p>';
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Fehler beim Laden der Bestellungen', 'error');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await CRUD.orders.updateStatus(orderId, newStatus);
        showToast('Status aktualisiert', 'success');
    } catch (error) {
        showToast('Fehler beim Aktualisieren: ' + error.message, 'error');
        loadOrders();
    }
}

function viewOrderDetails(orderId) {
    showToast('Details-Ansicht wird noch implementiert...', 'info');
}

// ============================================
// STATISTICS
// ============================================
async function loadStatistics() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Statistiken</h2>
            <p>Verkaufsstatistiken und Analysen</p>
        </div>
        
        <div id="eventFilterInfo"></div>
        
        <div class="card">
            <h3>Top Zutaten</h3>
            <div id="ingredientStats">
                <div class="spinner"></div>
            </div>
        </div>
        <div class="card">
            <h3>Top Komplettgerichte</h3>
            <div id="mealSetStats">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const activeEvent = await CRUD.events.getActive();
        const allowedIngredientNames = await getActiveEventIngredientNames();
        
        if (activeEvent && activeEvent.length > 0) {
            document.getElementById('eventFilterInfo').innerHTML = `
                <div class="card" style="border-left: 4px solid var(--primary-color); margin-bottom: 16px;">
                    <div style="padding: 12px; background: rgba(37, 99, 235, 0.05);">
                        <strong>Event-Modus aktiv:</strong> ${escapeHtml(activeEvent[0].name)} - 
                        Zeige nur Statistiken für Event-Gerichte und -Zutaten
                    </div>
                </div>
            `;
        }
        
        const ingredientStats = await CRUD.stats.getIngredientStats();
        const mealSetStats = await CRUD.stats.getMealSetStats();
        
        let filteredIngredientStats = ingredientStats;
        if (allowedIngredientNames !== null) {
            if (allowedIngredientNames.length === 0) {
                filteredIngredientStats = [];
            } else {
                filteredIngredientStats = ingredientStats.filter(stat => 
                    allowedIngredientNames.includes(stat.name)
                );
            }
        }
        
        let filteredMealSetStats = mealSetStats;
        if (activeEvent && activeEvent.length > 0) {
            const eventDetails = await CRUD.events.getById(activeEvent[0].id);
            if (eventDetails.meal_sets && eventDetails.meal_sets.length > 0) {
                const allMealSets = await CRUD.mealSets.getAll();
                const eventMealSetNames = allMealSets
                    .filter(ms => eventDetails.meal_sets.includes(ms.id))
                    .map(ms => ms.name);
                
                filteredMealSetStats = mealSetStats.filter(stat => 
                    eventMealSetNames.includes(stat.name)
                );
            } else {
                filteredMealSetStats = [];
            }
        }
        
        document.getElementById('ingredientStats').innerHTML = filteredIngredientStats.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Zutat</th>
                        <th>Verkauft</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredIngredientStats.slice(0, 10).map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${item.total_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary); padding: 16px;">Keine Statistiken verfügbar</p>';
        
        document.getElementById('mealSetStats').innerHTML = filteredMealSetStats.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Komplettgericht</th>
                        <th>Verkauft</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredMealSetStats.slice(0, 10).map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${item.total_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary); padding: 16px;">Keine Statistiken verfügbar</p>';
    } catch (error) {
        console.error('Error loading statistics:', error);
        showToast('Fehler beim Laden der Statistiken', 'error');
    }
}

// ============================================
// EVENTS
// ============================================
async function loadEvents() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Events</h2>
            <p>Verwalten Sie Events und beschränken Sie verfügbare Gerichte</p>
        </div>
        <div class="card">
            <div style="margin-bottom: 16px; padding: 12px; background: var(--background); border-radius: var(--border-radius); border-left: 3px solid var(--info-color);">
                <strong>ℹ️ Info:</strong> Ein aktives Event beschränkt die verfügbaren Gerichte und Zutaten. 
                Nur die ausgewählten Komplettgerichte sind für Bestellungen sichtbar.
            </div>
            <button class="btn btn-primary" onclick="showEventForm()">+ Neues Event</button>
            <div id="eventList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const events = await CRUD.events.getAll();
        const activeEvent = await CRUD.events.getActive();
        const activeEventId = activeEvent && activeEvent.length > 0 ? activeEvent[0].id : null;
        
        document.getElementById('eventList').innerHTML = events.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Beschreibung</th>
                        <th>Datum</th>
                        <th>Gerichte</th>
                        <th>Status</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(event => {
                        const isActive = event.id === activeEventId;
                        const eventDate = event.event_date ? formatEventDate(event.event_date) : 'Kein Datum';
                        
                        return `
                        <tr style="${isActive ? 'background: rgba(37, 99, 235, 0.05);' : ''}">
                            <td><strong>${escapeHtml(event.name)}</strong></td>
                            <td>${escapeHtml(event.description || '-')}</td>
                            <td>${eventDate}</td>
                            <td>${event.meal_set_count || 0} Gerichte</td>
                            <td>
                                ${isActive ? 
                                    '<span class="badge badge-success">✓ Aktiv</span>' : 
                                    '<span class="badge">Inaktiv</span>'
                                }
                            </td>
                            <td>
                                ${!isActive ? `
                                    <button class="btn btn-success btn-sm" onclick="activateEvent(${event.id})">Aktivieren</button>
                                ` : `
                                    <button class="btn btn-warning btn-sm" onclick="deactivateEvent()">Deaktivieren</button>
                                `}
                                <button class="btn btn-warning btn-sm" onclick="editEvent(${event.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">Löschen</button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Events vorhanden</p>';
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('Fehler beim Laden der Events', 'error');
    }
}

async function showEventForm(eventId = null) {
    currentEditId = eventId;
    
    const mealSets = await CRUD.mealSets.getAll();
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="eventName">Event Name</label>
            <input type="text" id="eventName" placeholder="z.B. Schlachtfest 2025" required>
        </div>
        <div class="form-group">
            <label for="eventDescription">Beschreibung</label>
            <textarea id="eventDescription" rows="3" placeholder="Optional"></textarea>
        </div>
        <div class="form-group">
            <label for="eventDate">Event Datum</label>
            <input type="date" id="eventDate">
        </div>
        
        <hr style="margin: 20px 0;">
        
        <div class="form-group">
            <label>Verfügbare Komplettgerichte</label>
            <div id="mealSetSelection" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 12px;">
                ${mealSets.map(ms => `
                    <div class="checkbox-wrapper" style="margin-bottom: 8px;">
                        <input 
                            type="checkbox" 
                            id="ms_${ms.id}" 
                            class="mealset-checkbox" 
                            data-mealset-id="${ms.id}">
                        <label for="ms_${ms.id}">
                            <strong>${escapeHtml(ms.name)}</strong>
                            ${ms.description ? `<br><small style="color: var(--text-secondary);">${escapeHtml(ms.description)}</small>` : ''}
                        </label>
                    </div>
                `).join('')}
            </div>
            <small class="form-text">Wählen Sie die Gerichte aus, die während des Events verfügbar sein sollen</small>
        </div>
    `;
    
    if (eventId) {
        const event = await CRUD.events.getById(eventId);
        if (event) {
            document.getElementById('eventName').value = event.name;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventDate').value = event.event_date || '';
            
            if (event.meal_sets && event.meal_sets.length > 0) {
                event.meal_sets.forEach(msId => {
                    const checkbox = document.getElementById(`ms_${msId}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    }
    
    showModal(eventId ? 'Event bearbeiten' : 'Neues Event');
    document.getElementById('modalSubmit').onclick = saveEventForm;
}

async function saveEventForm() {
    const selectedMealSets = [];
    document.querySelectorAll('.mealset-checkbox:checked').forEach(cb => {
        selectedMealSets.push(parseInt(cb.dataset.mealsetId));
    });
    
    const data = {
        name: document.getElementById('eventName').value,
        description: document.getElementById('eventDescription').value,
        event_date: document.getElementById('eventDate').value,
        meal_sets: selectedMealSets
    };
    
    if (!data.name) {
        showToast('Bitte Event-Name eingeben', 'error');
        return;
    }
    
    if (selectedMealSets.length === 0) {
        showToast('Bitte mindestens ein Komplettgericht auswählen', 'error');
        return;
    }
    
    try {
        if (currentEditId) {
            await CRUD.events.update(currentEditId, data);
            showToast('Event aktualisiert', 'success');
        } else {
            await CRUD.events.create(data);
            showToast('Event erstellt', 'success');
        }
        closeModal();
        loadEvents();
    } catch (error) {
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function editEvent(id) {
    await showEventForm(id);
}

async function deleteEvent(id) {
    if (!confirm('Event wirklich löschen?'))
        return;
    
    try {
        await CRUD.events.delete(id);
        showToast('Event gelöscht', 'success');
        loadEvents();
        loadDashboardActiveEvent();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

async function activateEvent(eventId) {
    if (!confirm('Event aktivieren?\n\nDies beschränkt die verfügbaren Gerichte auf die ausgewählten.'))
        return;
    
    try {
        await CRUD.events.activate(eventId);
        showToast('Event aktiviert', 'success');
        loadEvents();
        loadDashboardActiveEvent();
    } catch (error) {
        showToast('Fehler beim Aktivieren: ' + error.message, 'error');
    }
}

async function deactivateEvent() {
    if (!confirm('Event deaktivieren?\n\nAlle Gerichte und Zutaten werden wieder verfügbar.'))
        return;
    
    try {
        await CRUD.events.deactivate();
        showToast('Event deaktiviert', 'success');
        loadEvents();
        loadDashboardActiveEvent();
    } catch (error) {
        showToast('Fehler beim Deaktivieren: ' + error.message, 'error');
    }
}

// ============================================
// RADIO GROUPS
// ============================================
async function loadRadioGroups() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Radio Groups</h2>
            <p>Verwalten Sie Auswahlgruppen für Zutaten</p>
        </div>
        <div class="card">
            <div style="margin-bottom: 16px; padding: 12px; background: var(--background); border-radius: var(--border-radius); border-left: 3px solid var(--info-color);">
                <strong>ℹ️ Info:</strong> Radio Groups ermöglichen es, dass nur eine Zutat aus einer Gruppe gleichzeitig ausgewählt werden kann. 
                Beispiel: "1x Leberwurst" und "2x Leberwurst" sollten in der gleichen Gruppe sein.
            </div>
            <button class="btn btn-primary" onclick="showRadioGroupForm()">+ Neue Radio Group</button>
            <div id="radioGroupList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const radioGroups = await CRUD.radioGroups.getAll();
        
        document.getElementById('radioGroupList').innerHTML = radioGroups.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Exklusiv</th>
                        <th>Reihenfolge</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${radioGroups.map(rg => `
                        <tr>
                            <td><strong>${escapeHtml(rg.name)}</strong></td>
                            <td>${rg.exclusive ? '✓ Ja' : '✗ Nein'}</td>
                            <td>${rg.sort_order || 0}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="editRadioGroup(${rg.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteRadioGroup(${rg.id})">Löschen</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Radio Groups vorhanden</p>';
    } catch (error) {
        console.error('Error loading radio groups:', error);
        showToast('Fehler beim Laden der Radio Groups', 'error');
    }
}

async function showRadioGroupForm(radioGroupId = null) {
    currentEditId = radioGroupId;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-group">
            <label for="radioGroupName">Name</label>
            <input type="text" id="radioGroupName" placeholder="z.B. Leberwurst" required>
        </div>
        <div class="form-group">
            <label>Exklusiv</label>
            <div class="checkbox-wrapper">
                <input type="checkbox" id="radioGroupExclusive" checked>
                <label for="radioGroupExclusive">Nur eine Zutat aus dieser Gruppe kann ausgewählt werden</label>
            </div>
        </div>
        <div class="form-group">
            <label for="radioGroupSortOrder">Reihenfolge</label>
            <input type="number" id="radioGroupSortOrder" value="0" min="0">
        </div>
    `;
    
    if (radioGroupId) {
        const radioGroups = await CRUD.radioGroups.getAll();
        const radioGroup = radioGroups.find(rg => rg.id === radioGroupId);
        if (radioGroup) {
            document.getElementById('radioGroupName').value = radioGroup.name;
            document.getElementById('radioGroupExclusive').checked = radioGroup.exclusive;
            document.getElementById('radioGroupSortOrder').value = radioGroup.sort_order || 0;
        }
    }
    
    showModal(radioGroupId ? 'Radio Group bearbeiten' : 'Neue Radio Group');
    document.getElementById('modalSubmit').onclick = saveRadioGroupForm;
}

async function saveRadioGroupForm() {
    const data = {
        name: document.getElementById('radioGroupName').value,
        exclusive: document.getElementById('radioGroupExclusive').checked,
        sort_order: parseInt(document.getElementById('radioGroupSortOrder').value)
    };
    
    if (!data.name) {
        showToast('Bitte Name eingeben', 'error');
        return;
    }
    
    try {
        if (currentEditId) {
            await CRUD.radioGroups.update(currentEditId, data);
            showToast('Radio Group aktualisiert', 'success');
        } else {
            await CRUD.radioGroups.create(data);
            showToast('Radio Group erstellt', 'success');
        }
        closeModal();
        loadRadioGroups();
    } catch (error) {
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function editRadioGroup(id) {
    await showRadioGroupForm(id);
}

async function deleteRadioGroup(id) {
    if (!confirm('Radio Group wirklich löschen?\n\nHinweis: Zutaten, die dieser Gruppe zugeordnet sind, verlieren die Zuordnung.'))
        return;
    
    try {
        await CRUD.radioGroups.delete(id);
        showToast('Radio Group gelöscht', 'success');
        loadRadioGroups();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showModal(title) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEditId = null;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
