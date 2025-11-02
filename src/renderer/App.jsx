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
