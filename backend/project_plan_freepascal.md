# QR-Bestellsystem Implementierungsplan

## REST API - Kurze Erklärung

**REST API** = Representational State Transfer Application Programming Interface

**Einfach erklärt:**
- Eine Sammlung von **URLs** mit definierten **Funktionen**
- Jede URL macht **eine spezifische Sache**
- Kommunikation über **HTTP** (wie Webseiten)
- Daten werden als **JSON** übertragen (statt HTML)

**Beispiele:**
```
GET  /api/orders           → Alle Bestellungen abrufen
POST /api/orders           → Neue Bestellung erstellen
PUT  /api/orders/123       → Bestellung 123 ändern
DELETE /api/orders/123     → Bestellung 123 löschen
GET  /api/tables           → Alle Tische abrufen
```

**Warum REST?**
- Alle Geräte (Handy, Browser, andere Software) können darauf zugreifen
- Standardisiert und einfach zu verstehen
- Unabhängig von der Programmiersprache

---

## Systemübersicht

### Komponenten

1. **Zentraler Server (FreePascal)**
   - REST API
   - SSE für Live-Updates
   - SQLite Datenbank
   - Drucker-Anbindung
   - Läuft auf Thinclient

2. **Bestellstation (PWA)**
   - Menü-Auswahl und Bon-Erstellung
   - QR-Code-Generierung
   - Bon-Druck (lokal)
   - Läuft auf Laptop mit Touchscreen

3. **Service-App (Mobile PWA)**
   - QR-Code-Scanner
   - Tisch-Zuordnung
   - Take-Away-Markierung
   - Token-basierte Anmeldung

4. **Küchen-Display (PWA)**
   - Bestellungsübersicht (SSE)
   - Status-Updates (in Arbeit/fertig)
   - Vorbestellungen freigeben
   - Läuft auf Thinclient-Monitor

5. **Admin-Interface (PWA)**
   - Menü-Konfiguration
   - Benutzer-Verwaltung
   - Statistiken
   - System-Einstellungen

### Technologie-Stack
- **Backend:** FreePascal + fpHTTP
- **Frontend:** HTML5/JavaScript (PWA)
- **Datenbank:** SQLite3
- **Authentifizierung:** JWT-Token
- **Real-time:** Server-Sent Events (SSE)
- **Drucker:** ESC/POS über Serial/USB

---

## Entwicklungsplan

### Phase 1: Backend-Grundlage (Woche 1-2)
**Ziel:** Funktionsfähiger REST-Server

#### 1.1 Entwicklungsumgebung
- [ ] Lazarus auf Entwicklungsrechner einrichten
- [ ] Cross-Compiler für Linux installieren
- [ ] Test-Kompilierung für Thinclient
- [ ] Grundprojekt erstellen

#### 1.2 HTTP-Server Basis
```pascal
program OrderServer;
uses
  fphttpapp, httpdefs, httproute, fpjson, sqldb, sqlite3conn;

// Grundstruktur mit ersten Endpunkten
```

- [ ] HTTP-Server implementieren
- [ ] JSON-Handling einbauen
- [ ] CORS-Header für Browser-Zugriff
- [ ] Logging-System

#### 1.3 Datenbank-Schema
- [ ] SQLite-Datenbank erstellen
- [ ] Tabellen definieren (orders, order_items, dishes, users, tables)
- [ ] Grunddaten einfügen (Tische, Standard-Gerichte)
- [ ] Datenbankverbindung testen

#### 1.4 Basis REST-Endpunkte
- [ ] `GET /api/health` - Server-Status
- [ ] `GET /api/orders` - Bestellungen abrufen
- [ ] `POST /api/orders` - Neue Bestellung
- [ ] `PUT /api/orders/{id}/status` - Status ändern

**Test:** Postman/curl für API-Tests

### Phase 2: Service-App (Woche 2-3)
**Ziel:** QR-Scanner funktionsfähig

#### 2.1 Mobile PWA Basis
- [ ] HTML-Grundstruktur (basierend auf deiner vorhandenen App)
- [ ] Touch-optimierte Oberfläche
- [ ] PWA-Manifest und Service Worker
- [ ] QR-Scanner-Integration (ZXing)

#### 2.2 API-Integration
- [ ] Fetch-Funktionen für REST-Calls
- [ ] Token-Handling implementieren
- [ ] Offline-Handling (Basic)

#### 2.3 Core-Funktionen
- [ ] QR-Code scannen
- [ ] Tisch-Zuordnung
- [ ] Bestellung an Backend senden
- [ ] Erfolgs-/Fehler-Handling

**Test:** Service-App + Backend zusammen testen

### Phase 3: Küchen-Display (Woche 3-4)
**Ziel:** Live-Bestellungsanzeige

#### 3.1 SSE-Implementation (Backend)
```pascal
procedure HandleOrderStream(ARequest: TRequest; AResponse: TResponse);
// Server-Sent Events für Live-Updates
```

- [ ] SSE-Endpunkt implementieren
- [ ] Event-Broadcasting-System
- [ ] Reconnection-Handling

#### 3.2 Küchen-Interface
- [ ] Bestellungsübersicht (Live)
- [ ] Status-Buttons (in Arbeit/fertig)
- [ ] Vorbestellungen-Sektion
- [ ] Automatische Updates via SSE

#### 3.3 Drucker-Integration
- [ ] ESC/POS-Kommandos
- [ ] Bon-Layout definieren
- [ ] Automatischer Druck bei neuer Bestellung

**Test:** Vollständiger Workflow Service → Küche → Druck

### Phase 4: Bestellstation-Integration (Woche 4-5)
**Ziel:** Bestehende Station an Backend anbinden

#### 4.1 Backend-Erweiterung
- [ ] Menü-Konfiguration speichern/laden
- [ ] Preisberechnung-API
- [ ] QR-Code-Generierung

#### 4.2 Frontend-Anpassung
- [ ] Deine bestehende App erweitern
- [ ] API-Calls für Bestellerstellung
- [ ] QR-Code-Integration
- [ ] Bon-Druck-Anbindung

**Test:** Ende-zu-Ende Test: Bestellung → Service → Küche

### Phase 5: Admin-Interface (Woche 5-6)
**Ziel:** Konfiguration und Verwaltung

#### 5.1 Authentifizierung
- [ ] JWT-Token-System
- [ ] Login-Interface
- [ ] Session-Management
- [ ] Einfache 2FA (QR-Login oder PIN)

#### 5.2 Admin-Funktionen
- [ ] Menü-Editor (Gerichte, Preise, Kombinationen)
- [ ] Benutzer-Verwaltung
- [ ] System-Statistiken
- [ ] Backup/Export-Funktionen

#### 5.3 Konfiguration
- [ ] Drucker-Einstellungen
- [ ] Tisch-Layout
- [ ] Event-spezifische Menüs

**Test:** Vollständige Admin-Funktionalität

### Phase 6: Integration & Testing (Woche 6-7)
**Ziel:** Produktionsreifes System

#### 6.1 System-Integration
- [ ] Alle Komponenten zusammenführen
- [ ] Cross-Browser-Tests
- [ ] Mobile-Device-Tests
- [ ] Performance-Optimierung

#### 6.2 Deployment
- [ ] Installation auf Thinclient
- [ ] Systemd-Service einrichten
- [ ] Backup-Mechanismus
- [ ] Dokumentation

#### 6.3 Stress-Testing
- [ ] Mehrere gleichzeitige Benutzer
- [ ] Hohe Bestellfrequenz simulieren
- [ ] Netzwerk-Ausfälle testen
- [ ] Recovery-Szenarien

---

## Testablauf pro Phase

### Phase 1 Test:
```bash
# REST API testen
curl -X GET http://192.168.1.100:3000/api/health
curl -X POST http://192.168.1.100:3000/api/orders -d '{"table":"5"}'
```

### Phase 2 Test:
- QR-Code mit Smartphone scannen
- Tisch zuordnen
- Backend-Response prüfen

### Phase 3 Test:
- Service-App verwenden
- Küche sieht neue Bestellung sofort
- Bon wird automatisch gedruckt

### Phase 4 Test:
- Kompletter Workflow: Bestellung erstellen → scannen → Küche
- QR-Code-Funktionalität

### Phase 5 Test:
- Admin-Login
- Menü ändern
- Neue Benutzer anlegen

### Phase 6 Test:
- Vollständiger Schlachtfest-Simulation
- Mehrere Service-Kräfte gleichzeitig
- Stress-Test mit vielen Bestellungen

---

## Vorteile dieser Reihenfolge

1. **Backend zuerst:** Solide Basis für alle anderen Komponenten
2. **Service-App früh:** Wichtigste User-Funktionalität testbar
3. **Küche als nächstes:** Workflow Ende-zu-Ende testbar
4. **Bestellstation:** Kann mit bestehender App beginnen
5. **Admin zuletzt:** Nice-to-have, nicht kritisch für Grundfunktion

## Risiken und Mitigation

**Hardware-Performance:** 
- Frühe Tests auf Zielhardware
- Performance-Monitoring einbauen

**Browser-Kompatibilität:**
- Progressive Enhancement
- Fallbacks für ältere Geräte

**Netzwerk-Ausfälle:**
- Offline-Funktionalität
- Automatische Reconnection

---

## Geschätzte Arbeitszeit
- **Backend-Entwicklung:** ~60-80 Stunden
- **Frontend-Entwicklung:** ~40-60 Stunden  
- **Integration & Testing:** ~20-30 Stunden
- **Dokumentation:** ~10-15 Stunden

**Gesamt:** ~130-185 Stunden

Bei 10-15 Stunden/Woche: **9-13 Wochen**