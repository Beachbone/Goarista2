# Goarista2 - QR-Bestellsystem

> **Status:** 🚧 In Entwicklung (Pre-Alpha) - Nicht produktionsbereit

Webbasiertes QR-Bestellsystem für Schlachtfeste und ähnliche Veranstaltungen mit FreePascal-Backend und modernen Web-Frontends.

## 🚀 Schnellstart

```bash
# Backend starten
cd backend
./orderserver

# Admin-Interface öffnen
http://localhost:8080/admin

# Service-App öffnen
http://localhost:8080/pwa-service
```

📖 **[Vollständige Setup-Anleitung →](docs/SETUP.md)**

## 📊 Projektstand

**Gesamtfortschritt: ~75%**

| Komponente | Status | Fortschritt |
|------------|--------|-------------|
| Backend REST API | ✅ Fertig | 100% |
| Service-App (PWA) | ⚠️ Funktional | 85% |
| Admin-Interface | ✅ Fast fertig | 95% |
| Küchen-Display | 🔴 Offen | 0% |
| Bestellstation | 🔴 Offen | 0% |

## 🎯 Features

- ✅ **QR-Code basierte Bestellungen** - Gäste scannen Tisch-QR und bestellen per Smartphone
- ✅ **Event-Management** - Beschränke verfügbare Gerichte für spezielle Veranstaltungen
- ✅ **Inventar-Tracking** - Automatische Bestandsverwaltung mit Warnungen
- ✅ **Radio Groups** - Exklusive Auswahl-Gruppen (z.B. "1x ODER 2x Portion")
- ✅ **Komplettgerichte & Einzelzutaten** - Flexible Menü-Gestaltung
- ⚠️ **Echtzeit-Status** - Service-App mit Live-Updates (funktional)
- 🔴 **Küchen-Display** - Bestellungsanzeige für Küche (geplant)
- 🔴 **Bestellstation** - Touch-Interface für Kassenpersonal (geplant)

📖 **[Vollständige Feature-Liste →](docs/FEATURES.md)**

## 🏗️ Architektur

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Service-App   │────▶│  REST API        │◀────│ Admin-Interface │
│   (PWA)         │     │  (FreePascal)    │     │  (Web-App)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                        ┌──────▼──────┐
                        │   SQLite    │
                        │  Datenbank  │
                        └─────────────┘
```

**Technologie-Stack:**
- **Backend:** FreePascal + fpHTTP + ZEOS + SQLite3
- **Frontend:** Vanilla HTML5/CSS3/JavaScript (keine Frameworks)
- **PWA:** Service Worker + Manifest + ZXing QR-Scanner

📖 **[Technische Architektur →](docs/ARCHITECTURE.md)**

## 📡 API-Endpunkte

```
GET    /api/health                          - Server-Status
GET    /api/orders                          - Bestellungen
POST   /api/orders                          - Neue Bestellung
GET    /api/admin/categories                - Kategorien
GET    /api/admin/ingredients               - Zutaten
GET    /api/admin/meal-sets                 - Komplettgerichte
GET    /api/admin/events                    - Events
POST   /api/admin/events/{id}/activate     - Event aktivieren
...und 20+ weitere Endpunkte
```

📖 **[Vollständige API-Dokumentation →](docs/API.md)**

## 📁 Projektstruktur

```
Goarista2/
├── backend/              # FreePascal REST-API Server
│   ├── orderserver.lpr   # Hauptprogramm
│   └── orders.db         # SQLite Datenbank
├── admin/                # Admin Web-Interface
│   ├── admin-interface.html
│   └── js/               # CRUD-Manager
├── pwa-service/          # Service-App (PWA)
│   ├── index.html
│   └── manifest.json
└── docs/                 # Dokumentation
    ├── SETUP.md
    ├── FEATURES.md
    ├── API.md
    └── ARCHITECTURE.md
```

## 🛠️ Entwicklung

### Voraussetzungen
- FreePascal / Lazarus IDE (Backend)
- Moderner Webbrowser (Frontend)
- Optional: Linux für Deployment

### Backend kompilieren
```bash
cd backend
fpc orderserver.lpr
# oder in Lazarus IDE öffnen
```

### Frontend entwickeln
```bash
# Beliebiger HTTP-Server, z.B.:
python -m http.server 8000
# oder lighttpd/nginx
```

📖 **[Entwickler-Guide →](docs/SETUP.md#entwicklung)**

## 📝 Roadmap

### ✅ Abgeschlossen
- [x] Backend REST API mit allen CRUD-Operationen
- [x] Service-App mit QR-Scanner
- [x] Admin-Interface mit allen Verwaltungsfunktionen
- [x] Event-System für Veranstaltungen
- [x] Radio Groups für exklusive Auswahlen
- [x] Inventar-Management

### 🚧 In Arbeit
- [ ] Order Details Modal im Admin-Interface (5%)

### 🔜 Geplant (Priorität)
1. **Küchen-Display** - Bestellungsanzeige mit Status-Management
2. **Bestellstation** - Touch-Interface für Kassenpersonal
3. **Drucker-Integration** - Automatischer Bon-Druck
4. **Server-Sent Events** - Live-Updates für Küche

## 🤝 Mitwirken

Dieses Projekt ist aktuell in aktiver Entwicklung. Feedback und Vorschläge sind willkommen!

## 📄 Lizenz

Siehe [LICENSE](LICENSE) Datei.

## 👥 Kontakt

Erstellt für Schlachtfeste und ähnliche Veranstaltungen.

---

**Hinweis:** Dieses System befindet sich in Entwicklung und ist noch nicht für den Produktiveinsatz geeignet.
