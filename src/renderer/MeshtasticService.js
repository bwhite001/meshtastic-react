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
