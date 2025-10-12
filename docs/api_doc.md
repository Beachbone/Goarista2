# API-Dokumentation

## Inhaltsverzeichnis
- [Base URL](#base-url)
- [Authentifizierung](#authentifizierung)
- [Response-Format](#response-format)
- [Error-Handling](#error-handling)
- [Public Endpoints](#public-endpoints)
- [Admin Endpoints](#admin-endpoints)

---

## Base URL

```
http://localhost:8080/api
```

**Produktion:**
```
http://YOUR-SERVER-IP:8080/api
```

---

## Authentifizierung

**Aktuell:** Keine Authentifizierung erforderlich  
**Geplant:** Bearer Token oder Session-basiert

---

## Response-Format

### Success Response
```json
{
  "id": 1,
  "name": "Beispiel",
  "status": "success"
}
```

### Array Response
```json
[
  {"id": 1, "name": "Item 1"},
  {"id": 2, "name": "Item 2"}
]
```

### Error Response
```json
{
  "error": "Fehlerbeschreibung",
  "status": 400
}
```

---

## Error-Handling

### HTTP Status Codes

| Code | Bedeutung | Verwendung |
|------|-----------|------------|
| 200 | OK | Erfolgreiche GET/PUT-Anfrage |
| 201 | Created | Erfolgreiche POST-Anfrage |
| 400 | Bad Request | Ungültige Eingabe |
| 404 | Not Found | Ressource nicht gefunden |
| 500 | Server Error | Interner Serverfehler |

### Beispiel Error
```bash
curl -X DELETE http://localhost:8080/api/admin/categories/1

# Response (400):
{
  "error": "Cannot delete category with existing ingredients"
}
```

---

## Public Endpoints

### Health Check

#### GET /health
Prüft Server-Status

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-30T10:30:00Z"
}
```

**Beispiel:**
```bash
curl http://localhost:8080/api/health
```

---

### Tables

#### GET /tables
Gibt alle aktiven Tische zurück

**Response:**
```json
[
  {
    "id": 1,
    "table_number": "1",
    "table_name": "Tisch 1",
    "active": true
  },
  {
    "id": 6,
    "table_number": "takeaway",
    "table_name": "Take-Away",
    "active": true
  }
]
```

**Beispiel:**
```bash
curl http://localhost:8080/api/tables
```

---

### Categories

#### GET /categories
Gibt alle Kategorien mit Farben zurück

**Response:**
```json
[
  {
    "id": 1,
    "name": "Brot & Brötchen",
    "color_bg_inactive": "#33B1E4",
    "color_bg_active": "#1A3DC7",
    "color_font_inactive": "#000000",
    "color_font_active": "#FFFFFF",
    "sort_order": 0
  }
]
```

**Beispiel:**
```bash
curl http://localhost:8080/api/categories
```

---

### Ingredients

#### GET /ingredients
Gibt alle verfügbaren Zutaten zurück

**Query Parameters:**
- `category_id` (optional): Filtert nach Kategorie
- `available` (optional): Nur verfügbare (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Brötchen",
    "price": 0.60,
    "category_id": 1,
    "category_name": "Brot & Brötchen",
    "available": true,
    "radio_group_id": 0,
    "sort_order": 0,
    "track_inventory": false,
    "stock_quantity": 0,
    "min_warning_level": 5,
    "max_daily_limit": 0,
    "sold_today": 0
  }
]
```

**Beispiele:**
```bash
# Alle Zutaten
curl http://localhost:8080/api/ingredients

# Nur Kategorie 1
curl http://localhost:8080/api/ingredients?category_id=1

# Nur verfügbare
curl http://localhost:8080/api/ingredients?available=true
```

---

### Meal Sets

#### GET /meal-sets
Gibt alle Komplettgerichte zurück

**Response:**
```json
[
  {
    "id": 1,
    "name": "Gehacktes",
    "description": "Gehacktes mit Brötchen",
    "available": true,
    "sort_order": 0,
    "price": 0.00,
    "ingredient_count": 2,
    "calculated_price": 8.80
  }
]
```

**Hinweis:** 
- `price > 0`: Festpreis wird verwendet
- `price = 0`: `calculated_price` (Summe) wird verwendet

**Beispiel:**
```bash
curl http://localhost:8080/api/meal-sets
```

#### GET /meal-sets/{id}
Gibt Details eines Komplettgerichts mit allen Zutaten

**Response:**
```json
[
  {
    "id": 1,
    "meal_set_id": 1,
    "ingredient_id": 1,
    "ingredient_name": "Brötchen",
    "ingredient_price": 0.60,
    "quantity": 1
  },
  {
    "id": 2,
    "meal_set_id": 1,
    "ingredient_id": 18,
    "ingredient_name": "Gehacktes",
    "ingredient_price": 8.20,
    "quantity": 1
  }
]
```

**Beispiel:**
```bash
curl http://localhost:8080/api/meal-sets/1
```

---

### Orders

#### GET /orders
Gibt alle Bestellungen zurück

**Query Parameters:**
- `status` (optional): Filtert nach Status (`pending`, `preparing`, `ready`, `completed`, `cancelled`)
- `table_number` (optional): Filtert nach Tisch

**Response:**
```json
[
  {
    "id": 1,
    "order_number": "20250930-001",
    "table_number": "1",
    "status": "pending",
    "total_amount": 10.50,
    "note": "Ohne Zwiebeln",
    "qr_code": "{\"order\":\"20250930-001\",\"type\":\"order_qr\"}",
    "meal_set_id": 0,
    "is_custom": true,
    "created_at": "2025-09-30T10:30:00",
    "updated_at": "2025-09-30T10:30:00"
  }
]
```

**Beispiele:**
```bash
# Alle Bestellungen
curl http://localhost:8080/api/orders

# Nur pending
curl http://localhost:8080/api/orders?status=pending

# Nur Tisch 1
curl http://localhost:8080/api/orders?table_number=1
```

#### POST /orders
Erstellt eine neue Bestellung

**Request Body:**
```json
{
  "table_number": "1",
  "meal_set_id": 0,
  "is_custom": true,
  "note": "Ohne Zwiebeln",
  "items": [
    {
      "ingredient_id": 1,
      "quantity": 2,
      "note": ""
    },
    {
      "ingredient_id": 18,
      "quantity": 1,
      "note": "Gut durchgebraten"
    }
  ]
}
```

**Response:**
```json
{
  "order_id": 1,
  "order_number": "20250930-001",
  "total_amount": 10.50,
  "status": "pending"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "table_number": "1",
    "is_custom": true,
    "items": [
      {"ingredient_id": 1, "quantity": 2},
      {"ingredient_id": 18, "quantity": 1}
    ]
  }'
```

#### PUT /orders/{id}/status
Ändert den Status einer Bestellung

**Request Body:**
```json
{
  "status": "preparing"
}
```

**Valid Status Values:**
- `pending` - Neu eingegangen
- `preparing` - In Bearbeitung
- `ready` - Fertig zum Abholen
- `completed` - Abgeschlossen
- `cancelled` - Storniert

**Response:**
```json
{
  "message": "Status updated successfully"
}
```

**Beispiel:**
```bash
curl -X PUT http://localhost:8080/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}'
```

---

### Statistics

#### GET /stats
Gibt allgemeine Statistiken zurück

**Response:**
```json
{
  "total_orders": 150,
  "total_revenue": 2450.50,
  "today_orders": 25,
  "today_revenue": 380.75
}
```

#### GET /stats/ingredients
Gibt Top-Zutaten nach Verkaufszahlen zurück

**Response:**
```json
[
  {
    "ingredient_id": 1,
    "name": "Brötchen",
    "total_count": 145
  },
  {
    "ingredient_id": 18,
    "name": "Gehacktes",
    "total_count": 87
  }
]
```

#### GET /stats/meal-sets
Gibt Top-Komplettgerichte nach Verkaufszahlen zurück

**Response:**
```json
[
  {
    "meal_set_id": 1,
    "name": "Gehacktes",
    "total_count": 45
  },
  {
    "meal_set_id": 2,
    "name": "Schlachtplatte",
    "total_count": 32
  }
]
```

---

## Admin Endpoints

### Categories

#### GET /admin/categories
Gibt alle Kategorien zurück (wie /categories, aber für Admin)

#### POST /admin/categories
Erstellt eine neue Kategorie

**Request Body:**
```json
{
  "name": "Neue Kategorie",
  "color_bg_inactive": "#83BCBA",
  "color_bg_active": "#99E0F3",
  "color_font_inactive": "#000000",
  "color_font_active": "#FFFFFF",
  "sort_order": 0
}
```

**Response:**
```json
{
  "id": 10,
  "message": "Category created"
}
```

#### PUT /admin/categories/{id}
Aktualisiert eine Kategorie

**Request Body:** (wie POST)

**Response:**
```json
{
  "message": "Category updated"
}
```

#### DELETE /admin/categories/{id}
Löscht eine Kategorie

**Response:**
```json
{
  "message": "Category deleted"
}
```

**Error (400) wenn Zutaten zugeordnet:**
```json
{
  "error": "Cannot delete category with existing ingredients"
}
```

---

### Ingredients

#### GET /admin/ingredients
Gibt alle Zutaten mit erweiterten Infos zurück

#### POST /admin/ingredients
Erstellt eine neue Zutat

**Request Body:**
```json
{
  "name": "Neue Zutat",
  "price": 2.50,
  "category_id": 1,
  "available": true,
  "radio_group_id": 0,
  "sort_order": 0,
  "track_inventory": true,
  "stock_quantity": 100,
  "min_warning_level": 10,
  "max_daily_limit": 50
}
```

**Response:**
```json
{
  "id": 20,
  "message": "Ingredient created"
}
```

#### PUT /admin/ingredients/{id}
Aktualisiert eine Zutat

**Request Body:** (wie POST)

**Response:**
```json
{
  "message": "Ingredient updated"
}
```

#### DELETE /admin/ingredients/{id}
Löscht eine Zutat

**Response:**
```json
{
  "message": "Ingredient deleted"
}
```

**Error (400) wenn in Bestellungen verwendet:**
```json
{
  "error": "Cannot delete ingredient used in orders"
}
```

---

### Meal Sets

#### GET /admin/meal-sets
Gibt alle Komplettgerichte zurück

#### POST /admin/meal-sets
Erstellt ein neues Komplettgericht

**Request Body:**
```json
{
  "name": "Neues Gericht",
  "description": "Beschreibung",
  "price": 0.00,
  "available": true,
  "sort_order": 0,
  "ingredients": [1, 18]
}
```

**Hinweis:**
- `price = 0`: Summe der Zutaten wird verwendet
- `price > 0`: Festpreis überschreibt Summe
- `ingredients`: Array von Ingredient-IDs

**Response:**
```json
{
  "id": 10,
  "message": "Meal set created"
}
```

#### PUT /admin/meal-sets/{id}
Aktualisiert ein Komplettgericht

**Request Body:** (wie POST)

**Response:**
```json
{
  "message": "Meal set updated"
}
```

**Hinweis:** Alte Ingredient-Zuordnungen werden gelöscht und durch neue ersetzt

#### DELETE /admin/meal-sets/{id}
Löscht ein Komplettgericht

**Response:**
```json
{
  "message": "Meal set deleted"
}
```

---

### Radio Groups

#### GET /admin/radio-groups
Gibt alle Radio Groups zurück

**Response:**
```json
[
  {
    "id": 1,
    "name": "Leberwurst",
    "exclusive": true,
    "sort_order": 1,
    "created_at": "2025-09-28T17:24:26"
  }
]
```

#### POST /admin/radio-groups
Erstellt eine neue Radio Group

**Request Body:**
```json
{
  "name": "Neue Gruppe",
  "exclusive": true,
  "sort_order": 0
}
```

**Response:**
```json
{
  "id": 5,
  "message": "Radio group created"
}
```

#### PUT /admin/radio-groups/{id}
Aktualisiert eine Radio Group

**Request Body:** (wie POST)

**Response:**
```json
{
  "message": "Radio group updated"
}
```

#### DELETE /admin/radio-groups/{id}
Löscht eine Radio Group

**Response:**
```json
{
  "message": "Radio group deleted"
}
```

**Hinweis:** Zutaten mit dieser Radio Group behalten ihre Zuordnung (wird auf 0 gesetzt)

---

### Events

#### GET /admin/events
Gibt alle Events zurück

**Response:**
```json
[
  {
    "id": 1,
    "name": "Schlachtfest 2025",
    "description": "Fertige Version",
    "event_date": "2025-10-25",
    "is_active": false,
    "meal_set_count": 6,
    "created_at": "2025-09-30T16:00:47"
  }
]
```

#### GET /admin/events/{id}
Gibt Event-Details mit Meal Sets zurück

**Response:**
```json
{
  "id": 1,
  "name": "Schlachtfest 2025",
  "description": "Fertige Version",
  "event_date": "2025-10-25",
  "is_active": false,
  "meal_sets": [1, 2, 3, 4, 5, 6]
}
```

#### GET /admin/events/active
Gibt das aktive Event zurück (falls vorhanden)

**Response (wenn aktiv):**
```json
[
  {
    "id": 2,
    "name": "Kirmessonntag",
    "description": "Mittagessen",
    "event_date": "2025-10-25",
    "is_active": true,
    "meal_set_count": 1
  }
]
```

**Response (wenn kein Event aktiv):**
```json
[]
```

#### POST /admin/events
Erstellt ein neues Event

**Request Body:**
```json
{
  "name": "Neues Event",
  "description": "Beschreibung",
  "event_date": "2025-12-25",
  "meal_sets": [1, 3, 5]
}
```

**Response:**
```json
{
  "id": 3,
  "message": "Event created"
}
```

#### PUT /admin/events/{id}
Aktualisiert ein Event

**Request Body:** (wie POST)

**Response:**
```json
{
  "message": "Event updated"
}
```

#### DELETE /admin/events/{id}
Löscht ein Event

**Response:**
```json
{
  "message": "Event deleted"
}
```

#### POST /admin/events/{id}/activate
Aktiviert ein Event (deaktiviert alle anderen)

**Response:**
```json
{
  "message": "Event activated"
}
```

#### POST /admin/events/deactivate
Deaktiviert das aktive Event

**Response:**
```json
{
  "message": "Event deactivated"
}
```

---

### Inventory

#### GET /admin/inventory
Gibt Inventar-Informationen für alle Zutaten zurück

**Response:**
```json
[
  {
    "id": 16,
    "name": "Bratwurst",
    "track_inventory": true,
    "stock_quantity": 100,
    "min_warning_level": 10,
    "max_daily_limit": 90,
    "sold_today": 0
  }
]
```

#### PUT /admin/inventory/bulk
Bulk-Update für mehrere Inventar-Items

**Request Body:**
```json
{
  "updates": [
    {
      "id": 16,
      "stock_quantity": 150,
      "min_warning_level": 15,
      "max_daily_limit": 100,
      "track_inventory": true
    },
    {
      "id": 17,
      "stock_quantity": 75,
      "min_warning_level": 10,
      "max_daily_limit": 50,
      "track_inventory": true
    }
  ]
}
```

**Response:**
```json
{
  "message": "Inventory updated",
  "updated_count": 2
}
```

#### POST /admin/inventory/reset
Setzt `sold_today` für alle Zutaten zurück (auf 0)

**Response:**
```json
{
  "message": "Daily sold reset",
  "reset_count": 18
}
```

---

## Beispiel-Workflows

### Workflow 1: Neue Bestellung erstellen

```bash
# 1. Verfügbare Zutaten laden
curl http://localhost:8080/api/ingredients

# 2. Bestellung erstellen
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "table_number": "1",
    "is_custom": true,
    "items": [
      {"ingredient_id": 1, "quantity": 1},
      {"ingredient_id": 16, "quantity": 1}
    ]
  }'

# 3. Status ändern (Küche)
curl -X PUT http://localhost:8080/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}'
```

### Workflow 2: Event aktivieren

```bash
# 1. Alle Events laden
curl http://localhost:8080/api/admin/events

# 2. Event aktivieren
curl -X POST http://localhost:8080/api/admin/events/1/activate

# 3. Prüfen ob aktiv
curl http://localhost:8080/api/admin/events/active

# 4. Event deaktivieren
curl -X POST http://localhost:8080/api/admin/events/deactivate
```

### Workflow 3: Inventar verwalten

```bash
# 1. Inventar laden
curl http://localhost:8080/api/admin/inventory

# 2. Bulk-Update
curl -X PUT http://localhost:8080/api/admin/inventory/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"id": 16, "stock_quantity": 200, "track_inventory": true}
    ]
  }'

# 3. Tagesverkäufe zurücksetzen
curl -X POST http://localhost:8080/api/admin/inventory/reset
```

---

## Rate Limiting

**Aktuell:** Kein Rate Limiting  
**Geplant:** 100 Requests/Minute pro IP

---

## Versionierung

**Aktuelle Version:** v1.0  
**API-Pfad:** `/api` (keine Versionsnummer im Pfad)

---

## CORS-Policy

**Erlaubte Origins:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Hinweis:** In Produktion sollte `*` durch spezifische Domains ersetzt werden

---

## Support & Fehler melden

Bei API-Problemen:
1. HTTP-Status-Code prüfen
2. Response-Body auf Error-Message prüfen
3. Backend-Logs checken
4. Issue auf GitHub erstellen mit:
   - Request (Method + URL + Body)
   - Response (Status + Body)
   - Backend-Log-Auszug
