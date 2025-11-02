# Quick Reference Card

## Installation & Setup

```bash
# Install dependencies
npm install

# Run application (combined)
npm run electron:dev

# Run application (separate terminals)
npm run dev          # Terminal 1
npm run electron     # Terminal 2
```

## Meshtastic Device Configuration

```bash
# Install CLI
pip3 install --upgrade meshtastic

# Configure Node (replace /dev/ttyUSB0 with your port)
meshtastic --port /dev/ttyUSB0 --set lora.region ANZ
meshtastic --port /dev/ttyUSB0 --set device.role CLIENT
meshtastic --port /dev/ttyUSB0 --set-owner "Base Station"
meshtastic --port /dev/ttyUSB0 --set-owner-short "BASE"
meshtastic --port /dev/ttyUSB0 --set lora.modem_preset LONG_FAST

# Set channel (same on all nodes)
meshtastic --port /dev/ttyUSB0 --ch-set name "WICEN-Race"
meshtastic --port /dev/ttyUSB0 --ch-set psk base64:1PG7OiApB1nwvP+rz05pAQ==

# Verify
meshtastic --port /dev/ttyUSB0 --info
```

## Common Regions

| Region | Frequency | Countries |
|--------|-----------|-----------|
| US | 915 MHz | USA, Canada |
| EU_868 | 868 MHz | Europe |
| ANZ | 915 MHz | Australia, New Zealand |
| CN | 470 MHz | China |
| JP | 920 MHz | Japan |

## Application Usage

### Connect to Device
1. Click "Connect to USB Node"
2. Select device from list
3. Wait for "Connected" status

### Send Checkpoint Data
1. Enter checkpoint number (e.g., 15)
2. Enter runner IDs: `101,102,103,104,105`
3. Click "Send Checkpoint Data"

### Send Text Message
1. Type message in text field
2. Click "Send Text"

### View Messages
- Scroll through message log
- Green border = Checkpoint data
- Blue border = Text message
- Check RSSI/SNR for signal quality

## Signal Quality Indicators

### RSSI (Received Signal Strength Indicator)
- **-30 to -60 dBm**: Excellent
- **-60 to -80 dBm**: Good
- **-80 to -100 dBm**: Fair
- **-100 to -120 dBm**: Poor

### SNR (Signal-to-Noise Ratio)
- **+10 dB or higher**: Excellent
- **+5 to +10 dB**: Good
- **0 to +5 dB**: Fair
- **Below 0 dB**: Poor

## Troubleshooting

### Can't find USB port (Linux)
```bash
sudo usermod -a -G dialout $USER
sudo reboot
```

### Can't find USB port (macOS)
```bash
ls /dev/tty.* | grep usb
# Install CH340 driver if needed
```

### Can't find USB port (Windows)
- Check Device Manager > Ports (COM & LPT)
- Install USB-Serial drivers

### Nodes can't communicate
```bash
# Check region matches
meshtastic --port /dev/ttyUSB0 --get lora.region
meshtastic --port /dev/ttyUSB1 --get lora.region

# Check channel matches
meshtastic --port /dev/ttyUSB0 --ch-index 0 --ch-get all
meshtastic --port /dev/ttyUSB1 --ch-index 0 --ch-get all
```

### Application won't start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## File Locations

```
meshtastic-poc/
├── package.json              # Dependencies
├── vite.config.js            # Build config
├── src/
│   ├── main.js               # Electron main
│   ├── index.html            # HTML entry
│   └── renderer/
│       ├── main.jsx          # React entry
│       ├── App.jsx           # UI component
│       └── MeshtasticService.js  # Communication
```

## Key Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run electron         # Start Electron
npm run electron:dev     # Start both (combined)

# Production
npm run build            # Build for production
npm run package          # Package application

# Meshtastic CLI
meshtastic --port PORT --info           # Device info
meshtastic --port PORT --nodes          # List nodes
meshtastic --port PORT --sendtext "Hi"  # Send message
meshtastic --port PORT --listen         # Listen for messages
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

### Size Limits
- Max packet: 240 bytes
- Usable payload: ~200 bytes
- Recommended: < 150 bytes
- Batch: 10-15 runners per packet

## Performance

| Metric | Value |
|--------|-------|
| Range (LOS) | 5-10 km |
| Range (Urban) | 1-3 km |
| Latency | 0.5-10 sec |
| Baud Rate | 115200 |
| Packet Loss | ~10% |

## Hardware Recommendations

### Devices
- **LILYGO T-Beam**: $35-45 (recommended)
- **Heltec LoRa 32 V3**: $30-40
- **RAK4631 WisMesh**: $40-50

### Accessories
- USB-C cables (quality matters)
- External antennas for better range
- Weatherproof cases for outdoor use
- Power banks for portable operation

## Browser Compatibility

✅ **Supported**:
- Chrome 89+
- Edge 89+
- Opera 75+

❌ **Not Supported**:
- Firefox (no Web Serial API)
- Safari (no Web Serial API)

## Documentation

- **SETUP.md**: Detailed setup guide
- **PROJECT_STRUCTURE.md**: Code organization
- **IMPLEMENTATION_SUMMARY.md**: Complete overview
- **README.md**: Quick start

## Support Resources

- Meshtastic Docs: https://meshtastic.org/docs/
- Meshtastic.js: https://js.meshtastic.org/
- Discord: https://discord.gg/meshtastic
- Forum: https://meshtastic.discourse.group/

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Devices flashed with Meshtastic firmware
- [ ] Devices configured with same region
- [ ] Devices configured with same channel
- [ ] Application starts without errors
- [ ] Can connect to USB device
- [ ] Can send checkpoint data
- [ ] Can send text messages
- [ ] Can receive messages
- [ ] RSSI/SNR displayed correctly
- [ ] Two nodes can communicate

## Common Issues

| Issue | Solution |
|-------|----------|
| Port not found | Check USB cable, install drivers |
| Connection failed | Device in use by another app |
| Nodes can't see each other | Check region and channel match |
| Messages not received | Check signal quality, reduce distance |
| Web Serial not supported | Use Chrome/Edge/Opera |
| Build fails | Clear node_modules, reinstall |

## Tips & Best Practices

1. **Always configure both nodes with identical settings**
2. **Test indoors first before field deployment**
3. **Monitor RSSI/SNR to optimize placement**
4. **Keep payloads under 150 bytes for reliability**
5. **Use sequence numbers to track messages**
6. **Implement retry logic for critical data**
7. **Test range incrementally**
8. **Keep antennas vertical for best performance**
9. **Avoid metal enclosures that block signals**
10. **Document your channel settings**

---

**Quick Start**: `npm install` → `npm run electron:dev` → Click "Connect to USB Node"
