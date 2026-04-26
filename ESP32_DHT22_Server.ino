#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// ===== DHT22 Sensor Configuration =====
#define DHTPIN 4                               // GPIO pin where DHT22 data pin is connected
#define DHTTYPE DHT22                          // DHT 22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

// ===== Web Server Configuration =====
WebServer server(80);                          // Web server on port 80

// ===== Sensor Reading Variables =====
float temperature = 0.0;
float humidity = 0.0;
unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 2000;     // Read sensor every 2 seconds

// ===== Function to read DHT22 sensor =====
void readSensor() {
  unsigned long currentTime = millis();
  
  // Only read sensor at specified interval to avoid overwhelming it
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;
    
    // Read humidity
    float h = dht.readHumidity();
    // Read temperature as Celsius
    float t = dht.readTemperature();
    
    // Check if any reads failed
    if (isnan(h) || isnan(t)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }
    
    temperature = t;
    humidity = h;
    
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print("°C, Humidity: ");
    Serial.print(humidity);
    Serial.println("%");
  }
}

// ===== HTTP Endpoint: /sensor (returns JSON) =====
void handleSensor() {
  // Create JSON response
  StaticJsonDocument<200> doc;
  doc["temperature"] = round(temperature * 10) / 10.0;  // Round to 1 decimal place
  doc["humidity"] = round(humidity);                     // Round to nearest integer
  doc["unit_temp"] = "C";
  doc["unit_humidity"] = "%";
  doc["timestamp"] = millis();
  
  // Serialize JSON to string
  String response;
  serializeJson(doc, response);
  
  // Send response with proper headers
  server.sendHeader("Content-Type", "application/json");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);
  
  Serial.println("Sensor data sent to client");
}

// ===== HTTP Endpoint: /status (returns device status) =====
void handleStatus() {
  StaticJsonDocument<300> doc;
  doc["device"] = "ESP32 DHT22 Sensor";
  doc["status"] = "running";
  doc["temperature"] = round(temperature * 10) / 10.0;
  doc["humidity"] = round(humidity);
  doc["wifi_ssid"] = ssid;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["uptime_ms"] = millis();
  
  String response;
  serializeJson(doc, response);
  
  server.sendHeader("Content-Type", "application/json");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);
}

// ===== HTTP Endpoint: 404 Not Found =====
void handleNotFound() {
  String message = "404 - Endpoint not found\n";
  message += "Available endpoints:\n";
  message += "  GET /sensor - Get current temperature and humidity\n";
  message += "  GET /status - Get device status\n";
  
  server.send(404, "text/plain", message);
}

// ===== WiFi Connection Function =====
void connectToWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Failed to connect to WiFi");
  }
}

// ===== Setup Function =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nESP32 DHT22 Sensor Server Starting...");
  
  // Initialize DHT sensor
  dht.begin();
  Serial.println("DHT22 sensor initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server routes
  server.on("/sensor", handleSensor);
  server.on("/status", handleStatus);
  server.onNotFound(handleNotFound);
  
  // Start web server
  server.begin();
  Serial.println("Web server started on port 80");
  Serial.println("Access the sensor data at: http://<ESP32_IP>/sensor");
  
  // Read sensor once at startup
  readSensor();
}

// ===== Main Loop =====
void loop() {
  // Handle incoming HTTP requests
  server.handleClient();
  
  // Read sensor data
  readSensor();
  
  // Small delay to prevent overwhelming the CPU
  delay(10);
}
