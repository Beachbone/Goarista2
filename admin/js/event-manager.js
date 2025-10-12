// ============================================
// EVENT MANAGEMENT - Separate Module
// Version 1.0
// ============================================

// Globale Variable für aktuelles Edit
let currentEventEditId = null;


// Helper für sicheres Datums-Parsing mit Punkt-Trennzeichen
function formatEventDate(dateString) {
    if (!dateString) return '-';
    
    try {
        let date;
        
        // Verschiedene Formate unterstützen
        if (dateString.includes('-')) {
            const parts = dateString.split('-');
            
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // ISO-Format: YYYY-MM-DD
                    date = new Date(dateString);
                } else {
                    // Deutsches Format: DD-M-YY oder DD-MM-YYYY
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    let year = parseInt(parts[2]);
                    
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                    
                    date = new Date(year, month, day);
                }
            }
        } else {
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    } catch (error) {
        console.error('Date parsing error:', error, dateString);
        return dateString;
    }
}

// Helper: Konvertiere Datum für date-Input (erwartet YYYY-MM-DD)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    try {
        let date;
        
        if (dateString.includes('-')) {
            const parts = dateString.split('-');
            
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // Bereits ISO-Format: YYYY-MM-DD
                    return dateString;
                } else {
                    // Deutsches Format: DD-M-YY oder DD-MM-YYYY
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    let year = parseInt(parts[2]);
                    
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                    
                    date = new Date(year, month, day);
                }
            }
        } else {
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Formatiere als YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Date format error:', error, dateString);
        return '';
    }
}

// Event Manager wird nur geladen wenn die Seite aufgerufen wird
async function loadEvents() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="content-header">
            <h2>🎪 Event-Verwaltung</h2>
            <p>Verwalten Sie Veranstaltungen mit spezifischen Gerichten und Zutaten</p>
        </div>
        
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3>Aktives Event</h3>
                <span id="activeEventBadge" class="badge badge-info">Lädt...</span>
            </div>
            <div id="activeEventInfo">
                <div class="spinner"></div>
            </div>
        </div>

        <div class="card">
            <button class="btn btn-primary" onclick="showEventForm()">+ Neues Event</button>
            <div id="eventList" style="margin-top: 16px;">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    await loadEventList();
    await loadActiveEvent();
}

async function loadEventList() {
    try {
        const events = await CRUD.events.getAll();
        
        document.getElementById('eventList').innerHTML = events.length > 0 ? `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Datum</th>
                        <th>Gerichte</th>
                        <th>Status</th>
                        <th>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(event => `
                        <tr>
                            <td><strong>${escapeHtml(event.name)}</strong></td>
                            <td>${formatEventDate(event.event_date)}</td>
                            <td>${event.meal_set_count || 0} Gerichte</td>
                            <td>
                                ${event.is_active 
                                    ? '<span class="badge badge-success">✓ Aktiv</span>' 
                                    : '<span class="badge badge-secondary">Inaktiv</span>'}
                            </td>
                            <td>
                                ${!event.is_active 
                                    ? `<button class="btn btn-success btn-sm" onclick="activateEvent(${event.id})">Aktivieren</button>` 
                                    : `<button class="btn btn-warning btn-sm" onclick="deactivateEvent()">Deaktivieren</button>`}
                                <button class="btn btn-primary btn-sm" onclick="editEvent(${event.id})">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteEvent(${event.id})">Löschen</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary); padding: 16px;">Keine Events vorhanden</p>';
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('eventList').innerHTML = 
            '<p style="color: var(--danger-color);">Fehler beim Laden der Events</p>';
        showToast('Fehler beim Laden der Events', 'error');
    }
}

async function showEventForm(eventId = null) {
    currentEventEditId = eventId;
    
    try {
        const mealSets = await CRUD.mealSets.getAll();
        
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="form-group">
                <label for="eventName">Event Name *</label>
                <input type="text" id="eventName" placeholder="z.B. Schlachtfest 2025" required>
            </div>
            <div class="form-group">
                <label for="eventDescription">Beschreibung</label>
                <textarea id="eventDescription" rows="3" placeholder="Optionale Beschreibung"></textarea>
            </div>
            <div class="form-group">
                <label for="eventDate">Datum</label>
                <input type="date" id="eventDate">
            </div>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
            
            <div class="form-group">
                <label>
                    <strong>Verfügbare Komplettgerichte</strong>
                    <span style="font-weight: normal; color: var(--text-secondary); margin-left: 8px;">
                        (${mealSets.length} gesamt)
                    </span>
                </label>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                    Die Zutaten der ausgewählten Gerichte sind automatisch verfügbar.
                </p>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="selectAllMealSets(true)">Alle auswählen</button>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="selectAllMealSets(false)">Alle abwählen</button>
                </div>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; background: var(--background);">
                    ${mealSets.length > 0 ? mealSets.map(ms => `
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="ms_${ms.id}" class="meal-set-checkbox" value="${ms.id}">
                            <label for="ms_${ms.id}">${escapeHtml(ms.name)}</label>
                        </div>
                    `).join('') : '<p style="color: var(--text-secondary); padding: 8px;">Keine Komplettgerichte vorhanden</p>'}
                </div>
            </div>
        `;
        
        // Wenn Edit-Modus: Daten laden

		if (eventId) {
		    const event = await CRUD.events.getById(eventId);
		    document.getElementById('eventName').value = event.name || '';
		    document.getElementById('eventDescription').value = event.description || '';
		    document.getElementById('eventDate').value = formatDateForInput(event.event_date); // GEÄNDERT
		    
		    // Checkboxen setzen
		    if (event.meal_sets && Array.isArray(event.meal_sets)) {
		        event.meal_sets.forEach(msId => {
		            const cb = document.getElementById(`ms_${msId}`);
		            if (cb) cb.checked = true;
		        });
		    }
		}
        
        showModal(eventId ? 'Event bearbeiten' : 'Neues Event');
        document.getElementById('modalSubmit').onclick = saveEvent;
        
    } catch (error) {
        console.error('Error showing event form:', error);
        showToast('Fehler beim Laden des Formulars', 'error');
    }
}

// Helper-Funktion vereinfacht - nur noch für Meal Sets
function selectAllMealSets(select) {
    document.querySelectorAll('.meal-set-checkbox').forEach(cb => {
        cb.checked = select;
    });
}


async function saveEvent() {
    const data = {
        name: document.getElementById('eventName').value.trim(),
        description: document.getElementById('eventDescription').value.trim(),
        event_date: document.getElementById('eventDate').value,
        meal_sets: Array.from(document.querySelectorAll('.meal-set-checkbox:checked')).map(cb => parseInt(cb.value))
    };
    
    if (!data.name) {
        showToast('Bitte Event-Name eingeben', 'error');
        return;
    }
    
    if (data.meal_sets.length === 0) {
        showToast('Bitte mindestens ein Komplettgericht auswählen', 'error');
        return;
    }
    
    try {
        if (currentEventEditId) {
            await CRUD.events.update(currentEventEditId, data);
            showToast('Event aktualisiert', 'success');
        } else {
            await CRUD.events.create(data);
            showToast('Event erstellt', 'success');
        }
        closeModal();
        loadEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
}

async function activateEvent(eventId) {
    if (!confirm('Dieses Event aktivieren?\n\nDas derzeit aktive Event wird deaktiviert und nur die Gerichte/Zutaten dieses Events sind verfügbar.')) {
        return;
    }
    
    try {
        await CRUD.events.activate(eventId);
        showToast('Event aktiviert', 'success');
        loadEvents();
    } catch (error) {
        console.error('Error activating event:', error);
        showToast('Fehler beim Aktivieren: ' + error.message, 'error');
    }
}

async function deactivateEvent() {
    if (!confirm('Event deaktivieren?\n\nAlle Gerichte und Zutaten werden wieder verfügbar.')) {
        return;
    }
    
    try {
        await CRUD.events.deactivate();
        showToast('Event deaktiviert', 'success');
        loadEvents();
    } catch (error) {
        console.error('Error deactivating event:', error);
        showToast('Fehler beim Deaktivieren: ' + error.message, 'error');
    }
}

async function editEvent(id) {
    await showEventForm(id);
}

async function deleteEvent(id) {
    if (!confirm('Event wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        await CRUD.events.delete(id);
        showToast('Event gelöscht', 'success');
        loadEvents();
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Fehler beim Löschen: ' + error.message, 'error');
    }
}

async function loadActiveEvent() {
    try {
        const activeEvent = await CRUD.events.getActive();
        const badge = document.getElementById('activeEventBadge');
        const info = document.getElementById('activeEventInfo');
        
        if (!badge || !info) return;
        
        if (activeEvent && activeEvent.length > 0) {
            const event = activeEvent[0];
            badge.textContent = `✓ ${event.name}`;
            badge.className = 'badge badge-success';
            info.innerHTML = `
                <div style="display: flex; align-items: start; gap: 16px;">
                    <div style="flex: 1;">
                        <p><strong>${escapeHtml(event.name)}</strong></p>
	                    ${event.description ? `<p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">${escapeHtml(event.description)}</p>` : ''}
						${event.event_date ? `<p style="color: var(--text-secondary); font-size: 14px; margin-top: 4px;">📅 ${formatEventDate(event.event_date)}</p>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 14px; color: var(--text-secondary);">
                            ${event.meal_set_count || 0} Gerichte
                        </p>
                    </div>
                </div>
            `;
        } else {
            badge.textContent = 'Kein Event aktiv';
            badge.className = 'badge badge-info';
            info.innerHTML = '<p style="color: var(--text-secondary);">Kein Event ausgewählt - alle Gerichte verfügbar</p>';
        }
    } catch (error) {
        console.error('Error loading active event:', error);
        const badge = document.getElementById('activeEventBadge');
        const info = document.getElementById('activeEventInfo');
        if (badge) {
            badge.textContent = 'Fehler';
            badge.className = 'badge badge-danger';
        }
        if (info) {
            info.innerHTML = '<p style="color: var(--danger-color);">Fehler beim Laden des aktiven Events</p>';
        }
    }
}

console.log('Event Manager loaded successfully');
