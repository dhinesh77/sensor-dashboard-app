# ESP32 DHT22 Sensor Setup Instructions

## Hardware Requirements

- **ESP32 Development Board** (e.g., ESP32-DevKitC)
- **DHT22 Temperature & Humidity Sensor** (or DHT11)
- **Jumper Wires**
- **USB Cable** for programming
- **Home WiFi Network**

## Wiring Diagram

Connect the DHT22 sensor to your ESP32 as follows:

| DHT22 Pin | ESP32 Pin | Description |
|-----------|-----------|-------------|
| VCC (+)   | 3.3V      | Power supply |
| GND (-)   | GND       | Ground |
| DATA      | GPIO 4    | Data signal (can be changed in code) |

**Note:** Add a 10kΩ pull-up resistor between VCC and DATA pin for reliability.

## Software Setup

### 1. Install Arduino IDE

Download and install the [Arduino IDE](https://www.arduino.cc/en/software) (version 1.8.x or later).

### 2. Add ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Boards Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools → Board → Boards Manager**
6. Search for "ESP32" and install the latest version by Espressif Systems

### 3. Install Required Libraries

In Arduino IDE, go to **Sketch → Include Library → Manage Libraries** and install:

- **DHT sensor library** by Adafruit (search for "DHT")
- **ArduinoJson** by Benoit Blanchon (search for "ArduinoJson")

### 4. Configure WiFi Credentials

Open the `ESP32_DHT22_Server.ino` file and update these lines with your WiFi details:

```cpp
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password
```

### 5. Select Board and Port

1. Go to **Tools → Board** and select **ESP32 Dev Module** (or your specific ESP32 variant)
2. Go to **Tools → Port** and select the COM port where your ESP32 is connected
3. Set **Tools → Upload Speed** to **115200**

### 6. Upload Code

1. Copy the entire content of `ESP32_DHT22_Server.ino`
2. Paste it into Arduino IDE
3. Click the **Upload** button (→ icon)
4. Wait for the upload to complete

### 7. Verify Connection

1. Open **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. Press the **RESET** button on the ESP32
4. You should see output like:
   ```
   ESP32 DHT22 Sensor Server Starting...
   DHT22 sensor initialized
   Connecting to WiFi: YOUR_WIFI_SSID
   .....
   WiFi connected!
   IP address: 192.168.1.100
   Web server started on port 80
   ```

## Testing the HTTP API

Once the ESP32 is connected to WiFi, you can test the endpoints:

### Get Sensor Data

```
GET http://<ESP32_IP>/sensor
```

**Response Example:**
```json
{
  "temperature": 24.5,
  "humidity": 65,
  "unit_temp": "C",
  "unit_humidity": "%",
  "timestamp": 45230
}
```

### Get Device Status

```
GET http://<ESP32_IP>/status
```

**Response Example:**
```json
{
  "device": "ESP32 DHT22 Sensor",
  "status": "running",
  "temperature": 24.5,
  "humidity": 65,
  "wifi_ssid": "YOUR_WIFI_SSID",
  "ip_address": "192.168.1.100",
  "uptime_ms": 45230
}
```

## Finding Your ESP32 IP Address

### Method 1: Serial Monitor
The IP address is printed when the ESP32 connects to WiFi (see step 7 above).

### Method 2: Router Admin Panel
Log into your WiFi router's admin panel and look for connected devices.

### Method 3: Network Scanner
Use a network scanning tool like:
- **Angry IP Scanner** (Windows/Mac/Linux)
- **Network Analyzer** (Android)
- **Fing** (iOS/Android)

## Troubleshooting

### ESP32 Not Connecting to WiFi
- Verify WiFi SSID and password are correct
- Ensure your WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check that the WiFi network is not hidden or has special characters

### DHT22 Sensor Not Reading
- Verify wiring connections are correct
- Ensure the 10kΩ pull-up resistor is connected
- Try changing the DHTPIN to a different GPIO pin

### Mobile App Can't Connect to ESP32
- Ensure mobile phone and ESP32 are on the same WiFi network
- Verify the IP address is correct
- Check that there are no firewall rules blocking port 80
- Try accessing the endpoint from a web browser first: `http://<ESP32_IP>/sensor`

### Serial Monitor Shows Garbage
- Verify baud rate is set to **115200**
- Try a different USB cable
- Restart the Arduino IDE

## Next Steps

Once your ESP32 is running and accessible on your home WiFi, update the mobile app with the ESP32's IP address or hostname to start receiving real sensor readings.
