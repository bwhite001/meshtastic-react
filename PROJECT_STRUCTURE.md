# Project Structure

```
meshtastic-poc/
├── package.json                    # Project dependencies and scripts
├── vite.config.js                  # Vite build configuration
├── .gitignore                      # Git ignore patterns
├── README.md                       # Project overview
├── SETUP.md                        # Detailed setup guide
├── meshtastic-poc-guide.md         # Original POC guide
│
└── src/
    ├── main.js                     # Electron main process
    │                               # - Window management
    │                               # - Web Serial API configuration
    │                               # - Serial port selection handler
    │
    ├── preload.js                  # Electron preload script
    │                               # - IPC bridge (future use)
    │
    ├── index.html                  # HTML entry point
    │
    └── renderer/
        ├── main.jsx                # React bootstrap
        │                           # - ReactDOM.render()
        │
        ├── App.jsx                 # Main React component
        │                           # - Connection panel
        │                           # - Send checkpoint data form
        │                           # - Send text message form
        │                           # - Message log display
        │
        └── MeshtasticService.js    # Meshtastic communication service
                                    # - Device connection
                                    # - Message encoding/decoding
                                    # - Event handling
                                    # - Packet processing
```

## File Descriptions

### Configuration Files

#### `package.json`
- Dependencies: Electron, React, @meshtastic/js, Vite
- Scripts:
  - `npm run dev` - Start Vite dev server
  - `npm run electron` - Start Electron
  - `npm run electron:dev` - Start both (combined)
  - `npm run build` - Build for production
  - `npm run package` - Package for distribution

#### `vite.config.js`
- React plugin configuration
- Dev server on port 5173
- Build output to `dist/`

### Electron Layer

#### `src/main.js`
Main Electron process that:
- Creates the browser window
- Enables Web Serial API (`enableBlinkFeatures: 'Serial'`)
- Handles serial port selection
- Grants device permissions
- Loads the React app

#### `src/preload.js`
Preload script for secure IPC communication (currently minimal, ready for future expansion)

### React Application

#### `src/index.html`
HTML entry point that loads the React app via `<script type="module" src="/renderer/main.jsx">`

#### `src/renderer/main.jsx`
React bootstrap file that:
- Imports React and ReactDOM
- Renders the App component into `#root`

#### `src/renderer/App.jsx`
Main React component with:
- **State Management**:
  - Connection status
  - Node information
  - Message history
  - Form inputs
  
- **UI Sections**:
  - Connection Panel: Connect/disconnect button, status display
  - Send Checkpoint Data: Form for checkpoint number and runner IDs
  - Send Text Message: Simple text input and send button
  - Message Log: Scrollable list of received messages with RSSI/SNR

- **Event Handlers**:
  - `handleConnect()` - Initiates connection to USB device
  - `handleDisconnect()` - Closes connection
  - `handleSendCheckpoint()` - Sends checkpoint data as JSON
  - `handleSendText()` - Sends plain text message

#### `src/renderer/MeshtasticService.js`
Core service class that handles all Meshtastic communication:

**Methods**:
- `connect()` - Establishes Web Serial connection
- `disconnect()` - Closes connection
- `setupEventListeners()` - Subscribes to device events
- `handleIncomingPacket()` - Processes received packets
- `handleRaceData()` - Parses checkpoint JSON data
- `sendCheckpointData()` - Sends checkpoint log as JSON
- `sendTextMessage()` - Sends plain text
- `calculateCRC()` - Generates checksum for data integrity
- `getNodeInfo()` - Retrieves local node information
- `onMessage()` - Registers message callback
- `notifyMessageCallbacks()` - Triggers callbacks for new messages

**Event Subscriptions**:
- `onDeviceStatus` - Device connection status
- `onFromRadio` - Incoming packets from radio
- `onNodeUpdated` - Node database updates
- `onDeviceDebugLog` - Debug logging

## Data Flow

### Sending a Message

```
User Input (App.jsx)
    ↓
handleSendCheckpoint()
    ↓
MeshtasticService.sendCheckpointData()
    ↓
Create JSON payload
    ↓
@meshtastic/js Client.sendText()
    ↓
Encode to Protocol Buffer
    ↓
Web Serial API
    ↓
USB Serial Port
    ↓
ESP32 LoRa Device
    ↓
LoRa Radio Transmission
```

### Receiving a Message

```
LoRa Radio Reception
    ↓
ESP32 LoRa Device
    ↓
USB Serial Port
    ↓
Web Serial API
    ↓
@meshtastic/js Client
    ↓
Decode Protocol Buffer
    ↓
MeshtasticService.handleIncomingPacket()
    ↓
Parse JSON (if checkpoint data)
    ↓
notifyMessageCallbacks()
    ↓
App.jsx updates state
    ↓
React re-renders message log
```

## Message Format

### Checkpoint Data (JSON)
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

### Text Message
Plain string sent directly via `sendText()`

### Received Message Object
```javascript
{
  type: 'CHECKPOINT' | 'TEXT',
  from: 0x12345678,           // Node ID (hex)
  to: 0xffffffff,             // Destination (broadcast)
  checkpoint: 15,             // (CHECKPOINT only)
  runners: [101, 102, 103],   // (CHECKPOINT only)
  text: "Hello",              // (TEXT only)
  timestamp: Date,
  rssi: -85,                  // Signal strength (dBm)
  snr: 8.5                    // Signal-to-noise ratio (dB)
}
```

## Key Technologies

- **Electron 32.0.0**: Desktop application framework
- **React 18.3.0**: UI framework
- **Vite 5.4.0**: Build tool and dev server
- **@meshtastic/js 2.7.8**: Meshtastic protocol library
- **Web Serial API**: Browser API for USB serial communication
- **Protocol Buffers**: Binary serialization format used by Meshtastic

## Development Workflow

1. **Start Development**:
   ```bash
   npm run electron:dev
   ```

2. **Make Changes**:
   - Edit React components in `src/renderer/`
   - Vite hot-reloads changes automatically
   - Electron window refreshes

3. **Test with Hardware**:
   - Connect Meshtastic USB device
   - Click "Connect to USB Node"
   - Send and receive messages

4. **Build for Production**:
   ```bash
   npm run build
   npm run package
   ```

## Extension Points

### Adding New Message Types

1. Define message structure in `MeshtasticService.js`:
   ```javascript
   if (data.type === 'NEW_TYPE') {
     this.handleNewType(data, packet);
   }
   ```

2. Add handler method:
   ```javascript
   handleNewType(data, packet) {
     this.notifyMessageCallbacks({
       type: 'NEW_TYPE',
       // ... custom fields
     });
   }
   ```

3. Update UI in `App.jsx` to display new type

### Adding Persistence

1. Install Dexie.js: `npm install dexie`
2. Create database schema
3. Store messages in `handleIncomingPacket()`
4. Load history on app start

### Adding Acknowledgments

1. Track sent messages with sequence numbers
2. Listen for ACK packets in `handleIncomingPacket()`
3. Update UI with delivery status
4. Implement retry logic for failed sends

## Troubleshooting

### Build Issues
- Clear `node_modules/` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### Connection Issues
- Check USB cable and port
- Verify device permissions (Linux: dialout group)
- Check browser console for errors
- Verify Meshtastic firmware is flashed

### Message Not Received
- Check both devices are on same channel
- Verify same region settings
- Check RSSI/SNR values (signal quality)
- Ensure devices are within range (5-10 km)

## Resources

- [Meshtastic Documentation](https://meshtastic.org/docs/)
- [Meshtastic.js API](https://js.meshtastic.org/)
- [Web Serial API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [React Documentation](https://react.dev/)
