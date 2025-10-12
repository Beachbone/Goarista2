# Beitragen zu Goarista2

Vielen Dank für dein Interesse, zu Goarista2 beizutragen! Dieses Dokument enthält Richtlinien für Contributions.

## Inhaltsverzeichnis
- [Code of Conduct](#code-of-conduct)
- [Wie kann ich beitragen?](#wie-kann-ich-beitragen)
- [Development Setup](#development-setup)
- [Coding-Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

Sei respektvoll und konstruktiv in allen Interaktionen.

---

## Wie kann ich beitragen?

### Fehler melden (Bug Reports)

**Bevor du einen Bug meldest:**
1. Prüfe ob der Bug bereits gemeldet wurde ([GitHub Issues](https://github.com/Beachbone/Goarista2/issues))
2. Stelle sicher, dass du die neueste Version verwendest
3. Versuche den Bug zu reproduzieren

**Bug-Report sollte enthalten:**
- **Titel:** Kurze, präzise Beschreibung
- **Beschreibung:** Detaillierte Erklärung des Problems
- **Schritte zur Reproduktion:** 
  1. Gehe zu '...'
  2. Klicke auf '...'
  3. Scrolle zu '...'
  4. Fehler tritt auf
- **Erwartetes Verhalten:** Was sollte passieren?
- **Aktuelles Verhalten:** Was passiert stattdessen?
- **Screenshots/Logs:** Falls relevant
- **Umgebung:**
  - OS: [z.B. Windows 11, Debian 11]
  - Browser: [z.B. Chrome 120]
  - Backend-Version: [z.B. 0.7.5]

**Template:**
```markdown
**Beschreibung:**
[Klare Beschreibung des Problems]

**Schritte zur Reproduktion:**
1. 
2. 
3. 

**Erwartetes Verhalten:**
[Was sollte passieren]

**Aktuelles Verhalten:**
[Was passiert stattdessen]

**Umgebung:**
- OS: 
- Browser: 
- Version: 

**Logs/Screenshots:**
[Anhängen falls vorhanden]
```

---

### Features vorschlagen

**Feature-Request sollte enthalten:**
- **Problem/Motivation:** Welches Problem löst das Feature?
- **Vorgeschlagene Lösung:** Wie könnte es implementiert werden?
- **Alternativen:** Welche anderen Ansätze gibt es?
- **Zusätzlicher Kontext:** Screenshots, Mockups, Links

---

### Code beitragen

#### 1. Development Setup

Siehe [SETUP.md](docs/SETUP.md) für:
- Backend-Installation (FreePascal/Lazarus)
- Frontend-Setup
- Datenbank-Konfiguration

#### 2. Branch erstellen

```bash
git checkout -b feature/dein-feature-name
# oder
git checkout -b bugfix/dein-bugfix-name
```

**Branch-Naming-Konvention:**
- `feature/` - Neue Features
- `bugfix/` - Bugfixes
- `hotfix/` - Dringende Fixes
- `docs/` - Dokumentation
- `refactor/` - Code-Refactoring

#### 3. Änderungen committen

```bash
git add .
git commit -m "Type: Kurze Beschreibung"
```

**Commit-Message-Format:**
```
Type: Kurze Beschreibung (max. 50 Zeichen)

Längere Beschreibung falls nötig (max. 72 Zeichen pro Zeile).
Erkläre WARUM die Änderung gemacht wurde, nicht WAS geändert wurde.

Fixes #123
```

**Commit-Types:**
- `feat:` - Neues Feature
- `fix:` - Bugfix
- `docs:` - Dokumentation
- `style:` - Formatierung, keine Code-Änderung
- `refactor:` - Code-Refactoring
- `test:` - Tests hinzufügen/ändern
- `chore:` - Build-Process, Dependencies

**Beispiele:**
```
feat: Add radio groups management page

Implemented full CRUD interface for radio groups in admin panel.
Includes table view, create/edit modal, and delete confirmation.

Closes #45

---

fix: Correct ingredient selection in meal set edit

Ingredients were not pre-selected when editing meal sets due to 
incorrect parsing of API response array.

Fixes #67

---

docs: Update API documentation for events endpoints

Added missing POST /admin/events/deactivate endpoint and examples.
```

#### 4. Tests ausführen

**Backend:**
```bash
# Kompilieren und Warnings prüfen
fpc -vw orderserver.lpr

# API-Tests (PowerShell)
.\test-api.ps1
```

**Frontend:**
```bash
# Browser DevTools Console
# Alle Seiten durchklicken
# Fehler prüfen
```

#### 5. Push & Pull Request

```bash
git push origin feature/dein-feature-name
```

Dann auf GitHub:
1. "Create Pull Request"
2. Template ausfüllen
3. Reviewer zuweisen (optional)

---

## Coding-Standards

### Backend (FreePascal)

#### Code-Style

```pascal
// PascalCase für Typen
type
  TOrderManager = class
    // ...
  end;

// camelCase für Variablen
var
  orderCount: Integer;
  
// UPPER_CASE für Konstanten
const
  MAX_ORDERS = 100;

// Einrückung: 2 Spaces
procedure CreateOrder(const TableNumber: string);
begin
  if TableNumber <> '' then
  begin
    // Code hier
  end;
end;
```

#### Kommentare

```pascal
{ Erstellt eine neue Bestellung
  @param TableNumber Tischnummer als String
  @param Items Array von Bestellpositionen
  @returns Order-ID oder -1 bei Fehler
  @raises Exception Bei Datenbankfehler }
function CreateOrder(const TableNumber: string; 
  const Items: TOrderItems): Integer;
```

#### Error-Handling

```pascal
// Immer try-except verwenden
try
  Query.ExecSQL;
except
  on E: Exception do
  begin
    WriteLn('ERROR: ', E.Message);
    Response.Code := 500;
    Exit;
  end;
end;
```

#### SQL-Queries

```pascal
// IMMER Prepared Statements verwenden
Query.SQL.Text := 'SELECT * FROM orders WHERE id = :id';
Query.ParamByName('id').AsInteger := OrderID;
Query.Open;

// NIEMALS String-Concatenation
// BAD:
Query.SQL.Text := 'SELECT * FROM orders WHERE id = ' + IntToStr(OrderID);
```

---

### Frontend (JavaScript)

#### Code-Style

```javascript
// camelCase für Variablen und Funktionen
let orderCount = 0;
function loadOrders() { }

// PascalCase für Klassen
class OrderManager { }

// UPPER_CASE für Konstanten
const API_BASE_URL = 'http://localhost:8080/api';

// Einrückung: 4 Spaces (oder 2, konsistent)
function createOrder(tableNumber) {
    if (tableNumber) {
        // Code hier
    }
}
```

#### Async/Await

```javascript
// IMMER async/await statt Promises
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const orders = await response.json();
        return orders;
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Fehler beim Laden', 'error');
        return [];
    }
}
```

#### Kommentare

```javascript
/**
 * Lädt alle Bestellungen vom Backend
 * @async
 * @param {string} [status] - Optional: Filter nach Status
 * @returns {Promise<Array>} Array von Order-Objekten
 * @throws {Error} Bei Netzwerkfehler
 */
async function loadOrders(status) {
    // Implementation
}
```

#### HTML-Escaping

```javascript
// IMMER User-Input escapen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Verwendung:
element.innerHTML = `<p>${escapeHtml(userInput)}</p>`;
```

---

### CSS

#### Naming

```css
/* BEM-Notation verwenden */
.block { }
.block__element { }
.block--modifier { }

/* Beispiel: */
.order-card { }
.order-card__header { }
.order-card__body { }
.order-card--pending { }
```

#### CSS Custom Properties

```css
/* Farben als CSS Variables */
:root {
    --primary-color: #2563eb;
    --success-color: #10b981;
    --danger-color: #dc2626;
}

.button {
    background: var(--primary-color);
}
```

---

## Pull Request Process

### PR-Template

```markdown
## Beschreibung
[Kurze Beschreibung der Änderungen]

## Typ der Änderung
- [ ] Bugfix
- [ ] Neues Feature
- [ ] Breaking Change
- [ ] Dokumentation

## Checklist
- [ ] Code folgt Coding-Standards
- [ ] Kommentare hinzugefügt wo nötig
- [ ] Dokumentation aktualisiert
- [ ] Keine neuen Warnings
- [ ] Tests bestehen (falls vorhanden)
- [ ] Selbst getestet (Browser/OS/Device)

## Testing
**Getestet auf:**
- [ ] Windows 10/11
- [ ] Linux (Debian/Ubuntu)
- [ ] Chrome
- [ ] Firefox
- [ ] Mobile (iOS/Android)

**Test-Schritte:**
1. 
2. 
3. 

## Screenshots
[Falls UI-Änderungen]

## Related Issues
Closes #[Issue-Nummer]
```

### Review-Prozess

1. **Automatische Checks:** 
   - Code-Kompilierung erfolgreich
   - Keine Merge-Konflikte

2. **Code-Review:**
   - Coding-Standards eingehalten
   - Keine offensichtlichen Bugs
   - Dokumentation vorhanden

3. **Testing:**
   - Feature funktioniert wie beschrieben
   - Keine Regressions

4. **Merge:**
   - Squash & Merge (falls mehrere kleine Commits)
   - Merge Commit (bei größeren Features)

---

## Dokumentation

### Wo dokumentieren?

- **API-Änderungen:** `docs/API.md` updaten
- **Neue Features:** `docs/FEATURES.md` updaten
- **Setup-Änderungen:** `docs/SETUP.md` updaten
- **Breaking Changes:** `CHANGELOG.md` updaten

### Dokumentations-Standard

```markdown
## Feature-Name

### Beschreibung
[Was macht das Feature?]

### Verwendung
[Wie wird es verwendet?]

### Beispiel
[Code-Beispiel]

### Parameter/Optionen
[Falls relevant]

### Siehe auch
[Links zu verwandten Themen]
```

---

## Projekt-Struktur verstehen

```
Goarista2/
├── backend/              # FreePascal Backend
│   ├── orderserver.lpr   # Hauptprogramm
│   └── orders.db         # SQLite DB
├── admin/                # Admin Web-Interface
│   ├── admin-interface.html
│   ├── css/
│   └── js/
├── pwa-service/          # Service PWA
│   ├── index.html
│   ├── manifest.json
│   └── service-worker.js
└── docs/                 # Dokumentation
    ├── SETUP.md
    ├── API.md
    ├── FEATURES.md
    └── ARCHITECTURE.md
```

**Wo finde ich was?**
- **REST-API-Endpunkte:** `backend/orderserver.lpr`
- **Admin CRUD-Manager:** `admin/js/crud-managers.js`
- **Admin UI-Controller:** `admin/js/admin-interface.js`
- **PWA QR-Scanner:** `pwa-service/js/qr-scanner.js`
- **Datenbank-Schema:** `backend/orders.db` (mit DB Browser öffnen)

---

## Häufige Aufgaben

### Neuen API-Endpunkt hinzufügen

**1. Backend (orderserver.lpr):**
```pascal
// In HandleAdminEndpoints:
if Resource = 'new-endpoint' then
begin
  case ARequest.Method of
    'GET': HandleNewEndpointGet(ARequest, AResponse);
    'POST': HandleNewEndpointPost(ARequest, AResponse);
  end;
end;
```

**2. Frontend (crud-managers.js):**
```javascript
class NewEndpointManager extends BaseAPIClient {
  constructor() {
    super('/admin/new-endpoint');
  }
}

const CRUD = {
  // ...
  newEndpoint: new NewEndpointManager()
};
```

**3. Dokumentation (docs/API.md):**
```markdown
### New Endpoint

#### GET /admin/new-endpoint
[Beschreibung]
```

---

### Neue Admin-Seite hinzufügen

**1. HTML (admin-interface.html):**
```html
<button class="nav-item" data-page="newpage">
    🆕 New Page
</button>
```

**2. JavaScript (admin-interface.js):**
```javascript
function loadPage(page) {
  switch(page) {
    // ...
    case 'newpage':
      loadNewPage();
      break;
  }
}

async function loadNewPage() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="content-header">
      <h2>New Page</h2>
    </div>
    <div class="card">
      <!-- Content -->
    </div>
  `;
}
```

---

### Datenbank-Schema ändern

**1. SQL-Migration schreiben:**
```sql
-- migrations/001_add_new_column.sql
ALTER TABLE ingredients ADD COLUMN new_field TEXT DEFAULT '';
```

**2. Migration dokumentieren:**
- In `CHANGELOG.md` unter "Migration-Guides"
- In `docs/SETUP.md` unter "Datenbank Setup"

**3. Backend-Code anpassen:**
```pascal
// In Queries:
Query.SQL.Text := 'SELECT id, name, new_field FROM ingredients';
```

---

## Fragen?

Bei Fragen oder Unklarheiten:
1. Bestehenden Code anschauen (Beispiele)
2. Dokumentation lesen (`docs/`)
3. GitHub Issues durchsuchen
4. Neue Issue erstellen mit `[Question]` Prefix

---

## Lizenz

Durch das Beitragen stimmst du zu, dass deine Beiträge unter der gleichen Lizenz wie das Projekt lizenziert werden.

---

**Vielen Dank für deine Contributions! 🎉**
