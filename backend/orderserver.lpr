program OrderServer;

{$mode objfpc}{$H+}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Classes,
  FileInfo,
  SysUtils,
  fphttpapp,
  httpdefs,
  httproute,
  fpjson,
  jsonparser,
  ZConnection,
  ZDataset,
  ZSqlUpdate,
  ZDbcIntfs,
  DB,
  strutils;

type
  TDatabaseManager = class
  private
    FConnection: TZConnection;
    procedure InitializeDatabase;
    procedure CreateTables;
  public
    constructor Create;
    destructor Destroy; override;
    function QueryJSON(const SQL: string): TJSONArray;
    procedure ExecuteSQL(const SQL: string);
  end;

  TOrderAPIHandler = class
  private
    FDB: TDatabaseManager;

    // Helper functions
    function ExtractResourceId(const PathInfo: string;
      ResourcePosition: integer = 3): integer;
    function GetPathSegment(const PathInfo: string; SegmentIndex: integer): string;
    function IsValidResourceId(const PathInfo: string;
      ResourcePosition: integer = 3): boolean;

    // Core functions
    function GenerateOrderNumber: string;
    function GenerateQRCode(const OrderNumber: string): string;
    function ValidateAdminAccess(ARequest: TRequest): boolean;

    // Handler methods
    procedure HandleAdminCategories(ARequest: TRequest; AResponse: TResponse);
    procedure HandleAdminIngredients(ARequest: TRequest; AResponse: TResponse);
    procedure HandleAdminInventory(ARequest: TRequest; AResponse: TResponse);
    procedure HandleAdminMealSets(ARequest: TRequest; AResponse: TResponse);
    procedure HandleCategories(ARequest: TRequest; AResponse: TResponse);
    procedure HandleCreateOrder(ARequest: TRequest; AResponse: TResponse);
    procedure HandleDishes(ARequest: TRequest; AResponse: TResponse);
    procedure HandleIngredients(ARequest: TRequest; AResponse: TResponse);
    procedure HandleMealSetDetails(ARequest: TRequest; AResponse: TResponse);
    procedure HandleMealSets(ARequest: TRequest; AResponse: TResponse);
    procedure HandleStats(ARequest: TRequest; AResponse: TResponse);
    procedure HandleUpdateOrderStatus(ARequest: TRequest; AResponse: TResponse);
  public
    constructor Create;
    destructor Destroy; override;

    procedure HandleHealth(ARequest: TRequest; AResponse: TResponse);
    procedure HandleOrders(ARequest: TRequest; AResponse: TResponse);
    procedure HandleTables(ARequest: TRequest; AResponse: TResponse);
    procedure HandleRoot(ARequest: TRequest; AResponse: TResponse);
    procedure HandleDefault(ARequest: TRequest; AResponse: TResponse);

    procedure SetCORSHeaders(AResponse: TResponse);
    procedure SendJSONResponse(AResponse: TResponse; const AData: string;
      AStatusCode: integer = 200);
  end;

  // Database Manager Implementation
  constructor TDatabaseManager.Create;
  begin
    inherited Create;
    FConnection := TZConnection.Create(nil);
    FConnection.Protocol := 'sqlite';
    FConnection.Database := 'orders.db';
    FConnection.LibraryLocation := 'sqlite3.dll';

    try
      FConnection.Connect;
      WriteLn('Database connected successfully');
      InitializeDatabase;
    except
      on E: Exception do
      begin
        WriteLn('Database connection failed: ', E.Message);
        raise;
      end;
    end;
  end;

  destructor TDatabaseManager.Destroy;
  begin
    if Assigned(FConnection) then
    begin
      if FConnection.Connected then
        FConnection.Disconnect;
      FConnection.Free;
    end;
    inherited Destroy;
  end;

  procedure TDatabaseManager.ExecuteSQL(const SQL: string);
  var
    Query: TZQuery;
  begin
    Query := TZQuery.Create(nil);
    try
      Query.Connection := FConnection;
      Query.SQL.Text := SQL;
      Query.ExecSQL;
    finally
      Query.Free;
    end;
  end;

  function TDatabaseManager.QueryJSON(const SQL: string): TJSONArray;
  var
    Query: TZQuery;
    Row: TJSONObject;
    i: integer;
  begin
    Result := TJSONArray.Create;
    Query := TZQuery.Create(nil);
    try
      Query.Connection := FConnection;
      Query.SQL.Text := SQL;
      Query.Open;

      while not Query.EOF do
      begin
        Row := TJSONObject.Create;
        for i := 0 to Query.Fields.Count - 1 do
        begin
          if Query.Fields[i].IsNull then
            Row.Add(Query.Fields[i].FieldName, TJSONNull.Create)
          else
          begin
            case Query.Fields[i].DataType of
              ftInteger, ftSmallint, ftWord, ftLargeint:
                Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsInteger);
              ftFloat, ftCurrency, ftBCD, ftFMTBcd:
                Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsFloat);
              ftBoolean:
                Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsBoolean);
              ftDateTime, ftDate, ftTime, ftTimeStamp:
                Row.Add(Query.Fields[i].FieldName,
                  DateTimeToStr(Query.Fields[i].AsDateTime));
              else
                Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsString);
            end;
          end;
        end;
        Result.Add(Row);
        Query.Next;
      end;
    finally
      Query.Free;
    end;
  end;

  procedure TDatabaseManager.CreateTables;
  begin
    // Tables configuration
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS tables (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  table_number TEXT UNIQUE NOT NULL,' + '  table_name TEXT,' +
      '  active BOOLEAN DEFAULT 1' + ')'
      );

    // Categories
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS categories (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  name TEXT NOT NULL,' +
      '  color_bg_inactive TEXT DEFAULT ''#83BCBA'',' +
      '  color_bg_active TEXT DEFAULT ''#99E0F3'',' +
      '  color_font_inactive TEXT DEFAULT ''#000000'',' +
      '  color_font_active TEXT DEFAULT ''#FFFFFF'',' +
      '  sort_order INTEGER DEFAULT 0' + ')'
      );

    // Meal sets
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS meal_sets (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  name TEXT NOT NULL,' +
      '  description TEXT,' + '  available BOOLEAN DEFAULT 1,' +
      '  sort_order INTEGER DEFAULT 0,' +
      '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + ')'
      );

    // Ingredients - KORRIGIERT: Inventar-Spalten hinzugefügt
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS ingredients (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  name TEXT NOT NULL,' +
      '  price DECIMAL(10,2) NOT NULL,' + '  category_id INTEGER,' +
      '  available BOOLEAN DEFAULT 1,' + '  sort_order INTEGER DEFAULT 0,' +
      '  stock_quantity INTEGER DEFAULT 0,' + '  min_warning_level INTEGER DEFAULT 5,' +
      '  max_daily_limit INTEGER DEFAULT 0,' + '  track_inventory BOOLEAN DEFAULT 0,' +
      '  sold_today INTEGER DEFAULT 0,' +
      '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + ')'
      );

    // Meal set ingredients mapping
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS meal_set_ingredients (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  meal_set_id INTEGER NOT NULL,' +
      '  ingredient_id INTEGER NOT NULL,' + '  quantity INTEGER DEFAULT 1' + ')'
      );

    // Orders
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS orders (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
      '  order_number TEXT UNIQUE NOT NULL,' + '  table_number TEXT,' +
      '  status TEXT DEFAULT ''pending'',' + '  total_amount DECIMAL(10,2) DEFAULT 0,' +
      '  note TEXT,' + '  qr_code TEXT,' + '  meal_set_id INTEGER,' +
      '  is_custom BOOLEAN DEFAULT 0,' +
      '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,' +
      '  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' + ')'
      );

    // Order items
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS order_items (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  order_id INTEGER NOT NULL,' +
      '  ingredient_id INTEGER,' + '  ingredient_name TEXT NOT NULL,' +
      '  quantity INTEGER NOT NULL DEFAULT 1,' +
      '  unit_price DECIMAL(10,2) NOT NULL,' + '  total_price DECIMAL(10,2) NOT NULL,' +
      '  note TEXT,' + '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + ')'
      );

    // Legacy dishes
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS dishes (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  name TEXT NOT NULL,' +
      '  description TEXT,' + '  price DECIMAL(10,2) NOT NULL,' +
      '  category TEXT NOT NULL,' + '  available BOOLEAN DEFAULT 1,' +
      '  sort_order INTEGER DEFAULT 0,' +
      '  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' + ')'
      );

    // Statistics tables
    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS ingredient_stats (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  ingredient_id INTEGER NOT NULL,' +
      '  date DATE DEFAULT (date(''now'')),' + '  count INTEGER DEFAULT 0,' +
      '  UNIQUE(ingredient_id, date)' + ')'
      );

    ExecuteSQL(
      'CREATE TABLE IF NOT EXISTS meal_set_stats (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,' + '  meal_set_id INTEGER NOT NULL,' +
      '  date DATE DEFAULT (date(''now'')),' + '  count INTEGER DEFAULT 0,' +
      '  UNIQUE(meal_set_id, date)' + ')'
      );

    // Insert sample data
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''1'', ''Tisch 1'')');
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''2'', ''Tisch 2'')');
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''3'', ''Tisch 3'')');
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''4'', ''Tisch 4'')');
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''5'', ''Tisch 5'')');
    ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''takeaway'', ''Take-Away'')');

    // Categories
    ExecuteSQL(
      'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (1, ''Brot & Brötchen'', ''#33B1E4'', ''#1A3DC7'', ''#FFFFFF'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (2, ''Soßen & Beilagen'', ''#83BCBA'', ''#1A3DC7'', ''#FFFFFF'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (3, ''Schlachtplatte'', ''#B0EDEA'', ''#1A3DC7'', ''#FFFFFF'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (4, ''Hauptgerichte'', ''#6DB58B'', ''#1A3DC7'', ''#FFFFFF'')');

    // Ingredients
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (1, ''Brötchen'', 0.60, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (2, ''Brot'', 0.60, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (3, ''Kartoffelsalat'', 2.00, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (4, ''Jäger'', 0.70, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (5, ''Sauerkraut'', 2.00, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (6, ''Zwiebeln'', 0.70, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (7, ''1x Leberwurst'', 1.60, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (8, ''2x Leberwurst'', 3.20, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (9, ''1x Blutwurst'', 1.60, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (10, ''2x Blutwurst'', 3.20, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (11, ''1x Schwartenmagen'', 3.00, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (12, ''2x Schwartenmagen'', 6.00, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (13, ''1x Wellfleisch'', 3.20, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (14, ''2x Wellfleisch'', 6.40, 3)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (15, ''Chilli'', 8.00, 4)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (16, ''Bratwurst'', 2.40, 4)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (17, ''Schnitzel'', 9.70, 4)');
    ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (18, ''Gehacktes'', 8.20, 4)');

    // Meal sets
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (1, ''Gehacktes'', ''Gehacktes mit Brötchen'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (2, ''Schlachtplatte'', ''Traditionelle Schlachtplatte'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (3, ''Schnitzel'', ''Schnitzel mit Brötchen'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (4, ''Bratwurst'', ''Bratwurst mit Brötchen'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (5, ''Chilli'', ''Chilli sin Carne mit Brötchen'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (6, ''Wellfleisch'', ''Wellfleisch mit Brot und Sauerkraut'')');

    // Meal set ingredients mapping
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (1, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (1, 18)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 5)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 7)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 9)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 11)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 13)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (3, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (3, 17)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (4, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (4, 16)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (5, 1)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (5, 15)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 2)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 5)');
    ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 14)');

    // Sample inventory
    ExecuteSQL(
      'UPDATE ingredients SET stock_quantity = 100, min_warning_level = 10, max_daily_limit = 90, track_inventory = 1 WHERE name = ''Bratwurst''');
    ExecuteSQL(
      'UPDATE ingredients SET stock_quantity = 50, min_warning_level = 5, max_daily_limit = 40, track_inventory = 1 WHERE name = ''Schnitzel''');
    ExecuteSQL(
      'UPDATE ingredients SET stock_quantity = 80, min_warning_level = 8, max_daily_limit = 70, track_inventory = 1 WHERE name = ''Gehacktes''');

    // Legacy dishes
    ExecuteSQL(
      'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (1, ''Bratwurst'', ''Klassische Bratwurst vom Grill'', 3.50, ''Hauptgerichte'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (2, ''Currywurst'', ''Bratwurst mit Curry-Sauce'', 4.00, ''Hauptgerichte'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (3, ''Pommes'', ''Knusprige Pommes frites'', 2.50, ''Beilagen'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (4, ''Bier 0,5l'', ''Kühles Bier vom Fass'', 3.00, ''Getränke'')');
    ExecuteSQL(
      'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (5, ''Cola 0,3l'', ''Erfrischende Cola'', 2.00, ''Getränke'')');

    WriteLn('Database schema created successfully');
  end;

  procedure TDatabaseManager.InitializeDatabase;
  begin
    WriteLn('Initializing database schema...');
    CreateTables;
    WriteLn('Database initialization complete');
  end;

  // API Handler Implementation
  constructor TOrderAPIHandler.Create;
  begin
    inherited Create;
    FDB := TDatabaseManager.Create;
  end;

  destructor TOrderAPIHandler.Destroy;
  begin
    if Assigned(FDB) then
      FDB.Free;
    inherited Destroy;
  end;

  procedure TOrderAPIHandler.SetCORSHeaders(AResponse: TResponse);
  begin
    AResponse.SetCustomHeader('Access-Control-Allow-Origin', '*');
    AResponse.SetCustomHeader('Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS');
    AResponse.SetCustomHeader('Access-Control-Allow-Headers',
      'Content-Type, Authorization');
  end;

  procedure TOrderAPIHandler.SendJSONResponse(AResponse: TResponse;
  const AData: string; AStatusCode: integer);
  begin
    SetCORSHeaders(AResponse);
    AResponse.ContentType := 'application/json; charset=utf-8';
    AResponse.Code := AStatusCode;
    AResponse.Content := AData;
  end;
  // Helper Functions Implementation
  function TOrderAPIHandler.ExtractResourceId(const PathInfo: string;
    ResourcePosition: integer): integer;
  var
    PathParts: TStringArray;
  begin
    Result := -1;
    PathParts := SplitString(PathInfo, '/');

    if (Length(PathParts) > ResourcePosition) and
      TryStrToInt(PathParts[ResourcePosition], Result) then
    // Result already set
    else
      Result := -1;
  end;

  function TOrderAPIHandler.GetPathSegment(const PathInfo: string;
    SegmentIndex: integer): string;
  var
    PathParts: TStringArray;
  begin
    Result := '';
    PathParts := SplitString(PathInfo, '/');

    if (SegmentIndex >= 0) and (SegmentIndex < Length(PathParts)) then
      Result := PathParts[SegmentIndex];
  end;

  function TOrderAPIHandler.IsValidResourceId(const PathInfo: string;
    ResourcePosition: integer): boolean;
  begin
    Result := ExtractResourceId(PathInfo, ResourcePosition) > 0;
  end;

  function TOrderAPIHandler.GenerateOrderNumber: string;
  var
    Counter: integer;
    Query: TZQuery;
  begin
    Query := TZQuery.Create(nil);
    try
      Query.Connection := FDB.FConnection;
      Query.SQL.Text :=
        'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE(''now'')';
      Query.Open;
      Counter := Query.FieldByName('count').AsInteger + 1;
      Result := FormatDateTime('yyyymmdd', Now) + '-' + Format('%.3d', [Counter]);
    finally
      Query.Free;
    end;
  end;

  function TOrderAPIHandler.GenerateQRCode(const OrderNumber: string): string;
  begin
    Result := '{"order":"' + OrderNumber + '","type":"order_qr"}';
  end;

  function TOrderAPIHandler.ValidateAdminAccess(ARequest: TRequest): boolean;
  begin
    Result := True; // Development phase - allow all access
  end;

  // Handler Methods - Fixed Implementation
  procedure TOrderAPIHandler.HandleAdminCategories(ARequest: TRequest;
    AResponse: TResponse);
  var
    RequestData: TJSONData;
    CategoryObj: TJSONObject;
    CategoryId: integer;
    Query: TZQuery;
    Categories: TJSONArray;
    PathParts: TStringArray;
  begin
    WriteLn('Admin Categories request: ', ARequest.Method, ' ', ARequest.PathInfo);

    if not ValidateAdminAccess(ARequest) then
    begin
      SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
      Exit;
    end;

    try
      case ARequest.Method of
        'GET':
        begin
          Categories := FDB.QueryJSON(
            'SELECT * FROM categories ORDER BY sort_order, name');
          SendJSONResponse(AResponse, Categories.AsJSON);
          Categories.Free;
        end;

        'POST':
        begin
          if ARequest.Content = '' then
          begin
            SendJSONResponse(AResponse, '{"error":"Empty request body"}', 400);
            Exit;
          end;

          try
            RequestData := GetJSON(ARequest.Content);
          except
            on E: Exception do
            begin
              SendJSONResponse(AResponse, '{"error":"Invalid JSON: ' +
                E.Message + '"}', 400);
              Exit;
            end;
          end;

          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"JSON must be an object"}', 400);
            RequestData.Free;
            Exit;
          end;

          CategoryObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'INSERT INTO categories (name, color_bg_inactive, color_bg_active, color_font_inactive, color_font_active, sort_order) VALUES (:name, :bg_inactive, :bg_active, :font_inactive, :font_active, :sort_order)';
            Query.Params.ParamByName('name').AsString := CategoryObj.Get('name', '');
            Query.Params.ParamByName('bg_inactive').AsString :=
              CategoryObj.Get('color_bg_inactive', '#83BCBA');
            Query.Params.ParamByName('bg_active').AsString :=
              CategoryObj.Get('color_bg_active', '#99E0F3');
            Query.Params.ParamByName('font_inactive').AsString :=
              CategoryObj.Get('color_font_inactive', '#000000');
            Query.Params.ParamByName('font_active').AsString :=
              CategoryObj.Get('color_font_active', '#FFFFFF');
            Query.Params.ParamByName('sort_order').AsInteger :=
              CategoryObj.Get('sort_order', 0);
            Query.ExecSQL;
            SendJSONResponse(AResponse,
              '{"success":true,"message":"Category created"}', 201);
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'PUT':
        begin
          PathParts := SplitString(ARequest.PathInfo, '/');
          if Length(PathParts) < 5 then
          begin
            SendJSONResponse(AResponse,
              '{"error":"Invalid category ID - path too short"}', 400);
            Exit;
          end;

          if not TryStrToInt(PathParts[4], CategoryId) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid category ID"}', 400);
            Exit;
          end;

          if ARequest.Content = '' then
          begin
            SendJSONResponse(AResponse, '{"error":"Empty request body"}', 400);
            Exit;
          end;

          try
            RequestData := GetJSON(ARequest.Content);
          except
            on E: Exception do
            begin
              SendJSONResponse(AResponse, '{"error":"Invalid JSON: ' +
                E.Message + '"}', 400);
              Exit;
            end;
          end;

          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"JSON must be an object"}', 400);
            RequestData.Free;
            Exit;
          end;

          CategoryObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'UPDATE categories SET name = :name, color_bg_inactive = :bg_inactive, color_bg_active = :bg_active, color_font_inactive = :font_inactive, color_font_active = :font_active, sort_order = :sort_order WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := CategoryId;
            Query.Params.ParamByName('name').AsString := CategoryObj.Get('name', '');
            Query.Params.ParamByName('bg_inactive').AsString :=
              CategoryObj.Get('color_bg_inactive', '#83BCBA');
            Query.Params.ParamByName('bg_active').AsString :=
              CategoryObj.Get('color_bg_active', '#99E0F3');
            Query.Params.ParamByName('font_inactive').AsString :=
              CategoryObj.Get('color_font_inactive', '#000000');
            Query.Params.ParamByName('font_active').AsString :=
              CategoryObj.Get('color_font_active', '#FFFFFF');
            Query.Params.ParamByName('sort_order').AsInteger :=
              CategoryObj.Get('sort_order', 0);
            Query.ExecSQL;

            WriteLn('UPDATE executed, RowsAffected: ', Query.RowsAffected);

            if Query.RowsAffected > 0 then
              SendJSONResponse(AResponse, '{"success":true,"message":"Category updated"}')
            else
              SendJSONResponse(AResponse, '{"error":"Category not found"}', 404);
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'DELETE':
        begin
          PathParts := SplitString(ARequest.PathInfo, '/');
          if Length(PathParts) < 5 then
          begin
            SendJSONResponse(AResponse,
              '{"error":"Invalid category ID - path too short"}', 400);
            Exit;
          end;

          if not TryStrToInt(PathParts[4], CategoryId) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid category ID"}', 400);
            Exit;
          end;

          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'SELECT COUNT(*) as count FROM ingredients WHERE category_id = :id';
            Query.Params.ParamByName('id').AsInteger := CategoryId;
            Query.Open;

            if Query.FieldByName('count').AsInteger > 0 then
            begin
              SendJSONResponse(AResponse,
                '{"error":"Cannot delete category with ingredients"}', 400);
              Exit;
            end;

            Query.Close;
            Query.SQL.Text := 'DELETE FROM categories WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := CategoryId;
            Query.ExecSQL;

            if Query.RowsAffected > 0 then
              SendJSONResponse(AResponse, '{"success":true,"message":"Category deleted"}')
            else
              SendJSONResponse(AResponse, '{"error":"Category not found"}', 404);
          finally
            Query.Free;
          end;
        end;

        else
          SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleAdminCategories: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' + E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleAdminIngredients(ARequest: TRequest;
    AResponse: TResponse);
  var
    RequestData: TJSONData;
    IngredientObj: TJSONObject;
    IngredientId: integer;
    Query: TZQuery;
    Ingredients: TJSONArray;
  begin
    WriteLn('Admin Ingredients request: ', ARequest.Method, ' ', ARequest.PathInfo);

    if not ValidateAdminAccess(ARequest) then
    begin
      SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
      Exit;
    end;

    try
      case ARequest.Method of
        'GET':
        begin
          Ingredients := FDB.QueryJSON(
            'SELECT i.*, c.name as category_name FROM ingredients i ' +
            'LEFT JOIN categories c ON i.category_id = c.id ' +
            'ORDER BY i.category_id, i.sort_order, i.name');
          SendJSONResponse(AResponse, Ingredients.AsJSON);
          Ingredients.Free;
        end;

        'POST':
        begin
          RequestData := GetJSON(ARequest.Content);
          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
            Exit;
          end;

          IngredientObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'INSERT INTO ingredients (name, price, category_id, available, sort_order, '
              + 'stock_quantity, min_warning_level, max_daily_limit, track_inventory) '
              + 'VALUES (:name, :price, :category_id, :available, :sort_order, ' +
              ':stock_quantity, :min_warning_level, :max_daily_limit, :track_inventory)';
            Query.Params.ParamByName('name').AsString := IngredientObj.Get('name', '');
            Query.Params.ParamByName('price').AsFloat := IngredientObj.Get('price', 0.0);
            Query.Params.ParamByName('category_id').AsInteger :=
              IngredientObj.Get('category_id', 1);
            Query.Params.ParamByName('available').AsBoolean :=
              IngredientObj.Get('available', True);
            Query.Params.ParamByName('sort_order').AsInteger :=
              IngredientObj.Get('sort_order', 0);
            Query.Params.ParamByName('stock_quantity').AsInteger :=
              IngredientObj.Get('stock_quantity', 0);
            Query.Params.ParamByName('min_warning_level').AsInteger :=
              IngredientObj.Get('min_warning_level', 5);
            Query.Params.ParamByName('max_daily_limit').AsInteger :=
              IngredientObj.Get('max_daily_limit', 0);
            Query.Params.ParamByName('track_inventory').AsBoolean :=
              IngredientObj.Get('track_inventory', False);
            Query.ExecSQL;
            SendJSONResponse(AResponse,
              '{"success":true,"message":"Ingredient created"}', 201);
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'PUT':
        begin
          if not IsValidResourceId(ARequest.PathInfo, 4) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid ingredient ID"}', 400);
            Exit;
          end;
          IngredientId := ExtractResourceId(ARequest.PathInfo, 4);

          RequestData := GetJSON(ARequest.Content);
          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
            Exit;
          end;

          IngredientObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'UPDATE ingredients SET name = :name, price = :price, category_id = :category_id, '
              + 'available = :available, sort_order = :sort_order, stock_quantity = :stock_quantity, '
              + 'min_warning_level = :min_warning_level, max_daily_limit = :max_daily_limit, '
              + 'track_inventory = :track_inventory WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := IngredientId;
            Query.Params.ParamByName('name').AsString := IngredientObj.Get('name', '');
            Query.Params.ParamByName('price').AsFloat := IngredientObj.Get('price', 0.0);
            Query.Params.ParamByName('category_id').AsInteger :=
              IngredientObj.Get('category_id', 1);
            Query.Params.ParamByName('available').AsBoolean :=
              IngredientObj.Get('available', True);
            Query.Params.ParamByName('sort_order').AsInteger :=
              IngredientObj.Get('sort_order', 0);
            Query.Params.ParamByName('stock_quantity').AsInteger :=
              IngredientObj.Get('stock_quantity', 0);
            Query.Params.ParamByName('min_warning_level').AsInteger :=
              IngredientObj.Get('min_warning_level', 5);
            Query.Params.ParamByName('max_daily_limit').AsInteger :=
              IngredientObj.Get('max_daily_limit', 0);
            Query.Params.ParamByName('track_inventory').AsBoolean :=
              IngredientObj.Get('track_inventory', False);
            Query.ExecSQL;

            if Query.RowsAffected > 0 then
              SendJSONResponse(AResponse,
                '{"success":true,"message":"Ingredient updated"}')
            else
              SendJSONResponse(AResponse, '{"error":"Ingredient not found"}', 404);
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'DELETE':
        begin
          if not IsValidResourceId(ARequest.PathInfo, 4) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid ingredient ID"}', 400);
            Exit;
          end;
          IngredientId := ExtractResourceId(ARequest.PathInfo, 4);

          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'SELECT COUNT(*) as count FROM meal_set_ingredients WHERE ingredient_id = :id';
            Query.Params.ParamByName('id').AsInteger := IngredientId;
            Query.Open;

            if Query.FieldByName('count').AsInteger > 0 then
            begin
              SendJSONResponse(AResponse,
                '{"error":"Cannot delete ingredient used in meal sets"}', 400);
              Exit;
            end;

            Query.Close;
            Query.SQL.Text := 'DELETE FROM ingredients WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := IngredientId;
            Query.ExecSQL;

            if Query.RowsAffected > 0 then
              SendJSONResponse(AResponse,
                '{"success":true,"message":"Ingredient deleted"}')
            else
              SendJSONResponse(AResponse, '{"error":"Ingredient not found"}', 404);
          finally
            Query.Free;
          end;
        end;

        else
          SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleAdminIngredients: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleAdminMealSets(ARequest: TRequest;
    AResponse: TResponse);
  var
    RequestData: TJSONData;
    MealSetObj: TJSONObject;
    IngredientsArray: TJSONArray;
    IngredientObj: TJSONObject;
    MealSetId: integer;
    Query: TZQuery;
    MealSets: TJSONArray;
    i: integer;
  begin
    WriteLn('Admin MealSets request: ', ARequest.Method, ' ', ARequest.PathInfo);

    if not ValidateAdminAccess(ARequest) then
    begin
      SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
      Exit;
    end;

    try
      case ARequest.Method of
        'GET':
        begin
          MealSets := FDB.QueryJSON(
            'SELECT ms.*, COUNT(msi.ingredient_id) as ingredient_count ' +
            'FROM meal_sets ms ' +
            'LEFT JOIN meal_set_ingredients msi ON ms.id = msi.meal_set_id ' +
            'GROUP BY ms.id ' + 'ORDER BY ms.sort_order, ms.name');
          SendJSONResponse(AResponse, MealSets.AsJSON);
          MealSets.Free;
        end;

        'POST':
        begin
          RequestData := GetJSON(ARequest.Content);
          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
            Exit;
          end;

          MealSetObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'INSERT INTO meal_sets (name, description, available, sort_order) ' +
              'VALUES (:name, :description, :available, :sort_order)';
            Query.Params.ParamByName('name').AsString := MealSetObj.Get('name', '');
            Query.Params.ParamByName('description').AsString :=
              MealSetObj.Get('description', '');
            Query.Params.ParamByName('available').AsBoolean :=
              MealSetObj.Get('available', True);
            Query.Params.ParamByName('sort_order').AsInteger :=
              MealSetObj.Get('sort_order', 0);
            Query.ExecSQL;

            Query.SQL.Text := 'SELECT last_insert_rowid() as id';
            Query.Open;
            MealSetId := Query.Fields[0].AsInteger;
            Query.Close;

            if MealSetObj.Find('ingredients', IngredientsArray) then
            begin
              for i := 0 to IngredientsArray.Count - 1 do
              begin
                IngredientObj := IngredientsArray.Objects[i];
                Query.SQL.Text :=
                  'INSERT INTO meal_set_ingredients (meal_set_id, ingredient_id, quantity) '
                  + 'VALUES (:meal_set_id, :ingredient_id, :quantity)';
                Query.Params.ParamByName('meal_set_id').AsInteger := MealSetId;
                Query.Params.ParamByName('ingredient_id').AsInteger :=
                  IngredientObj.Get('ingredient_id', 0);
                Query.Params.ParamByName('quantity').AsInteger :=
                  IngredientObj.Get('quantity', 1);
                Query.ExecSQL;
              end;
            end;

            SendJSONResponse(AResponse,
              '{"success":true,"message":"Meal set created","id":' +
              IntToStr(MealSetId) + '}', 201);
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'PUT':
        begin
          if not IsValidResourceId(ARequest.PathInfo, 4) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid meal set ID"}', 400);
            Exit;
          end;
          MealSetId := ExtractResourceId(ARequest.PathInfo, 4);

          RequestData := GetJSON(ARequest.Content);
          if not (RequestData is TJSONObject) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
            Exit;
          end;

          MealSetObj := RequestData as TJSONObject;
          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text :=
              'UPDATE meal_sets SET name = :name, description = :description, ' +
              'available = :available, sort_order = :sort_order WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := MealSetId;
            Query.Params.ParamByName('name').AsString := MealSetObj.Get('name', '');
            Query.Params.ParamByName('description').AsString :=
              MealSetObj.Get('description', '');
            Query.Params.ParamByName('available').AsBoolean :=
              MealSetObj.Get('available', True);
            Query.Params.ParamByName('sort_order').AsInteger :=
              MealSetObj.Get('sort_order', 0);
            Query.ExecSQL;

            if Query.RowsAffected = 0 then
            begin
              SendJSONResponse(AResponse, '{"error":"Meal set not found"}', 404);
              Exit;
            end;

            if MealSetObj.Find('ingredients', IngredientsArray) then
            begin
              Query.SQL.Text :=
                'DELETE FROM meal_set_ingredients WHERE meal_set_id = :id';
              Query.Params.ParamByName('id').AsInteger := MealSetId;
              Query.ExecSQL;

              for i := 0 to IngredientsArray.Count - 1 do
              begin
                IngredientObj := IngredientsArray.Objects[i];
                Query.SQL.Text :=
                  'INSERT INTO meal_set_ingredients (meal_set_id, ingredient_id, quantity) '
                  + 'VALUES (:meal_set_id, :ingredient_id, :quantity)';
                Query.Params.ParamByName('meal_set_id').AsInteger := MealSetId;
                Query.Params.ParamByName('ingredient_id').AsInteger :=
                  IngredientObj.Get('ingredient_id', 0);
                Query.Params.ParamByName('quantity').AsInteger :=
                  IngredientObj.Get('quantity', 1);
                Query.ExecSQL;
              end;
            end;

            SendJSONResponse(AResponse, '{"success":true,"message":"Meal set updated"}');
          finally
            Query.Free;
          end;
          RequestData.Free;
        end;

        'DELETE':
        begin
          if not IsValidResourceId(ARequest.PathInfo, 4) then
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid meal set ID"}', 400);
            Exit;
          end;
          MealSetId := ExtractResourceId(ARequest.PathInfo, 4);

          Query := TZQuery.Create(nil);
          try
            Query.Connection := FDB.FConnection;
            Query.SQL.Text := 'DELETE FROM meal_set_ingredients WHERE meal_set_id = :id';
            Query.Params.ParamByName('id').AsInteger := MealSetId;
            Query.ExecSQL;

            Query.SQL.Text := 'DELETE FROM meal_sets WHERE id = :id';
            Query.Params.ParamByName('id').AsInteger := MealSetId;
            Query.ExecSQL;

            if Query.RowsAffected > 0 then
              SendJSONResponse(AResponse,
                '{"success":true,"message":"Meal set deleted"}')
            else
              SendJSONResponse(AResponse, '{"error":"Meal set not found"}', 404);
          finally
            Query.Free;
          end;
        end;

        else
          SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleAdminMealSets: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

 procedure TOrderAPIHandler.HandleAdminInventory(ARequest: TRequest; AResponse: TResponse);
var
  RequestData: TJSONData;
  InventoryObj, UpdateObj: TJSONObject;
  UpdatesArray: TJSONArray;
  SubPath: string;
  Query: TZQuery;
  Inventory: TJSONArray;
  PathParts: TStringArray;
  i: integer;
begin
  WriteLn('Admin Inventory request: ', ARequest.Method, ' ', ARequest.PathInfo);

  if not ValidateAdminAccess(ARequest) then
  begin
    SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
    Exit;
  end;

  try
    PathParts := SplitString(ARequest.PathInfo, '/');
    if Length(PathParts) >= 5 then
      SubPath := PathParts[4]  // /api/admin/inventory/bulk -> PathParts[4] = "bulk"
    else
      SubPath := '';

    WriteLn('SubPath extracted: "', SubPath, '"');

    case ARequest.Method of
      'GET':
      begin
        case SubPath of
          'warnings':
            Inventory := FDB.QueryJSON(
              'SELECT i.id, i.name, i.stock_quantity, i.min_warning_level, i.sold_today, ' +
              'c.name as category_name FROM ingredients i ' +
              'LEFT JOIN categories c ON i.category_id = c.id ' +
              'WHERE i.track_inventory = 1 AND i.stock_quantity <= i.min_warning_level ' +
              'ORDER BY i.stock_quantity ASC');
          'history':
            Inventory := FDB.QueryJSON(
              'SELECT i.name, i.sold_today, i.max_daily_limit, ' +
              '(i.max_daily_limit - i.sold_today) as remaining_today, ' +
              'c.name as category_name FROM ingredients i ' +
              'LEFT JOIN categories c ON i.category_id = c.id ' +
              'WHERE i.track_inventory = 1 ' +
              'ORDER BY i.sold_today DESC');
          else
            Inventory := FDB.QueryJSON(
              'SELECT i.id, i.name, i.price, i.stock_quantity, i.min_warning_level, ' +
              'i.max_daily_limit, i.track_inventory, i.sold_today, i.available, ' +
              'c.name as category_name, ' +
              'CASE WHEN i.track_inventory = 1 AND i.stock_quantity <= i.min_warning_level THEN 1 ELSE 0 END as is_warning, ' +
              'CASE WHEN i.track_inventory = 1 AND i.stock_quantity = 0 THEN 1 ELSE 0 END as is_out_of_stock ' +
              'FROM ingredients i ' +
              'LEFT JOIN categories c ON i.category_id = c.id ' +
              'ORDER BY i.category_id, i.name');
        end;

        SendJSONResponse(AResponse, Inventory.AsJSON);
        Inventory.Free;
      end;

      'PUT':
      begin
        if ARequest.Content = '' then
        begin
          SendJSONResponse(AResponse, '{"error":"Empty request body"}', 400);
          Exit;
        end;

        try
          RequestData := GetJSON(ARequest.Content);
        except
          on E: Exception do
          begin
            SendJSONResponse(AResponse, '{"error":"Invalid JSON: ' + E.Message + '"}', 400);
            Exit;
          end;
        end;

        if not (RequestData is TJSONObject) then
        begin
          SendJSONResponse(AResponse, '{"error":"JSON must be an object"}', 400);
          RequestData.Free;
          Exit;
        end;

        InventoryObj := RequestData as TJSONObject;

        case SubPath of
          'bulk':
          begin
            if not InventoryObj.Find('updates', UpdatesArray) then
            begin
              SendJSONResponse(AResponse, '{"error":"No updates array provided"}', 400);
              RequestData.Free;
              Exit;
            end;

            Query := TZQuery.Create(nil);
            try
              Query.Connection := FDB.FConnection;

              for i := 0 to UpdatesArray.Count - 1 do
              begin
                UpdateObj := UpdatesArray.Objects[i];
                Query.SQL.Text :=
                  'UPDATE ingredients SET stock_quantity = :stock_quantity, ' +
                  'min_warning_level = :min_warning_level, max_daily_limit = :max_daily_limit, ' +
                  'track_inventory = :track_inventory WHERE id = :id';
                Query.Params.ParamByName('id').AsInteger := UpdateObj.Get('id', 0);
                Query.Params.ParamByName('stock_quantity').AsInteger := UpdateObj.Get('stock_quantity', 0);
                Query.Params.ParamByName('min_warning_level').AsInteger := UpdateObj.Get('min_warning_level', 5);
                Query.Params.ParamByName('max_daily_limit').AsInteger := UpdateObj.Get('max_daily_limit', 0);
                Query.Params.ParamByName('track_inventory').AsBoolean := UpdateObj.Get('track_inventory', False);
                Query.ExecSQL;
              end;

              SendJSONResponse(AResponse, '{"success":true,"message":"Inventory updated","updated":' + IntToStr(UpdatesArray.Count) + '}');
            finally
              Query.Free;
            end;
          end;
          'reset':
          begin
            Query := TZQuery.Create(nil);
            try
              Query.Connection := FDB.FConnection;
              Query.SQL.Text := 'UPDATE ingredients SET sold_today = 0 WHERE track_inventory = 1';
              Query.ExecSQL;
              SendJSONResponse(AResponse, '{"success":true,"message":"Daily counters reset","affected":' + IntToStr(Query.RowsAffected) + '}');
            finally
              Query.Free;
            end;
          end;
          else
            SendJSONResponse(AResponse, '{"error":"Invalid inventory operation"}', 400);
        end;

        RequestData.Free;
      end;

      'POST':
      begin
        case SubPath of
          'reset':
          begin
            Query := TZQuery.Create(nil);
            try
              Query.Connection := FDB.FConnection;
              Query.SQL.Text := 'UPDATE ingredients SET sold_today = 0 WHERE track_inventory = 1';
              Query.ExecSQL;
              SendJSONResponse(AResponse, '{"success":true,"message":"Daily counters reset","affected":' + IntToStr(Query.RowsAffected) + '}');
            finally
              Query.Free;
            end;
          end;
          else
            SendJSONResponse(AResponse, '{"error":"Invalid inventory operation"}', 400);
        end;
      end;

      else
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
    end;
  except
    on E: Exception do
    begin
      WriteLn('Error in HandleAdminInventory: ', E.Message);
      SendJSONResponse(AResponse, '{"error":"Database error: ' + E.Message + '"}', 500);
    end;
  end;
end;

  // Public Handler Methods
  procedure TOrderAPIHandler.HandleHealth(ARequest: TRequest; AResponse: TResponse);
  var
    HealthObj: TJSONObject;
  begin
    WriteLn('Health check from: ', ARequest.RemoteAddress);

    HealthObj := TJSONObject.Create;
    try
      HealthObj.Add('status', 'ok');
      HealthObj.Add('message', 'Server is running and healthy');
      HealthObj.Add('timestamp', DateTimeToStr(Now));
      HealthObj.Add('platform', {$I %FPCTARGETOS%});
      HealthObj.Add('version', '0.5.0');
      HealthObj.Add('database', 'connected');
      SendJSONResponse(AResponse, HealthObj.AsJSON);
    finally
      HealthObj.Free;
    end;
  end;

  procedure TOrderAPIHandler.HandleOrders(ARequest: TRequest; AResponse: TResponse);
  var
    Orders: TJSONArray;
    OrderId: integer;
    StatusSegment: string;
  begin
    WriteLn('Orders request: ', ARequest.Method, ' ', ARequest.PathInfo);

    try
      // Check if this is a status update request
      StatusSegment := GetPathSegment(ARequest.PathInfo, 4);
      if StatusSegment = 'status' then
      begin
        HandleUpdateOrderStatus(ARequest, AResponse);
        Exit;
      end;

      // Check if this is a create order request
      if ARequest.Method = 'POST' then
      begin
        HandleCreateOrder(ARequest, AResponse);
        Exit;
      end;

      // Handle GET requests
      if ARequest.Method = 'GET' then
      begin
        OrderId := ExtractResourceId(ARequest.PathInfo, 3);
        if OrderId > 0 then
        begin
          WriteLn('Fetching specific order: ', OrderId);
          Orders := FDB.QueryJSON('SELECT * FROM orders WHERE id = ' +
            IntToStr(OrderId));
        end
        else
        begin
          WriteLn('Fetching all orders...');
          Orders := FDB.QueryJSON(
            'SELECT * FROM orders ORDER BY created_at DESC LIMIT 20');
        end;

        WriteLn('Query executed, found ', Orders.Count, ' orders');
        SendJSONResponse(AResponse, Orders.AsJSON);
        Orders.Free;
      end
      else
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('ERROR in HandleOrders: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleTables(ARequest: TRequest; AResponse: TResponse);
  var
    Tables: TJSONArray;
  begin
    WriteLn('Tables request from: ', ARequest.RemoteAddress);

    try
      Tables := FDB.QueryJSON(
        'SELECT table_number, table_name, active FROM tables WHERE active = 1');
      SendJSONResponse(AResponse, Tables.AsJSON);
      Tables.Free;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleTables: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleCategories(ARequest: TRequest; AResponse: TResponse);
  var
    Categories: TJSONArray;
  begin
    WriteLn('Categories request from: ', ARequest.RemoteAddress);

    try
      if ARequest.Method = 'GET' then
      begin
        Categories := FDB.QueryJSON(
          'SELECT id, name, color_bg_inactive, color_bg_active, ' +
          'color_font_inactive, color_font_active, sort_order ' +
          'FROM categories ORDER BY sort_order, name');
        SendJSONResponse(AResponse, Categories.AsJSON);
        Categories.Free;
      end
      else
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleCategories: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleIngredients(ARequest: TRequest; AResponse: TResponse);
  var
    Ingredients: TJSONArray;
    CategoryId: integer;
    WhereClause: string;
    CategorySegment: string;
  begin
    WriteLn('Ingredients request: ', ARequest.PathInfo);

    try
      if ARequest.Method = 'GET' then
      begin
        WhereClause := 'WHERE i.available = 1';

        // Check if requesting ingredients for specific category: /api/ingredients/category/1
        CategorySegment := GetPathSegment(ARequest.PathInfo, 3);
        if CategorySegment = 'category' then
        begin
          CategoryId := ExtractResourceId(ARequest.PathInfo, 4);
          if CategoryId > 0 then
            WhereClause := WhereClause + ' AND i.category_id = ' + IntToStr(CategoryId);
        end;

        Ingredients := FDB.QueryJSON(
          'SELECT i.id, i.name, i.price, i.category_id, i.sort_order, ' +
          'c.name as category_name, c.color_bg_inactive, c.color_bg_active, ' +
          'c.color_font_inactive, c.color_font_active ' +
          'FROM ingredients i ' +
          'LEFT JOIN categories c ON i.category_id = c.id ' +
          WhereClause + ' ' + 'ORDER BY i.category_id, i.sort_order, i.name');
        SendJSONResponse(AResponse, Ingredients.AsJSON);
        Ingredients.Free;
      end
      else
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleIngredients: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleMealSets(ARequest: TRequest; AResponse: TResponse);
  var
    MealSets: TJSONArray;
  begin
    WriteLn('MealSets request from: ', ARequest.RemoteAddress);

    try
      if ARequest.Method = 'GET' then
      begin
        MealSets := FDB.QueryJSON(
          'SELECT id, name, description, available, sort_order ' +
          'FROM meal_sets WHERE available = 1 ' + 'ORDER BY sort_order, name');
        SendJSONResponse(AResponse, MealSets.AsJSON);
        MealSets.Free;
      end
      else
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleMealSets: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleMealSetDetails(ARequest: TRequest;
    AResponse: TResponse);
  var
    MealSetId: integer;
    Details: TJSONArray;
  begin
    WriteLn('MealSet Details request: ', ARequest.PathInfo);

    try
      if ARequest.Method <> 'GET' then
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
        Exit;
      end;

      MealSetId := ExtractResourceId(ARequest.PathInfo, 3);
      if MealSetId <= 0 then
      begin
        SendJSONResponse(AResponse, '{"error":"Invalid meal set ID"}', 400);
        Exit;
      end;

      Details := FDB.QueryJSON(
        'SELECT ms.id as meal_set_id, ms.name as meal_set_name, ms.description, ' +
        'msi.quantity, i.id as ingredient_id, i.name as ingredient_name, ' +
        'i.price as ingredient_price, c.name as category_name, ' +
        'c.color_bg_inactive, c.color_bg_active, c.color_font_inactive, c.color_font_active '
        + 'FROM meal_sets ms ' +
        'JOIN meal_set_ingredients msi ON ms.id = msi.meal_set_id ' +
        'JOIN ingredients i ON msi.ingredient_id = i.id ' +
        'LEFT JOIN categories c ON i.category_id = c.id ' + 'WHERE ms.id = ' +
        IntToStr(MealSetId) + ' AND ms.available = 1 AND i.available = 1 ' +
        'ORDER BY c.sort_order, i.sort_order, i.name');

      SendJSONResponse(AResponse, Details.AsJSON);
      Details.Free;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleMealSetDetails: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleStats(ARequest: TRequest; AResponse: TResponse);
  var
    Stats: TJSONArray;
    StatsType: string;
  begin
    WriteLn('Stats request: ', ARequest.PathInfo);

    try
      if ARequest.Method <> 'GET' then
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
        Exit;
      end;

      StatsType := GetPathSegment(ARequest.PathInfo, 3);
      if StatsType = '' then
        StatsType := 'summary';

      case StatsType of
        'ingredients':
          Stats := FDB.QueryJSON(
            'SELECT i.name, COALESCE(SUM(ist.count), 0) as total_count ' +
            'FROM ingredients i ' +
            'LEFT JOIN ingredient_stats ist ON i.id = ist.ingredient_id ' +
            'GROUP BY i.id, i.name ' + 'ORDER BY total_count DESC, i.name');
        'meal-sets':
          Stats := FDB.QueryJSON(
            'SELECT ms.name, COALESCE(SUM(mst.count), 0) as total_count ' +
            'FROM meal_sets ms ' +
            'LEFT JOIN meal_set_stats mst ON ms.id = mst.meal_set_id ' +
            'GROUP BY ms.id, ms.name ' + 'ORDER BY total_count DESC, ms.name');
        'today':
          Stats := FDB.QueryJSON(
            'SELECT ''ingredients'' as type, i.name, COALESCE(ist.count, 0) as count ' +
            'FROM ingredients i ' +
            'LEFT JOIN ingredient_stats ist ON i.id = ist.ingredient_id AND ist.date = date(''now'') '
            + 'UNION ALL ' +
            'SELECT ''meal_sets'' as type, ms.name, COALESCE(mst.count, 0) as count ' +
            'FROM meal_sets ms ' +
            'LEFT JOIN meal_set_stats mst ON ms.id = mst.meal_set_id AND mst.date = date(''now'') '
            + 'ORDER BY type, count DESC');
        else
          Stats := FDB.QueryJSON('SELECT ' +
            '(SELECT COUNT(*) FROM orders WHERE date(created_at) = date(''now'')) as orders_today, '
            + '(SELECT COUNT(*) FROM orders) as orders_total, ' +
            '(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE date(created_at) = date(''now'')) as revenue_today, '
            + '(SELECT COALESCE(SUM(total_amount), 0) FROM orders) as revenue_total');
      end;

      SendJSONResponse(AResponse, Stats.AsJSON);
      Stats.Free;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleStats: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error: ' +
          E.Message + '"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleDishes(ARequest: TRequest; AResponse: TResponse);
  var
    Dishes: TJSONArray;
  begin
    WriteLn('Dishes request from: ', ARequest.RemoteAddress);

    try
      if ARequest.Method = 'GET' then
      begin
        Dishes := FDB.QueryJSON(
          'SELECT id, name, description, price, category FROM dishes WHERE available = 1 ORDER BY category, sort_order, name');
        SendJSONResponse(AResponse, Dishes.AsJSON);
        Dishes.Free;
      end
      else
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleDishes: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Database error"}', 500);
      end;
    end;
  end;

  procedure TOrderAPIHandler.HandleCreateOrder(ARequest: TRequest; AResponse: TResponse);
  var
    RequestData: TJSONData;
    OrderObj, ItemObj: TJSONObject;
    ItemsArray: TJSONArray;
    OrderNumber, QRCode: string;
    TableNumber, Note: string;
    TotalAmount: double;
    OrderId: integer;
    i: integer;
    Query: TZQuery;
  begin
    WriteLn('Create Order request from: ', ARequest.RemoteAddress);

    try
      if ARequest.Method <> 'POST' then
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
        Exit;
      end;

      RequestData := GetJSON(ARequest.Content);
      if not (RequestData is TJSONObject) then
      begin
        SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
        Exit;
      end;

      OrderObj := RequestData as TJSONObject;

      TableNumber := OrderObj.Get('table_number', '');
      Note := OrderObj.Get('note', '');

      if not OrderObj.Find('items', ItemsArray) then
      begin
        SendJSONResponse(AResponse, '{"error":"No items provided"}', 400);
        Exit;
      end;

      OrderNumber := GenerateOrderNumber;
      QRCode := GenerateQRCode(OrderNumber);

      TotalAmount := 0;
      for i := 0 to ItemsArray.Count - 1 do
      begin
        ItemObj := ItemsArray.Objects[i];
        TotalAmount := TotalAmount + (ItemObj.Get('quantity', 1) *
          ItemObj.Get('unit_price', 0.0));
      end;

      Query := TZQuery.Create(nil);
      try
        Query.Connection := FDB.FConnection;
        Query.SQL.Text :=
          'INSERT INTO orders (order_number, table_number, total_amount, note, qr_code, status) '
          + 'VALUES (:order_number, :table_number, :total_amount, :note, :qr_code, ''pending'')';
        Query.Params.ParamByName('order_number').AsString := OrderNumber;
        Query.Params.ParamByName('table_number').AsString := TableNumber;
        Query.Params.ParamByName('total_amount').AsFloat := TotalAmount;
        Query.Params.ParamByName('note').AsString := Note;
        Query.Params.ParamByName('qr_code').AsString := QRCode;
        Query.ExecSQL;

        Query.SQL.Text := 'SELECT last_insert_rowid() as id';
        Query.Open;
        OrderId := Query.Fields[0].AsInteger;
        Query.Close;

        for i := 0 to ItemsArray.Count - 1 do
        begin
          ItemObj := ItemsArray.Objects[i];
          Query.SQL.Text :=
            'INSERT INTO order_items (order_id, ingredient_id, ingredient_name, quantity, unit_price, total_price, note) '
            +
            'VALUES (:order_id, :ingredient_id, :ingredient_name, :quantity, :unit_price, :total_price, :note)';
          Query.Params.ParamByName('order_id').AsInteger := OrderId;
          Query.Params.ParamByName('ingredient_id').AsInteger :=
            ItemObj.Get('ingredient_id', 0);
          Query.Params.ParamByName('ingredient_name').AsString :=
            ItemObj.Get('ingredient_name', '');
          Query.Params.ParamByName('quantity').AsInteger := ItemObj.Get('quantity', 1);
          Query.Params.ParamByName('unit_price').AsFloat :=
            ItemObj.Get('unit_price', 0.0);
          Query.Params.ParamByName('total_price').AsFloat :=
            ItemObj.Get('quantity', 1) * ItemObj.Get('unit_price', 0.0);
          Query.Params.ParamByName('note').AsString := ItemObj.Get('note', '');
          Query.ExecSQL;
        end;
      finally
        Query.Free;
      end;

      OrderObj := TJSONObject.Create;
      try
        OrderObj.Add('success', True);
        OrderObj.Add('order_id', OrderId);
        OrderObj.Add('order_number', OrderNumber);
        OrderObj.Add('qr_code', QRCode);
        OrderObj.Add('total_amount', TotalAmount);
        OrderObj.Add('status', 'pending');
        SendJSONResponse(AResponse, OrderObj.AsJSON, 201);
      finally
        OrderObj.Free;
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleCreateOrder: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Failed to create order: ' +
          E.Message + '"}', 500);
      end;
    end;

    if Assigned(RequestData) then
      RequestData.Free;
  end;

  procedure TOrderAPIHandler.HandleUpdateOrderStatus(ARequest: TRequest;
    AResponse: TResponse);
  var
    OrderId: integer;
    RequestData: TJSONData;
    RequestObj, ResponseObj: TJSONObject;
    NewStatus: string;
    Query: TZQuery;
    StatusSegment: string;
  begin
    WriteLn('Update Order Status request: ', ARequest.PathInfo);

    try
      if ARequest.Method <> 'PUT' then
      begin
        SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
        Exit;
      end;

      StatusSegment := GetPathSegment(ARequest.PathInfo, 4);
      if StatusSegment <> 'status' then
      begin
        SendJSONResponse(AResponse,
          '{"error":"Invalid path format. Use /api/orders/{id}/status"}', 400);
        Exit;
      end;

      OrderId := ExtractResourceId(ARequest.PathInfo, 3);
      if OrderId <= 0 then
      begin
        SendJSONResponse(AResponse, '{"error":"Invalid order ID"}', 400);
        Exit;
      end;

      RequestData := GetJSON(ARequest.Content);
      if not (RequestData is TJSONObject) then
      begin
        SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
        Exit;
      end;

      RequestObj := RequestData as TJSONObject;
      NewStatus := RequestObj.Get('status', '');

      if NewStatus = '' then
      begin
        SendJSONResponse(AResponse, '{"error":"Status field required"}', 400);
        Exit;
      end;

      if not ((NewStatus = 'pending') or (NewStatus = 'preparing') or
        (NewStatus = 'ready') or (NewStatus = 'completed') or
        (NewStatus = 'cancelled')) then
      begin
        SendJSONResponse(AResponse,
          '{"error":"Invalid status. Use: pending, preparing, ready, completed, cancelled"}',
          400);
        Exit;
      end;

      Query := TZQuery.Create(nil);
      try
        Query.Connection := FDB.FConnection;
        Query.SQL.Text :=
          'UPDATE orders SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id';
        Query.Params.ParamByName('status').AsString := NewStatus;
        Query.Params.ParamByName('id').AsInteger := OrderId;
        Query.ExecSQL;

        if Query.RowsAffected = 0 then
        begin
          SendJSONResponse(AResponse, '{"error":"Order not found"}', 404);
          Exit;
        end;
      finally
        Query.Free;
      end;

      ResponseObj := TJSONObject.Create;
      try
        ResponseObj.Add('success', True);
        ResponseObj.Add('order_id', OrderId);
        ResponseObj.Add('new_status', NewStatus);
        ResponseObj.Add('updated_at', DateTimeToStr(Now));
        SendJSONResponse(AResponse, ResponseObj.AsJSON);
      finally
        ResponseObj.Free;
      end;
    except
      on E: Exception do
      begin
        WriteLn('Error in HandleUpdateOrderStatus: ', E.Message);
        SendJSONResponse(AResponse, '{"error":"Failed to update order status: ' +
          E.Message + '"}', 500);
      end;
    end;

    if Assigned(RequestData) then
      RequestData.Free;
  end;

  procedure TOrderAPIHandler.HandleRoot(ARequest: TRequest; AResponse: TResponse);
  var
    InfoObj: TJSONObject;
  begin
    WriteLn('Root request from: ', ARequest.RemoteAddress);

    InfoObj := TJSONObject.Create;
    try
      InfoObj.Add('service', 'Order Management API');
      InfoObj.Add('version', '0.5.0');
      InfoObj.Add('status', 'running');
      InfoObj.Add('endpoints', TJSONArray.Create(['/api/health',
        '/api/orders', '/api/tables']));
      SendJSONResponse(AResponse, InfoObj.AsJSON);
    finally
      InfoObj.Free;
    end;
  end;

  procedure TOrderAPIHandler.HandleDefault(ARequest: TRequest; AResponse: TResponse);
  var
    ErrorObj: TJSONObject;
  begin
    WriteLn('Default handler - unmatched route: "', ARequest.PathInfo,
      '" from: ', ARequest.RemoteAddress);

    ErrorObj := TJSONObject.Create;
    try
      ErrorObj.Add('error', 'Endpoint not found');
      ErrorObj.Add('path', ARequest.PathInfo);
      ErrorObj.Add('method', ARequest.Method);
      ErrorObj.Add('available_endpoints',
        TJSONArray.Create(['/', '/api/health', '/api/orders', '/api/tables']));
      ErrorObj.Add('message', 'Use one of the available endpoints listed above');
      SendJSONResponse(AResponse, ErrorObj.AsJSON, 404);
    finally
      ErrorObj.Free;
    end;
  end;

  // Main Program
var
  APIHandler: TOrderAPIHandler;

begin
  {$IFDEF UNIX}
  ExitCode := 0;
  Signal(SIGINT, SIG_DFL);
  {$ENDIF}

  WriteLn('=================================');
  WriteLn('Order Management System Server');
  WriteLn('Platform: ', {$I %FPCTARGETOS%});
  WriteLn('Architecture: ', {$I %FPCTARGETCPU%});
  WriteLn('Version: 0.5.0');
  WriteLn('=================================');

  APIHandler := TOrderAPIHandler.Create;

  try
    WriteLn('Registering routes...');

    HTTPRouter.RegisterRoute('/', @APIHandler.HandleRoot);
    HTTPRouter.RegisterRoute('/api/health', @APIHandler.HandleHealth);
    HTTPRouter.RegisterRoute('/api/orders', @APIHandler.HandleOrders);
    HTTPRouter.RegisterRoute('/api/orders/*', @APIHandler.HandleOrders);
    HTTPRouter.RegisterRoute('/api/tables', @APIHandler.HandleTables);
    HTTPRouter.RegisterRoute('/api/dishes', @APIHandler.HandleDishes);

    HTTPRouter.RegisterRoute('/api/categories', @APIHandler.HandleCategories);
    HTTPRouter.RegisterRoute('/api/ingredients', @APIHandler.HandleIngredients);
    HTTPRouter.RegisterRoute('/api/ingredients/*', @APIHandler.HandleIngredients);
    HTTPRouter.RegisterRoute('/api/meal-sets', @APIHandler.HandleMealSets);
    HTTPRouter.RegisterRoute('/api/meal-sets/*', @APIHandler.HandleMealSetDetails);
    HTTPRouter.RegisterRoute('/api/stats', @APIHandler.HandleStats);
    HTTPRouter.RegisterRoute('/api/stats/*', @APIHandler.HandleStats);

    HTTPRouter.RegisterRoute('/api/admin/categories', @APIHandler.HandleAdminCategories);
    HTTPRouter.RegisterRoute('/api/admin/categories/*',
      @APIHandler.HandleAdminCategories);
    HTTPRouter.RegisterRoute('/api/admin/ingredients',
      @APIHandler.HandleAdminIngredients);
    HTTPRouter.RegisterRoute('/api/admin/ingredients/*',
      @APIHandler.HandleAdminIngredients);
    HTTPRouter.RegisterRoute('/api/admin/meal-sets', @APIHandler.HandleAdminMealSets);
    HTTPRouter.RegisterRoute('/api/admin/meal-sets/*', @APIHandler.HandleAdminMealSets);
    HTTPRouter.RegisterRoute('/api/admin/inventory', @APIHandler.HandleAdminInventory);
    HTTPRouter.RegisterRoute('/api/admin/inventory/*', @APIHandler.HandleAdminInventory);

    HTTPRouter.RegisterRoute('*', @APIHandler.HandleDefault);

    WriteLn('All routes registered successfully');
    WriteLn('');
    WriteLn('Available endpoints:');
    WriteLn('  http://localhost:8080/api/health');
    WriteLn('  http://localhost:8080/api/orders                    [GET, POST]');
    WriteLn('  http://localhost:8080/api/orders/{id}/status        [PUT]');
    WriteLn('  http://localhost:8080/api/tables                    [GET]');
    WriteLn('  http://localhost:8080/api/categories                [GET]');
    WriteLn('  http://localhost:8080/api/ingredients               [GET]');
    WriteLn('  http://localhost:8080/api/meal-sets                 [GET]');
    WriteLn('  http://localhost:8080/api/stats                     [GET]');
    WriteLn('  http://localhost:8080/api/admin/categories          [GET, POST, PUT, DELETE]');
    WriteLn('  http://localhost:8080/api/admin/ingredients         [GET, POST, PUT, DELETE]');
    WriteLn('  http://localhost:8080/api/admin/meal-sets           [GET, POST, PUT, DELETE]');
    WriteLn('  http://localhost:8080/api/admin/inventory           [GET, PUT]');
    WriteLn('');
    WriteLn('Press Ctrl+C to stop server');

    Application.Port := 8080;
    Application.Threaded := True;
    Application.Initialize;
    WriteLn('Server started successfully on port 8080!');
    Application.Run;

  except
    on E: Exception do
    begin
      WriteLn('Server error: ', E.Message);
      WriteLn('Make sure:');
      WriteLn('  - sqlite3.dll is in the current directory');
      WriteLn('  - Port 8080 is not in use');
      ExitCode := 1;
    end;
  end;

  if Assigned(APIHandler) then
    APIHandler.Free;

  WriteLn('Server stopped.');
end.program OrderServer;
{$mode objfpc}{$H+}uses
{$IFDEF UNIX}
  cthreads,
{$ENDIF}  Classes,
FileInfo,
SysUtils,
fphttpapp,
httpdefs,
httproute,
fpjson,
jsonparser,
ZConnection,
ZDataset,
ZSqlUpdate,
ZDbcIntfs,
DB,
strutils;
type
TDatabaseManager = class
private
FConnection: TZConnection;
procedure InitializeDatabase;
procedure CreateTables;
public
constructor Create;
destructor Destroy;
override;
function QueryJSON(const SQL: string): TJSONArray;
procedure ExecuteSQL(const SQL: string);
end;
TOrderAPIHandler = class
private
FDB: TDatabaseManager;
// Helper functions    function ExtractResourceId(const PathInfo: string;ResourcePosition:
integer = 3): integer;
function GetPathSegment(
const PathInfo: string;
SegmentIndex: integer): string;
function IsValidResourceId(
const PathInfo: string;
ResourcePosition: integer = 3): boolean;
// Core functions    function GenerateOrderNumber: string;function GenerateQRCode(const
OrderNumber: string): string;
function ValidateAdminAccess(ARequest: TRequest): boolean;
// Handler methods    procedure HandleAdminCategories(ARequest: TRequest;AResponse:TResponse);
procedure HandleAdminIngredients(ARequest: TRequest;
AResponse: TResponse);
procedure HandleAdminInventory(ARequest: TRequest;
AResponse: TResponse);
procedure HandleAdminMealSets(ARequest: TRequest;
AResponse: TResponse);
procedure HandleCategories(ARequest: TRequest;
AResponse: TResponse);
procedure HandleCreateOrder(ARequest: TRequest;
AResponse: TResponse);
procedure HandleDishes(ARequest: TRequest;
AResponse: TResponse);
procedure HandleIngredients(ARequest: TRequest;
AResponse: TResponse);
procedure HandleMealSetDetails(ARequest: TRequest;
AResponse: TResponse);
procedure HandleMealSets(ARequest: TRequest;
AResponse: TResponse);
procedure HandleStats(ARequest: TRequest;
AResponse: TResponse);
procedure HandleUpdateOrderStatus(ARequest: TRequest;
AResponse: TResponse);
public
constructor Create;
destructor Destroy;
override;
procedure HandleHealth(ARequest: TRequest;
AResponse: TResponse);
procedure HandleOrders(ARequest: TRequest;
AResponse: TResponse);
procedure HandleTables(ARequest: TRequest;
AResponse: TResponse);
procedure HandleRoot(ARequest: TRequest;
AResponse: TResponse);
procedure HandleDefault(ARequest: TRequest;
AResponse: TResponse);
procedure SetCORSHeaders(AResponse: TResponse);
procedure SendJSONResponse(AResponse: TResponse;
const AData: string;
AStatusCode: integer = 200);
end;
// Database Manager Implementationconstructor TDatabaseManager.Create;begin
inherited Create;
FConnection := TZConnection.Create(nil);
FConnection.Protocol := 'sqlite';
FConnection.Database := 'orders.db';
FConnection.LibraryLocation := 'sqlite3.dll';
try
FConnection.Connect;
WriteLn('Database connected successfully');
InitializeDatabase;
except
on E: Exception do
begin
WriteLn('Database connection failed: ', E.Message);
raise;
end;
end;
end;
destructor TDatabaseManager.Destroy;
begin
if Assigned(FConnection) then
begin
if FConnection.Connected then
FConnection.Disconnect;
FConnection.Free;
end;
inherited Destroy;
end;
procedure TDatabaseManager.ExecuteSQL(const SQL: string);
var
Query: TZQuery;
begin
Query := TZQuery.Create(nil);
try
Query.Connection := FConnection;
Query.SQL.Text := SQL;
Query.ExecSQL;
finally
Query.Free;
end;
end;
function TDatabaseManager.QueryJSON(const SQL: string): TJSONArray;
var
Query: TZQuery;
Row: TJSONObject;
i: integer;
begin
Result := TJSONArray.Create;
Query := TZQuery.Create(nil);
try
Query.Connection := FConnection;
Query.SQL.Text := SQL;
Query.Open;
while not Query.EOF do
begin
Row := TJSONObject.Create;
for i := 0 to Query.Fields.Count - 1 do
begin
if Query.Fields[i].IsNull then
Row.Add(Query.Fields[i].FieldName, TJSONNull.Create)
else
begin
case Query.Fields[i].DataType of
ftInteger, ftSmallint, ftWord, ftLargeint:
Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsInteger);
ftFloat, ftCurrency, ftBCD, ftFMTBcd: Row.Add(
Query.Fields[i].FieldName, Query.Fields[i].AsFloat);
ftBoolean: Row.Add(Query.Fields[i].FieldName,
Query.Fields[i].AsBoolean);
ftDateTime, ftDate, ftTime, ftTimeStamp:
Row.Add(Query.Fields[i].FieldName,
DateTimeToStr(Query.Fields[i].AsDateTime));
else
Row.Add(Query.Fields[i].FieldName, Query.Fields[i].AsString);
end;
end;
end;
Result.Add(Row);
Query.Next;
end;
finally
Query.Free;
end;
end;
procedure TDatabaseManager.CreateTables;
begin
// Tables configuration  ExecuteSQL('CREATE TABLE IF NOT EXISTS tables (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  table_number TEXT UNIQUE NOT NULL,' +
'  table_name TEXT,' +
'  active BOOLEAN DEFAULT 1' +
')');
// Categories  ExecuteSQL('CREATE TABLE IF NOT EXISTS categories (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  name TEXT NOT NULL,' +
'  color_bg_inactive TEXT DEFAULT ''#83BCBA'',' +
'  color_bg_active TEXT DEFAULT ''#99E0F3'',' +
'  color_font_inactive TEXT DEFAULT ''#000000'',' +
'  color_font_active TEXT DEFAULT ''#FFFFFF'',' +
'  sort_order INTEGER DEFAULT 0' +
')');
// Meal sets  ExecuteSQL('CREATE TABLE IF NOT EXISTS meal_sets (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  name TEXT NOT NULL,' +
'  description TEXT,' +
'  available BOOLEAN DEFAULT 1,' +
'  sort_order INTEGER DEFAULT 0,' +
'  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
')');
// Ingredients - KORRIGIERT: Inventar-Spalten hinzugefügt  ExecuteSQL(
'CREATE TABLE IF NOT EXISTS ingredients (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  name TEXT NOT NULL,' +
'  price DECIMAL(10,2) NOT NULL,' +
'  category_id INTEGER,' +
'  available BOOLEAN DEFAULT 1,' +
'  sort_order INTEGER DEFAULT 0,' +
'  stock_quantity INTEGER DEFAULT 0,' +
'  min_warning_level INTEGER DEFAULT 5,' +
'  max_daily_limit INTEGER DEFAULT 0,' +
'  track_inventory BOOLEAN DEFAULT 0,' +
'  sold_today INTEGER DEFAULT 0,' +
'  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
')');
// Meal set ingredients mapping  ExecuteSQL('CREATE TABLE IF NOT EXISTS meal_set_ingredients ('
+
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  meal_set_id INTEGER NOT NULL,' +
'  ingredient_id INTEGER NOT NULL,' +
'  quantity INTEGER DEFAULT 1' +
')');
// Orders  ExecuteSQL('CREATE TABLE IF NOT EXISTS orders (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  order_number TEXT UNIQUE NOT NULL,' +
'  table_number TEXT,' +
'  status TEXT DEFAULT ''pending'',' +
'  total_amount DECIMAL(10,2) DEFAULT 0,' +
'  note TEXT,' +
'  qr_code TEXT,' +
'  meal_set_id INTEGER,' +
'  is_custom BOOLEAN DEFAULT 0,' +
'  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,' +
'  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
')');
// Order items  ExecuteSQL('CREATE TABLE IF NOT EXISTS order_items (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  order_id INTEGER NOT NULL,' +
'  ingredient_id INTEGER,' +
'  ingredient_name TEXT NOT NULL,' +
'  quantity INTEGER NOT NULL DEFAULT 1,' +
'  unit_price DECIMAL(10,2) NOT NULL,' +
'  total_price DECIMAL(10,2) NOT NULL,' +
'  note TEXT,' +
'  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
')');
// Legacy dishes  ExecuteSQL('CREATE TABLE IF NOT EXISTS dishes (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  name TEXT NOT NULL,' +
'  description TEXT,' +
'  price DECIMAL(10,2) NOT NULL,' +
'  category TEXT NOT NULL,' +
'  available BOOLEAN DEFAULT 1,' +
'  sort_order INTEGER DEFAULT 0,' +
'  created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
')');
// Statistics tables  ExecuteSQL('CREATE TABLE IF NOT EXISTS ingredient_stats (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  ingredient_id INTEGER NOT NULL,' +
'  date DATE DEFAULT (date(''now'')),' +
'  count INTEGER DEFAULT 0,' +
'  UNIQUE(ingredient_id, date)' +
')');
ExecuteSQL(
'CREATE TABLE IF NOT EXISTS meal_set_stats (' +
'  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
'  meal_set_id INTEGER NOT NULL,' +
'  date DATE DEFAULT (date(''now'')),' +
'  count INTEGER DEFAULT 0,' +
'  UNIQUE(meal_set_id, date)' +
')');
// Insert sample data  ExecuteSQL(
'INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''1'', ''Tisch 1'')');
ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''2'', ''Tisch 2'')');
ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''3'', ''Tisch 3'')');
ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''4'', ''Tisch 4'')');
ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''5'', ''Tisch 5'')');
ExecuteSQL('INSERT OR IGNORE INTO tables (table_number, table_name) VALUES (''takeaway'', ''Take-Away'')');
// Categories  ExecuteSQL(
'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (1, ''Brot & Brötchen'', ''#33B1E4'', ''#1A3DC7'', ''#FFFFFF'')');
ExecuteSQL(
'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (2, ''Soßen & Beilagen'', ''#83BCBA'', ''#1A3DC7'', ''#FFFFFF'')');
ExecuteSQL(
'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (3, ''Schlachtplatte'', ''#B0EDEA'', ''#1A3DC7'', ''#FFFFFF'')');
ExecuteSQL(
'INSERT OR IGNORE INTO categories (id, name, color_bg_inactive, color_bg_active, color_font_active) VALUES (4, ''Hauptgerichte'', ''#6DB58B'', ''#1A3DC7'', ''#FFFFFF'')');
// Ingredients  ExecuteSQL(
'INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (1, ''Brötchen'', 0.60, 1)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (2, ''Brot'', 0.60, 1)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (3, ''Kartoffelsalat'', 2.00, 2)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (4, ''Jäger'', 0.70, 2)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (5, ''Sauerkraut'', 2.00, 2)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (6, ''Zwiebeln'', 0.70, 2)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (7, ''1x Leberwurst'', 1.60, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (8, ''2x Leberwurst'', 3.20, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (9, ''1x Blutwurst'', 1.60, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (10, ''2x Blutwurst'', 3.20, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (11, ''1x Schwartenmagen'', 3.00, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (12, ''2x Schwartenmagen'', 6.00, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (13, ''1x Wellfleisch'', 3.20, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (14, ''2x Wellfleisch'', 6.40, 3)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (15, ''Chilli'', 8.00, 4)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (16, ''Bratwurst'', 2.40, 4)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (17, ''Schnitzel'', 9.70, 4)');
ExecuteSQL('INSERT OR IGNORE INTO ingredients (id, name, price, category_id) VALUES (18, ''Gehacktes'', 8.20, 4)');
// Meal sets  ExecuteSQL(
'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (1, ''Gehacktes'', ''Gehacktes mit Brötchen'')');
ExecuteSQL(
'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (2, ''Schlachtplatte'', ''Traditionelle Schlachtplatte'')');
ExecuteSQL('INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (3, ''Schnitzel'', ''Schnitzel mit Brötchen'')');
ExecuteSQL('INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (4, ''Bratwurst'', ''Bratwurst mit Brötchen'')');
ExecuteSQL('INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (5, ''Chilli'', ''Chilli sin Carne mit Brötchen'')');
ExecuteSQL(
'INSERT OR IGNORE INTO meal_sets (id, name, description) VALUES (6, ''Wellfleisch'', ''Wellfleisch mit Brot und Sauerkraut'')');
// Meal set ingredients mapping  ExecuteSQL(
'INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (1, 1)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (1, 18)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 2)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 5)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 7)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 9)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 11)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (2, 13)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (3, 1)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (3, 17)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (4, 1)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (4, 16)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (5, 1)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (5, 15)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 2)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 5)');
ExecuteSQL('INSERT OR IGNORE INTO meal_set_ingredients (meal_set_id, ingredient_id) VALUES (6, 14)');
// Sample inventory  ExecuteSQL(
'UPDATE ingredients SET stock_quantity = 100, min_warning_level = 10, max_daily_limit = 90, track_inventory = 1 WHERE name = ''Bratwurst''');
ExecuteSQL(
'UPDATE ingredients SET stock_quantity = 50, min_warning_level = 5, max_daily_limit = 40, track_inventory = 1 WHERE name = ''Schnitzel''');
ExecuteSQL(
'UPDATE ingredients SET stock_quantity = 80, min_warning_level = 8, max_daily_limit = 70, track_inventory = 1 WHERE name = ''Gehacktes''');
// Legacy dishes  ExecuteSQL(
'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (1, ''Bratwurst'', ''Klassische Bratwurst vom Grill'', 3.50, ''Hauptgerichte'')');
ExecuteSQL(
'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (2, ''Currywurst'', ''Bratwurst mit Curry-Sauce'', 4.00, ''Hauptgerichte'')');
ExecuteSQL(
'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (3, ''Pommes'', ''Knusprige Pommes frites'', 2.50, ''Beilagen'')');
ExecuteSQL(
'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (4, ''Bier 0,5l'', ''Kühles Bier vom Fass'', 3.00, ''Getränke'')');
ExecuteSQL(
'INSERT OR IGNORE INTO dishes (id, name, description, price, category) VALUES (5, ''Cola 0,3l'', ''Erfrischende Cola'', 2.00, ''Getränke'')');
WriteLn('Database schema created successfully');
end;
procedure TDatabaseManager.InitializeDatabase;
begin
WriteLn('Initializing database schema...');
CreateTables;
WriteLn('Database initialization complete');
end;
// API Handler Implementationconstructor TOrderAPIHandler.Create;begininherited Create;
FDB := TDatabaseManager.Create;
end;
destructor TOrderAPIHandler.Destroy;
begin
if Assigned(FDB) then
FDB.Free;
inherited Destroy;
end;
procedure TOrderAPIHandler.SetCORSHeaders(AResponse: TResponse);
begin
AResponse.SetCustomHeader('Access-Control-Allow-Origin', '*');
AResponse.SetCustomHeader('Access-Control-Allow-Methods',
'GET, POST, PUT, DELETE, OPTIONS');
AResponse.SetCustomHeader('Access-Control-Allow-Headers',
'Content-Type, Authorization');
end;
procedure TOrderAPIHandler.SendJSONResponse(AResponse: TResponse;
const AData: string;
AStatusCode: integer);
begin
SetCORSHeaders(AResponse);
AResponse.ContentType := 'application/json; charset=utf-8';
AResponse.Code := AStatusCode;
AResponse.Content := AData;
end;
// Helper Functions Implementationfunction TOrderAPIHandler.ExtractResourceId(constPathInfo:
string;
ResourcePosition: integer): integer;
var
PathParts: TStringArray;
begin
Result := -1;
PathParts := SplitString(PathInfo, '/');
if (Length(PathParts) > ResourcePosition) and
TryStrToInt(PathParts[ResourcePosition], Result) then
// Result already set  elseResult := -1;end;
function TOrderAPIHandler.GetPathSegment(const PathInfo: string;
SegmentIndex: integer): string;
var
PathParts: TStringArray;
begin
Result := '';
PathParts := SplitString(PathInfo, '/');
if (SegmentIndex >= 0) and (SegmentIndex < Length(PathParts)) then
Result := PathParts[SegmentIndex];
end;
function TOrderAPIHandler.IsValidResourceId(const PathInfo: string;
ResourcePosition: integer): boolean;
begin
Result := ExtractResourceId(PathInfo, ResourcePosition) > 0;
end;
function TOrderAPIHandler.GenerateOrderNumber: string;
var
Counter: integer;
Query: TZQuery;
begin
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE(''now'')';
Query.Open;
Counter := Query.FieldByName('count').AsInteger + 1;
Result := FormatDateTime('yyyymmdd', Now) + '-' + Format('%.3d', [Counter]);
finally
Query.Free;
end;
end;
function TOrderAPIHandler.GenerateQRCode(const OrderNumber: string): string;
begin
Result := '{"order":"' + OrderNumber + '","type":"order_qr"}';
end;
function TOrderAPIHandler.ValidateAdminAccess(ARequest: TRequest): boolean;
begin
Result := True; // Development phase - allow all accessend;
// Handler Methods - Fixed ImplementationprocedureTOrderAPIHandler.HandleAdminCategories(
ARequest: TRequest;
AResponse: TResponse);
var
RequestData: TJSONData;
CategoryObj: TJSONObject;
CategoryId: integer;
Query: TZQuery;
Categories: TJSONArray;
begin
WriteLn('Admin Categories request: ', ARequest.Method, ' ', ARequest.PathInfo);
if not ValidateAdminAccess(ARequest) then
begin
SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
Exit;
end;
try
case ARequest.Method of
'GET': begin
Categories := FDB.QueryJSON(
'SELECT * FROM categories ORDER BY sort_order, name');
SendJSONResponse(AResponse, Categories.AsJSON);
Categories.Free;
end;
'POST': begin
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
CategoryObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'INSERT INTO categories (name, color_bg_inactive, color_bg_active, color_font_inactive, color_font_active, sort_order) VALUES (:name, :bg_inactive, :bg_active, :font_inactive, :font_active, :sort_order)';
Query.Params.ParamByName('name').AsString := CategoryObj.Get('name', '');
Query.Params.ParamByName('bg_inactive').AsString :=
CategoryObj.Get('color_bg_inactive', '#83BCBA');
Query.Params.ParamByName('bg_active').AsString :=
CategoryObj.Get('color_bg_active', '#99E0F3');
Query.Params.ParamByName('font_inactive').AsString :=
CategoryObj.Get('color_font_inactive', '#000000');
Query.Params.ParamByName('font_active').AsString :=
CategoryObj.Get('color_font_active', '#FFFFFF');
Query.Params.ParamByName('sort_order').AsInteger :=
CategoryObj.Get('sort_order', 0);
Query.ExecSQL;
SendJSONResponse(AResponse,
'{"success":true,"message":"Category created"}', 201);
finally
Query.Free;
end;
RequestData.Free;
end;
'PUT': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid category ID"}', 400);
Exit;
end;
CategoryId := ExtractResourceId(ARequest.PathInfo, 3);
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
CategoryObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'UPDATE categories SET name = :name, color_bg_inactive = :bg_inactive, color_bg_active = :bg_active, color_font_inactive = :font_inactive, color_font_active = :font_active, sort_order = :sort_order WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := CategoryId;
Query.Params.ParamByName('name').AsString := CategoryObj.Get('name', '');
Query.Params.ParamByName('bg_inactive').AsString :=
CategoryObj.Get('color_bg_inactive', '#83BCBA');
Query.Params.ParamByName('bg_active').AsString :=
CategoryObj.Get('color_bg_active', '#99E0F3');
Query.Params.ParamByName('font_inactive').AsString :=
CategoryObj.Get('color_font_inactive', '#000000');
Query.Params.ParamByName('font_active').AsString :=
CategoryObj.Get('color_font_active', '#FFFFFF');
Query.Params.ParamByName('sort_order').AsInteger :=
CategoryObj.Get('sort_order', 0);
Query.ExecSQL;
if Query.RowsAffected > 0 then
SendJSONResponse(AResponse, '{"success":true,"message":"Category updated"}')
else
SendJSONResponse(AResponse, '{"error":"Category not found"}', 404);
finally
Query.Free;
end;
RequestData.Free;
end;
'DELETE': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid category ID"}', 400);
Exit;
end;
CategoryId := ExtractResourceId(ARequest.PathInfo, 3);
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'SELECT COUNT(*) as count FROM ingredients WHERE category_id = :id';
Query.Params.ParamByName('id').AsInteger := CategoryId;
Query.Open;
if Query.FieldByName('count').AsInteger > 0 then
begin
SendJSONResponse(AResponse,
'{"error":"Cannot delete category with ingredients"}', 400);
Exit;
end;
Query.Close;
Query.SQL.Text := 'DELETE FROM categories WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := CategoryId;
Query.ExecSQL;
if Query.RowsAffected > 0 then
SendJSONResponse(AResponse, '{"success":true,"message":"Category deleted"}')
else
SendJSONResponse(AResponse, '{"error":"Category not found"}', 404);
finally
Query.Free;
end;
end;
else
SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
end;
except
on E: Exception do
begin
WriteLn('Error in HandleAdminCategories: ', E.Message);
SendJSONResponse(AResponse, '{"error":"Database error: ' + E.Message + '"}', 500);
end;
end;
end;
procedure TOrderAPIHandler.HandleAdminIngredients(ARequest: TRequest;
AResponse: TResponse);
var
RequestData: TJSONData;
IngredientObj: TJSONObject;
IngredientId: integer;
Query: TZQuery;
Ingredients: TJSONArray;
begin
WriteLn('Admin Ingredients request: ', ARequest.Method, ' ', ARequest.PathInfo);
if not ValidateAdminAccess(ARequest) then
begin
SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
Exit;
end;
try
case ARequest.Method of
'GET': begin
Ingredients := FDB.QueryJSON(
'SELECT i.*, c.name as category_name FROM ingredients i ' +
'LEFT JOIN categories c ON i.category_id = c.id ' +
'ORDER BY i.category_id, i.sort_order, i.name');
SendJSONResponse(AResponse, Ingredients.AsJSON);
Ingredients.Free;
end;
'POST': begin
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
IngredientObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'INSERT INTO ingredients (name, price, category_id, available, sort_order, ' +
'stock_quantity, min_warning_level, max_daily_limit, track_inventory) ' +
'VALUES (:name, :price, :category_id, :available, :sort_order, ' +
':stock_quantity, :min_warning_level, :max_daily_limit, :track_inventory)';
Query.Params.ParamByName('name').AsString := IngredientObj.Get('name', '');
Query.Params.ParamByName('price').AsFloat := IngredientObj.Get('price', 0.0);
Query.Params.ParamByName('category_id').AsInteger :=
IngredientObj.Get('category_id', 1);
Query.Params.ParamByName('available').AsBoolean :=
IngredientObj.Get('available', True);
Query.Params.ParamByName('sort_order').AsInteger :=
IngredientObj.Get('sort_order', 0);
Query.Params.ParamByName('stock_quantity').AsInteger :=
IngredientObj.Get('stock_quantity', 0);
Query.Params.ParamByName('min_warning_level').AsInteger :=
IngredientObj.Get('min_warning_level', 5);
Query.Params.ParamByName('max_daily_limit').AsInteger :=
IngredientObj.Get('max_daily_limit', 0);
Query.Params.ParamByName('track_inventory').AsBoolean :=
IngredientObj.Get('track_inventory', False);
Query.ExecSQL;
SendJSONResponse(AResponse,
'{"success":true,"message":"Ingredient created"}', 201);
finally
Query.Free;
end;
RequestData.Free;
end;
'PUT': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid ingredient ID"}', 400);
Exit;
end;
IngredientId := ExtractResourceId(ARequest.PathInfo, 3);
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
IngredientObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'UPDATE ingredients SET name = :name, price = :price, category_id = :category_id, ' +
'available = :available, sort_order = :sort_order, stock_quantity = :stock_quantity, ' +
'min_warning_level = :min_warning_level, max_daily_limit = :max_daily_limit, ' +
'track_inventory = :track_inventory WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := IngredientId;
Query.Params.ParamByName('name').AsString := IngredientObj.Get('name', '');
Query.Params.ParamByName('price').AsFloat := IngredientObj.Get('price', 0.0);
Query.Params.ParamByName('category_id').AsInteger :=
IngredientObj.Get('category_id', 1);
Query.Params.ParamByName('available').AsBoolean :=
IngredientObj.Get('available', True);
Query.Params.ParamByName('sort_order').AsInteger :=
IngredientObj.Get('sort_order', 0);
Query.Params.ParamByName('stock_quantity').AsInteger :=
IngredientObj.Get('stock_quantity', 0);
Query.Params.ParamByName('min_warning_level').AsInteger :=
IngredientObj.Get('min_warning_level', 5);
Query.Params.ParamByName('max_daily_limit').AsInteger :=
IngredientObj.Get('max_daily_limit', 0);
Query.Params.ParamByName('track_inventory').AsBoolean :=
IngredientObj.Get('track_inventory', False);
Query.ExecSQL;
if Query.RowsAffected > 0 then
SendJSONResponse(AResponse,
'{"success":true,"message":"Ingredient updated"}')
else
SendJSONResponse(AResponse, '{"error":"Ingredient not found"}', 404);
finally
Query.Free;
end;
RequestData.Free;
end;
'DELETE': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid ingredient ID"}', 400);
Exit;
end;
IngredientId := ExtractResourceId(ARequest.PathInfo, 3);
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'SELECT COUNT(*) as count FROM meal_set_ingredients WHERE ingredient_id = :id';
Query.Params.ParamByName('id').AsInteger := IngredientId;
Query.Open;
if Query.FieldByName('count').AsInteger > 0 then
begin
SendJSONResponse(AResponse,
'{"error":"Cannot delete ingredient used in meal sets"}', 400);
Exit;
end;
Query.Close;
Query.SQL.Text := 'DELETE FROM ingredients WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := IngredientId;
Query.ExecSQL;
if Query.RowsAffected > 0 then
SendJSONResponse(AResponse,
'{"success":true,"message":"Ingredient deleted"}')
else
SendJSONResponse(AResponse, '{"error":"Ingredient not found"}', 404);
finally
Query.Free;
end;
end;
else
SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
end;
except
on E: Exception do
begin
WriteLn('Error in HandleAdminIngredients: ', E.Message);
SendJSONResponse(AResponse, '{"error":"Database error: ' + E.Message + '"}', 500);
end;
end;
end;
procedure TOrderAPIHandler.HandleAdminMealSets(ARequest: TRequest;
AResponse: TResponse);
var
RequestData: TJSONData;
MealSetObj: TJSONObject;
IngredientsArray: TJSONArray;
IngredientObj: TJSONObject;
MealSetId: integer;
Query: TZQuery;
MealSets: TJSONArray;
i: integer;
begin
WriteLn('Admin MealSets request: ', ARequest.Method, ' ', ARequest.PathInfo);
if not ValidateAdminAccess(ARequest) then
begin
SendJSONResponse(AResponse, '{"error":"Unauthorized"}', 401);
Exit;
end;
try
case ARequest.Method of
'GET': begin
MealSets := FDB.QueryJSON(
'SELECT ms.*, COUNT(msi.ingredient_id) as ingredient_count ' +
'FROM meal_sets ms ' +
'LEFT JOIN meal_set_ingredients msi ON ms.id = msi.meal_set_id ' +
'GROUP BY ms.id ' +
'ORDER BY ms.sort_order, ms.name');
SendJSONResponse(AResponse, MealSets.AsJSON);
MealSets.Free;
end;
'POST': begin
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
MealSetObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'INSERT INTO meal_sets (name, description, available, sort_order) ' +
'VALUES (:name, :description, :available, :sort_order)';
Query.Params.ParamByName('name').AsString := MealSetObj.Get('name', '');
Query.Params.ParamByName('description').AsString :=
MealSetObj.Get('description', '');
Query.Params.ParamByName('available').AsBoolean :=
MealSetObj.Get('available', True);
Query.Params.ParamByName('sort_order').AsInteger :=
MealSetObj.Get('sort_order', 0);
Query.ExecSQL;
Query.SQL.Text := 'SELECT last_insert_rowid() as id';
Query.Open;
MealSetId := Query.Fields[0].AsInteger;
Query.Close;
if MealSetObj.Find('ingredients', IngredientsArray) then
begin
for i := 0 to IngredientsArray.Count - 1 do
begin
IngredientObj := IngredientsArray.Objects[i];
Query.SQL.Text :=
'INSERT INTO meal_set_ingredients (meal_set_id, ingredient_id, quantity) ' +
'VALUES (:meal_set_id, :ingredient_id, :quantity)';
Query.Params.ParamByName('meal_set_id').AsInteger := MealSetId;
Query.Params.ParamByName('ingredient_id').AsInteger :=
IngredientObj.Get('ingredient_id', 0);
Query.Params.ParamByName('quantity').AsInteger :=
IngredientObj.Get('quantity', 1);
Query.ExecSQL;
end;
end;
SendJSONResponse(AResponse,
'{"success":true,"message":"Meal set created","id":' + IntToStr(MealSetId) + '}', 201);
finally
Query.Free;
end;
RequestData.Free;
end;
'PUT': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid meal set ID"}', 400);
Exit;
end;
MealSetId := ExtractResourceId(ARequest.PathInfo, 3);
RequestData := GetJSON(ARequest.Content);
if not (RequestData is TJSONObject) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid JSON format"}', 400);
Exit;
end;
MealSetObj := RequestData as TJSONObject;
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text :=
'UPDATE meal_sets SET name = :name, description = :description, ' +
'available = :available, sort_order = :sort_order WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := MealSetId;
Query.Params.ParamByName('name').AsString := MealSetObj.Get('name', '');
Query.Params.ParamByName('description').AsString :=
MealSetObj.Get('description', '');
Query.Params.ParamByName('available').AsBoolean :=
MealSetObj.Get('available', True);
Query.Params.ParamByName('sort_order').AsInteger :=
MealSetObj.Get('sort_order', 0);
Query.ExecSQL;
if Query.RowsAffected = 0 then
begin
SendJSONResponse(AResponse, '{"error":"Meal set not found"}', 404);
Exit;
end;
if MealSetObj.Find('ingredients', IngredientsArray) then
begin
Query.SQL.Text := 'DELETE FROM meal_set_ingredients WHERE meal_set_id = :id';
Query.Params.ParamByName('id').AsInteger := MealSetId;
Query.ExecSQL;
for i := 0 to IngredientsArray.Count - 1 do
begin
IngredientObj := IngredientsArray.Objects[i];
Query.SQL.Text :=
'INSERT INTO meal_set_ingredients (meal_set_id, ingredient_id, quantity) ' +
'VALUES (:meal_set_id, :ingredient_id, :quantity)';
Query.Params.ParamByName('meal_set_id').AsInteger := MealSetId;
Query.Params.ParamByName('ingredient_id').AsInteger :=
IngredientObj.Get('ingredient_id', 0);
Query.Params.ParamByName('quantity').AsInteger :=
IngredientObj.Get('quantity', 1);
Query.ExecSQL;
end;
end;
SendJSONResponse(AResponse, '{"success":true,"message":"Meal set updated"}');
finally
Query.Free;
end;
RequestData.Free;
end;
'DELETE': begin
if not IsValidResourceId(ARequest.PathInfo, 3) then
begin
SendJSONResponse(AResponse, '{"error":"Invalid meal set ID"}', 400);
Exit;
end;
MealSetId := ExtractResourceId(ARequest.PathInfo, 3);
Query := TZQuery.Create(nil);
try
Query.Connection := FDB.FConnection;
Query.SQL.Text := 'DELETE FROM meal_set_ingredients WHERE meal_set_id = :id';
Query.Params.ParamByName('id').AsInteger := MealSetId;
Query.ExecSQL;
Query.SQL.Text := 'DELETE FROM meal_sets WHERE id = :id';
Query.Params.ParamByName('id').AsInteger := MealSetId;
Query.ExecSQL;
if Query.RowsAffected > 0 then
SendJSONResponse(AResponse, '{"success":true,"message":"Meal set deleted"}')
else
SendJSONResponse(AResponse, '{"error":"Meal set not found"}', 404);
finally
Query.Free;
end;
end;
else
SendJSONResponse(AResponse, '{"error":"Method not allowed"}', 405);
end;
except
on E: Exception do
begin
WriteLn('Error in HandleAdminMealSets: ', E.Message);
SendJSONResponse(AResponse, '{"error":"Database error: ' + E.Message + '"}', 500);
end;
end;
end;
