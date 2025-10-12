# QR-Bestellsystem - Aktueller Projektstand

**Letzte Aktualisierung:** 30. September 2025

## Projektübersicht
Entwicklung eines webbasierten QR-Bestellsystems für Schlachtfeste mit FreePascal/ZEOS Backend und HTML5/JavaScript Frontend-Komponenten.

**Geschätzte Gesamtzeit:** 130-185 Stunden  
**Bereits investiert:** ~98-140 Stunden  
**Verbleibend:** ~32-45 Stunden (2-3 Wochen)  
**Aktueller Fortschritt:** ~75% der Gesamtfunktionalität implementiert

---

## Technologie-Stack

### Backend
- **Sprache:** FreePascal (Object Pascal) 
- **HTTP-Server:** fpHTTP mit CORS-Support
- **Datenbank:** SQLite3 mit ZEOS Database Objects
- **JSON:** fpjson für Request/Response-Handling
- **Platform:** Windows/Linux Cross-Platform

### Frontend
- **Admin-Interface:** HTML5/JavaScript (Vanilla, keine Frameworks)
- **Service-App:** HTML5/JavaScript PWA (Prototyp)
- **QR-Scanner:** ZXing-js Library  
- **UI-Framework:** Vanilla CSS/JS mit CSS Custom Properties
- **API-Communication:** Fetch API mit Retry-Logic

### Deployment
- **Entwicklung:** Windows 11 mit Lazarus IDE
- **Produktion:** Linux Thinclient
- **Frontend-Delivery:** Lighttpd/Nginx für statische Files
- **API-Zugriff:** REST über Fetch API

---

## Implementierungsstatus

### ✅ Phase 1: Backend-Grundlage (100% ABGESCHLOSSEN)

**HTTP-Server:** FreePascal + fpHTTP mit CORS-Support  
**Datenbank:** SQLite3 mit 12 Tabellen  
**REST API:** 30+ funktionale Endpunkte  
**JSON-Handling:** Vollständige Request/Response-Verarbeitung  
**Fehlerbehandlung:** Robuste Exception-Behandlung und Logging

**Datenbank-Schema:**
- `orders`, `order_items` - Bestellungen und Positionen
- `tables` - Tischkonfiguration  
- `categories` - Farbgruppen für UI
- `ingredients` - Einzelne Zutaten mit Inventar-Management
- `meal_sets`, `meal_set_ingredients` - Komplettgerichte und Zuordnungen
- `radio_groups` - Exklusive Auswahl-Gruppen
- `events`, `event_meal_sets`, `event_ingredients` - Event-System
- `ingredient_stats`, `meal_set_stats` - Verkaufsstatistiken
- `dishes` - Legacy-Gerichte (Kompatibilität)

---

### ⚠️ Phase 2: Service-App (PROTOTYP/DEMO - NICHT FUNKTIONAL)

**Status:** Nur Funktionsbeispiel zur Demonstration des Konzepts

**Implementiert (UI/Struktur):**
- PWA-Struktur mit Manifest
- QR-Scanner-Integration (ZXing)
- Touch-optimiertes Layout
- Tisch-Auswahl-Interface
- Bestell-UI-Struktur

**NICHT funktional:**
- ❌ Bestellprozess (nicht mit Backend verbunden)
- ❌ Order-Confirmation
- ❌ Status-Tracking für Gäste
- ❌ Warenkorb-Logik
- ❌ QR-Code-Verarbeitung

**Zweck:** 
- Demonstriert UI/UX-Konzept
- Zeigt technische Machbarkeit (QR-Scanner)
- Basis für zukünftige Implementierung

**Noch offen:**
- Vollständige Backend-Integration
- Bestelllogik implementieren
- HTTPS-Testing für mobile Kamera
- Cross-Device-Testing

---

### ✅ Phase 3: Admin-Backend API (100% ABGESCHLOSSEN)

**Test-Status:** 24/26 Tests erfolgreich  
**Hinweis:** 2 "Fehler" sind gewolltes Verhalten (schützen vor Dateninkonsistenz)

**Vollständig funktional:**
- **Categories:** GET/POST/PUT/DELETE (CRUD komplett)
- **Ingredients:** GET/POST/PUT/DELETE (CRUD komplett)  
- **Meal Sets:** GET/POST/PUT/DELETE (CRUD komplett)
- **Radio Groups:** GET/POST/PUT/DELETE (CRUD komplett)
- **Events:** GET/POST/PUT/DELETE + Activation/Deactivation
- **Inventory:** GET/PUT/POST (Bulk-Updates, Reset-Operationen)
- **Orders:** GET/POST/PUT (Status-Management)
- **Statistics:** GET (Ingredients, Meal Sets, Summary)

**API-Endpunkte (Auswahl):**
```
Health & Info:
GET  /api/health

Public Data:
GET  /api/orders
POST /api/orders
PUT  /api/orders/{id}/status
GET  /api/tables
GET  /api/categories
GET  /api/ingredients
GET  /api/meal-sets
GET  /api/meal-sets/{id}
GET  /api/stats
GET  /api/stats/ingredients
GET  /api/stats/meal-sets

Admin Endpoints:
GET/POST/PUT/DELETE /api/admin/categories
GET/POST/PUT/DELETE /api/admin/ingredients  
GET/POST/PUT/DELETE /api/admin/meal-sets
GET/POST/PUT/DELETE /api/admin/radio-groups
GET/POST/PUT/DELETE /api/admin/events
GET                 /api/admin/events/active
POST                /api/admin/events/{id}/activate
POST                /api/admin/events/deactivate
GET/PUT             /api/admin/inventory
PUT                 /api/admin/inventory/bulk
POST                /api/admin/inventory/reset
```

**Helper-Funktionen implementiert:**
- `ExtractResourceId()` - URL-ID-Extraktion
- `GetPathSegment()` - URL-Segment-Parsing  
- `IsValidResourceId()` - ID-Validierung

---

### ✅ Phase 4: Admin-Frontend (95% ABGESCHLOSSEN)

**Technologie:** Vanilla HTML/CSS/JS (keine Framework-Dependencies)  
**Deployment:** Statische Files über Lighttpd/Nginx + REST API calls  
**Zielgeräte:** Desktop/Tablet (nicht Mobile-optimiert)

#### ✅ Dashboard (100%)
- **Server-Status:** Live-Anzeige (Online/Offline) mit Ping alle 30s
- **Aktives Event:** 
  - Name, Beschreibung, Datum
  - Meal Set Count
  - Quick-Deactivate Button
  - Fallback wenn kein Event aktiv
- **Statistiken:**
  - Heutige Bestellungen
  - Offene Bestellungen (pending + preparing)
  - Heutiger Umsatz
  - Gesamt-Umsatz
- **Inventory-Overview:** 
  - Nur Items mit track_inventory
  - Event-Filter aktiv (nur Event-Zutaten)
  - Status-Badges (OK / Niedrig / Ausverkauft)
  - Critical Stock Warnings
  - Quick-Refill-Button pro Item
  - Reset Daily Sold Button

#### ✅ Categories Management (100%)
- **CRUD:** Create, Read, Update, Delete
- **Farbsystem:**
  - Hintergrundfarbe (inaktiv/aktiv)
  - Schriftfarbe (inaktiv/aktiv)
  - Color-Picker für einfache Auswahl
  - Live-Vorschau in Tabelle
- **Sortierung:** Reihenfolge festlegen
- **Validierung:** Name erforderlich, Farben im Hex-Format

#### ✅ Ingredients Management (100%)
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Preis (required)
  - Kategorie-Zuordnung (Dropdown)
  - Radio Group (optional, Dropdown)
  - Verfügbar (Checkbox)
  - Lagerbestand-Tracking (Checkbox, zeigt/versteckt weitere Felder)
- **Inventory-Felder (conditional):**
  - Stock Quantity
  - Min Warning Level
  - Max Daily Limit
  - Sold Today (readonly, nur Anzeige)
- **Sortierung:** Reihenfolge pro Kategorie
- **Tabelle:** Zeigt Verfügbarkeit und Lagerbestand

#### ✅ Meal Sets Management (100%)
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Beschreibung
  - Festpreis (optional, 0 = Summe verwenden)
  - Verfügbar (Checkbox)
  - Sortierung
- **Ingredient-Selection:**
  - Kategorisierte Checkboxen (alle Ingredients gruppiert)
  - Multi-Select möglich
  - Live-Preisberechnung während Auswahl
  - Zeigt "Berechneter Preis" (Summe) vs "Endpreis" (Festpreis oder Summe)
  - Info-Text erklärt Preislogik
- **Zutat-Count:** Automatische Anzeige in Tabelle
- **Edit:** Lädt zugeordnete Ingredients korrekt (bugfix applied)

#### ✅ Radio Groups Management (100%)
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name (z.B. "Leberwurst")
  - Exclusive (Checkbox, Standard: Ja)
  - Sortierung
- **Info-Box:** Erklärt Funktion und Verwendungszweck
- **Tabelle:** Zeigt Name, Exklusiv-Status, Sortierung

#### ✅ Events Management (100%)
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Beschreibung
  - Event-Datum (Date-Picker)
  - Meal Sets (Multi-Select mit Checkboxen)
- **Aktivierung:**
  - Nur 1 Event kann aktiv sein
  - Activate/Deactivate Buttons in Tabelle
  - Warnung bei Aktivierung ("beschränkt verfügbare Gerichte")
  - Dashboard zeigt aktives Event
- **Status-Anzeige:** 
  - Badge "Aktiv" (grün) in Tabelle
  - Meal Set Count automatisch berechnet
- **Integration:**
  - Dashboard zeigt aktives Event
  - Statistics filtern nach Event
  - Inventory Dashboard filtert nach Event

#### ✅ Orders Management (100%)
- **Liste:** Alle Bestellungen mit Pagination-Option
- **Filter:** Nach Status (über Dropdown in Tabelle)
- **Status-Änderung:** Dropdown direkt in Tabelle
- **Felder angezeigt:**
  - Bestellnummer (Format: YYYYMMDD-NNN)
  - Tischnummer
  - Status (pending/preparing/ready/completed/cancelled)
  - Betrag
  - Erstellt-Datum
- **Actions:** Details-Button (⚠️ Platzhalter)

#### ⚠️ Order Details (95%)
**Status:** Nur Platzhalter - 5% fehlen für 100%

**Implementiert:**
- Button "Details" in Orders-Tabelle
- Funktion `viewOrderDetails(orderId)` vorhanden

**Noch nicht implementiert:**
- Modal mit Order-Details
- Liste aller Order Items
- Notizen anzeigen
- Zeitstempel (created/updated)
- Bearbeiten/Stornieren-Optionen

**Geplant:**
```javascript
function viewOrderDetails(orderId) {
  // TODO: Implement detailed order view
  // - Fetch order with items
  // - Show in modal
  // - Display all items with quantities
  // - Show notes
  // - Enable status changes
  // - Enable order cancellation
}
```

#### ✅ Statistics (100%)
- **Ingredient Stats:** Top 10 Zutaten nach Verkaufszahlen
- **Meal Set Stats:** Top 10 Gerichte nach Verkaufszahlen
- **Event-Filter:** 
  - Automatisch aktiv wenn Event aktiv
  - Zeigt nur Event-relevante Daten
  - Info-Banner erklärt Filterung
- **Sortierung:** Nach Verkaufszahlen (DESC)
- **Tabellen:** Übersichtliche Darstellung mit Name + Count

#### ✅ Inventory Dashboard (100%)
- **Übersicht:** Alle tracked Items
- **Event-Filter:** 
  - Zeigt nur Event-Zutaten wenn Event aktiv
  - Info-Banner mit Event-Name und Zutat-Count
  - Fallback auf alle Items wenn kein Event
- **Status-Anzeige:**
  - ✅ OK (grün) - Bestand über Warnschwelle
  - ⚠️ Niedrig (orange) - Bestand auf/unter Warnschwelle
  - 🔴 Ausverkauft (rot) - Bestand = 0
- **Felder:**
  - Name
  - Lagerbestand (groß, hervorgehoben)
  - Warnschwelle
  - Heute verkauft
  - Tageslimit (∞ wenn 0)
  - Status-Badge
- **Actions:**
  - Quick-Refill (Popup-Input, addiert zur aktuellen Menge)
  - Reset Daily Sold (setzt alle sold_today auf 0)
- **Warnungen:**
  - Alert-Banner bei kritischen Beständen
  - Zeigt Anzahl der Items unter Warnschwelle

#### ✅ UI/UX Features (100%)
- **Responsive Design:** Optimiert für Desktop/Tablet
- **CSS Custom Properties:** Theme-Farben als CSS-Variablen
- **Toast-Notifications:** Erfolg (grün), Fehler (rot), Info (blau)
- **Modal-Dialoge:** Zentriert, Overlay, ESC/Click-Outside schließt
- **Confirmation-Dialoge:** Browser-Native confirm() für kritische Aktionen
- **Loading-Spinner:** Bei allen API-Calls
- **Form-Validation:** Client-Side vor Submit, Fehlermeldungen
- **Error-Handling:** User-freundliche Fehlermeldungen, kein Stack-Trace
- **Navigation:** Sidebar mit Icons, aktiver Zustand hervorgehoben
- **Tabellen:** Zebra-Striping, Hover-Effekte, Action-Buttons rechts

---

### 🔴 Phase 5: Küchen-Display (0% - NICHT BEGONNEN)

**Geplant:**
- **Server-Sent Events (SSE):** Live-Updates für Küche
- **Bestellungsübersicht:** Echzeit-Anzeige neuer Bestellungen
- **Status-Management:** Touch-Buttons für "in Arbeit", "fertig", "ausgegeben"
- **Vorbestellungen:** Separate Sektion für vorbestellte Gerichte
- **Drucker-Integration:** Automatischer Bon-Druck bei neuen Bestellungen
- **Audio-Alarm:** Bei neuer Bestellung
- **Multi-Screen-Support:** Mehrere Displays gleichzeitig

**Geschätzter Aufwand:** 20-30 Stunden

---

### 🔴 Phase 6: Bestellstation-Interface (0% - NICHT BEGONNEN)

**Geplant (basierend auf Pascal-UI):**
- **Komplettgericht-Auswahl:** Wie im Original mit Farbkodierung
- **Einzelzutaten-Modus:** Individuelle Zusammenstellung
- **Preisberechnung:** Live-Kalkulation mit Gesamtsumme
- **QR-Code-Generierung:** Für Service-App-Integration
- **Bon-Druck:** Lokaler Kassendrucker
- **Touch-Optimierung:** 10" Display
- **Dynamisches Layout-System:** (kritischer Punkt - siehe unten)

**Geschätzter Aufwand:** 25-35 Stunden

---

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

**Status:** Noch nicht begonnen

---

### 2. Service-App vollständig implementieren

**Problem:** Aktuell nur UI-Prototyp ohne Funktionalität

**Nötige Schritte:**
1. Backend-Integration implementieren
2. Bestelllogik mit Warenkorb
3. Order-Confirmation-Screen
4. Status-Tracking für Gäste
5. QR-Code-Verarbeitung (Tisch-Zuordnung)
6. Session-Management
7. HTTPS-Setup für mobile Kamera

**Status:** Prototyp vorhanden, Implementierung ausstehend

**Geschätzter Aufwand:** 15-25 Stunden

---

## Entwicklungsstand - Detaillierte Übersicht

### ✅ Produktionsbereit (3 von 6 Phasen)
- ✅ Backend REST API (100%)
- ✅ Datenbank-Schema (100%)
- ✅ Admin-Interface (95%, nur Order Details fehlt)

### ⚠️ Prototyp/Demo (1 von 6 Phasen)
- ⚠️ Service-App PWA (Nur UI-Demo, nicht funktional)

### 🔴 Nicht begonnen (2 von 6 Phasen)
- 🔴 Küchen-Display (0%)
- 🔴 Bestellstation (0%)

---

## Bestellsystem-Daten (Aus Pascal-Original übernommen)

### Kategorien (4)
1. **Brot & Brötchen** (#33B1E4 → #1A3DC7)
2. **Soßen & Beilagen** (#83BCBA → #1A3DC7)
3. **Schlachtplatte** (#B0EDEA → #1A3DC7)
4. **Hauptgerichte** (#6DB58B → #1A3DC7)

### Zutaten (19)
**Brot & Brötchen:**
- Brötchen (0.60€)
- Brot (0.60€)

**Soßen & Beilagen:**
- Kartoffelsalat (2.00€)
- Jäger (0.70€)
- Sauerkraut (2.00€)
- Zwiebeln (0.70€, nicht verfügbar)

**Schlachtplatte:**
- 1x Leberwurst (1.60€) - Radio Group
- 2x Leberwurst (3.20€) - Radio Group
- 1x Blutwurst (1.60€) - Radio Group
- 2x Blutwurst (3.20€) - Radio Group
- 1x Schwartenmagen (3.00€) - Radio Group
- 2x Schwartenmagen (6.00€) - Radio Group
- 1x Wellfleisch (3.20€) - Radio Group
- 2x Wellfleisch (6.40€) - Radio Group

**Hauptgerichte:**
- Chilli (8.00€)
- Bratwurst (2.40€) - Inventory tracked
- Schnitzel (9.70€) - Inventory tracked
- Gehacktes (8.20€) - Inventory tracked
- Zigeuner (1.50€) - Inventory tracked

### Komplettgerichte (7)
1. **Gehacktes** = Brötchen + Gehacktes
2. **Schlachtplatte** = Brot + Sauerkraut + Leberwurst + Blutwurst + Schwartenmagen + Wellfleisch
3. **Schnitzel** = Brötchen + Schnitzel
4. **Bratwurst** = Brötchen + Bratwurst
5. **Chilli** = Brötchen + Chilli (Festpreis: 9.00€)
6. **Wellfleisch** = Brot + Sauerkraut + 2x Wellfleisch
7. **Zigeunerschnitzel** = Brötchen + Schnitzel + Zigeuner

### Radio Groups (4)
1. **Leberwurst** - Exclusive: Ja
2. **Blutwurst** - Exclusive: Ja
3. **Schwartenmagen** - Exclusive: Ja
4. **Wellfleisch** - Exclusive: Ja

### Events (2)
1. **Schlachtfest 2025** - Inaktiv, 6 Gerichte
2. **Kirmessonntag** - Aktiv, 1 Gericht (Zigeunerschnitzel)

---

## Neue Features seit v0.7.0

### ✅ Radio Groups System (100%)
**Backend:**
- CRUD-Endpunkte: `/api/admin/radio-groups`
- Exclusive-Flag für exklusive Auswahl
- Sortierung

**Frontend:**
- Verwaltungsseite mit Tabelle
- Create/Edit Modal
- Delete mit Warning

**Datenbank:**
- `radio_groups` Tabelle
- `ingredients.radio_group_id` (Foreign Key)

**Funktion:**
- Nur eine Zutat aus einer Gruppe kann ausgewählt werden
- Beispiel: "1x Leberwurst" ODER "2x Leberwurst"
- Optional pro Ingredient
- UI kann Radio-Buttons statt Checkboxen anzeigen

---

### ✅ Events System (100%)
**Backend:**
- CRUD-Endpunkte: `/api/admin/events`
- `/api/admin/events/active` - Aktives Event abrufen
- `/api/admin/events/{id}/activate` - Event aktivieren
- `/api/admin/events/deactivate` - Event deaktivieren

**Frontend:**
- Events-Verwaltungsseite mit Tabelle
- Event-Aktivierung (nur 1 Event kann aktiv sein)
- Meal Set Zuordnung (Multi-Select)
- Dashboard zeigt aktives Event mit Quick-Actions
- Statistics und Inventory filtern nach aktivem Event

**Datenbank:**
- `events` Tabelle
- `event_meal_sets` Zuordnungstabelle
- `event_ingredients` Zuordnungstabelle (für Zukunft)

**Funktion:**
- Beschränkt verfügbare Gerichte für spezielle Veranstaltungen
- Automatische Filterung im Admin-Interface
- Dashboard zeigt aktives Event prominent
- Deaktivierung macht alle Gerichte wieder verfügbar

---

### ✅ Meal Sets Festpreis-Option (100%)
**Änderung:**
- `meal_sets.price` Column hinzugefügt
- `price = 0`: Summe der Zutaten wird verwendet (wie vorher)
- `price > 0`: Festpreis überschreibt automatische Summe

**Frontend:**
- Live-Berechnung zeigt beide Optionen
- "Berechneter Preis (Summe)" vs "Endpreis"
- Info-Text erklärt welcher Preis verwendet wird
- Color-Coding (orange für Festpreis, grün für Summe)

**Migration:**
```sql
ALTER TABLE meal_sets ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
```

**Use-Case:**
- Rabatt-Aktionen (Festpreis < Summe)
- Bundle-Angebote
- Vereinfachte Preisgestaltung

---

## Workflow-Abhängigkeiten

### ✅ Abgeschlossen
1. ✅ **Kategorien definieren** → Farbzuordnung (Admin fertig)
2. ✅ **Zutaten anlegen** → Content für Buttons (Admin fertig)
3. ✅ **Komplettgerichte erstellen** → Menü-Kombinationen (Admin fertig)
4. ✅ **Radio Groups zuordnen** → Exklusive Auswahlen (Admin fertig)
5. ✅ **Events erstellen** → Veranstaltungsspezifische Menüs (Admin fertig)

### 🔴 Ausstehend
6. 🔴 **Layout-Editor entwickeln** → Button-Positionen definieren
7. 🔴 **Bestellstation generieren** → Finale UI basierend auf Layout
8. 🔴 **Küchen-Display entwickeln** → Bestellungsanzeige
9. 🔴 **Service-App fertigstellen** → Gäste-Bestellungen

---

## 💡 Ideen & TODOs

### UI/UX Verbesserungen (Priorität: Hoch)
- [ ] **Smart Color Picker:** Bei Auswahl der Grundfarbe werden hover/active/disabled Farben automatisch berechnet
  - Algorithmus: HSL-Manipulation (Helligkeit ±20%, Sättigung ±10%)
  - Vorschau aller generierten Farben
  - "Reset to defaults" Button
  - Expertenmodus mit manueller Anpassung aller Farben

- [ ] **Dashboard: Offene Bestellungen Widget**
  - Zeigt letzte 5-10 offene Bestellungen (pending + preparing)
  - Tischnummer, Bestellnummer, Zeit, Betrag
  - Quick-Status-Change direkt auf Dashboard
  - Live-Update (alle 10s)
  - "Alle anzeigen" Link zu Orders-Seite

- [ ] **Statistiken übersichtlicher gestalten**
  - Chart.js Integration für visuelle Darstellung
  - Line Chart: Umsatz über Zeit (7/30/90 Tage)
  - Bar Chart: Top 10 Gerichte
  - Pie Chart: Umsatz nach Kategorie
  - Date-Range-Picker für flexible Zeiträume
  - Export als PNG/PDF

- [ ] **Dark Mode Toggle**
  - Switch im Header
  - Speichert Präferenz in LocalStorage
  - Respektiert System-Präferenz (prefers-color-scheme)
  - Smooth Transition zwischen Themes

### Features (Priorität: Mittel)
- [ ] **Bulk-Actions für Listen**
  - Checkboxen in Tabellen
  - "Alle auswählen" / "Keine auswählen"
  - Bulk-Delete, Bulk-Availability-Toggle
  - Confirmation mit Anzahl der Items

- [ ] **Export-Funktionen**
  - CSV-Export für Statistiken
  - Excel-Export mit Formatierung
  - PDF-Report-Generator
  - "Drucken"-Button für Tagesübersicht

- [ ] **Global-Search**
  - Search-Bar im Header
  - Sucht über alle Entities (Ingredients, Meal Sets, Orders)
  - Live-Results-Dropdown
  - Keyboard-Navigation (↑↓ Enter)

- [ ] **Favoriten/Shortcuts**
  - Häufig verwendete Gerichte markieren
  - Quick-Create-Buttons auf Dashboard
  - "Recently edited" Section

### Admin-Interface (Priorität: Niedrig)
- [ ] **Drag & Drop Sortierung**
  - Statt Nummern-Eingabe
  - Visual Feedback beim Dragging
  - Speichert automatisch nach Drop

- [ ] **Keyboard-Shortcuts**
  - Strg+S: Speichern (in Forms)
  - ESC: Modal schließen
  - Strg+N: Neues Item erstellen
  - Strg+F: Search fokussieren
  - Tooltip zeigt verfügbare Shortcuts

- [ ] **Undo/Redo für kritische Operationen**
  - Undo-Stack für Delete-Operationen
  - "Rückgängig" Toast-Button (5s)
  - Soft-Delete statt Hard-Delete

- [ ] **Notifications-Center**
  - Bell-Icon im Header mit Badge
  - Sammelt alle Toasts
  - Persistent bis wegklicken
  - Filter nach Typ (Success/Error/Info)

### Technisch (Priorität: Hoch)
- [ ] **WebSocket/SSE für Echtzeit-Updates**
  - Küchen-Display: Live-Bestellungen
  - Dashboard: Live-Statistiken
  - Admin: Concurrent-Edit-Warning

- [ ] **Service Worker für Admin-Interface**
  - Offline-fähiges Admin-Interface
  - Caching-Strategie (Cache-First für Assets)
  - Background-Sync für failed Requests

- [ ] **PWA-Installation für Admin**
  - Manifest.json
  - Install-Prompt
  - Desktop-Icon

- [ ] **Auto-Backup System**
  - Cron-Job: Täglicher DB-Export
  - Speichert letzte 30 Tage
  - Download im Admin-Interface
  - Restore-Funktion

### Testing & Quality (Priorität: Mittel)
- [ ] **Automated Tests**
  - Jest für Frontend Unit-Tests
  - Playwright für E2E-Tests
  - CI/CD Pipeline (GitHub Actions)

- [ ] **Error-Tracking**
  - Sentry Integration
  - Frontend Error-Logger
  - Backend Exception-Logger

- [ ] **Performance-Monitoring**
  - Lighthouse-Score >90
  - Bundle-Size-Optimization
  - Lazy-Loading für große Listen

### Weitere Ideen (TBC)
- [ ] Multi-Language Support (DE/EN/FR)
- [ ] Tablet-optimierte Bestellstation-Preview im Admin
- [ ] QR-Code-Generator direkt im Admin-Interface
- [ ] Printer-Test-Page für Bon-Drucker
- [ ] Nutzer-Verwaltung mit Rollen (Admin, Kitchen, Service)
- [ ] Audit-Log (Wer hat wann was geändert)
- [ ] Email-Notifications bei kritischen Ereignissen
- [ ] API-Rate-Limiting Dashboard
- [ ] Mobile-App (React Native) statt PWA

---

## Nächste Prioritäten

### Sofort (Admin-Interface vervollständigen)
1. **Order Details Modal** - 2-3 Stunden
   - Modal-Layout erstellen
   - Order Items laden und anzeigen
   - Status-Änderung ermöglichen
   - Stornierung ermöglichen

### Kurzfristig (1-2 Wochen)
1. **Dashboard-Verbesserungen** - 3-5 Stunden
   - Offene Bestellungen Widget
   - Smart Color Picker
   - Statistik-Charts

2. **Service-App funktional machen** - 15-25 Stunden
   - Backend-Integration
   - Bestelllogik
   - Order-Confirmation
   - Status-Tracking

### Mittelfristig (3-4 Wochen)
1. **Küchen-Display** - 20-30 Stunden
   - Server-Sent Events
   - Bestellungsanzeige
   - Status-Management
   - Drucker-Integration

2. **Bestellstation** - 25-35 Stunden
   - Touch-Interface
   - Dynamisches Layout-System
   - QR-Code-Generierung
   - Bon-Druck

### Langfristig (nach MVP)
- Layout-Editor für Bestellstation
- Erweiterte Statistiken mit Charts
- Multi-User-Support mit Rollen
- Automatisiertes Testing
- Performance-Optimierungen

---

## Geschätzter Restaufwand

| Phase | Status | Aufwand |
|-------|--------|---------|
| Order Details Modal | 🔴 | 2-3h |
| Service-App funktional | 🔴 | 15-25h |
| Küchen-Display | 🔴 | 20-30h |
| Bestellstation | 🔴 | 25-35h |
| Integration & Testing | 🔴 | 15-25h |
| **Gesamt verbleibend** | | **77-118h** |
| **Bei 10-15h/Woche** | | **5-8 Wochen** |

---

## Entwicklungsumgebung

### Aktueller Code
- **orderserver.lpr:** Vollständiger Backend-Server (100% funktional)
- **Admin-Interface:** HTML/CSS/JS (95% funktional)
- **Service-App:** PWA Prototyp (nur UI-Demo)

### Hardware-Setup
- **Entwicklung:** Windows 11 + Lazarus IDE
- **Zielumgebung:** Linux Thinclient 
- **Bestellstation:** 10" Touch-Display
- **Service-Devices:** Smartphones mit Kamera (HTTPS erforderlich)

---

## Architektur-Prinzipien

- **Keine Framework-Dependencies** - Vanilla JS/CSS für Wartbarkeit
- **Frontend/Backend-Trennung** - Statische Files + REST API
- **Touch-Optimierung** nur wo nötig (Service-App, Bestellstation)
- **Desktop-Fokus** für Admin-Tools
- **Responsive Design** für verschiedene Admin-Bildschirmgrößen
- **Progressive Enhancement** - Core-Funktionalität ohne JavaScript

---

## Dokumentation

Vollständige Dokumentation in `docs/` Verzeichnis:
- **README.md** - Projekt-Übersicht und Schnellstart
- **docs/SETUP.md** - Installation und Deployment
- **docs/FEATURES.md** - Vollständige Feature-Liste
- **docs/API.md** - API-Dokumentation mit Beispielen
- **docs/ARCHITECTURE.md** - Technische Architektur
- **CHANGELOG.md** - Versions-Historie und Migration-Guides
- **CONTRIBUTING.md** - Contribution-Guidelines

---

**Das Backend und Admin-Interface sind production-ready. Die Hauptaufgaben sind nun: Service-App funktional machen, Küchen-Display entwickeln und Bestellstation implementieren.**
