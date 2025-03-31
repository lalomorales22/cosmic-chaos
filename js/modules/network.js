/**
 * Network Module
 * Handles WebSocket communication for multiplayer functionality
 */

import gameState from './game-state.js';
import { showMessage, createActiveUsersList, updateActiveUsersList, createChatInterface, addChatMessage } from './ui.js';

// Initialize multiplayer connection
export function initMultiplayer() {
    // Check if multiplayer is already enabled
    if (gameState.multiplayer.enabled) return;
    
    // Initialize connection retry state
    if (!gameState.multiplayer.connectionRetries) {
        gameState.multiplayer.connectionRetries = 0;
        gameState.multiplayer.maxRetries = 5;
        gameState.multiplayer.retryDelay = 1000; // Start with 1 second delay
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = host === 'localhost' ? ':3000' : '';
    const wsUrl = `${protocol}//${host}${port}`;
    
    console.log(`Connecting to WebSocket server at ${wsUrl}`);
    
    try {
        const socket = new WebSocket(wsUrl);
        gameState.multiplayer.socket = socket;
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
            if (socket.readyState !== WebSocket.OPEN) {
                console.error('WebSocket connection timeout');
                socket.close();
                handleConnectionFailure();
            }
        }, 5000);
        
        // Connection opened
        socket.addEventListener('open', (event) => {
            clearTimeout(connectionTimeout);
            console.log('Connected to multiplayer server');
            gameState.multiplayer.enabled = true;
            gameState.multiplayer.lastServerMessage = Date.now();
            
            // Reset connection retry state on successful connection
            gameState.multiplayer.connectionRetries = 0;
            gameState.multiplayer.retryDelay = 1000;
            
            // Show connection message
            showMessage('CONNECTED TO MULTIPLAYER SERVER', 3000);
            
            // Initialize UI components for multiplayer
            createActiveUsersList();
            createChatInterface();
            
            // Delay setting up chat handlers to ensure DOM elements are ready
            setTimeout(() => {
                setupChatHandlers();
            }, 500);
            
            // Update button text if exists
            const button = document.getElementById('multiplayer-toggle');
            if (button) {
                button.textContent = 'DISABLE MULTIPLAYER';
            }
        });
        
        // Listen for messages
        socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        });
        
        // Connection closed
        socket.addEventListener('close', (event) => {
            clearTimeout(connectionTimeout);
            console.log('Disconnected from multiplayer server:', event.code, event.reason);
            
            if (gameState.multiplayer.enabled) {
                // Only try to reconnect if we were previously connected and didn't intentionally disconnect
                handleConnectionFailure();
            } else {
                // Clean disconnection
                disableMultiplayer();
            }
        });
        
        // Handle connection errors
        socket.addEventListener('error', (error) => {
            clearTimeout(connectionTimeout);
            console.error('WebSocket error:', error);
            showMessage('MULTIPLAYER CONNECTION ERROR', 3000);
            handleConnectionFailure();
        });
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        showMessage('FAILED TO CONNECT TO SERVER', 3000);
        handleConnectionFailure();
    }
}

// Handle connection failures with exponential backoff
function handleConnectionFailure() {
    if (!gameState.multiplayer) return;
    
    // Clean up current connection
    disableMultiplayer(false);
    
    // Check if we should retry
    if (gameState.multiplayer.connectionRetries < gameState.multiplayer.maxRetries) {
        const retryDelay = gameState.multiplayer.retryDelay;
        gameState.multiplayer.connectionRetries++;
        
        // Exponential backoff - double the delay for next retry
        gameState.multiplayer.retryDelay = Math.min(retryDelay * 2, 30000); // Cap at 30 seconds
        
        console.log(`Retrying connection in ${retryDelay/1000} seconds... (Attempt ${gameState.multiplayer.connectionRetries}/${gameState.multiplayer.maxRetries})`);
        showMessage(`CONNECTION FAILED. RETRYING IN ${Math.round(retryDelay/1000)}s`, 2000);
        
        setTimeout(() => {
            if (!gameState.multiplayer.enabled) {
                initMultiplayer();
            }
        }, retryDelay);
    } else {
        console.log('Maximum connection retries reached. Giving up.');
        showMessage('MULTIPLAYER CONNECTION FAILED', 3000);
        
        // Reset retry state for next attempt
        gameState.multiplayer.connectionRetries = 0;
        gameState.multiplayer.retryDelay = 1000;
    }
}

// Disable multiplayer
export function disableMultiplayer(userInitiated = true) {
    if (gameState.multiplayer.socket) {
        gameState.multiplayer.socket.close();
    }
    
    gameState.multiplayer.enabled = false;
    gameState.multiplayer.socket = null;
    
    // Clean up other players with error handling
    try {
        gameState.multiplayer.otherPlayers.forEach((player) => {
            if (gameState.mainScene && player.model) {
                gameState.mainScene.remove(player.model);
            }
            if (gameState.mainScene && player.alienModel) {
                gameState.mainScene.remove(player.alienModel);
            }
        });
        gameState.multiplayer.otherPlayers.clear();
    } catch (error) {
        console.error("Error cleaning up other players:", error);
    }
    
    // Remove multiplayer UI elements
    removeChatInterface();
    removeActiveUsersList();
    
    // Update button text only if user intentionally disabled
    if (userInitiated) {
        const button = document.getElementById('multiplayer-toggle');
        if (button) {
            button.textContent = 'ENABLE MULTIPLAYER';
        }
    }
}

// Handle messages from the server
function handleServerMessage(data) {
    switch (data.type) {
        case 'init':
            // Initial connection data
            gameState.multiplayer.playerId = data.playerId;
            gameState.multiplayer.playerColor = data.playerColor;
            
            // Update player ship color
            updatePlayerShipColor(data.playerColor);
            
            // Initialize other players
            Object.values(data.players).forEach(playerData => {
                if (playerData.id !== gameState.multiplayer.playerId) {
                    createOtherPlayerShip(playerData);
                }
            });
            
            // Update UI
            updateActiveUsersList();
            
            showMessage(`ASSIGNED PLAYER ID: ${data.playerId}`, 3000);
            break;
            
        case 'playerJoined':
            // New player joined
            createOtherPlayerShip(data.player);
            showMessage(`PLAYER ${data.player.id} JOINED`, 2000);
            updateActiveUsersList();
            break;
            
        case 'playerLeft':
            // Player left
            removeOtherPlayerShip(data.playerId);
            showMessage(`PLAYER ${data.playerId} LEFT`, 2000);
            updateActiveUsersList();
            break;
            
        case 'gameState':
            // Update all player positions
            updateOtherPlayersPositions(data.players);
            
            // Update connection status timestamp
            gameState.multiplayer.lastServerMessage = Date.now();
            break;
            
        case 'heartbeat':
            // Update heartbeat timestamp to maintain connection
            gameState.multiplayer.lastServerMessage = Date.now();
            
            // Send a position update in response to keep connection active
            sendPositionUpdate(true);
            break;
            
        case 'ping':
            // Respond to ping with pong message
            gameState.multiplayer.lastServerMessage = Date.now();
            sendToServer({
                type: 'pong',
                pingTime: data.timestamp,
                timestamp: Date.now()
            });
            break;
            
        case 'playerAlienMode':
            // Player toggled alien mode
            updateOtherPlayerAlienMode(data.playerId, data.isAlienMode, data.planetId);
            break;
            
        case 'bombPlaced':
            // A player placed a bomb
            handleOtherPlayerBombPlacement(data);
            break;
            
        case 'planetDestroyed':
            // A planet was destroyed
            handleOtherPlayerPlanetDestruction(data.planetId, data.playerId);
            break;
            
        case 'chat':
            // Chat message received
            receiveChatMessage(data);
            // Show a notification message
            if (data.playerId !== gameState.multiplayer.playerId) {
                showMessage(`MESSAGE FROM ${data.playerId}`, 2000);
            }
            break;
    }
}

// Set up chat input handlers
function setupChatHandlers() {
    const chatForm = document.getElementById('chat-form');
    if (!chatForm) return;
    
    // Remove existing event listeners to prevent duplicates
    const newChatForm = chatForm.cloneNode(true);
    chatForm.parentNode.replaceChild(newChatForm, chatForm);
    
    newChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (message) {
            sendChatMessage(message);
            chatInput.value = '';
        }
    });
    
    // Add a keydown event listener for the Enter key
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                const message = chatInput.value.trim();
                if (message) {
                    sendChatMessage(message);
                    chatInput.value = '';
                }
            }
        });
    }
}

// Remove chat interface
function removeChatInterface() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.remove();
    }
    
    const chatToggle = document.getElementById('chat-toggle');
    if (chatToggle) {
        chatToggle.remove();
    }
}

// Remove active users list
function removeActiveUsersList() {
    const activeUsers = document.getElementById('active-users');
    if (activeUsers) {
        activeUsers.remove();
    }
}

// Create ship model for other players
function createOtherPlayerShip(playerData) {
    // Use Three.js library to create the ship
    // This function is implemented in the renderer module
    if (!window.THREE) {
        console.error('THREE.js not loaded yet');
        return;
    }
    
    // Create a ship model similar to player ship but simpler
    const shipGroup = new THREE.Group();
    
    // UFO body
    const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
    bodyGeometry.scale(1, 0.4, 1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: playerData.color,
        specular: 0x111111,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    shipGroup.add(body);
    
    // Cockpit dome
    const domeGeometry = new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshPhongMaterial({
        color: 0x44aaff,
        specular: 0xffffff,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.2;
    shipGroup.add(dome);
    
    // Add a light to the ship
    const shipLight = new THREE.PointLight(playerData.color, 0.5, 30);
    shipGroup.add(shipLight);
    
    // Add player ID text above ship
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256;
    textCanvas.height = 64;
    const textContext = textCanvas.getContext('2d');
    textContext.font = 'Bold 24px Arial';
    textContext.fillStyle = playerData.color;
    textContext.textAlign = 'center';
    textContext.fillText(playerData.id, 128, 32);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.SpriteMaterial({ map: textTexture });
    const textSprite = new THREE.Sprite(textMaterial);
    textSprite.scale.set(5, 1.25, 1);
    textSprite.position.y = 2;
    shipGroup.add(textSprite);
    
    // Set initial position and rotation
    shipGroup.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    
    if (playerData.rotation) {
        shipGroup.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        );
    }
    
    // Add to scene
    gameState.mainScene.add(shipGroup);
    
    // Create alien model if in alien mode
    let alienModel = null;
    if (playerData.isAlienMode) {
        alienModel = createOtherPlayerAlien(playerData);
    }
    
    // Store player data
    gameState.multiplayer.otherPlayers.set(playerData.id, {
        id: playerData.id,
        model: shipGroup,
        alienModel: alienModel,
        color: playerData.color,
        isAlienMode: playerData.isAlienMode,
        landedPlanetId: playerData.landedPlanetId
    });
}

// Create alien model for other players
function createOtherPlayerAlien(playerData) {
    if (!window.THREE) return null;
    
    // Create a simple alien model (similar to player alien but simpler)
    const alienGroup = new THREE.Group();
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    headGeometry.scale(0.8, 1.2, 1);
    const headMaterial = new THREE.MeshLambertMaterial({ color: playerData.color });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.6;
    alienGroup.add(head);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.4, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: playerData.color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    alienGroup.add(body);
    
    // Add a small light
    const alienLight = new THREE.PointLight(playerData.color, 0.5, 10);
    alienLight.position.set(0, 0.5, 0);
    alienGroup.add(alienLight);
    
    // Position alien near the landed planet
    if (playerData.landedPlanetId) {
        const planet = gameState.planets.find(p => p.id === playerData.landedPlanetId);
        if (planet) {
            const planetPosition = new THREE.Vector3();
            planet.group.getWorldPosition(planetPosition);
            
            // Position on planet surface
            alienGroup.position.copy(planetPosition);
            alienGroup.position.normalize();
            alienGroup.position.multiplyScalar(planet.size + 1);
        }
    }
    
    // Add alien to scene
    gameState.mainScene.add(alienGroup);
    
    return alienGroup;
}

// Remove other player ship
function removeOtherPlayerShip(playerId) {
    const player = gameState.multiplayer.otherPlayers.get(playerId);
    if (player) {
        if (gameState.mainScene) {
            if (player.model) gameState.mainScene.remove(player.model);
            if (player.alienModel) gameState.mainScene.remove(player.alienModel);
        }
        gameState.multiplayer.otherPlayers.delete(playerId);
    }
}

// Optimize the function that updates other players' positions
function updateOtherPlayersPositions(playersData) {
    try {
        // Get our player's position
        if (!gameState.playerShip) return;
        
        const myPosition = new THREE.Vector3(
            gameState.playerShip.position.x,
            gameState.playerShip.position.y,
            gameState.playerShip.position.z
        );
        
        // Sort players by distance from our player
        const sortedPlayers = Object.values(playersData)
            .filter(playerData => playerData.id !== gameState.multiplayer.playerId)
            .map(playerData => {
                const distance = new THREE.Vector3(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                ).distanceTo(myPosition);
                
                return {
                    data: playerData,
                    distance: distance
                };
            })
            .sort((a, b) => a.distance - b.distance);
        
        // Clear the set of rendered players
        gameState.multiplayer.renderedPlayers.clear();
        
        // Process only the closest players up to the limit
        const playerLimit = gameState.multiplayer.playerLimit;
        const playersToProcess = sortedPlayers.slice(0, playerLimit);
        
        // Update only the closest players
        playersToProcess.forEach(({ data: playerData }) => {
            // Add to rendered players set
            gameState.multiplayer.renderedPlayers.add(playerData.id);
            
            const player = gameState.multiplayer.otherPlayers.get(playerData.id);
            
            // If player doesn't exist yet, create them
            if (!player) {
                createOtherPlayerShip(playerData);
                return;
            }
            
            // Skip updates if player model isn't available
            if (!player.model && !player.alienModel) return;
            
            // Show this player's model
            if (player.model) player.model.visible = !player.isAlienMode;
            if (player.alienModel) player.alienModel.visible = player.isAlienMode;
            
            // Update position and rotation with minimal interpolation to save performance
            if (!player.isAlienMode && player.model) {
                // Update ship position with smooth interpolation
                player.model.position.lerp(
                    new THREE.Vector3(
                        playerData.position.x,
                        playerData.position.y,
                        playerData.position.z
                    ),
                    0.1 // Reduced for smoother motion
                );
                
                // Update rotation
                if (playerData.rotation) {
                    player.model.rotation.set(
                        playerData.rotation.x,
                        playerData.rotation.y,
                        playerData.rotation.z
                    );
                }
            } else if (player.isAlienMode && player.alienModel) {
                // Update alien position if in alien mode
                player.alienModel.position.lerp(
                    new THREE.Vector3(
                        playerData.position.x,
                        playerData.position.y,
                        playerData.position.z
                    ),
                    0.1 // Reduced for smoother motion
                );
            }
        });
        
        // Hide players that are too far away to save rendering resources
        gameState.multiplayer.otherPlayers.forEach((player, playerId) => {
            if (!gameState.multiplayer.renderedPlayers.has(playerId)) {
                // Hide this player's models
                if (player.model) player.model.visible = false;
                if (player.alienModel) player.alienModel.visible = false;
            }
        });
    } catch (error) {
        console.error("Error updating other players' positions:", error);
    }
}

// Toggle alien mode for other player
function updateOtherPlayerAlienMode(playerId, isAlienMode, planetId) {
    const player = gameState.multiplayer.otherPlayers.get(playerId);
    if (!player) return;
    
    player.isAlienMode = isAlienMode;
    player.landedPlanetId = planetId;
    
    // Toggle visibility of ship and alien
    if (player.model) {
        player.model.visible = !isAlienMode;
    }
    
    if (isAlienMode) {
        // Create alien model if it doesn't exist
        if (!player.alienModel) {
            player.alienModel = createOtherPlayerAlien({
                id: playerId,
                color: player.color,
                landedPlanetId: planetId
            });
        } else if (player.alienModel) {
            player.alienModel.visible = true;
        }
    } else if (player.alienModel) {
        player.alienModel.visible = false;
    }
}

// Handle bomb placement by other player
function handleOtherPlayerBombPlacement(data) {
    // This function will be implemented in the game logic module
    // For now, just show a message
    showMessage(`PLAYER ${data.playerId} PLACED A BOMB`, 2000);
}

// Handle planet destruction by other player
function handleOtherPlayerPlanetDestruction(planetId, playerId) {
    // This function will be implemented in the game logic module
    // For now, just show a message
    showMessage(`PLANET DESTROYED BY PLAYER ${playerId}`, 2000);
}

// Update player ship color
function updatePlayerShipColor(color) {
    if (!gameState.playerShip) return;
    
    // Find the ship body and update its material
    gameState.playerShip.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
            child.material.color.set(color);
        }
    });
}

// Send position update to server
export function sendPositionUpdate(force = false) {
    if (!gameState.multiplayer.enabled || !gameState.multiplayer.socket) return;
    
    try {
        // Check if it's time to send an update, or if we're forcing an update
        const now = Date.now();
        if (!force && now - gameState.multiplayer.lastPositionUpdate < gameState.multiplayer.updateInterval) {
            return;
        }
        
        gameState.multiplayer.lastPositionUpdate = now;
        
        // Get player position and rotation
        const position = {
            x: gameState.playerShip.position.x,
            y: gameState.playerShip.position.y,
            z: gameState.playerShip.position.z
        };
        
        const rotation = {
            x: gameState.playerShip.rotation.x,
            y: gameState.playerShip.rotation.y,
            z: gameState.playerShip.rotation.z
        };
        
        // Send to server
        sendToServer({
            type: 'updatePosition',
            position,
            rotation,
            timestamp: now
        });
    } catch (error) {
        console.error("Error sending position update:", error);
        // Don't disable multiplayer here to allow recovery
    }
}

// Send alien mode update to server
export function sendAlienModeUpdate(isAlienMode, planetId = null) {
    if (!gameState.multiplayer.enabled || !gameState.multiplayer.socket) return;
    
    sendToServer({
        type: 'alienMode',
        isAlienMode,
        planetId
    });
}

// Send bomb placement to server
export function sendBombPlacement(planetId, position) {
    if (!gameState.multiplayer.enabled || !gameState.multiplayer.socket) return;
    
    sendToServer({
        type: 'placeBomb',
        planetId,
        position: {
            x: position.x,
            y: position.y,
            z: position.z
        },
        countdown: 10
    });
}

// Send planet destruction to server
export function sendPlanetDestruction(planetId) {
    if (!gameState.multiplayer.enabled || !gameState.multiplayer.socket) return;
    
    sendToServer({
        type: 'planetDestroyed',
        planetId
    });
}

// Send chat message to server
function sendChatMessage(message) {
    if (!gameState.multiplayer.enabled || !gameState.multiplayer.socket) {
        console.error('Cannot send chat message: multiplayer not enabled or socket not connected');
        return;
    }
    
    // Ensure message is not empty
    if (!message || message.trim() === '') {
        return;
    }
    
    // Limit message length
    const truncatedMessage = message.trim().substring(0, 200);
    
    // Send message to server
    const chatData = {
        type: 'chat',
        message: truncatedMessage
    };
    
    console.log('Sending chat message:', chatData);
    sendToServer(chatData);
    
    // Also add the message to our own chat (immediate feedback)
    addChatMessage(
        gameState.multiplayer.playerId,
        truncatedMessage,
        gameState.multiplayer.playerColor
    );
}

// Receive and display chat message
function receiveChatMessage(data) {
    console.log('Received chat message:', data);
    
    // Skip if message is from self (already added)
    if (data.playerId === gameState.multiplayer.playerId) {
        return;
    }
    
    // Add the message to the chat UI
    addChatMessage(data.playerId, data.message, data.playerColor);
    
    // Store message in history
    gameState.multiplayer.chatMessages.push({
        playerId: data.playerId,
        playerColor: data.playerColor,
        message: data.message,
        timestamp: Date.now()
    });
    
    // Limit history to 50 messages
    if (gameState.multiplayer.chatMessages.length > 50) {
        gameState.multiplayer.chatMessages.shift();
    }
    
    // Always make chat visible when receiving messages
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'flex';
        
        // Update toggle button text
        const toggleButton = document.getElementById('chat-toggle');
        if (toggleButton) {
            toggleButton.textContent = 'CLOSE CHAT';
            toggleButton.style.backgroundColor = 'rgba(255, 255, 0, 0.5)';
            setTimeout(() => {
                toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }, 1000);
        }
    }
}

// Send data to server
function sendToServer(data) {
    try {
        if (gameState.multiplayer.socket && gameState.multiplayer.socket.readyState === WebSocket.OPEN) {
            gameState.multiplayer.socket.send(JSON.stringify(data));
        }
    } catch (error) {
        console.error("Error sending data to server:", error);
    }
}
