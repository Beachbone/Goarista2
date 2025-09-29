// Admin Interface JavaScript - mit CRUD Managern
// WICHTIG: crud-managers.js muss VOR dieser Datei geladen werden!
// API_BASE_URL wird aus crud-managers.js verwendet

let currentPage = 'dashboard';
let currentEditId = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    initializeNavigation();
    loadPage('dashboard');
    
    // Check server status periodically
    setInterval(checkServerStatus, 30000);
});

// Server Status Check
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

// Navigation
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

// Page Loader
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
        case 'inventory':
            loadInventory();
            break;
        case 'statistics':
            loadStatistics();
            break;
        default:
            document.getElementById('mainContent').innerHTML = '<h2>Seite nicht gefunden</h2>';
    }
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
    `;
    
    await loadDashboardStats();
}

async function loadDashboardStats() {
    try {
        const orders = await CRUD.orders.getAll();
        const todayOrders = CRUD.orders.getTodayOrders(orders);
        const openOrders = CRUD.orders.filterByStatus(orders, 'pending')
            .concat(CRUD.orders.filterByStatus(orders, 'preparing'));
        
        document.getElementById('todayOrders').textContent = todayOrders.length;
        document.getElementById('openOrders').textContent = openOrders.length;
        document.getElementById('todayRevenue').textContent = 
            `€${CRUD.orders.calculateRevenue(todayOrders).toFixed(2)}`;
        document.getElementById('totalRevenue').textContent = 
            `€${CRUD.orders.calculateRevenue(orders).toFixed(2)}`;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Fehler beim Laden der Dashboard-Daten', 'error');
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
                                    <div style="width: 30px; height: 30px; background: ${cat.color_bg_inactive}; border-radius: 4px; border: 1px solid var(--border);"></div>
                                    <code>${cat.color_bg_inactive}</code>
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 30px; height: 30px; background: ${cat.color_bg_active}; border-radius: 4px; border: 1px solid var(--border);"></div>
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

function showCategoryForm(categoryId = null) {
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
        CRUD.categories.getAll().then(categories => {
            const category = categories.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('categoryName').value = category.name;
                document.getElementById('colorBgInactive').value = category.color_bg_inactive;
                document.getElementById('colorBgActive').value = category.color_bg_active;
                document.getElementById('colorFontInactive').value = category.color_font_inactive;
                document.getElementById('colorFontActive').value = category.color_font_active;
                document.getElementById('categorySortOrder').value = category.sort_order || 0;
            }
        });
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
    showCategoryForm(id);
}

async function deleteCategory(id) {
    if (!confirm('Kategorie wirklich löschen?')) return;
    
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
                        // Check if ingredient is unavailable (checkbox unchecked OR stock = 0)
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
    
    // Load categories for dropdown
    const categories = await CRUD.categories.getAll();
    
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
    
    // Show/hide inventory fields based on checkbox
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
    
    const data = {
        name: document.getElementById('ingredientName').value,
        price: parseFloat(document.getElementById('ingredientPrice').value),
        category_id: parseInt(document.getElementById('ingredientCategory').value),
        available: document.getElementById('ingredientAvailable').checked,
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
            <p>Verwalten Sie Menüs und Kombi-Angebote</p>
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
                        <th>Anzahl Zutaten</th>
                        <th>Verfügbar</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${mealSets.map(ms => `
                        <tr>
                            <td><strong>${escapeHtml(ms.name)}</strong></td>
                            <td>${escapeHtml(ms.description || '-')}</td>
                            <td>${ms.ingredient_count || 0}</td>
                            <td>${ms.available ? '✓' : '✗'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="editMealSet(${ms.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteMealSet(${ms.id})">Löschen</button>
                            </td>
                        </tr>
                    `).join('')}
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
            <label>Verfügbarkeit</label>
            <div class="checkbox-wrapper">
                <input type="checkbox" id="mealSetAvailable" checked>
                <label for="mealSetAvailable">Komplettgericht ist verfügbar</label>
            </div>
        </div>
        <div class="form-group">
            <label for="mealSetSortOrder">Reihenfolge</label>
            <input type="number" id="mealSetSortOrder" value="0" min="0">
        </div>
        <div class="form-group">
            <label>Zutaten (Feature noch nicht implementiert)</label>
            <p style="color: var(--text-secondary); font-size: 14px;">
                Die Zuordnung von Zutaten erfolgt in einer zukünftigen Version
            </p>
        </div>
    `;
    
    if (mealSetId) {
        const mealSets = await CRUD.mealSets.getAll();
        const mealSet = mealSets.find(ms => ms.id === mealSetId);
        if (mealSet) {
            document.getElementById('mealSetName').value = mealSet.name;
            document.getElementById('mealSetDescription').value = mealSet.description || '';
            document.getElementById('mealSetAvailable').checked = mealSet.available;
            document.getElementById('mealSetSortOrder').value = mealSet.sort_order || 0;
        }
    }
    
    showModal(mealSetId ? 'Komplettgericht bearbeiten' : 'Neues Komplettgericht');
    document.getElementById('modalSubmit').onclick = saveMealSetForm;
}

async function saveMealSetForm() {
    const data = {
        name: document.getElementById('mealSetName').value,
        description: document.getElementById('mealSetDescription').value,
        available: document.getElementById('mealSetAvailable').checked,
        sort_order: parseInt(document.getElementById('mealSetSortOrder').value),
        ingredients: [] // TODO: Implement ingredient selection
    };
    
    if (!data.name) {
        showToast('Bitte Name eingeben', 'error');
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
    if (!confirm('Komplettgericht wirklich löschen?')) return;
    
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
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${escapeHtml(order.order_number || '-')}</td>
                            <td>${escapeHtml(order.table_number || '-')}</td>
                            <td>
                                <select onchange="updateOrderStatus(${order.id}, this.value)">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ausstehend</option>
                                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>In Bearbeitung</option>
                                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Bereit</option>
                                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Abgeschlossen</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Storniert</option>
                                </select>
                            </td>
                            <td>€${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                            <td>${new Date(order.created_at).toLocaleString('de-DE')}</td>
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
        loadOrders(); // Reload to reset dropdown
    }
}

// ============================================
// INVENTORY
// ============================================
async function loadInventory() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Inventar-Verwaltung</h2>
            <p>Lagerbestände und Warnungen</p>
        </div>
        <div class="card">
            <div class="btn-group">
                <button class="btn btn-warning" onclick="resetDailySold()">Tagesverkäufe zurücksetzen</button>
            </div>
            <div id="inventoryList">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const inventory = await CRUD.inventory.getAll();
        const trackedItems = inventory.filter(i => i.track_inventory);
        
        document.getElementById('inventoryList').innerHTML = trackedItems.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Zutat</th>
                        <th>Lagerbestand</th>
                        <th>Warnung bei</th>
                        <th>Heute verkauft</th>
                        <th>Tageslimit</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${trackedItems.map(item => {
                        const isWarning = item.stock_quantity <= item.min_warning_level;
                        const isOutOfStock = item.stock_quantity === 0;
                        return `
                            <tr style="${isWarning ? 'background: rgba(220, 38, 38, 0.1);' : ''}">
                                <td><strong>${escapeHtml(item.name)}</strong></td>
                                <td>
                                    <input type="number" 
                                           value="${item.stock_quantity || 0}" 
                                           onchange="updateStock(${item.id}, this.value)"
                                           style="width: 80px; padding: 4px;">
                                </td>
                                <td>${item.min_warning_level || '-'}</td>
                                <td>${item.sold_today || 0}</td>
                                <td>${item.max_daily_limit || 'Unbegrenzt'}</td>
                                <td>
                                    ${isOutOfStock ? '<span style="color: var(--danger-color);">Nicht auf Lager</span>' : 
                                      isWarning ? '<span style="color: var(--warning-color);">Niedrig</span>' : 
                                      '<span style="color: var(--success-color);">OK</span>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : '<p>Keine Artikel mit Inventarverwaltung vorhanden</p>';
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Fehler beim Laden des Inventars', 'error');
    }
}

async function updateStock(ingredientId, newStock) {
    try {
        await CRUD.inventory.updateStock(ingredientId, parseInt(newStock));
        showToast('Lagerbestand aktualisiert', 'success');
    } catch (error) {
        showToast('Fehler beim Aktualisieren: ' + error.message, 'error');
        loadInventory();
    }
}

async function resetDailySold() {
    if (!confirm('Tagesverkäufe wirklich zurücksetzen?')) return;
    
    try {
        await CRUD.inventory.resetDailySold();
        showToast('Tagesverkäufe zurückgesetzt', 'success');
        loadInventory();
    } catch (error) {
        showToast('Fehler: ' + error.message, 'error');
    }
}

// ============================================
// STATISTICS
// ============================================
async function loadStatistics() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>Statistiken</h2>
            <p>Verkaufsstatistiken und Auswertungen</p>
        </div>
        <div class="card">
            <h3>Verkaufsübersicht</h3>
            <div id="statsContent">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    try {
        const summary = await CRUD.stats.getSummary();
        const ingredientStats = await CRUD.stats.getIngredientStats();
        const mealSetStats = await CRUD.stats.getMealSetStats();
        
        document.getElementById('statsContent').innerHTML = `
            <h4>Zusammenfassung</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Bestellungen Heute</h4>
                    <div class="value">${summary[0]?.orders_today || 0}</div>
                </div>
                <div class="stat-card">
                    <h4>Bestellungen Gesamt</h4>
                    <div class="value">${summary[0]?.orders_total || 0}</div>
                </div>
                <div class="stat-card">
                    <h4>Umsatz Heute</h4>
                    <div class="value">€${parseFloat(summary[0]?.revenue_today || 0).toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <h4>Umsatz Gesamt</h4>
                    <div class="value">€${parseFloat(summary[0]?.revenue_total || 0).toFixed(2)}</div>
                </div>
            </div>
            
            <h4 style="margin-top: 24px;">Top Zutaten</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Zutat</th>
                        <th>Verkauft</th>
                    </tr>
                </thead>
                <tbody>
                    ${ingredientStats.slice(0, 10).map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${item.total_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h4 style="margin-top: 24px;">Top Komplettgerichte</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Gericht</th>
                        <th>Verkauft</th>
                    </tr>
                </thead>
                <tbody>
                    ${mealSetStats.slice(0, 10).map(item => `
                        <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${item.total_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading statistics:', error);
        showToast('Fehler beim Laden der Statistiken', 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Modal Functions
function showModal(title) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEditId = null;
}

// Toast Notification
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

// HTML Escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
