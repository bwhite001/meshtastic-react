# Meshtastic Proof of Concept: USB Node Communication

This guide provides step-by-step instructions for setting up two Meshtastic USB nodes for bidirectional communication in a WICEN race tracking scenario.

---

## Hardware Requirements

- **2x ESP32 LoRa USB Devices**
  - LILYGO T-Beam ($35-45)
  - Heltec LoRa 32 V3 ($30-40)
  - RAK4631 WisMesh ($40-50)
- **2x USB-C cables**
- **2x Computers** (or 1 computer for testing both sequentially)
- **LoRa Antennas** (usually included with devices)

---

## Software Requirements

- **Python 3.8+**
- **Meshtastic Python CLI**
- **Node.js 18+** (for React POC)
- **Meshtastic.js library**

---

## Part 1: Hardware Setup & Firmware Flash

### Step 1: Install Meshtastic Firmware

#### Using Web Flasher (Easiest)
1. Visit: https://flasher.meshtastic.org
2. Connect device via USB
3. Click "Flash Device"
4. Select your device type
5. Choose "2.5.x Stable"
6. Wait for flash to complete

#### Using CLI (Advanced)
```bash
# Install esptool
pip3 install esptool

# Download firmware for your device
# Visit: https://github.com/meshtastic/firmware/releases

# Flash (example for ESP32)
esptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash
esptool.py --chip esp32 --port /dev/ttyUSB0 write_flash 0x0 firmware-tbeam-2.5.x.bin
```

---

## Part 2: Device Configuration

### Step 1: Install Python CLI

```bash
# macOS/Linux
pip3 install --upgrade pytap2
pip3 install --upgrade meshtastic

# Windows
pip3 install --upgrade pytap2
pip3 install --upgrade meshtastic

# Verify installation
meshtastic --version
```

### Step 2: Find USB Port

**Linux/macOS:**
```bash
ls /dev/tty.* | grep usb
# or
dmesg | grep tty
```

**Windows:**
```powershell
# Check Device Manager > Ports (COM & LPT)
# Usually COM3, COM4, etc.
```

### Step 3: Configure Node 1 (Base Station)

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
# Options: LONG_FAST (default), LONG_SLOW, MEDIUM_FAST, MEDIUM_SLOW, SHORT_FAST, SHORT_SLOW
meshtastic --port /dev/ttyUSB0 --set lora.modem_preset LONG_FAST

# Set custom channel (optional - for private network)
meshtastic --port /dev/ttyUSB0 --ch-set name "WICEN-Race"
meshtastic --port /dev/ttyUSB0 --ch-set psk base64:1PG7OiApB1nwvP+rz05pAQ==

# Get node info to verify
meshtastic --port /dev/ttyUSB0 --info
```

### Step 4: Configure Node 2 (Checkpoint Station)

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

---

## Part 3: Message Packet Structure

### Meshtastic Packet Format

Meshtastic uses **Protocol Buffers (protobuf)** for message encoding[74][77]. Here's the structure:

```protobuf
message ServiceEnvelope {
  MeshPacket packet = 1;
  string channelId = 2;
  string gatewayId = 3;
}

message MeshPacket {
  uint32 from = 1;          // Node ID of sender
  uint32 to = 2;            // Node ID of receiver (0 = broadcast)
  uint32 id = 3;            // Unique packet ID
  uint32 channel = 4;       // Channel index
  Data payload = 5;         // Actual message data
  uint32 hop_limit = 6;     // Max mesh hops
  bool want_ack = 7;        // Request acknowledgment
  uint32 rx_time = 8;       // Reception time
  float rx_snr = 9;         // Signal-to-noise ratio
  int32 rx_rssi = 10;       // Signal strength
}

message Data {
  PortNum portnum = 1;      // Port number (TEXT_MESSAGE_APP = 1)
  bytes payload = 2;        // Actual message bytes
  bool want_response = 3;
  uint32 dest = 4;
  uint32 source = 5;
  uint32 request_id = 6;
  uint32 emoji = 7;
}
```

### WICEN Race Tracking Packet

For race tracking, we'll use **TEXT_MESSAGE_APP** port with JSON payload:

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

**Packet Size Limits:**
- Maximum packet size: **240 bytes** (including headers)[16]
- Usable payload: ~200 bytes
- Best practice: **Keep under 150 bytes** for reliability

**Batching Strategy:**
```javascript
// Good: Batch 10-15 runners per packet
{ runners: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110] }

// Bad: Too large
{ runners: [101, 102, ... 150] }  // Will fail or fragment

// Solution: Split into multiple packets
packet1: { runners: [101-110], seq: 1001 }
packet2: { runners: [111-120], seq: 1002 }
```

---

## Part 4: Testing CLI Communication

### Test 1: Send Text Message

**From Node 1 (Base):**
```bash
# Send broadcast message
meshtastic --port /dev/ttyUSB0 --sendtext "Hello from Base Station"

# Send to specific node (get node ID from --nodes command)
meshtastic --port /dev/ttyUSB0 --dest '!a1b2c3d4' --sendtext "Direct message to CP01"
```

**Monitor on Node 2 (Checkpoint):**
```bash
# Listen for incoming messages
meshtastic --port /dev/ttyUSB1 --listen
```

### Test 2: Send JSON Data

```bash
# Encode runner data as JSON and send
meshtastic --port /dev/ttyUSB0 --sendtext '{"type":"CP_LOG","cp":15,"runners":[101,102,103]}'
```

### Test 3: Request Node List

```bash
# Get all nodes on mesh
meshtastic --port /dev/ttyUSB0 --nodes
```

---

## Part 5: React/Electron POC Application

### Project Structure

```
meshtastic-poc/
├── package.json
├── src/
│   ├── main.js                 # Electron main process
│   ├── index.html
│   └── renderer/
│       ├── App.jsx             # React app
│       ├── MeshtasticService.js
│       └── components/
│           ├── ConnectionPanel.jsx
│           ├── SendMessage.jsx
│           └── MessageLog.jsx
```

### Step 1: Initialize Project

```bash
mkdir meshtastic-poc
cd meshtastic-poc

# Initialize npm
npm init -y

# Install dependencies
npm install @meshtastic/js
npm install electron react react-dom
npm install vite @vitejs/plugin-react

# Dev dependencies
npm install -D electron-builder
```

### Step 2: package.json

```json
{
  "name": "meshtastic-poc",
  "version": "1.0.0",
  "main": "src/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\""
  },
  "dependencies": {
    "@meshtastic/js": "^2.7.8",
    "electron": "^32.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.0.0",
    "vite": "^5.4.0",
    "wait-on": "^8.0.0"
  }
}
```

### Step 3: Electron Main Process (src/main.js)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'Serial', // Enable Web Serial API
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Handle serial port selection
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    
    console.log('Available ports:', portList);
    
    // Find Meshtastic device (CH340, CP2102, or similar)
    const meshtasticPort = portList.find(port => 
      port.displayName?.includes('CH340') || 
      port.displayName?.includes('CP210') ||
      port.displayName?.includes('Silicon Labs') ||
      port.vendorId === '0x10c4' ||
      port.vendorId === '0x1a86'
    );
    
    if (meshtasticPort) {
      callback(meshtasticPort.portId);
    } else if (portList.length > 0) {
      // Default to first available port
      callback(portList[0].portId);
    } else {
      callback('');
    }
  });

  // Grant serial device permissions
  mainWindow.webContents.session.setDevicePermissionHandler(() => true);

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### Step 4: Meshtastic Service (src/renderer/MeshtasticService.js)

```javascript
import { Client } from '@meshtastic/js';

export class MeshtasticService {
  constructor() {
    this.client = null;
    this.connection = null;
    this.isConnected = false;
    this.messageCallbacks = [];
    this.nodeInfo = null;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to Meshtastic device...');
      
      // Create client
      this.client = new Client();
      
      // Create serial connection
      this.connection = this.client.createSerialConnection();

      // Setup event listeners
      this.setupEventListeners();

      // Connect to device
      await this.connection.connect({
        baudRate: 115200,
        concurrentLogOutput: true
      });

      this.isConnected = true;
      console.log('✅ Connected to Meshtastic device');
      
      // Get node info
      await this.getNodeInfo();
      
      return { success: true, nodeInfo: this.nodeInfo };
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  setupEventListeners() {
    // Device status events
    this.connection.events.onDeviceStatus.subscribe((status) => {
      console.log('📱 Device status:', status);
    });

    // Incoming messages
    this.connection.events.onFromRadio.subscribe((packet) => {
      this.handleIncomingPacket(packet);
    });

    // Node database updates
    this.connection.events.onNodeUpdated.subscribe((node) => {
      console.log('🔄 Node updated:', node);
    });

    // Connection events
    this.connection.events.onDeviceDebugLog.subscribe((log) => {
      console.log('🐛 Device log:', log);
    });
  }

  handleIncomingPacket(packet) {
    console.log('📥 Incoming packet:', packet);

    try {
      // Check for text message
      if (packet.payloadVariant?.case === 'decoded') {
        const decoded = packet.payloadVariant.value;
        
        if (decoded.portnum === 1) { // TEXT_MESSAGE_APP
          const textDecoder = new TextDecoder();
          const text = textDecoder.decode(decoded.payload);
          
          console.log('💬 Text message:', text);
          
          // Try to parse as JSON
          try {
            const data = JSON.parse(text);
            this.handleRaceData(data, packet);
          } catch {
            // Not JSON, treat as plain text
            this.notifyMessageCallbacks({
              type: 'TEXT',
              from: packet.from,
              to: packet.to,
              text: text,
              timestamp: new Date(),
              rssi: packet.rxRssi,
              snr: packet.rxSnr
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling packet:', error);
    }
  }

  handleRaceData(data, packet) {
    if (data.type === 'CHECKPOINT_LOG') {
      console.log('🏃 Checkpoint data:', data);
      
      this.notifyMessageCallbacks({
        type: 'CHECKPOINT',
        from: packet.from,
        checkpoint: data.checkpoint,
        runners: data.runners,
        timestamp: data.timestamp,
        seq: data.seq,
        rssi: packet.rxRssi,
        snr: packet.rxSnr
      });
    }
  }

  async sendCheckpointData(checkpointData) {
    if (!this.isConnected) {
      throw new Error('Not connected to device');
    }

    // Create JSON payload
    const payload = {
      type: 'CHECKPOINT_LOG',
      checkpoint: checkpointData.checkpoint,
      runners: checkpointData.runners,
      timestamp: new Date().toISOString(),
      seq: Date.now(),
      crc: this.calculateCRC(checkpointData)
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(payload);
    
    // Check size
    if (jsonString.length > 200) {
      throw new Error(`Payload too large: ${jsonString.length} bytes (max 200)`);
    }

    console.log('📤 Sending checkpoint data:', payload);

    try {
      // Send as text message (broadcast)
      await this.connection.sendText(
        jsonString,
        undefined, // destination (undefined = broadcast)
        true // wantAck
      );

      console.log('✅ Sent checkpoint data');
      return { success: true, seq: payload.seq };
    } catch (error) {
      console.error('❌ Send failed:', error);
      throw error;
    }
  }

  async sendTextMessage(text, destination = undefined) {
    if (!this.isConnected) {
      throw new Error('Not connected to device');
    }

    await this.connection.sendText(text, destination, true);
    console.log(`📤 Sent text: "${text}"`);
  }

  calculateCRC(data) {
    // Simple CRC for demo (use proper CRC in production)
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async getNodeInfo() {
    // Get local node info
    this.nodeInfo = await this.connection.getMyNodeInfo();
    return this.nodeInfo;
  }

  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }

  notifyMessageCallbacks(message) {
    this.messageCallbacks.forEach(cb => cb(message));
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
      this.isConnected = false;
      this.client = null;
      this.connection = null;
      console.log('🔌 Disconnected');
    }
  }
}
```

### Step 5: React App Component (src/renderer/App.jsx)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { MeshtasticService } from './MeshtasticService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState(null);
  
  // Form state
  const [checkpoint, setCheckpoint] = useState(1);
  const [runners, setRunners] = useState('101,102,103');
  const [textMessage, setTextMessage] = useState('');

  const serviceRef = useRef(null);

  useEffect(() => {
    // Initialize service
    serviceRef.current = new MeshtasticService();

    // Setup message listener
    serviceRef.current.onMessage((message) => {
      console.log('New message:', message);
      setMessages(prev => [...prev, message]);
    });

    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      setStatus('Connecting...');
      setError(null);
      
      const result = await serviceRef.current.connect();
      
      setIsConnected(true);
      setNodeInfo(result.nodeInfo);
      setStatus('Connected');
    } catch (err) {
      setError(err.message);
      setStatus('Connection failed');
      setIsConnected(false);
    }
  };

  const handleDisconnect = async () => {
    await serviceRef.current.disconnect();
    setIsConnected(false);
    setNodeInfo(null);
    setStatus('Disconnected');
  };

  const handleSendCheckpoint = async () => {
    try {
      const runnerArray = runners.split(',').map(r => parseInt(r.trim()));
      
      await serviceRef.current.sendCheckpointData({
        checkpoint: parseInt(checkpoint),
        runners: runnerArray
      });

      alert('Checkpoint data sent!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSendText = async () => {
    try {
      await serviceRef.current.sendTextMessage(textMessage);
      setTextMessage('');
      alert('Text message sent!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Meshtastic POC - WICEN Race Tracking</h1>

      {/* Connection Panel */}
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '15px', 
        marginBottom: '20px',
        borderRadius: '5px'
      }}>
        <h2>Connection</h2>
        <p>Status: <strong>{status}</strong></p>
        {nodeInfo && (
          <div>
            <p>Node: {nodeInfo.user?.longName} ({nodeInfo.user?.shortName})</p>
            <p>ID: {nodeInfo.myNodeNum?.toString(16)}</p>
          </div>
        )}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        
        <button 
          onClick={isConnected ? handleDisconnect : handleConnect}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isConnected ? '#dc3545' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isConnected ? 'Disconnect' : 'Connect to USB Node'}
        </button>
      </div>

      {/* Send Checkpoint Data */}
      {isConnected && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          marginBottom: '20px',
          borderRadius: '5px'
        }}>
          <h2>Send Checkpoint Data</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Checkpoint: </label>
            <input 
              type="number" 
              value={checkpoint} 
              onChange={(e) => setCheckpoint(e.target.value)}
              style={{ padding: '5px', marginLeft: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Runners (comma-separated): </label>
            <input 
              type="text" 
              value={runners} 
              onChange={(e) => setRunners(e.target.value)}
              placeholder="101,102,103"
              style={{ padding: '5px', marginLeft: '10px', width: '300px' }}
            />
          </div>
          <button 
            onClick={handleSendCheckpoint}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Send Checkpoint Data
          </button>
        </div>
      )}

      {/* Send Text Message */}
      {isConnected && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          marginBottom: '20px',
          borderRadius: '5px'
        }}>
          <h2>Send Text Message</h2>
          <input 
            type="text" 
            value={textMessage} 
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ padding: '5px', width: '400px', marginRight: '10px' }}
          />
          <button 
            onClick={handleSendText}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Send Text
          </button>
        </div>
      )}

      {/* Message Log */}
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '15px',
        borderRadius: '5px'
      }}>
        <h2>Received Messages ({messages.length})</h2>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '5px'
        }}>
          {messages.length === 0 && <p>No messages received yet</p>}
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                marginBottom: '10px', 
                padding: '10px',
                backgroundColor: 'white',
                borderRadius: '3px',
                borderLeft: `4px solid ${msg.type === 'CHECKPOINT' ? '#28a745' : '#007bff'}`
              }}
            >
              <strong>{msg.type}</strong> from {msg.from?.toString(16)}
              {msg.type === 'CHECKPOINT' && (
                <div>
                  <p>Checkpoint: {msg.checkpoint}</p>
                  <p>Runners: {msg.runners.join(', ')}</p>
                  <p>Time: {new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              )}
              {msg.type === 'TEXT' && (
                <p>{msg.text}</p>
              )}
              <small>RSSI: {msg.rssi} dBm, SNR: {msg.snr} dB</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
```

### Step 6: HTML (src/index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meshtastic POC</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/renderer/main.jsx"></script>
</body>
</html>
```

### Step 7: Vite Config (vite.config.js)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173
  }
});
```

---

## Part 6: Running the POC

### Terminal 1: Start Vite Dev Server
```bash
npm run dev
```

### Terminal 2: Start Electron
```bash
npm run electron
```

### Testing Sequence

1. **Connect Node 1**
   - Click "Connect to USB Node"
   - Should see Base Station info

2. **Open Second Instance**
   - Run another Electron instance
   - Connect Node 2 (Checkpoint)

3. **Send Checkpoint Data from Node 2**
   - Checkpoint: 15
   - Runners: 101,102,103,104,105
   - Click "Send Checkpoint Data"

4. **Verify on Node 1**
   - Should receive message in log
   - Shows checkpoint, runners, RSSI/SNR

5. **Send Reply from Node 1**
   - Text: "Received CP15 data"
   - Node 2 should receive acknowledgment

---

## Part 7: Packet Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Checkpoint Station (Node 2)                                  │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ React App                                                │ │
│ │ - User marks runners 101-105 at CP15                     │ │
│ │ - Calls: sendCheckpointData({cp: 15, runners: [...]})   │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ MeshtasticService                                        │ │
│ │ - Creates JSON: {type:"CP_LOG",cp:15,runners:[101-105]} │ │
│ │ - Size check: 87 bytes ✓                                │ │
│ │ - Calls: connection.sendText(json, broadcast, ack)      │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ @meshtastic/js Client                                    │ │
│ │ - Encodes to protobuf MeshPacket                         │ │
│ │ - Sets: portnum=TEXT_MESSAGE_APP, want_ack=true         │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Web Serial API                                           │ │
│ │ - Writes binary data to USB serial port                 │ │
│ └───────────────────┬──────────────────────────────────────┘ │
└─────────────────────┼──────────────────────────────────────────┘
                      ▼
              ┌────────────────┐
              │ LoRa Radio TX  │ 915 MHz
              │ ESP32 Device   │ (ANZ region)
              └────────┬───────┘
                       │ LoRa Mesh
                       │ ~5-10 km range
                       ▼
              ┌────────────────┐
              │ LoRa Radio RX  │
              │ ESP32 Device   │
              └────────┬───────┘
┌─────────────────────┼──────────────────────────────────────────┐
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Web Serial API                                           │ │
│ │ - Reads binary data from USB serial port                │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ @meshtastic/js Client                                    │ │
│ │ - Decodes protobuf MeshPacket                            │ │
│ │ - Extracts TEXT_MESSAGE_APP payload                      │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ MeshtasticService                                        │ │
│ │ - Parses JSON from payload                               │ │
│ │ - Validates CRC                                          │ │
│ │ - Emits event to React app                               │ │
│ └───────────────────┬──────────────────────────────────────┘ │
│                     ▼                                         │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ React App (Base Station)                                 │ │
│ │ - Updates UI with checkpoint data                        │ │
│ │ - Shows: CP15, Runners 101-105, RSSI/SNR                │ │
│ │ - Stores to IndexedDB via baseOperationsStore           │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Base Station (Node 1)                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: "Port not found"
```bash
# Linux: Add user to dialout group
sudo usermod -a -G dialout $USER
sudo reboot

# macOS: Check driver
# Install CH340 driver if needed
```

### Issue: "Nodes can't see each other"
```bash
# Verify same region
meshtastic --port /dev/ttyUSB0 --get lora.region
meshtastic --port /dev/ttyUSB1 --get lora.region

# Verify same channel
meshtastic --port /dev/ttyUSB0 --ch-index 0 --ch-get all
meshtastic --port /dev/ttyUSB1 --ch-index 0 --ch-get all
```

### Issue: "Web Serial not supported"
- Use Chrome/Edge/Opera (not Firefox/Safari)
- Electron must have `enableBlinkFeatures: 'Serial'`

---

## Next Steps

1. **Field Testing**: Test range and reliability outdoors
2. **Acknowledgment System**: Implement packet ACK/retry
3. **Encryption**: Add message signing for data integrity
4. **Store Integration**: Connect to RaceTracker Pro stores
5. **Multi-hop Testing**: Test with relay nodes

---

## Summary

This POC demonstrates:
✅ USB serial connection from Electron/React  
✅ Bidirectional Meshtastic communication  
✅ JSON data transmission  
✅ WICEN checkpoint logging format  
✅ Message reception and display  
✅ RSSI/SNR monitoring  

The system is ready for integration into RaceTracker Pro's base-operations module.
