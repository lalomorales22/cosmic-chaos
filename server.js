const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Add CORS support
app.use(cors({
  origin: '*', // In production, you would restrict this to your domain
  methods: ['GET', 'POST'],
  credentials: true
}));

// Initialize WebSocket server with proper configuration
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: false
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve JavaScript modules
app.use('/js', express.static(path.join(__dirname, 'js')));

// Main page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Player data storage
const players = new Map();
const playerColors = ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B', '#7FDBFF', '#F012BE'];
let nextColorIndex = 0;

// Planet data - just a starter set, players will see procedurally generated ones too
const planets = [
  { id: 'p1', position: { x: 1000, y: 0, z: 1000 }, size: 50, type: 'Rocky' },
  { id: 'p2', position: { x: -1500, y: 200, z: -800 }, size: 70, type: 'Gaseous' },
  { id: 'p3', position: { x: 800, y: -100, z: -1200 }, size: 40, type: 'Molten' }
];

// Game state synchronization rate (ms) - increasing from 50ms to reduce server load
const SYNC_RATE = 100;

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  // Get username from URL query parameter if available
  const urlParams = new URLSearchParams(req.url.slice(req.url.indexOf('?')));
  const username = urlParams.get('username') || generateId();
  
  // Generate a unique ID for the new player
  const playerId = username;
  
  // Assign color to player - from URL params or the next available
  let playerColor = urlParams.get('color');
  if (!playerColor) {
    playerColor = playerColors[nextColorIndex];
    nextColorIndex = (nextColorIndex + 1) % playerColors.length;
  }
  
  // Initialize player data
  const playerData = {
    id: playerId,
    position: { x: 0, y: 100, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    color: playerColor,
    isAlienMode: false,
    lastUpdate: Date.now(),
    socket: ws,
    pingTime: 0
  };
  
  // Store player data
  players.set(playerId, playerData);
  
  console.log(`Player connected: ${playerId}`);
  
  // Set up ping interval for this specific connection
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const pingTime = Date.now();
        playerData.pingTime = pingTime;
        ws.send(JSON.stringify({ type: 'ping', timestamp: pingTime }));
      } catch (error) {
        console.error(`Error sending ping to ${playerId}:`, error);
        clearInterval(pingInterval);
      }
    } else {
      clearInterval(pingInterval);
    }
  }, 15000); // Ping every 15 seconds
  
  // Send initial player data
  sendToPlayer(ws, {
    type: 'init',
    playerId,
    playerColor,
    players: getPlayersData(),
    planets
  });
  
  // Broadcast new player to others
  broadcastToOthers(playerId, {
    type: 'playerJoined',
    player: getPlayerDataForBroadcast(playerData)
  });
  
  // Message handler
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Update last activity timestamp to prevent timeout
      const player = players.get(playerId);
      if (player) {
        player.lastUpdate = Date.now();
      }
      
      // Handle different message types
      switch (data.type) {
        case 'updatePosition':
          updatePlayerPosition(playerId, data);
          break;
        
        case 'alienMode':
          updatePlayerAlienMode(playerId, data);
          break;
        
        case 'placeBomb':
          handleBombPlacement(playerId, data);
          break;
        
        case 'planetDestroyed':
          handlePlanetDestruction(playerId, data.planetId);
          break;
          
        case 'chat':
          broadcastChat(playerId, data.message);
          break;
          
        case 'pong':
          // Player responded to ping
          if (player && data.pingTime) {
            const latency = Date.now() - data.pingTime;
            player.latency = latency;
            console.log(`Player ${playerId} latency: ${latency}ms`);
          }
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log(`Player disconnected: ${playerId}`);
    
    // Clear ping interval
    clearInterval(pingInterval);
    
    // Broadcast player disconnection
    broadcastToAll({
      type: 'playerLeft',
      playerId
    });
    
    // Remove player data
    players.delete(playerId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for player ${playerId}:`, error);
    clearInterval(pingInterval);
    players.delete(playerId);
  });
});

// Start server sync loop
setInterval(() => {
  syncGameState();
}, SYNC_RATE);

// Add a heartbeat interval to keep connections alive
setInterval(() => {
  sendHeartbeat();
}, 5000); // Send heartbeat every 5 seconds

// Send heartbeat to all connected players
function sendHeartbeat() {
  players.forEach((player) => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      try {
        player.socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      } catch (error) {
        console.error(`Error sending heartbeat to player ${player.id}:`, error);
      }
    }
  });
}

// Sync game state to all players with improved error handling
function syncGameState() {
    try {
        // Clean up inactive players (disconnected without proper close)
        const now = Date.now();
        const timeout = 30000; // 30 seconds (increased from 10 seconds)
        
        players.forEach((player, id) => {
            if (now - player.lastUpdate > timeout) {
                console.log(`Player timed out: ${id}, last update: ${new Date(player.lastUpdate).toISOString()}`);
                players.delete(id);
                
                broadcastToAll({
                    type: 'playerLeft',
                    playerId: id
                });
            }
        });
        
        // Prepare a lightweight game state - only send necessary data
        const playersData = {};
        players.forEach((player, id) => {
            playersData[id] = {
                id: player.id,
                position: player.position,
                rotation: player.rotation,
                isAlienMode: player.isAlienMode,
                landedPlanetId: player.landedPlanetId
            };
        });
        
        const gameStateData = {
            type: 'gameState',
            players: playersData,
            timestamp: now
        };
        
        // Broadcast state to all players with error handling
        players.forEach((player) => {
            try {
                if (player.socket && player.socket.readyState === WebSocket.OPEN) {
                    player.socket.send(JSON.stringify(gameStateData));
                }
            } catch (error) {
                console.error(`Error sending game state to player ${player.id}:`, error);
            }
        });
        
        // Update all players' lastUpdate to prevent timeout if they're just stationary
        players.forEach((player) => {
            // Only update if they haven't had an update recently to avoid overriding more recent updates
            const timeSinceUpdate = now - player.lastUpdate;
            if (timeSinceUpdate > SYNC_RATE * 2) {
                player.lastUpdate = now;
            }
        });
    } catch (error) {
        console.error("Error in syncGameState:", error);
    }
}

// Update player position with error handling
function updatePlayerPosition(playerId, data) {
    try {
        const player = players.get(playerId);
        if (!player) return;
        
        // Basic validation
        if (!isValidPosition(data.position) || !isValidRotation(data.rotation)) {
            console.log(`Invalid position/rotation data from ${playerId}`);
            return;
        }
        
        // Update player data
        player.position = data.position;
        player.rotation = data.rotation;
        player.lastUpdate = Date.now();
    } catch (error) {
        console.error(`Error updating position for player ${playerId}:`, error);
    }
}

// Update player alien mode
function updatePlayerAlienMode(playerId, data) {
  const player = players.get(playerId);
  if (!player) return;
  
  player.isAlienMode = data.isAlienMode;
  
  // If landed on planet, store planet data
  if (data.planetId) {
    player.landedPlanetId = data.planetId;
  } else {
    player.landedPlanetId = null;
  }
  
  // Broadcast alien mode change
  broadcastToAll({
    type: 'playerAlienMode',
    playerId,
    isAlienMode: player.isAlienMode,
    planetId: player.landedPlanetId
  });
}

// Handle bomb placement
function handleBombPlacement(playerId, data) {
  // Validate data
  if (!data.planetId || !isValidPosition(data.position)) {
    console.log(`Invalid bomb placement data from ${playerId}`);
    return;
  }
  
  // Broadcast bomb placement to all players
  broadcastToAll({
    type: 'bombPlaced',
    playerId,
    planetId: data.planetId,
    position: data.position,
    countdown: data.countdown || 10
  });
}

// Handle planet destruction
function handlePlanetDestruction(playerId, planetId) {
  if (!planetId) {
    console.log(`Invalid planet destruction data from ${playerId}`);
    return;
  }
  
  // Broadcast planet destruction to all players
  broadcastToAll({
    type: 'planetDestroyed',
    playerId,
    planetId
  });
}

// Broadcast chat message
function broadcastChat(playerId, message) {
  const player = players.get(playerId);
  if (!player || !message || message.length > 200) return;
  
  // Sanitize message (basic)
  const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Log the chat message for debugging
  console.log(`[CHAT] ${playerId}: ${sanitizedMessage}`);
  
  const chatData = {
    type: 'chat',
    playerId,
    playerColor: player.color,
    message: sanitizedMessage
  };
  
  // Send to all players, including the sender for confirmation
  players.forEach((p) => {
    if (p.socket && p.socket.readyState === WebSocket.OPEN) {
      try {
        p.socket.send(JSON.stringify(chatData));
      } catch (error) {
        console.error(`Error sending chat to player ${p.id}:`, error);
      }
    }
  });
}

// Get player data for broadcasting (exclude socket)
function getPlayerDataForBroadcast(player) {
  return {
    id: player.id,
    position: player.position,
    rotation: player.rotation,
    color: player.color,
    isAlienMode: player.isAlienMode,
    landedPlanetId: player.landedPlanetId
  };
}

// Get all players data for broadcasting
function getPlayersData() {
  const playersData = {};
  
  players.forEach((player, id) => {
    playersData[id] = getPlayerDataForBroadcast(player);
  });
  
  return playersData;
}

// Data validation
function isValidPosition(position) {
  if (!position) return false;
  return (
    typeof position.x === 'number' && 
    typeof position.y === 'number' && 
    typeof position.z === 'number' &&
    !isNaN(position.x) && 
    !isNaN(position.y) && 
    !isNaN(position.z)
  );
}

function isValidRotation(rotation) {
  if (!rotation) return false;
  return (
    typeof rotation.x === 'number' && 
    typeof rotation.y === 'number' && 
    typeof rotation.z === 'number' &&
    !isNaN(rotation.x) && 
    !isNaN(rotation.y) && 
    !isNaN(rotation.z)
  );
}

// Send data to specific player
function sendToPlayer(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

// Broadcast to all players except one
function broadcastToOthers(excludePlayerId, data) {
  players.forEach((player, id) => {
    if (id !== excludePlayerId && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(data));
    }
  });
}

// Broadcast to all players with error handling
function broadcastToAll(data) {
    try {
        const serializedData = JSON.stringify(data);
        players.forEach((player) => {
            try {
                if (player.socket && player.socket.readyState === WebSocket.OPEN) {
                    player.socket.send(serializedData);
                }
            } catch (socketError) {
                console.error(`Error sending to player ${player.id}:`, socketError);
            }
        });
    } catch (error) {
        console.error("Error in broadcastToAll:", error);
    }
}

// Generate a unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`UFO Game server running on port ${PORT}`);
  console.log(`WebSocket server is ready to accept connections`);
}).on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please close other instances or use a different port.`);
    process.exit(1);
  }
});