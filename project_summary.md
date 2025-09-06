# QR-Bestellsystem - Aktueller Projektstand

## Projektübersicht
Entwicklung eines webbasierten QR-Bestellsystems für Schlachtfeste mit FreePascal/ZEOS Backend und HTML5/JavaScript Frontend-Komponenten.

**Geschätzte Gesamtzeit:** 130-185 Stunden (9-13 Wochen bei 10-15h/Woche)
**Aktueller Fortschritt:** ~65% der Gesamtfunktionalität implementiert

## Technologie-Stack

### Backend:
- **Sprache:** FreePascal (Object Pascal) 
- **HTTP-Server:** fpHTTP mit CORS-Support
- **Datenbank:** SQLite3 mit ZEOS Database Objects
- **JSON:** fpjson für Request/Response-Handling
- **Platform:** Windows/Linux Cross-Platform

### Frontend:
- **Service-App:** HTML5/JavaScript PWA
- **QR-Scanner:** ZXing-js Library  
- **UI-Framework:** Vanilla CSS/JS (keine Dependencies)
- **API-Communication:** Fetch API mit Retry-Logic

### Deployment:
- **Entwicklung:** Windows 11 mit Lazarus IDE
- **Produktion:** Linux Thinclient geplant
- **Frontend-Delivery:** Lighttpd/Nginx für statische Files
- **API-Zugriff:** REST über Fetch API

## Implementierungsstatus

### ✅ Phase 1: Backend-Grundlage (100% ABGESCHLOSSEN)
- **HTTP-Server:** FreePascal + fpHTTP mit CORS-Support
- **Datenbank:** SQLite3 mit 9 Tabellen
- **REST API:** 15+ funktionale Endpunkte
- **JSON-Handling:** Vollständige Request/Response-Verarbeitung
- **Fehlerbehandlung:** Robuste Exception-Behandlung und Logging

**Datenbank-Schema:**
- `orders`, `order_items` - Bestellungen und Positionen
- `tables` - Tischkonfiguration  
- `categories` - Farbgruppen für UI
- `ingredients` - Einzelne Zutaten mit Inventar-Management
- `meal_sets`, `meal_set_ingredients` - Komplettgerichte und Zuordnungen
- `dishes` - Legacy-Gerichte (Kompatibilität)
- `ingredient_stats`, `meal_set_stats` - Verkaufsstatistiken

### ✅ Phase 2: Service-App (85% ABGESCHLOSSEN)
- **PWA:** Vollständig funktionsfähige Progressive Web App
- **QR-Scanner:** ZXing-Integration mit Kamera-Zugriff
- **Touch-optimierte UI:** Mobile-first Design
- **Backend-Integration:** Dynamisches Laden von Tischen
- **Timer-System:** Automatische Tisch-Session-Verwaltung (5 Min.)
- **Offline-Fallback:** Lokale Test-Tische wenn Server nicht erreichbar
- **Konfigurierbare API-URL:** Admin kann Backend-URL ändern
- **Service Worker:** PWA-Installation möglich

**Noch offen:**
- HTTPS-Testing für mobile Kamera
- Cross-Device-Testing

### ✅ Admin-Backend API (92% ABGESCHLOSSEN)
**Test-Status:** 24/26 Tests bestehen (92% Erfolgsquote)

**Vollständig funktional:**
- **Categories:** GET/POST/PUT/DELETE (CRUD komplett)
- **Ingredients:** GET/POST/PUT/DELETE (CRUD komplett)  
- **Meal Sets:** GET/POST/PUT/DELETE (CRUD komplett)
- **Inventory:** GET/PUT/POST (Bulk-Updates, Reset-Operationen)

**Verbleibende "Fehler" (gewolltes Verhalten):**
- Delete Category With Ingredients: 400 Error (korrekt - verhindert Dateninkonsistenz)
- Delete Used Ingredient: 400 Error (korrekt - verhindert Dateninkonsistenz)

**API-Endpunkte verfügbar:**
```
GET  /api/health                 - Server-Status
GET  /api/orders                 - Bestellungen abrufen
POST /api/orders                 - Bestellung erstellen  
PUT  /api/orders/{id}/status     - Bestellstatus ändern
GET  /api/tables                 - Tische abrufen
GET  /api/categories             - Farbgruppen für UI
GET  /api/ingredients            - Alle/gefilterte Zutaten
GET  /api/meal-sets              - Komplettgerichte
GET  /api/stats                  - Verkaufsstatistiken

Admin-Endpunkte:
GET/POST/PUT/DELETE /api/admin/categories
GET/POST/PUT/DELETE /api/admin/ingredients  
GET/POST/PUT/DELETE /api/admin/meal-sets
GET/PUT/POST        /api/admin/inventory
```

**Helper-Funktionen implementiert:**
- `ExtractResourceId()` - URL-ID-Extraktion
- `GetPathSegment()` - URL-Segment-Parsing  
- `IsValidResourceId()` - ID-Validierung

### ⚠️ Noch nicht begonnen:

#### Phase 3: Küchen-Display (0%)
- Server-Sent Events (SSE) für Live-Updates
- Bestellungsübersicht mit Echzeit-Anzeige
- Status-Management (in Arbeit, fertig, ausgegeben)
- Drucker-Integration für Bon-Druck

#### Phase 4: Bestellstation-Interface (0%)
- Komplettgericht-Auswahl mit Farbkodierung
- Einzelzutaten-Modus für Custom-Bestellungen
- Live-Preisberechnung
- QR-Code-Generierung
- **Dynamisches Layout-System** (kritischer Punkt)

#### Phase 5: Admin-Frontend (0% - NÄCHSTER SCHRITT)
- Dashboard mit System-Übersicht
- CRUD-Interface für alle Entitäten
- Inventar-Management Interface
- **Layout-Editor für Bestellstation** (komplexester Teil)

## Aktuelle Herausforderungen

### 1. Dynamisches Layout-System für Bestellstation
**Problem:** Flexible Button-Anordnung für verschiedene Menü-Größen ohne manuelle Anpassung

**Lösungsansatz:** Layout-Editor basierend auf Tischplan-Konzept
- Grid-basierte Button-Positionierung
- Drag & Drop für Anordnung
- Button-Typen: meal_set, ingredient, category_header, empty
- JSON-Konfiguration für Layout-Speicherung

**Hardware-Kontext:**
- Zielgerät: 10" Touch-Display
- Mausbedienung für Editor (nicht touch-optimiert)
- Feste Button-Größen aus Lazarus-System übernehmen

### 2. Admin-Frontend Architektur-Entscheidungen
**Technologie:** Vanilla HTML/CSS/JS (keine Framework-Dependencies)
**Deployment:** Statische Files über Lighttpd/Nginx + REST API calls
**Zielgeräte:** Desktop/Tablet (nicht Mobile-optimiert)

**Workflow-Abhängigkeiten:**
1. Kategorien definieren → Farbzuordnung
2. Zutaten/Komplettgerichte anlegen → Content für Buttons  
3. Layout erstellen → Button-Positionen + Zuordnungen
4. Bestellstation generieren → Finale UI

## Bestellsystem-Daten (Aus Pascal-Original übernommen)

### Kategorien (4):
1. Brot & Brötchen (#33B1E4)
2. Soßen & Beilagen (#83BCBA)  
3. Schlachtplatte (#B0EDEA)
4. Hauptgerichte (#6DB58B)

### Zutaten (18):
- BrÖtchen (0.60€), Brot (0.60€)
- Kartoffelsalat (2.00€), Jäger (0.70€), Sauerkraut (2.00€), Zwiebeln (0.70€)
- 1x/2x Leberwurst (1.60€/3.20€), 1x/2x Blutwurst (1.60€/3.20€)
- 1x/2x Schwartenmagen (3.00€/6.00€), 1x/2x Wellfleisch (3.20€/6.40€)
- Chilli (8.00€), Bratwurst (2.40€), Schnitzel (9.70€), Gehacktes (8.20€)

### Komplettgerichte (6):
1. Gehacktes = Brötchen + Gehacktes
2. Schlachtplatte = Brot + Sauerkraut + Leberwurst + Blutwurst + Schwartenmagen + Wellfleisch
3. Schnitzel = Brötchen + Schnitzel  
4. Bratwurst = Brötchen + Bratwurst
5. Chilli = Brötchen + Chilli
6. Wellfleisch = Brot + Sauerkraut + 2x Wellfleisch

## Entwicklungsumgebung

### Aktueller Code:
- **orderserver.lpr:** Vollständiger Backend-Server (24/26 Tests bestehen)
- **Service-App:** PWA mit QR-Scanner funktional
- **table-plan-editor.html:** Prototyp für Layout-Editor-Konzept

### Hardware-Setup:
- **Entwicklung:** Windows 11 + Lazarus IDE
- **Zielumgebung:** Linux Thinclient 
- **Bestellstation:** 10" Touch-Display
- **Service-Devices:** Smartphones mit Kamera (HTTPS erforderlich)

## Nächste Prioritäten

### Sofort (Admin-Frontend):
1. **Grundlegende Admin-UI** - Dashboard und Navigation
2. **CRUD-Interfaces** - für Categories, Ingredients, Meal Sets
3. **Layout-Editor** - Button-Positionierung für Bestellstation
4. **Farbsystem-Management** - CSS Custom Properties + Color Picker

### Mittelfristig:
1. **Küchen-Display** - Server-Sent Events + Status-Management
2. **Bestellstation** - Dynamisches UI basierend auf Layout-Konfiguration
3. **Integration Testing** - Ende-zu-Ende Workflows

### Architektur-Prinzipien:
- **Keine Framework-Dependencies** - Vanilla JS/CSS für Wartbarkeit
- **Frontend/Backend-Trennung** - Statische Files + REST API
- **Touch-Optimierung** nur wo nötig (Service-App, Bestellstation)
- **Desktop-Fokus** für Admin-Tools
- **Responsive Design** für verschiedene Admin-Bildschirmgrößen

## Geschätzter Restaufwand:
- **Admin-Frontend:** 25-35 Stunden
- **Küchen-Display:** 20-30 Stunden  
- **Bestellstation:** 25-35 Stunden
- **Integration & Testing:** 15-25 Stunden

**Gesamt verbleibend:** 85-125 Stunden (6-9 Wochen)

Das Backend ist production-ready, das Admin-Frontend ist der logische nächste Schritt zur Vervollständigung des Systems.