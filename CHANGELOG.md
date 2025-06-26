# Changelog

All notable changes to the ESP32-S3 Pet Collar project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.1] - 2025-06-26
### Fixed
- OLED snow: initialise SSD1306 as 128×32
- Buzzer restored to GPIO 18
- Auto-connect: UDP discovery → live WS, no localhost fall-back
- Removed stale proxy /api/discover 503s

### Added
- UDP-to-WebSocket discovery server for browser compatibility
- Automatic collar discovery via WebSocket relay
- Enhanced connection failure handling with smart cache management
- Discovery server with robust error handling and auto-reconnect

### Changed
- Discovery flow now uses dedicated server instead of direct UDP
- Improved WebSocket connection reliability
- Better error messages for connection failures
- Simplified auto-connect logic

### Technical Details
- Discovery server listens on UDP 47808 and serves WebSocket on ws://localhost:3001/discovery
- Web app automatically connects to discovery server for real-time collar announcements
- Collar continues broadcasting to UDP 47808 (no firmware changes required)
- Clean separation of UDP discovery relay and WebSocket collar communication 