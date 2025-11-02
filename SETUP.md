# Meshtastic POC Setup Guide

## Overview
This is a proof-of-concept Electron + React application for Meshtastic LoRa USB node communication, designed for WICEN race tracking with bidirectional data synchronization between base and checkpoint stations.

## Prerequisites

### Hardware
- 2x ESP32 LoRa USB devices (LILYGO T-Beam, Heltec LoRa 32 V3, or RAK4631)
- 2x USB-C cables
- LoRa antennas (usually included with devices)

### Software
- Node.js 18+ (https://nodejs.org/)
- Python 3.8+ (for Meshtastic CLI configuration)
- Meshtastic firmware flashed on devices (https://flasher.meshtastic.org)

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Electron 32.0.0
- React 18.3.0
- @meshtastic/js 2.7.8
- Vite 5.4.0
- Other development dependencies

### 2. Configure Meshtastic Devices

Before running the application, you need to configure your Meshtastic devices using the CLI:

#### Install Meshtastic CLI
```bash
pip3 install --upgrade meshtastic
```

#### Configure Node 1 (Base Station)
```bash
# Set region (REQUIRED - choose your region)
# Options: US, EU_433, EU_868, CN, JP, ANZ, KR, TW, RU, IN, NZ_865, TH, UA_433, UA_868, MY_433, MY_919, SG_923, LORA_24, PH
meshtastic --port /dev/ttyUSB0 --set lora.region ANZ

# Set device role
meshtastic --port /dev/ttyUSB0 --set device.role CLIENT

# Set node name
meshtastic --port /dev/ttyUSB0 --set-owner "Base Station"
meshtastic --port /dev/ttyUSB0 --set-owner-short "BASE"

# Configure LoRa modem preset
meshtastic --port /dev/ttyUSB0 --set lora.modem_preset LONG_FAST

# Set custom channel (optional - for private network)
meshtastic --port /dev/ttyUSB0 --ch-set name "WICEN-Race"
meshtastic --port /dev/ttyUSB0 --ch-set psk base64:1PG7OiApB1nwvP+rz05pAQ==

# Verify configuration
meshtastic --port /dev/ttyUSB0 --info
```

#### Configure Node 2 (Checkpoint Station)
```bash
# IMPORTANT: Use same region and channel settings as Node 1
meshtastic --port /dev/ttyUSB1 --set lora.region ANZ
meshtastic --port /dev/ttyUSB1 --set device.role CLIENT
meshtastic --port /dev/ttyUSB1 --set-owner "Checkpoint 1"
meshtastic --port /dev/ttyUSB1 --set-owner-short "CP01"
meshtastic --port /dev/ttyUSB1 --set lora.modem_preset LONG_FAST

# Use SAME channel settings
meshtastic --port /dev/ttyUSB1 --ch-set name "WICEN-Race"
meshtastic --port /dev/ttyUSB1 --ch-set psk base64:1PG7OiApB1nwvP+rz05pAQ==

# Verify
meshtastic --port /dev/ttyUSB1 --info
```

## Running the Application

### Development Mode

You need to run two commands in separate terminals:

#### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```

This starts the React development server on http://localhost:5173

#### Terminal 2: Start Electron
```bash
# Wait for Vite to start, then run:
npm run electron
```

Or use the combined command:
```bash
npm run electron:dev
```

This will automatically start both Vite and Electron.

### Production Build

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

## Usage

### 1. Connect to Meshtastic Device

1. Launch the application
2. Click "Connect to USB Node"
3. Select your Meshtastic device from the serial port list
4. Wait for connection confirmation
5. You should see your node information displayed

### 2. Send Checkpoint Data

Once connected:

1. Enter checkpoint number (e.g., 15)
2. Enter runner numbers separated by commas (e.g., 101,102,103,104,105)
3. Click "Send Checkpoint Data"
4. The data will be broadcast to all nodes on the mesh

**Data Format:**
```json
{
  "type": "CHECKPOINT_LOG",
  "checkpoint": 15,
  "runners": [101, 102, 103, 104, 105],
  "timestamp": "2025-11-03T14:30:00Z",
  "seq": 1730635800000,
  "crc": "a1b2c3d4"
}
```

### 3. Send Text Messages

1. Type a message in the text input field
2. Click "Send Text"
3. The message will be broadcast to all nodes

### 4. Receive Messages

All incoming messages are displayed in the "Received Messages" panel:
- **Checkpoint messages** (green border): Shows checkpoint number, runner list, timestamp
- **Text messages** (blue border): Shows plain text content
- All messages display RSSI (signal strength) and SNR (signal-to-noise ratio)

## Testing with Two Nodes

### Setup
1. Connect Node 1 (Base Station) to Computer 1
2. Connect Node 2 (Checkpoint) to Computer 2 (or same computer with different USB port)
3. Launch the application on both computers

### Test Sequence

1. **Connect both nodes**
   - Both should show "Connected" status
   - Verify node information is displayed

2. **Send from Checkpoint to Base**
   - On Node 2: Enter checkpoint 15, runners 101-105
   - Click "Send Checkpoint Data"
   - On Node 1: Verify message appears in received messages

3. **Send reply from Base**
   - On Node 1: Type "Received CP15 data"
   - Click "Send Text"
   - On Node 2: Verify acknowledgment appears

4. **Monitor signal quality**
   - Check RSSI and SNR values
   - RSSI: -120 to -30 dBm (higher is better)
   - SNR: -20 to +10 dB (higher is better)

## Troubleshooting

### "Port not found" Error

**Linux:**
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER
sudo reboot
```

**macOS:**
- Install CH340 driver if needed
- Check System Preferences > Security & Privacy

**Windows:**
- Check Device Manager > Ports (COM & LPT)
- Install USB-Serial drivers if needed

### "Nodes can't see each other"

```bash
# Verify same region on both nodes
meshtastic --port /dev/ttyUSB0 --get lora.region
meshtastic --port /dev/ttyUSB1 --get lora.region

# Verify same channel settings
meshtastic --port /dev/ttyUSB0 --ch-index 0 --ch-get all
meshtastic --port /dev/ttyUSB1 --ch-index 0 --ch-get all
```

### "Web Serial not supported"

- Use Chrome, Edge, or Opera (not Firefox or Safari)
- Ensure Electron has `enableBlinkFeatures: 'Serial'` in webPreferences

### Connection Fails

1. Check USB cable is properly connected
2. Verify device is powered on (LED should be lit)
3. Try a different USB port
4. Check device is not already connected to another application
5. Restart the device by unplugging and reconnecting

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Electron App (React + Vite)                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React UI (App.jsx)                             │   │
│  │  - Connection Panel                             │   │
│  │  - Send Checkpoint Data                         │   │
│  │  - Send Text Message                            │   │
│  │  - Message Log                                  │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  MeshtasticService.js                           │   │
│  │  - Connection management                        │   │
│  │  - Message encoding/decoding                    │   │
│  │  - Event handling                               │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  @meshtastic/js Client                          │   │
│  │  - Protocol buffer encoding                     │   │
│  │  - Serial connection                            │   │
│  └─────────────────────────────────────────────────┘   │
│           ↓                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Web Serial API                                 │   │
│  │  - USB serial communication                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    ↓
              ┌────────────────┐
              │ ESP32 LoRa USB │
              │ Meshtastic Node│
              └────────────────┘
                    ↓
              LoRa Mesh Network
              (5-10 km range)
```

## Key Features

✅ USB serial connection to Meshtastic devices  
✅ Bidirectional communication  
✅ JSON data transmission for checkpoint logs  
✅ Text message support  
✅ Real-time message reception  
✅ RSSI/SNR signal quality monitoring  
✅ Automatic packet encoding/decoding  
✅ Error handling and connection recovery  

## Packet Size Limits

- Maximum packet size: **240 bytes** (including headers)
- Usable payload: ~200 bytes
- Best practice: **Keep under 150 bytes** for reliability

**Batching Strategy:**
- Good: 10-15 runners per packet
- If more runners, split into multiple packets with sequence numbers

## Next Steps

1. **Field Testing**: Test range and reliability outdoors
2. **Acknowledgment System**: Implement packet ACK/retry logic
3. **Data Persistence**: Add IndexedDB for offline storage
4. **Multi-hop Testing**: Test with relay nodes
5. **Integration**: Connect to RaceTracker Pro stores

## Resources

- Meshtastic Documentation: https://meshtastic.org/docs/
- Meshtastic.js Library: https://js.meshtastic.org/
- Web Serial API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- Electron Documentation: https://www.electronjs.org/docs/latest/

## License

MIT
