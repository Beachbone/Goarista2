# Feature-Übersicht

## Inhaltsverzeichnis
- [Backend-Features](#backend-features)
- [Service-App (PWA)](#service-app-pwa)
- [Admin-Interface](#admin-interface)
- [Geplante Features](#geplante-features)

---

## Backend-Features

### ✅ REST API
- **HTTP-Server:** fpHTTP mit CORS-Support
- **JSON-Verarbeitung:** fpjson für alle Requests/Responses
- **Error-Handling:** Strukturierte Fehlerantworten mit HTTP-Status-Codes
- **Logging:** Console-Output für Debugging

### ✅ Datenbank-Management
- **SQLite3:** Leichtgewichtige, dateibasierte Datenbank
- **ZEOS:** Moderne Database Abstraction Layer
- **Transaktionen:** Sichere Multi-Step-Operationen
- **Migrations:** Schema-Updates ohne Datenverlust

**Tabellen:**
```
orders              - Bestellungen
order_items         - Bestellpositionen
tables              - Tisch-Konfiguration
categories          - Farbgruppen
ingredients         - Einzelzutaten
meal_sets           - Komplettgerichte
meal_set_ingredients- Zutat-Zuordnung
radio_groups        - Exklusive Auswahl-Gruppen
events              - Veranstaltungen
event_meal_sets     - Event-Gerichte
ingredient_stats    - Verkaufsstatistiken
meal_set_stats      - Verkaufsstatistiken
```

### ✅ Bestellungs-System
- **Order-Tracking:** Eindeutige Bestellnummern (Format: `YYYYMMDD-NNN`)
- **Status-Management:** `pending` → `preparing` → `ready` → `completed` / `cancelled`
- **Tisch-Zuordnung:** Verknüpfung mit QR-Code
- **Notizen:** Sonderwünsche pro Bestellung/Zutat
- **Zeitstempel:** Automatische `created_at` / `updated_at`

### ✅ Inventar-Management
- **Stock-Tracking:** Lagerbestand pro Zutat
- **Warnschwellen:** Automatische Low-Stock-Warnung
- **Tageslimit:** Max. Verkaufsmenge pro Tag
- **Tagesverkäufe:** Counter für `sold_today`
- **Bulk-Updates:** Mehrere Artikel gleichzeitig aktualisieren
- **Reset-Funktion:** Tagesverkäufe zurücksetzen

### ✅ Event-System
- **Event-Verwaltung:** Name, Beschreibung, Datum
- **Meal Set Zuordnung:** Nur ausgewählte Gerichte verfügbar
- **Aktivierung:** Nur 1 Event kann aktiv sein
- **Filter-Logik:** Frontend zeigt nur Event-Gerichte
- **Deaktivierung:** Alle Gerichte wieder verfügbar

### ✅ Radio Groups
- **Exklusive Auswahl:** Nur 1 Zutat pro Gruppe wählbar
- **Beispiel:** "1x Leberwurst" ODER "2x Leberwurst"
- **Flexible Zuordnung:** Ingredient → Radio Group (optional)
- **UI-Unterstützung:** Frontend zeigt Radio-Buttons statt Checkboxen

### ✅ Preis-System
- **Einzelpreise:** Pro Zutat
- **Komplettgericht-Preise:** 
  - Automatisch: Summe aller Zutaten
  - Festpreis: Überschreibt Summe
- **Live-Berechnung:** Frontend zeigt beide Optionen
- **Dezimal-Genauigkeit:** 2 Nachkommastellen

### ✅ Statistiken
- **Ingredient Stats:** Top-Verkäufe pro Zutat
- **Meal Set Stats:** Top-Verkäufe pro Gericht
- **Zeitbasiert:** Tages-, Wochen-, Monatsansicht möglich
- **Event-Filter:** Nur Daten des aktiven Events

---

## Service-App (PWA)

### ✅ Progressive Web App
- **Offline-fähig:** Service Worker für Offline-Fallback
- **Installierbar:** Add to Homescreen
- **Manifest:** Icons, Namen, Theme-Farben
- **Responsive:** Optimiert für Smartphone-Displays

### ✅ QR-Code-Scanner
- **ZXing-Integration:** Moderne JavaScript-Bibliothek
- **Kamera-Zugriff:** Automatische Berechtigungsanfrage
- **Echtzeit-Scanning:** Live-Vorschau
- **Fallback:** Manuelle Tischnummer-Eingabe

**QR-Code-Format:**
```json
{
  "table": "1",
  "type": "table_qr"
}
```

### ✅ Tisch-Management
- **Automatisches Laden:** Tische vom Backend
- **Timer-System:** 5-Minuten-Session pro Tisch
- **Session-Speicherung:** LocalStorage für aktiven Tisch
- **Offline-Fallback:** Test-Tische wenn Server nicht erreichbar

### ⚠️ Bestellungs-Interface (Teilweise)
- ✅ **Kategorien:** Farbcodierte Buttons
- ✅ **Zutaten:** Touch-optimierte Auswahl
- ⚠️ **Komplettgerichte:** UI vorhanden, Backend-Integration geplant
- ⚠️ **Warenkorb:** UI vorhanden, Funktionalität teilweise
- ⚠️ **Bestellung abschicken:** Grundfunktion vorhanden

### 🔴 Noch nicht implementiert
- Order-Confirmation-Screen
- Order-Status-Tracking für Gäste
- Push-Notifications bei fertigem Essen

---

## Admin-Interface

### ✅ Dashboard
- **Server-Status:** Live-Anzeige (Online/Offline)
- **Aktives Event:** Name, Datum, Meal Set Count
- **Quick-Actions:** Event aktivieren/deaktivieren
- **Statistiken:**
  - Heutige Bestellungen
  - Offene Bestellungen
  - Heutiger Umsatz
  - Gesamt-Umsatz
- **Inventory-Overview:** 
  - Kritische Bestände hervorgehoben
  - Event-Filter aktiv
  - Quick-Refill-Button

### ✅ Categories Management
- **CRUD:** Create, Read, Update, Delete
- **Farbsystem:**
  - Hintergrundfarbe (inaktiv/aktiv)
  - Schriftfarbe (inaktiv/aktiv)
  - Color-Picker für einfache Auswahl
- **Sortierung:** Reihenfolge festlegen
- **Live-Preview:** Farbvorschau in Tabelle

### ✅ Ingredients Management
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Preis
  - Kategorie-Zuordnung
  - Radio Group (optional)
  - Verfügbar (Ja/Nein)
  - Lagerbestand-Tracking (optional)
- **Inventory-Felder (falls aktiviert):**
  - Stock Quantity
  - Min Warning Level
  - Max Daily Limit
  - Sold Today (readonly)
- **Sortierung:** Reihenfolge pro Kategorie

### ✅ Meal Sets Management
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Beschreibung
  - Festpreis (optional, sonst Summe)
  - Verfügbar (Ja/Nein)
  - Sortierung
- **Ingredient-Selection:**
  - Kategorisierte Checkboxen
  - Live-Preisberechnung
  - Zeigt Summe vs. Festpreis
- **Zutat-Count:** Automatische Anzeige in Liste

### ✅ Radio Groups Management
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name (z.B. "Leberwurst")
  - Exclusive (Ja/Nein)
  - Sortierung
- **Info-Box:** Erklärt Funktion für User

### ✅ Events Management
- **CRUD:** Vollständige Verwaltung
- **Felder:**
  - Name, Beschreibung
  - Event-Datum
  - Meal Sets (Multi-Select)
- **Aktivierung:**
  - Nur 1 Event aktiv
  - Button: Aktivieren/Deaktivieren
  - Warnung bei Aktivierung
- **Status-Anzeige:** Badge in Tabelle
- **Meal Set Count:** Automatisch berechnet

### ✅ Orders Management
- **Liste:** Alle Bestellungen
- **Filter:** Nach Status
- **Status-Änderung:** Dropdown in Tabelle
- **Felder angezeigt:**
  - Bestellnummer
  - Tischnummer
  - Status
  - Betrag
  - Erstellt-Datum
- **Actions:** Details-Button (Platzhalter)

### ⚠️ Order Details (95% - nur Modal fehlt)
- 🔴 **Details-Ansicht:** Noch nicht implementiert
- **Geplant:**
  - Alle Order Items
  - Notizen
  - Zeitstempel
  - Bearbeiten/Stornieren

### ✅ Statistics
- **Ingredient Stats:** Top 10 Zutaten
- **Meal Set Stats:** Top 10 Gerichte
- **Event-Filter:** Automatisch wenn Event aktiv
- **Info-Banner:** Zeigt aktives Event
- **Sortierung:** Nach Verkaufszahlen

### ✅ Inventory Dashboard
- **Übersicht:** Alle tracked Items
- **Event-Filter:** Nur Event-Zutaten wenn aktiv
- **Status-Anzeige:**
  - ✅ OK (grün)
  - ⚠️ Niedrig (orange)
  - 🔴 Ausverkauft (rot)
- **Felder:**
  - Name
  - Lagerbestand
  - Warnschwelle
  - Heute verkauft
  - Tageslimit
- **Actions:**
  - Quick-Refill (Popup-Input)
  - Bulk-Update (geplant)
  - Reset Daily Sold

### ✅ UI/UX Features
- **Responsive Design:** Desktop/Tablet optimiert
- **Dark/Light Theme:** CSS Custom Properties
- **Toast-Notifications:** Erfolg/Fehler/Info
- **Modal-Dialoge:** Für Create/Edit-Formulare
- **Confirmation-Dialoge:** Bei Delete/Deactivate
- **Loading-Spinner:** Bei API-Calls
- **Form-Validation:** Client-Side vor Submit
- **Error-Handling:** User-freundliche Fehlermeldungen

---

## Geplante Features

### 🔴 Küchen-Display
- **Server-Sent Events (SSE):** Echtzeit-Updates
- **Bestellungsanzeige:**
  - Neue Bestellungen (rot)
  - In Arbeit (gelb)
  - Fertig (grün)
- **Status-Buttons:** Touch-optimiert
- **Drucker-Integration:** Auto-Print bei neuer Bestellung
- **Vorbestellungen:** Separate Sektion
- **Audio-Alarm:** Bei neuer Bestellung
- **Multi-Screen-Support:** Mehrere Displays gleichzeitig

### 🔴 Bestellstation
- **Touch-Interface:** Optimiert für 10" Display
- **Komplettgerichte:** Farbcodierte Buttons (wie im Original)
- **Einzelzutaten-Modus:** Custom-Bestellungen
- **Live-Preisberechnung:** Summe aktualisiert sich
- **QR-Code-Generierung:** Für Service-App
- **Bon-Druck:** Lokaler Kassendrucker
- **Tageskasse:** Umsatz-Tracking
- **Layout-Editor:** Admin kann Button-Positionen festlegen

### 🔴 Layout-Editor
- **Grid-System:** Drag & Drop Button-Anordnung
- **Button-Typen:**
  - Meal Set
  - Ingredient
  - Category Header
  - Empty (Spacer)
- **JSON-Export:** Konfiguration speichern
- **Preview-Modus:** Layout testen
- **Responsive-Check:** Verschiedene Auflösungen

### 🔴 Erweiterte Admin-Features
- **Benutzer-Verwaltung:** Rollen & Berechtigungen
- **System-Einstellungen:**
  - Drucker-Konfiguration
  - QR-Code-Vorlagen
  - Timer-Werte (Session-Timeout)
- **Export-Funktionen:**
  - Excel-Export (Statistiken)
  - PDF-Reports
  - CSV-Export (Bestellungen)
- **Backup/Restore:** Datenbank-Sicherung im Interface

### 🔴 Service-App Erweiterungen
- **Order-Tracking:** Gast sieht Status der Bestellung
- **Rechnung anfordern:** Button für Abrechnung
- **Feedback:** Bewertung nach Bestellung
- **Mehrsprachigkeit:** DE/EN/FR

### 🔴 Reporting & Analytics
- **Dashboards:**
  - Umsatz-Trends (Tage/Wochen/Monate)
  - Beliebte Zeiten
  - Durchschnittliche Bestellgröße
- **Heatmaps:** Welche Gerichte wann verkauft
- **Forecasting:** Bedarfsprognose für Zutaten

---

## Feature-Prioritäten

### Kritisch (für MVP)
1. ✅ Backend REST API - **FERTIG**
2. ✅ Admin-Interface - **95% FERTIG**
3. ⚠️ Service-App - **85% FERTIG**
4. 🔴 Küchen-Display - **OFFEN**
5. 🔴 Bestellstation - **OFFEN**

### Wichtig (für v1.0)
1. 🔴 Drucker-Integration
2. 🔴 Order Details Modal
3. 🔴 Layout-Editor
4. 🔴 Backup/Restore

### Wünschenswert (für v2.0)
1. 🔴 Benutzer-Verwaltung
2. 🔴 Mehrsprachigkeit
3. 🔴 Analytics-Dashboard
4. 🔴 Mobile Order-Tracking

---

## Technische Highlights

### Performance
- **SQLite-Optimierungen:** WAL-Mode, Memory-Cache
- **Minimal Dependencies:** Keine Framework-Bloat
- **Effiziente Queries:** Optimierte JOINs und INDEXes
- **Lazy-Loading:** Frontend lädt Daten on-demand

### Sicherheit
- **Input-Validation:** Backend & Frontend
- **SQL-Injection-Schutz:** ZEOS Prepared Statements
- **CORS-Policy:** Konfigurierbare Origins
- **HTTPS-Ready:** Production mit SSL/TLS

### Wartbarkeit
- **Modularer Code:** Getrennte CRUD-Manager
- **Konsistente API:** RESTful Patterns
- **Error-Handling:** Strukturierte Fehlerbehandlung
- **Logging:** Debug-Output für Entwicklung

### Skalierbarkeit
- **Stateless-Backend:** Horizontal skalierbar
- **SQLite-Limits:** Bis ~100.000 Orders performant
- **Frontend-Caching:** Browser-Storage für Offline
- **Progressive-Enhancement:** Funktioniert ohne JavaScript-Features

---

## Kompatibilität

### Browser-Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ Mobile Browser (HTTPS erforderlich für Kamera)

### Betriebssysteme
- ✅ Windows 10/11
- ✅ Linux (Debian 11+, Ubuntu 20.04+)
- ⚠️ macOS (theoretisch, nicht getestet)
- ❌ iOS/Android (PWA funktioniert, Native-App geplant)

### Geräte
- ✅ Desktop/Laptop
- ✅ Tablet (10"+)
- ✅ Smartphone (Service-App)
- ✅ Touch-Display (Bestellstation)

---

## Limitierungen

### Bekannte Einschränkungen
- **SQLite:** Nicht geeignet für >100 gleichzeitige Schreibzugriffe
- **Keine Echtzeit:** Polling statt WebSockets/SSE (geplant)
- **Keine Authentifizierung:** Admin-Interface ungeschützt (geplant)
- **Kein Multi-Tenancy:** Ein System = Ein Restaurant

### Geplante Verbesserungen
- Server-Sent Events für Live-Updates
- WebSocket-Support für Echtzeit-Kommunikation
- User-Authentication & Rollen
- Multi-Restaurant-Support via Subdomains
