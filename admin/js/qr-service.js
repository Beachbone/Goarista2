// QR Service JavaScript

// Configuration
const API_BASE_URL = 'http://localhost:8080/api';
let currentTable = null;
let scanner = null;
let deferredPrompt = null;

// PWA Manifest Generator
function createManifest() {
    const manifestData = document.getElementById('manifest-data');
    if (!manifestData) return;
    
    const manifestBlob = new Blob([manifestData.textContent], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = manifestURL;
    document.head.appendChild(manifestLink);
    
    return manifestURL;
}

// Server Connection Check
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            updateConnectionStatus(true);
            await loadTables();
        } else {
            updateConnectionStatus(false);
            loadFallbackTables();
        }
    } catch (error) {
        console.error('Connection check failed:', error);
        updateConnectionStatus(false);
        loadFallbackTables();
    }
}

// Update Connection Status UI
function updateConnectionStatus(isOnline) {
    const indicator = document.querySelector('.status-indicator');
    const statusText = document.getElementById('connectionStatus');
    const infoText = document.getElementById('connectionInfo');
    
    if (indicator) {
        indicator.className = 'status-indicator ' + (isOnline ? 'status-online' : 'status-offline');
    }
    
    if (statusText) {
        statusText.textContent = isOnline ? 'Online' : 'Offline';
    }
    
    if (infoText) {
        infoText.textContent = isOnline 
            ? 'Verbunden mit Server' 
            : 'Offline-Modus - Lokale Testdaten';
    }
}

// Load Tables from Server
async function loadTables() {
    try {
        const response = await fetch(`${API_BASE_URL}/tables`);
        const tables = await response.json();
        
        if (Array.isArray(tables) && tables.length > 0) {
            renderTables(tables);
        } else {
            loadFallbackTables();
        }
    } catch (error) {
        console.error('Failed to load tables:', error);
        loadFallbackTables();
    }
}

// Fallback Tables for Offline Mode
function loadFallbackTables() {
    const fallbackTables = [
        { table_number: 'T1', status: 'available' },
        { table_number: 'T2', status: 'available' },
        { table_number: 'T3', status: 'available' },
        { table_number: 'T4', status: 'available' },
        { table_number: 'T5', status: 'available' },
        { table_number: 'T6', status: 'available' }
    ];
    renderTables(fallbackTables);
}

// Render Tables to Grid
function renderTables(tables) {
    const tableGrid = document.getElementById('tableGrid');
    if (!tableGrid) return;
    
    tableGrid.innerHTML = tables.map(table => `
        <div class="table-card ${table.status === 'occupied' ? 'occupied' : ''}" 
             onclick="selectTable('${table.table_number}')">
            <div class="table-number">${table.table_number}</div>
            <div class="table-status">${table.status === 'occupied' ? 'Besetzt' : 'Frei'}</div>
        </div>
    `).join('');
}

// Select Table
function selectTable(tableNumber) {
    currentTable = tableNumber;
    
    // Remove selection from all tables
    document.querySelectorAll('.table-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked table
    const selectedCard = Array.from(document.querySelectorAll('.table-card'))
        .find(card => card.querySelector('.table-number').textContent === tableNumber);
    
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    console.log('Selected table:', tableNumber);
}

// Start QR Scanner
async function startScanner() {
    const cameraView = document.getElementById('cameraView');
    const video = document.getElementById('qr-video');
    
    if (!cameraView || !video) return;
    
    try {
        cameraView.style.display = 'flex';
        
        // Check if ZXing library is available
        if (typeof ZXing === 'undefined') {
            console.error('ZXing library not loaded');
            alert('QR-Scanner konnte nicht geladen werden. Bitte Seite neu laden.');
            closeScanner();
            return;
        }
        
        const codeReader = new ZXing.BrowserQRCodeReader();
        
        // Get available video devices
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
            alert('Keine Kamera gefunden!');
            closeScanner();
            return;
        }
        
        // Use first available camera (usually back camera on mobile)
        const selectedDeviceId = videoInputDevices[0].deviceId;
        
        scanner = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            video,
            (result, err) => {
                if (result) {
                    console.log('QR Code detected:', result.text);
                    handleQRResult(result.text);
                }
                
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error('Scanner error:', err);
                }
            }
        );
        
    } catch (error) {
        console.error('Failed to start scanner:', error);
        alert('Kamera konnte nicht gestartet werden: ' + error.message);
        closeScanner();
    }
}

// Close Scanner
function closeScanner() {
    const cameraView = document.getElementById('cameraView');
    
    if (scanner) {
        scanner.stop();
        scanner = null;
    }
    
    if (cameraView) {
        cameraView.style.display = 'none';
    }
    
    // Stop all video streams
    const video = document.getElementById('qr-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
}

// Handle QR Code Result
function handleQRResult(qrData) {
    closeScanner();
    
    const qrResult = document.getElementById('qrResult');
    if (qrResult) {
        qrResult.textContent = `QR Code: ${qrData}`;
        qrResult.style.display = 'block';
        
        setTimeout(() => {
            qrResult.style.display = 'none';
        }, 3000);
    }
    
    // Parse QR data (assuming format: order number or table info)
    try {
        const data = JSON.parse(qrData);
        if (data.table) {
            selectTable(data.table);
        }
    } catch (e) {
        // If not JSON, treat as simple table number
        console.log('QR data:', qrData);
    }
    
    // Show confirmation modal
    showConfirmation();
}

// Show Confirmation Modal
function showConfirmation() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.display = 'flex';
        
        const tableInfo = document.getElementById('confirmTableInfo');
        if (tableInfo && currentTable) {
            tableInfo.textContent = `Tisch: ${currentTable}`;
        }
    }
}

// Close Confirmation Modal
function closeConfirmation() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const noteInput = document.getElementById('orderNote');
    if (noteInput) {
        noteInput.value = '';
    }
}

// Submit Order
async function submitOrder() {
    if (!currentTable) {
        alert('Bitte wählen Sie zuerst einen Tisch aus!');
        return;
    }
    
    const noteInput = document.getElementById('orderNote');
    const note = noteInput ? noteInput.value.trim() : '';
    
    const orderData = {
        table_number: currentTable,
        note: note,
        status: 'pending',
        items: [] // In real app, this would contain ordered items
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            showSuccess();
            closeConfirmation();
            currentTable = null;
            
            // Reload tables after short delay
            setTimeout(() => {
                loadTables();
            }, 2000);
        } else {
            const error = await response.json();
            alert('Fehler beim Senden der Bestellung: ' + (error.error || 'Unbekannter Fehler'));
        }
        
    } catch (error) {
        console.error('Submit order failed:', error);
        alert('Bestellung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
    }
}

// Show Success Animation
function showSuccess() {
    const successAnimation = document.getElementById('successAnimation');
    if (successAnimation) {
        successAnimation.style.display = 'block';
        successAnimation.textContent = '✓ Bestellung erfolgreich!';
        
        setTimeout(() => {
            successAnimation.style.display = 'none';
        }, 2000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    createManifest();
    checkConnection();
    
    // Refresh connection status periodically
    setInterval(checkConnection, 30000); // Every 30 seconds
});

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt triggered');
    e.preventDefault();
    deferredPrompt = e;
});

// Note: ServiceWorker disabled - requires separate .js file for production
// For now, PWA works without offline caching
console.log('PWA running without ServiceWorker (requires separate file in production)');

// Mobile viewport handling
function updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

updateViewportHeight();
window.addEventListener('resize', updateViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(updateViewportHeight, 100);
});

// Hide address bar on mobile
function hideAddressBar() {
    if (window.innerHeight < window.outerHeight) {
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);
    }
}

window.addEventListener('load', hideAddressBar);

// Prevent zoom on double-tap for iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);