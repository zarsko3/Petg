#ifndef MQTT_CONFIG_H
#define MQTT_CONFIG_H

// MQTT Server Configuration
#define MQTT_SERVER "broker.hivemq.com"  // HiveMQ public broker
#define MQTT_PORT 8883                   // TLS port
#define MQTT_USER "guest"                // Guest mode user
#define MQTT_PASS "guest"                // Guest mode password

// Device Configuration
#define DEVICE_ID "001"                  // Guest collar device ID
#define DEVICE_NAME "ESP32_PET_COLLAR"   // Device name for MQTT client ID

// MQTT Topics
#define MQTT_TOPIC_PREFIX "pet-collar"   // Topic prefix for all messages
#define MQTT_TOPIC_STATUS "status"       // Online/offline status
#define MQTT_TOPIC_TELEMETRY "telemetry" // Sensor data
#define MQTT_TOPIC_COMMAND "command"     // Incoming commands
#define MQTT_TOPIC_BEACON "beacon-detection" // Beacon detection data

// MQTT QoS Levels
#define MQTT_QOS_STATUS 1    // QoS 1 for status messages
#define MQTT_QOS_TELEMETRY 1 // QoS 1 for telemetry data
#define MQTT_QOS_COMMAND 1   // QoS 1 for commands
#define MQTT_QOS_BEACON 1    // QoS 1 for beacon detection

// MQTT Timing Configuration
#define MQTT_KEEPALIVE 30    // Keepalive interval in seconds
#define MQTT_RECONNECT_DELAY 5000 // Reconnect delay in milliseconds
#define MQTT_MAX_PACKET_SIZE 1024 // Maximum packet size

// Topic Construction Macros
#define MQTT_MAKE_TOPIC(type) MQTT_TOPIC_PREFIX "/" DEVICE_ID "/" type
#define MQTT_STATUS_TOPIC MQTT_MAKE_TOPIC(MQTT_TOPIC_STATUS)
#define MQTT_TELEMETRY_TOPIC MQTT_MAKE_TOPIC(MQTT_TOPIC_TELEMETRY)
#define MQTT_COMMAND_TOPIC MQTT_MAKE_TOPIC(MQTT_TOPIC_COMMAND)
#define MQTT_BEACON_TOPIC MQTT_MAKE_TOPIC(MQTT_TOPIC_BEACON)

#endif // MQTT_CONFIG_H
