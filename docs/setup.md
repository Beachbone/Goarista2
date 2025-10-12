# Setup & Installation

## Inhaltsverzeichnis
- [Systemanforderungen](#systemanforderungen)
- [Backend Installation](#backend-installation)
- [Frontend Deployment](#frontend-deployment)
- [Entwicklungsumgebung](#entwicklungsumgebung)
- [Produktion (Linux)](#produktion-linux)
- [Fehlerbehebung](#fehlerbehebung)

## Systemanforderungen

### Minimum
- **CPU:** 1 GHz Dual-Core
- **RAM:** 512 MB
- **Festplatte:** 100 MB
- **OS:** Windows 10+ / Linux (Debian 11+)

### Empfohlen für Produktion
- **CPU:** 2 GHz Quad-Core
- **RAM:** 2 GB
- **SSD:** 500 MB
- **OS:** Linux (Debian/Ubuntu)

### Software
- **Backend:** FreePascal 3.2.0+ / Lazarus 2.0.10+
- **Datenbank:** SQLite3 (inkludiert)
- **Webserver (optional):** lighttpd / nginx
- **Browser:** Chrome/Firefox/Safari (aktuelle Version)

---

## Backend Installation

### Windows (Entwicklung)

#### 1. FreePascal installieren
```bash
# Lazarus IDE herunterladen von:
https://www.lazarus-ide.org/

# Installation mit Standard-Einstellungen
```

#### 2. ZEOS Components installieren
```bash
# In Lazarus IDE:
# Package -> Online Package Manager
# Suche: "zeos"
# Installiere: "zeosdbo" (Version 8.0+)
```

#### 3. Projekt kompilieren
```bash
cd backend
# In Lazarus öffnen: orderserver.lpi
# Run -> Build (Ctrl+F9)

# Oder per Kommandozeile:
fpc orderserver.lpr
```

#### 4. Starten
```bash
cd backend
orderserver.exe
# Server läuft auf: http://localhost:8080
```

### Linux (Produktion)

#### 1. Abhängigkeiten installieren
```bash
sudo apt update
sudo apt install -y fpc sqlite3 libsqlite3-dev
```

#### 2. Binary kopieren
```bash
# Backend kompiliert auf Windows für Linux:
# In Lazarus: Project -> Project Options
# Compiler Options -> Config and Target
# Target OS: Linux, Target CPU: x86_64

# Dann auf Linux-Server kopieren:
scp backend/orderserver user@server:/opt/qr-bestellsystem/
```

#### 3. Systemd Service einrichten
```bash
sudo nano /etc/systemd/system/orderserver.service
```

**Service-Datei:**
```ini
[Unit]
Description=QR-Bestellsystem Order Server
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/qr-bestellsystem/backend
ExecStart=/opt/qr-bestellsystem/backend/orderserver
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable orderserver
sudo systemctl start orderserver
sudo systemctl status orderserver
```

#### 4. Firewall konfigurieren
```bash
# Port 8080 öffnen
sudo ufw allow 8080/tcp
sudo ufw reload
```

---

## Frontend Deployment

### Option 1: Direkter Zugriff via Backend
Der Backend-Server kann statische Dateien ausliefern:
```
http://SERVER-IP:8080/admin/admin-interface.html
http://SERVER-IP:8080/pwa-service/index.html
```

### Option 2: Separater Webserver (Empfohlen)

#### lighttpd Installation
```bash
sudo apt install lighttpd
```

**Konfiguration (`/etc/lighttpd/lighttpd.conf`):**
```conf
server.document-root = "/opt/qr-bestellsystem"
server.port = 80

# CORS für API-Zugriff
setenv.add-response-header = (
    "Access-Control-Allow-Origin" => "*"
)
```

```bash
sudo systemctl restart lighttpd
```

#### nginx Installation
```bash
sudo apt install nginx
```

**Konfiguration (`/etc/nginx/sites-available/goarista`):**
```nginx
server {
    listen 80;
    server_name _;
    
    root /opt/qr-bestellsystem;
    index index.html;
    
    # Frontend Dateien
    location / {
        try_files $uri $uri/ =404;
    }
    
    # API Proxy
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/goarista /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Entwicklungsumgebung

### Backend-Entwicklung

#### Lazarus IDE Setup
1. **Projekt öffnen:** `backend/orderserver.lpi`
2. **ZEOS installieren:** Package Manager
3. **Debugging aktivieren:** 
   - Project Options → Compiler Options
   - Debugging: Level 3, Generate line info

#### Nützliche Tools
```bash
# SQLite Browser für DB-Inspektion
sudo apt install sqlitebrowser
sqlitebrowser orders.db

# API-Testing
curl http://localhost:8080/api/health
```

### Frontend-Entwicklung

#### Live-Server (Python)
```bash
cd admin
python3 -m http.server 8000
# Öffne: http://localhost:8000/admin-interface.html
```

#### Browser DevTools
- **Chrome:** F12 → Network/Console
- **CORS-Probleme:** Starte Backend zuerst
- **PWA-Testing:** Application Tab → Service Workers

---

## Datenbank Setup

### Neue Datenbank erstellen
```bash
cd backend
sqlite3 orders.db < schema.sql
```

### Musterdaten importieren
```sql
-- In sqlite3:
.read backend/orders.db.sql
```

### Backup erstellen
```bash
sqlite3 orders.db .dump > backup_$(date +%Y%m%d).sql
```

### Migration für Meal Sets Preis-Feature
```sql
-- Falls die price Column fehlt:
ALTER TABLE meal_sets ADD COLUMN price DECIMAL(10,2) DEFAULT 0;

-- Duplikate entfernen:
DELETE FROM meal_set_ingredients 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM meal_set_ingredients 
    GROUP BY meal_set_id, ingredient_id
);
```

---

## Netzwerk-Konfiguration

### Lokales Netzwerk (für Tests)
```bash
# Backend-IP herausfinden:
# Windows:
ipconfig

# Linux:
ip addr show

# Admin-Interface öffnen:
http://192.168.x.x:8080/admin/admin-interface.html
```

### HTTPS für PWA (Produktion erforderlich)

#### Let's Encrypt mit Certbot
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ihre-domain.de
```

#### Selbstsigniertes Zertifikat (nur für Tests)
```bash
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes
```

---

## Fehlerbehebung

### Backend startet nicht

**Problem:** `sqlite3.dll not found` (Windows)
```bash
# Lösung: sqlite3.dll ins Backend-Verzeichnis kopieren
# Download: https://www.sqlite.org/download.html
```

**Problem:** Port 8080 bereits belegt
```bash
# Port-Nutzung prüfen:
# Windows:
netstat -ano | findstr :8080

# Linux:
sudo lsof -i :8080

# Prozess beenden oder Port im Code ändern
```

**Problem:** Service startet nicht (Status 217/USER)
```bash
# Berechtigungen prüfen:
ls -la /opt/qr-bestellsystem/backend/orderserver
sudo chmod +x /opt/qr-bestellsystem/backend/orderserver

# DB-Berechtigungen:
sudo chown root:root /opt/qr-bestellsystem/backend/orders.db
sudo chmod 644 /opt/qr-bestellsystem/backend/orders.db
```

### Frontend-Probleme

**Problem:** API-Aufrufe schlagen fehl (CORS)
```javascript
// In crud-managers.js prüfen:
const API_BASE_URL = 'http://192.168.x.x:8080/api';

// Backend muss laufen und CORS aktiviert sein
```

**Problem:** QR-Scanner funktioniert nicht
```
Lösung:
1. HTTPS verwenden (Kamera-Zugriff erfordert HTTPS)
2. Browser-Berechtigungen prüfen (Kamera erlauben)
3. Fallback: Manuelle Tischnummer-Eingabe nutzen
```

**Problem:** Admin-Interface lädt Daten nicht
```bash
# Browser Console öffnen (F12)
# Prüfe: Network-Tab für 404/500 Fehler
# Backend-Status prüfen:
curl http://localhost:8080/api/health
```

### Datenbank-Probleme

**Problem:** `database locked`
```bash
# Andere Verbindungen schließen
# Backend neu starten
sudo systemctl restart orderserver
```

**Problem:** Alte Daten angezeigt
```bash
# Browser-Cache leeren
# Oder Hard-Reload: Ctrl+Shift+R
```

---

## Performance-Tuning

### SQLite Optimierung
```sql
-- In orders.db:
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
```

### Backend-Performance
```pascal
// In orderserver.lpr:
// Erhöhe Threadpool falls nötig
Application.Threaded := True;
```

---

## Logs & Debugging

### Backend-Logs
```bash
# Systemd Service Logs:
sudo journalctl -u orderserver -f

# Oder direkter Start für Debug-Output:
./orderserver
```

### Frontend-Logs
```javascript
// Browser Console (F12)
// Admin-Interface zeigt Fehler in Console
```

---

## Update-Prozess

### Backend aktualisieren
```bash
# 1. Service stoppen
sudo systemctl stop orderserver

# 2. Backup erstellen
cp orderserver orderserver.backup
sqlite3 orders.db .dump > db_backup.sql

# 3. Neue Binary kopieren
scp backend/orderserver user@server:/opt/qr-bestellsystem/backend/

# 4. Berechtigungen setzen
sudo chmod +x /opt/qr-bestellsystem/backend/orderserver

# 5. Service starten
sudo systemctl start orderserver
sudo systemctl status orderserver
```

### Frontend aktualisieren
```bash
# Einfach neue Dateien kopieren:
scp -r admin/* user@server:/opt/qr-bestellsystem/admin/
scp -r pwa-service/* user@server:/opt/qr-bestellsystem/pwa-service/

# Browser-Cache leeren
```

---

## Sicherheitshinweise

### Produktions-Checkliste
- [ ] HTTPS aktiviert (Let's Encrypt)
- [ ] Firewall konfiguriert (nur Port 80/443)
- [ ] Backend läuft als Non-Root-User
- [ ] Datenbank-Backups eingerichtet
- [ ] Passwort-Schutz für Admin-Interface (geplant)
- [ ] Rate-Limiting aktiviert (geplant)

### Backup-Strategie
```bash
# Tägliches Backup einrichten:
sudo crontab -e

# Füge hinzu:
0 2 * * * sqlite3 /opt/qr-bestellsystem/backend/orders.db .dump > /backups/orders_$(date +\%Y\%m\%d).sql
```

---

## Support & Hilfe

Bei Problemen:
1. Logs prüfen (siehe oben)
2. GitHub Issues durchsuchen
3. Fehlermeldung + Log-Auszug posten

**Tipp:** Für schnelle Hilfe immer Backend-Version und OS angeben!
