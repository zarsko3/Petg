#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// Your WiFi credentials
const char* ssid = "JenoviceAP";
const char* password = "YOUR_WIFI_PASSWORD";

// Your HiveMQ Cloud credentials
const char* mqtt_server = "ab14d5df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "zarsko";
const char* mqtt_password = "089430732zG";

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("🧪 MQTT Credential Test");
    Serial.println("========================");
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println();
    Serial.printf("✅ WiFi connected: %s\n", WiFi.localIP().toString().c_str());
    
    // Test internet connectivity
    WiFiClient testClient;
    if (testClient.connect("google.com", 80)) {
        Serial.println("✅ Internet connectivity: OK");
        testClient.stop();
    } else {
        Serial.println("❌ No internet connectivity");
        return;
    }
    
    // Configure MQTT
    espClient.setInsecure(); // For testing only
    client.setServer(mqtt_server, mqtt_port);
    
    Serial.printf("🔗 Testing MQTT connection to: %s:%d\n", mqtt_server, mqtt_port);
    Serial.printf("👤 Username: %s\n", mqtt_user);
    
    // Try different connection methods
    Serial.println("\n🧪 Test 1: Basic connection");
    if (client.connect("ESP32-Test", mqtt_user, mqtt_password)) {
        Serial.println("✅ SUCCESS: Basic MQTT connection works!");
        client.publish("test/esp32", "Hello from ESP32!");
        Serial.println("✅ Test message published");
        client.disconnect();
    } else {
        Serial.printf("❌ FAILED: Error code %d\n", client.state());
        printMQTTError(client.state());
    }
    
    delay(2000);
    
    Serial.println("\n🧪 Test 2: Simple client ID");
    if (client.connect("test123", mqtt_user, mqtt_password)) {
        Serial.println("✅ SUCCESS: Simple client ID works!");
        client.disconnect();
    } else {
        Serial.printf("❌ FAILED: Error code %d\n", client.state());
    }
    
    delay(2000);
    
    Serial.println("\n🧪 Test 3: No credentials (anonymous)");
    if (client.connect("anonymous")) {
        Serial.println("✅ SUCCESS: Anonymous connection works!");
        client.disconnect();
    } else {
        Serial.printf("❌ FAILED: Error code %d (expected if anonymous disabled)\n", client.state());
    }
    
    Serial.println("\n========================");
    Serial.println("🏁 Test Complete");
}

void printMQTTError(int errorCode) {
    switch (errorCode) {
        case -4: Serial.println("💡 MQTT_CONNECTION_TIMEOUT - Check server address"); break;
        case -3: Serial.println("💡 MQTT_CONNECTION_LOST - Network issue"); break;
        case -2: Serial.println("💡 MQTT_CONNECT_FAILED - Can't reach server"); break;
        case -1: Serial.println("💡 MQTT_DISCONNECTED - Client disconnected"); break;
        case 1: Serial.println("💡 MQTT_CONNECT_BAD_PROTOCOL - Protocol version"); break;
        case 2: Serial.println("💡 MQTT_CONNECT_BAD_CLIENT_ID - Client ID issue"); break;
        case 3: Serial.println("💡 MQTT_CONNECT_UNAVAILABLE - Server unavailable"); break;
        case 4: Serial.println("💡 MQTT_CONNECT_BAD_CREDENTIALS - Wrong username/password"); break;
        case 5: Serial.println("💡 MQTT_CONNECT_UNAUTHORIZED - Account suspended or credentials invalid"); break;
        default: Serial.printf("💡 Unknown error: %d\n", errorCode);
    }
}

void loop() {
    // Nothing to do here
    delay(10000);
} 