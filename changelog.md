# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

## [Unreleased]

### Geplant
- Küchen-Display mit Server-Sent Events
- Bestellstation mit Touch-Interface
- Layout-Editor für Bestellstation
- Drucker-Integration
- Benutzer-Verwaltung mit Rollen
- Order Details Modal

---

## [0.7.5] - 2025-09-30

### Added
- **Radio Groups System:** Vollständige CRUD-Verwaltung für exklusive Auswahl-Gruppen
  - Backend-Endpunkte: `/api/admin/radio-groups`
  - Frontend-Verwaltungsseite mit Tabelle
  - Zuordnung von Ingredients zu Radio Groups
  - Funktionalität für "nur 1 aus Gruppe wählbar"
  
- **Events System:** Vollständiges Event-Management
  - Backend-Endpunkte: `/api/admin/events`
  - Event-Aktivierung/Deaktivierung
  - Meal Set Zuordnung zu Events
  - Dashboard zeigt aktives Event
  - Filterung von Statistics nach aktivem Event
  - Inventory-Dashboard filtert nach Event-Zutaten

- **Admin-Interface komplett überarbeitet:**
  - Dashboard mit Live-Server-Status
  - Event-Anzeige mit Quick-Actions
  - Inventory-Dashboard mit Event-Filter
  - Categories Management (vollständig)
  - Ingredients Management (vollständig)
  - Meal Sets Management (vollständig)
  - Orders Management mit Status-Änderung
  - Statistics mit Event-Filter

- **Meal Sets Preissystem:**
  - Festpreis ODER automatische Summe
  - `price` Column in DB
  - Live-Preisberechnung im Frontend
  - Migration für bestehende DBs

### Fixed
- **Duplikate in meal_set_ingredients:** SQL-Script zum Bereinigen
- **Ingredient Selection beim Edit:** Meal Sets zeigen jetzt korrekt alle zugeordneten Zutaten
- **SQL-Queries optimiert:** DISTINCT für korrekte Zählungen
- **DB-Berechtigungen:** Dokumentierte Lösung für systemd-Service-Probleme

### Changed
- Backend-Fortschritt: 92% → 100%
- Admin-Frontend-Fortschritt: 0% → 95%
- Gesamtfortschritt: 65% → 75%

### Documentation
- README.md komplett überarbeitet (modulare Struktur)
- SETUP.md erstellt (detaillierte Installation)
- FEATURES.md erstellt (Feature-Übersicht)
- API.md erstellt (vollständige API-Dokumentation)
- ARCHITECTURE.md erstellt (technische Architektur)

---

## [0.7.0] - 2025-09-29

### Added
- **Inventory Management System:**
  - Stock-Tracking pro Zutat
  - Warnschwellen (min_warning_level)
  - Tageslimits (max_daily_limit)
  - Tagesverkäufe (sold_today)
  - Bulk-Update-Funktion
  - Reset-Funktion für Tagesverkäufe

- **Admin API erweitert:**
  - `/api/admin/inventory` - GET für Übersicht
  - `/api/admin/inventory/bulk` - PUT für Bulk-Updates
  - `/api/admin/inventory/reset` - POST für Daily-Reset

### Changed
- `ingredients` Tabelle erweitert um Inventory-Felder
- Backend-Tests: 24/26 bestehen (92%)

---

## [0.6.5] - 2025-09-17

### Added
- **Admin Backend API (CRUD):**
  - `/api/admin/categories` - Vollständiges CRUD
  - `/api/admin/ingredients` - Vollständiges CRUD
  - `/api/admin/meal-sets` - Vollständiges CRUD
  - Error-Handling für Delete-Operationen

- **Statistik-Endpunkte:**
  - `/api/stats` - Allgemeine Statistiken
  - `/api/stats/ingredients` - Top-Zutaten
  - `/api/stats/meal-sets` - Top-Gerichte

- **Database-Schema erweitert:**
  - `ingredient_stats` - Verkaufsstatistiken
  - `meal_set_stats` - Verkaufsstatistiken

### Fixed
- SQL-Injection-Schutz durch ZEOS Prepared Statements
- Referentielle Integrität (Foreign Key Constraints)

---

## [0.6.0] - 2025-09-15

### Added
- **Service-App (PWA):**
  - QR-Code-Scanner mit ZXing-Integration
  - Kamera-Zugriff für QR-Scanning
  - Manuelle Tischnummer-Eingabe (Fallback)
  - Timer-System (5-Min-Session)
  - Offline-Fallback mit Test-Tischen
  - Service Worker für PWA-Installation

- **Tisch-Management:**
  - Automatisches Laden vom Backend
  - Session-Speicherung in LocalStorage
  - Session-Timeout mit Verlängerungs-Option

### Changed
- Frontend-Struktur überarbeitet
- Mobile-First-Design implementiert

---

## [0.5.0] - 2025-09-10

### Added
- **Bestellungs-System (Backend):**
  - POST `/api/orders` - Neue Bestellung erstellen
  - PUT `/api/orders/{id}/status` - Status ändern
  - GET `/api/orders` - Filter nach Status/Tisch
  - Eindeutige Bestellnummern (Format: YYYYMMDD-NNN)

- **Order-Items-Tabelle:**
  - Verknüpfung Order → Ingredients
  - Quantity pro Zutat
  - Notes pro Zutat
  - Unit-Price Snapshot

- **Status-Management:**
  - `pending` - Neu
  - `preparing` - In Arbeit
  - `ready` - Fertig
  - `completed` - Abgeschlossen
  - `cancelled` - Storniert

---

## [0.4.0] - 2025-09-05

### Added
- **Komplettgerichte (Meal Sets):**
  - `meal_sets` Tabelle
  - `meal_set_ingredients` Zuordnungstabelle
  - GET `/api/meal-sets` - Alle Gerichte
  - GET `/api/meal-sets/{id}` - Details mit Zutaten

- **Berechnete Preise:**
  - Automatische Summe aller Zutaten
  - ingredient_count pro Meal Set

### Changed
- Datenbank-Schema erweitert
- Query-Performance optimiert (JOINs)

---

## [0.3.0] - 2025-09-01

### Added
- **Zutaten-System:**
  - `ingredients` Tabelle
  - `categories` Tabelle für Farbgruppen
  - GET `/api/ingredients` - Mit Filter-Optionen
  - GET `/api/categories` - Farbschema

- **Kategorie-Farbsystem:**
  - Separate Farben für aktiv/inaktiv
  - Schrift- und Hintergrundfarben
  - Sortierungs-Unterstützung

### Data
- Musterdaten importiert:
  - 4 Kategorien
  - 18 Zutaten
  - 6 Komplettgerichte

---

## [0.2.0] - 2025-08-25

### Added
- **Tisch-Management:**
  - `tables` Tabelle
  - GET `/api/tables` - Aktive Tische
  - QR-Code-Format definiert

- **CORS-Support:**
  - Konfigurierbare Origins
  - OPTIONS-Handler
  - Access-Control-Headers

### Changed
- HTTP-Server-Konfiguration verbessert
- Error-Responses strukturiert

---

## [0.1.0] - 2025-08-20

### Added
- **Initiales Backend-Setup:**
  - FreePascal HTTP-Server (fpHTTP)
  - SQLite3-Datenbank mit ZEOS
  - JSON-Request/Response-Handling
  - Basis-Routing-System

- **Datenbank-Grundstruktur:**
  - `orders` Tabelle
  - `order_items` Tabelle
  - `dishes` Tabelle (Legacy)

- **Erste Endpunkte:**
  - GET `/api/health` - Server-Status
  - GET `/api/orders` - Bestellungen

### Infrastructure
- Lazarus-Project erstellt
- Kompilierung für Windows/Linux
- Basis-Fehlerbehandlung

---

## Versionierungs-Schema

Dieses Projekt folgt [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Inkompatible API-Änderungen
- **MINOR** version: Neue Features (abwärtskompatibel)
- **PATCH** version: Bugfixes (abwärtskompatibel)

**Beispiel:** `0.7.5`
- `0` = Pre-Release (vor 1.0)
- `7` = 7. Feature-Release
- `5` = 5. Bugfix-Release

---

## Migration-Guides

### 0.7.0 → 0.7.5

**Datenbank-Migration:**
```sql
-- 1. Meal Sets Preis-Feature
ALTER TABLE meal_sets ADD COLUMN price DECIMAL(10,2) DEFAULT 0;

-- 2. Duplikate entfernen
DELETE FROM meal_set_ingredients 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM meal_set_ingredients 
    GROUP BY meal_set_id, ingredient_id
);

-- 3. Unique Constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_set_ingredients_unique 
ON meal_set_ingredients(meal_set_id, ingredient_id);
```

**Backend:**
- Keine Code-Änderungen nötig
- Neu kompilieren empfohlen

**Frontend:**
- Neue Dateien: `admin/` Verzeichnis
- Cache leeren im Browser

---

### 0.6.0 → 0.7.0

**Datenbank-Migration:**
```sql
-- Inventory-Felder hinzufügen
ALTER TABLE ingredients ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN min_warning_level INTEGER DEFAULT 5;
ALTER TABLE ingredients ADD COLUMN max_daily_limit INTEGER DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN track_inventory BOOLEAN DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN sold_today INTEGER DEFAULT 0;

-- Stats-Tabellen
CREATE TABLE ingredient_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_id INTEGER NOT NULL,
  date DATE DEFAULT (date('now')),
  count INTEGER DEFAULT 0,
  UNIQUE(ingredient_id, date)
);

CREATE TABLE meal_set_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_set_id INTEGER NOT NULL,
  date DATE DEFAULT (date('now')),
  count INTEGER DEFAULT 0,
  UNIQUE(meal_set_id, date)
);
```

---

## Breaking Changes

### Version 0.7.5
- **Keine Breaking Changes** - Vollständig abwärtskompatibel

### Version 0.7.0
- **Admin-API:** Neue Endpunkte, alte bleiben funktional
- **DB-Schema:** Neue Spalten mit Defaults, keine Daten gehen verloren

### Version 0.6.0
- **QR-Code-Format geändert:**
  - Alt: `"table": "1"`
  - Neu: `{"table": "1", "type": "table_qr"}`
  - Abwärtskompatibel durch optionales `type`-Feld

---

## Bekannte Probleme

### Version 0.7.5
- Order Details Modal ist nur Platzhalter (5% fehlt für 100%)
- HTTPS-Testing für mobile Kamera ausstehend
- Cross-Device-Testing unvollständig

### Version 0.7.0
- SQLite Concurrent-Write-Limit (1 Writer gleichzeitig)
- Keine Authentifizierung im Admin-Interface

### Version 0.6.0
- PWA-Kamera-Zugriff erfordert HTTPS in Produktion
- Service-Worker-Update-Mechanismus fehlt

---

## Credits

### Externe Bibliotheken
- **FreePascal/Lazarus** - Compiler & IDE
- **ZEOS** - Database Abstraction Layer
- **ZXing-js** - QR-Code-Scanner
- **SQLite3** - Embedded Database

### Inspiration
- Original Goarista (Lazarus Desktop-App)
- Moderne QR-Bestellsysteme

---

## Support

Bei Fragen oder Problemen:
1. [GitHub Issues](https://github.com/Beachbone/Goarista2/issues)
2. Changelog durchlesen
3. SETUP.md & TROUBLESHOOTING konsultieren

---

**Letzte Aktualisierung:** 2025-09-30
