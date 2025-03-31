/**
 * UI Module
 * Handles all user interface elements and interactions
 */

import gameState from './game-state.js';
import Config from '../config.js';

// Show a timed message in the message box
export function showMessage(text, duration = 2000) {
    const messageBox = document.getElementById('message-box');
    messageBox.textContent = text;
    messageBox.style.opacity = 1;
    
    // Clear previous timeout if exists
    if (gameState.activeMessages.length > 0) {
        const lastMessage = gameState.activeMessages[gameState.activeMessages.length - 1];
        clearTimeout(lastMessage.timeout);
        gameState.activeMessages.pop();
    }
    
    // Set new timeout
    const messageTimeout = setTimeout(() => {
        messageBox.style.opacity = 0;
        
        // Remove this message from active messages
        const index = gameState.activeMessages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            gameState.activeMessages.splice(index, 1);
        }
    }, duration);
    
    // Generate a unique ID for this message
    const messageId = Date.now();
    
    // Store the message and its timeout
    gameState.activeMessages.push({
        id: messageId,
        text: text,
        timeout: messageTimeout
    });
}

// Update the minimap with planets, wormholes, players, and the VIBEVERSE portal
export function updateMinimap() {
    // Increment update timer
    gameState.minimapUpdateTimer += gameState.clock.getDelta();
    
    // Only update at specified intervals
    if (gameState.minimapUpdateTimer < gameState.minimapUpdateInterval) {
        return;
    }
    
    gameState.minimapUpdateTimer = 0;
    
    // Clear previous minimap dots
    const minimapDots = document.getElementById('minimap-dots');
    minimapDots.innerHTML = '';
    
    // Add player's position
    const playerDot = document.createElement('div');
    playerDot.className = 'minimap-dot player';
    playerDot.style.left = '50%';
    playerDot.style.top = '50%';
    minimapDots.appendChild(playerDot);
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Calculate minimap scale - show objects within range
    const minimapRadius = Config.ui.minimapRadius;
    const minimapScale = 100 / minimapRadius;
    
    // Add other players to minimap if multiplayer is enabled (prioritize these)
    if (gameState.multiplayer.enabled) {
        addPlayersToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale);
    }
    
    // Add important planets to minimap (nearest + planets with bombs)
    addImportantPlanetsToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale);
    
    // Add wormholes to minimap
    addWormholesToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale);
    
    // Add VIBEVERSE portal to minimap if it exists
    addVibeVersePortalToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale);
}

// Add VIBEVERSE portal to the minimap with blinking effect
function addVibeVersePortalToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale) {
    // Check if exit portal exists
    if (!window.portal || !window.portal.portalState || !window.portal.portalState.exitPortal) return;
    
    const exitPortalGroup = window.portal.portalState.exitPortal.group;
    if (!exitPortalGroup) return;
    
    // Get portal position
    const portalPosition = new THREE.Vector3();
    exitPortalGroup.getWorldPosition(portalPosition);
    
    // Calculate relative position
    const relativePosition = {
        x: portalPosition.x - playerPosition.x,
        z: portalPosition.z - playerPosition.z
    };
    
    // Calculate distance to portal
    const distance = Math.sqrt(relativePosition.x * relativePosition.x + relativePosition.z * relativePosition.z);
    
    // Calculate angle to portal - we'll show it at the edge of the minimap if it's outside the radar range
    const angle = Math.atan2(relativePosition.z, relativePosition.x);
    
    // Determine if portal is within radar range
    const inRange = distance <= minimapRadius;
    
    // Calculate minimap coordinates
    let minimapX, minimapY;
    
    if (inRange) {
        // Portal is in range, show at actual position
        minimapX = 50 + (relativePosition.x * minimapScale);
        minimapY = 50 + (relativePosition.z * minimapScale);
    } else {
        // Portal is out of range, show at edge of radar with direction indicator
        minimapX = 50 + Math.cos(angle) * 46; // 46% from center (slightly inside border)
        minimapY = 50 + Math.sin(angle) * 46;
    }
    
    // Create portal marker
    const portalDot = document.createElement('div');
    portalDot.className = 'minimap-dot portal-dot';
    portalDot.style.left = minimapX + '%';
    portalDot.style.top = minimapY + '%';
    
    // Apply portal styling - make it more prominent
    portalDot.style.width = '8px';
    portalDot.style.height = '8px';
    portalDot.style.backgroundColor = '#00ff00'; // Bright green
    portalDot.style.boxShadow = '0 0 8px #00ff00'; // Green glow
    portalDot.style.borderRadius = '50%'; // Circular
    portalDot.style.zIndex = '10'; // Make sure it appears above other dots
    
    // Apply the pulse animation
    portalDot.style.animation = 'portalPulse 1.5s infinite';
    
    // Add portal to minimap
    minimapDots.appendChild(portalDot);
    
    // If portal is outside range, add direction indicator
    if (!inRange) {
        // Add an arrow or line pointing in the direction of the portal
        const directionIndicator = document.createElement('div');
        directionIndicator.style.position = 'absolute';
        directionIndicator.style.left = minimapX + '%';
        directionIndicator.style.top = minimapY + '%';
        directionIndicator.style.width = '0';
        directionIndicator.style.height = '0';
        directionIndicator.style.borderLeft = '4px solid transparent';
        directionIndicator.style.borderRight = '4px solid transparent';
        directionIndicator.style.borderBottom = '8px solid #00ff00';
        directionIndicator.style.transform = `rotate(${angle}rad)`;
        directionIndicator.style.transformOrigin = 'center bottom';
        directionIndicator.style.zIndex = '9';
        
        minimapDots.appendChild(directionIndicator);
    }
    
    // Add "VIBEVERSE" label
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = (minimapX + 6) + '%';
    label.style.top = (minimapY - 6) + '%';
    label.style.color = '#00ff00';
    label.style.fontSize = '8px';
    label.style.fontWeight = 'bold';
    label.style.textShadow = '0 0 3px #00ff00';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'none';
    label.textContent = 'VIBEVERSE';
    
    // Only add label if in range or near the edge
    if (inRange || distance < minimapRadius * 1.5) {
        minimapDots.appendChild(label);
    }
}

// Add only important planets to the minimap (nearest + planets with bombs)
function addImportantPlanetsToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale) {
    // Track the nearest planet even if it's outside minimap radius
    let nearestPlanet = null;
    let nearestDistance = Infinity;
    
    // Get the nearest planet and planets with bombs
    const importantPlanets = gameState.planets.filter(planet => {
        if (planet.isDestroyed) return false;
        
        const planetPosition = new THREE.Vector3();
        planet.group.getWorldPosition(planetPosition);
        
        // Calculate distance
        const distance = planetPosition.distanceTo(playerPosition);
        
        // Track nearest planet
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlanet = planet;
        }
        
        // Add planets with bombs or within a closer range
        const inRange = distance < (minimapRadius * 0.7); // Only show closer planets
        return planet.hasBomb || inRange;
    });
    
    // Add nearest planet if not already included
    if (nearestPlanet && !importantPlanets.includes(nearestPlanet)) {
        importantPlanets.push(nearestPlanet);
    }
    
    // Limit to showing only the 10 closest planets for better readability
    const planetsToShow = importantPlanets
        .sort((a, b) => {
            const posA = new THREE.Vector3();
            const posB = new THREE.Vector3();
            a.group.getWorldPosition(posA);
            b.group.getWorldPosition(posB);
            return posA.distanceTo(playerPosition) - posB.distanceTo(playerPosition);
        })
        .slice(0, 10);
    
    // Add planets to minimap
    planetsToShow.forEach(planet => {
        const planetPosition = new THREE.Vector3();
        planet.group.getWorldPosition(planetPosition);
        
        // Calculate relative position
        const relativePosition = {
            x: planetPosition.x - playerPosition.x,
            z: planetPosition.z - playerPosition.z
        };
        
        // Skip if outside minimap radius
        const distance = Math.sqrt(relativePosition.x * relativePosition.x + relativePosition.z * relativePosition.z);
        if (distance > minimapRadius) return;
        
        // Calculate minimap coordinates
        const minimapX = 50 + (relativePosition.x * minimapScale);
        const minimapY = 50 + (relativePosition.z * minimapScale);
        
        // Create planet dot
        const planetDot = document.createElement('div');
        planetDot.className = 'minimap-dot';
        planetDot.style.left = minimapX + '%';
        planetDot.style.top = minimapY + '%';
        
        // Set color based on planet type
        let dotColor;
        switch (planet.type) {
            case 'Rocky': dotColor = '#a67c52'; break;
            case 'Gaseous': dotColor = '#a8c8ff'; break;
            case 'Molten': dotColor = '#ff5500'; break;
            case 'Frozen': dotColor = '#aaddff'; break;
            case 'Toxic': dotColor = '#55ff55'; break;
            case 'Oceanic': dotColor = '#0088ff'; break;
            case 'Desert': dotColor = '#ffcc44'; break;
            case 'Crystalline': dotColor = '#ff00ff'; break;
            default: dotColor = '#ffffff';
        }
        
        planetDot.style.backgroundColor = dotColor;
        
        // Add a glow to the dot for the nearest planet
        if (planet === gameState.nearestPlanet) {
            planetDot.style.boxShadow = '0 0 5px #fff';
        }
        
        // Highlight planets with bombs
        if (planet.hasBomb) {
            planetDot.style.backgroundColor = '#ff0000';
            planetDot.style.boxShadow = '0 0 7px #ff0000';
        }
        
        minimapDots.appendChild(planetDot);
    });
}

// Add wormholes to the minimap
function addWormholesToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale) {
    gameState.wormholes.forEach(wormhole => {
        const wormholePosition = new THREE.Vector3();
        wormhole.group.getWorldPosition(wormholePosition);
        
        // Calculate relative position
        const relativePosition = {
            x: wormholePosition.x - playerPosition.x,
            z: wormholePosition.z - playerPosition.z
        };
        
        // Skip if outside minimap radius
        const distance = Math.sqrt(relativePosition.x * relativePosition.x + relativePosition.z * relativePosition.z);
        if (distance > minimapRadius) return;
        
        // Calculate minimap coordinates
        const minimapX = 50 + (relativePosition.x * minimapScale);
        const minimapY = 50 + (relativePosition.z * minimapScale);
        
        // Create wormhole dot
        const wormholeDot = document.createElement('div');
        wormholeDot.className = 'minimap-dot';
        wormholeDot.style.left = minimapX + '%';
        wormholeDot.style.top = minimapY + '%';
        wormholeDot.style.backgroundColor = '#aa00ff';
        wormholeDot.style.boxShadow = '0 0 5px #aa00ff';
        
        minimapDots.appendChild(wormholeDot);
    });
}

// Add players to the minimap with enhanced visibility
function addPlayersToMinimap(minimapDots, playerPosition, minimapRadius, minimapScale) {
    // Get current animation state for blinking (using time to create a blink effect)
    const timeNow = Date.now();
    const blinkState = Math.floor(timeNow / 500) % 2 === 0; // Blink every 500ms
    
    gameState.multiplayer.otherPlayers.forEach((player) => {
        // Skip if player model doesn't exist
        if (!player.model) return;
        
        // Get player position
        const otherPlayerPosition = new THREE.Vector3();
        player.model.getWorldPosition(otherPlayerPosition);
        
        // Calculate relative position
        const relativePosition = {
            x: otherPlayerPosition.x - playerPosition.x,
            z: otherPlayerPosition.z - playerPosition.z
        };
        
        // Calculate distance
        const distance = Math.sqrt(relativePosition.x * relativePosition.x + relativePosition.z * relativePosition.z);
        
        // Skip if outside extended minimap radius (show players even if they're further away)
        if (distance > minimapRadius * 1.2) return; // Extended range for players
        
        // Calculate minimap coordinates
        const minimapX = 50 + (relativePosition.x * minimapScale);
        const minimapY = 50 + (relativePosition.z * minimapScale);
        
        // Create player marker container
        const playerMarker = document.createElement('div');
        playerMarker.className = 'player-marker';
        playerMarker.style.position = 'absolute';
        playerMarker.style.left = minimapX + '%';
        playerMarker.style.top = minimapY + '%';
        playerMarker.style.transform = 'translate(-50%, -50%)';
        playerMarker.style.pointerEvents = 'none';
        playerMarker.style.zIndex = '20'; // Above planets
        
        // Create player dot
        const playerDot = document.createElement('div');
        playerDot.className = 'minimap-dot player-dot';
        
        // Apply player color
        playerDot.style.backgroundColor = player.color;
        
        // Enhance the player marker to make it more distinct from planets
        playerDot.style.width = '8px';
        playerDot.style.height = '8px';
        playerDot.style.borderRadius = '0'; // Square shape to differentiate from planets
        playerDot.style.transform = 'rotate(45deg)'; // Diamond shape
        
        // Add blinking effect - make the glow stronger when blinking on
        const glowIntensity = blinkState ? '8px' : '3px';
        playerDot.style.boxShadow = `0 0 ${glowIntensity} ${player.color}`;
        
        // Add player ID if in range and not in alien mode
        if (distance < minimapRadius && !player.isAlienMode) {
            // Create player label with ID
            const playerLabel = document.createElement('div');
            playerLabel.className = 'player-label';
            playerLabel.textContent = player.id.slice(0, 4); // Short ID for cleaner display
            playerLabel.style.position = 'absolute';
            playerLabel.style.left = '10px';
            playerLabel.style.top = '-10px';
            playerLabel.style.color = player.color;
            playerLabel.style.fontSize = '8px';
            playerLabel.style.fontWeight = 'bold';
            playerLabel.style.textShadow = `0 0 3px ${player.color}`;
            playerLabel.style.whiteSpace = 'nowrap';
            
            playerMarker.appendChild(playerLabel);
        }
        
        // Add direction indicator if player is outside minimap radius
        if (distance > minimapRadius) {
            // Calculate angle to player
            const angle = Math.atan2(relativePosition.z, relativePosition.x);
            
            // Position indicator at edge of minimap
            const edgeX = 50 + Math.cos(angle) * 45; // 45% from center (inside border)
            const edgeY = 50 + Math.sin(angle) * 45;
            
            playerMarker.style.left = edgeX + '%';
            playerMarker.style.top = edgeY + '%';
            
            // Add an arrow indicator
            playerDot.style.clipPath = 'polygon(50% 0, 100% 100%, 0 100%)'; // Triangle
            playerDot.style.transform = `rotate(${angle + Math.PI/2}rad)`; // Point towards player
        }
        
        playerMarker.appendChild(playerDot);
        minimapDots.appendChild(playerMarker);
    });
}

// Update the orientation indicator (artificial horizon)
export function updateOrientationIndicator() {
    const indicator = document.getElementById('orientation-dot');
    if (!indicator) return;
    
    const maxOffset = 35; // Maximum pixel offset from center
    
    // Calculate position based on pitch and yaw, normalized to [-1, 1] range
    const pitchNormalized = gameState.shipOrientation.pitch / (Math.PI / 2);
    const yawNormalized = gameState.shipOrientation.yaw / Math.PI;
    
    // Calculate dot position (inverted Y for visual representation)
    const dotX = yawNormalized * maxOffset;
    const dotY = -pitchNormalized * maxOffset;
    
    // Apply transform
    indicator.style.transform = `translate(${dotX}px, ${dotY}px)`;
}

// Update alien symbols panel
export function updateAlienSymbols() {
    const panel = document.getElementById('alien-symbols');
    // Return early if panel doesn't exist anymore
    if (!panel) return;
    
    panel.innerHTML = '';
    
    gameState.discoveredMessages.forEach(message => {
        const span = document.createElement('span');
        span.textContent = message.symbol;
        span.style.cursor = 'pointer';
        span.style.opacity = message.discovered ? '1.0' : '0.5';
        
        // Add tooltip with meaning if discovered
        if (message.discovered) {
            span.title = message.meaning;
            span.style.color = '#0ff';
        }
        
        span.addEventListener('click', () => {
            if (message.discovered) {
                showMessage(message.meaning, 2000);
            } else {
                showMessage("UNKNOWN SYMBOL - TRANSLATION NEEDED", 2000);
            }
        });
        
        panel.appendChild(span);
    });
}

// Discover a new alien symbol
export function discoverSymbol(symbolIndex) {
    if (!gameState.discoveredMessages[symbolIndex].discovered) {
        gameState.discoveredMessages[symbolIndex].discovered = true;
        
        // Only try to update UI if panel exists
        const panel = document.getElementById('alien-symbols');
        if (panel) {
            updateAlienSymbols();
        }
        
        showMessage(`NEW ALIEN SYMBOL TRANSLATED: ${gameState.discoveredMessages[symbolIndex].meaning}`, 3000);
    }
}

// Show planet destruction rating
export function showDestructionRating(planet, resourcesGained) {
    const destructionRating = document.getElementById('destruction-rating');
    const destroyedPlanet = document.getElementById('destroyed-planet');
    const destructionEfficiency = document.getElementById('destruction-efficiency');
    const resourcesCollected = document.getElementById('resources-collected');
    const destructionBonus = document.getElementById('destruction-bonus');
    
    // Set values
    destroyedPlanet.textContent = planet.name;
    
    // Random efficiency for demo
    const efficiency = Math.floor(Math.random() * 40) + 60; // 60-100%
    destructionEfficiency.textContent = efficiency;
    
    // Resources based on planet size and type
    resourcesCollected.textContent = resourcesGained;
    
    // Add score based on resources collected
    const resourceScore = resourcesGained * 5;
    gameState.updateScore(resourceScore);
    
    // Bonus
    const bonuses = ['PERFECT TIMING', 'CORE STRIKE', 'COMPLETE VAPORIZATION', 'NONE'];
    const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
    destructionBonus.textContent = bonus;
    
    // Add bonus points if achieved
    if (bonus !== 'NONE') {
        const bonusScore = 100;
        gameState.updateScore(bonusScore);
        showMessage(`BONUS: ${bonus}! +${bonusScore} POINTS`, 2000);
    }
    
    // Show rating
    destructionRating.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        destructionRating.style.display = 'none';
    }, 5000);
}

// Create explosion flash effect
export function createExplosionFlash(color = 'rgba(255, 100, 0, 0.3)') {
    const flash = document.getElementById('explosion-flash');
    if (!flash) return;
    
    // Set flash color
    flash.style.backgroundColor = color;
    
    // Fade out
    setTimeout(() => {
        flash.style.backgroundColor = 'rgba(255, 100, 0, 0)';
    }, 200);
}

// Create and return Active Users UI component
export function createActiveUsersList() {
    // Check if it already exists
    let activeUsers = document.getElementById('active-users');
    
    if (!activeUsers) {
        activeUsers = document.createElement('div');
        activeUsers.id = 'active-users';
        
        // Position above chat container at bottom right
        activeUsers.style.position = 'absolute';
        activeUsers.style.bottom = '250px';
        activeUsers.style.right = '20px';
        activeUsers.style.width = '300px';
        activeUsers.style.padding = '10px';
        activeUsers.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        activeUsers.style.border = '1px solid #0ff';
        activeUsers.style.borderRadius = '10px';
        activeUsers.style.zIndex = '100';
        activeUsers.style.maxHeight = '200px';
        activeUsers.style.overflowY = 'auto';
        
        const title = document.createElement('div');
        title.id = 'active-users-title';
        title.textContent = 'ACTIVE PILOTS';
        activeUsers.appendChild(title);
        
        const list = document.createElement('ul');
        list.id = 'active-users-list';
        activeUsers.appendChild(list);
        
        document.getElementById('ui-container').appendChild(activeUsers);
    }
    
    return activeUsers;
}

// Update the active users list
export function updateActiveUsersList() {
    if (!gameState.multiplayer.enabled) return;
    
    const list = document.getElementById('active-users-list');
    if (!list) return;
    
    // Clear existing list
    list.innerHTML = '';
    
    // Add current player
    addUserToList(list, gameState.multiplayer.playerId, gameState.multiplayer.playerColor, true);
    
    // Add other players
    gameState.multiplayer.otherPlayers.forEach((player) => {
        addUserToList(list, player.id, player.color);
    });
}

// Add a user to the active users list
function addUserToList(list, id, color, isCurrentUser = false) {
    const item = document.createElement('li');
    item.className = 'active-user';
    
    const colorDot = document.createElement('div');
    colorDot.className = 'user-color';
    colorDot.style.backgroundColor = color;
    
    const userId = document.createElement('div');
    userId.className = 'user-id';
    userId.textContent = id + (isCurrentUser ? ' (YOU)' : '');
    
    item.appendChild(colorDot);
    item.appendChild(userId);
    list.appendChild(item);
}

// Create chat interface
export function createChatInterface() {
    // Check if it already exists
    let chatContainer = document.getElementById('chat-container');
    
    if (!chatContainer) {
        chatContainer = document.createElement('div');
        chatContainer.id = 'chat-container';
        
        // Position the chat at bottom right
        chatContainer.style.position = 'absolute';
        chatContainer.style.bottom = '20px';
        chatContainer.style.right = '20px';
        chatContainer.style.width = '300px';
        chatContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        chatContainer.style.border = '1px solid #0ff';
        chatContainer.style.borderRadius = '10px';
        chatContainer.style.padding = '10px';
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.pointerEvents = 'all';
        chatContainer.style.zIndex = '100';
        chatContainer.style.maxHeight = '200px';
        
        // Create header with title and close button
        const header = document.createElement('div');
        header.className = 'chat-header';
        
        const title = document.createElement('div');
        title.className = 'chat-title';
        title.textContent = 'COMMS CHANNEL';
        header.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'chat-close';
        closeButton.textContent = 'X';
        closeButton.addEventListener('click', () => {
            chatContainer.style.display = 'none';
            const toggleChatBtn = document.getElementById('chat-toggle');
            if (toggleChatBtn) {
                toggleChatBtn.textContent = 'OPEN CHAT';
            }
        });
        header.appendChild(closeButton);
        
        chatContainer.appendChild(header);
        
        // Create chat messages container
        const chatMessages = document.createElement('div');
        chatMessages.id = 'chat-messages';
        chatMessages.style.maxHeight = '120px'; // Adjusted height for proper display
        chatMessages.style.overflowY = 'auto';
        chatMessages.style.marginBottom = '10px';
        chatMessages.style.color = '#0ff';
        chatContainer.appendChild(chatMessages);
        
        // Create chat input form
        const chatForm = document.createElement('form');
        chatForm.id = 'chat-form';
        chatForm.style.display = 'flex';
        
        // Create chat input
        const chatInput = document.createElement('input');
        chatInput.id = 'chat-input';
        chatInput.type = 'text';
        chatInput.placeholder = 'Type message...';
        chatInput.style.flex = '1';
        chatInput.style.padding = '5px';
        chatInput.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        chatInput.style.border = '1px solid #0ff';
        chatInput.style.borderRadius = '5px';
        chatInput.style.color = '#0ff';
        chatInput.style.outline = 'none';
        chatForm.appendChild(chatInput);
        
        // Create send button
        const sendButton = document.createElement('button');
        sendButton.id = 'chat-submit';
        sendButton.type = 'submit';
        sendButton.textContent = 'Send';
        sendButton.style.marginLeft = '5px';
        sendButton.style.padding = '5px 10px';
        sendButton.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
        sendButton.style.border = '1px solid #0ff';
        sendButton.style.borderRadius = '5px';
        sendButton.style.color = '#0ff';
        sendButton.style.cursor = 'pointer';
        chatForm.appendChild(sendButton);
        
        chatContainer.appendChild(chatForm);
        
        document.getElementById('ui-container').appendChild(chatContainer);
        
        // Initially visible
        chatContainer.style.display = 'flex';
        
        // Make sure we have a chat toggle button
        createChatToggle();
        
        // Update chat toggle button text
        const toggleChatBtn = document.getElementById('chat-toggle');
        if (toggleChatBtn) {
            toggleChatBtn.textContent = 'CLOSE CHAT';
        }
    }
    
    return chatContainer;
}

// Add chat message to interface
export function addChatMessage(playerId, message, playerColor) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.style.marginBottom = '5px';
    
    // Create sender element
    const senderElement = document.createElement('span');
    senderElement.textContent = `${playerId}: `;
    senderElement.style.color = playerColor;
    senderElement.style.fontWeight = 'bold';
    
    // Create message text element
    const textElement = document.createElement('span');
    textElement.textContent = message;
    
    // Add elements to message
    messageElement.appendChild(senderElement);
    messageElement.appendChild(textElement);
    
    // Add message to chat
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update the UI for upgrades
export function updateUpgradesUI() {
    const upgradeCards = document.querySelectorAll('.upgrade-card');
    const upgradesPanel = document.getElementById('upgrades-panel');
    
    // Get gameState from module
    import('./game-state.js').then(module => {
        const gameState = module.default;
        
        // Show/hide the upgrades panel based on visibility flag
        if (upgradesPanel) {
            upgradesPanel.style.display = gameState.upgrades.isUpgradeUIVisible ? 'block' : 'none';
            
            // Update resources display
            const resourcesDisplay = document.getElementById('upgrades-resources');
            if (resourcesDisplay) {
                resourcesDisplay.textContent = `AVAILABLE RESOURCES: ${gameState.resourcesCollected}`;
            }
        }
        
        upgradeCards.forEach(card => {
            const upgradeType = card.dataset.upgradeType;
            const level = gameState.upgrades[`${upgradeType}Level`];
            const maxLevel = gameState.upgrades[`${upgradeType}MaxLevel`];
            const cost = gameState.getUpgradeCost(upgradeType);
            const canUpgrade = gameState.canUpgrade(upgradeType);
            
            // Update level
            const levelElement = card.querySelector('.upgrade-level');
            if (levelElement) {
                levelElement.textContent = level;
            }
            
            // Update max level
            const maxLevelElement = card.querySelector('.upgrade-max-level');
            if (maxLevelElement) {
                maxLevelElement.textContent = `/ ${maxLevel}`;
            }
            
            // Update cost
            const costElement = card.querySelector('.upgrade-cost');
            if (costElement) {
                costElement.textContent = `${cost} RESOURCES`;
                
                // Change color based on affordability
                if (gameState.resourcesCollected >= cost) {
                    costElement.style.color = '#ff0';
                } else {
                    costElement.style.color = '#f55';
                }
            }
            
            // Update button state
            const button = card.querySelector('.upgrade-button');
            if (button) {
                if (level >= maxLevel) {
                    button.textContent = 'MAX LEVEL';
                    button.disabled = true;
                    button.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
                    button.style.color = '#888';
                    button.style.cursor = 'not-allowed';
                } else if (canUpgrade) {
                    button.textContent = 'UPGRADE';
                    button.disabled = false;
                    button.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
                    button.style.color = '#0ff';
                    button.style.cursor = 'pointer';
                } else {
                    button.textContent = 'NEED MORE RESOURCES';
                    button.disabled = true;
                    button.style.backgroundColor = 'rgba(100, 100, 100, 0.5)';
                    button.style.color = '#f55';
                    button.style.cursor = 'not-allowed';
                }
            }
        });
    });
}

// Add a button to toggle the upgrades UI
export function addUpgradesButton() {
    // Check if it already exists
    if (document.getElementById('upgrades-toggle')) return;
    
    // Create the button
    const button = document.createElement('button');
    button.id = 'upgrades-toggle';
    button.textContent = 'SHIP UPGRADES';
    button.style.position = 'absolute';
    button.style.top = '390px'; // Position at appropriate height
    button.style.right = '20px';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    button.style.color = '#0ff';
    button.style.border = '2px solid #0ff';
    button.style.borderRadius = '10px';
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '16px';
    button.style.letterSpacing = '1px';
    button.style.textShadow = '0 0 5px #0ff';
    button.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
    button.style.transition = 'all 0.3s ease';
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(0, 100, 100, 0.7)';
        button.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.5)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        button.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
    });
    
    // Add click handler
    button.addEventListener('click', () => {
        import('./game-state.js').then(module => {
            const gameState = module.default;
            gameState.toggleUpgradeUI();
            updateUpgradesUI();
        });
    });
    
    // Add to DOM
    document.getElementById('ui-container').appendChild(button);
    
    // Create the upgrades UI panel
    createUpgradesUI();
    
    // Update button appearance periodically based on available resources
    setInterval(() => {
        updateUpgradesButtonAppearance();
    }, 1000);
}

// Update the Ship Upgrades button appearance based on available resources
function updateUpgradesButtonAppearance() {
    const button = document.getElementById('upgrades-toggle');
    if (!button) return;
    
    import('./game-state.js').then(module => {
        const gameState = module.default;
        
        // Check if player has enough resources for any upgrade
        let hasResources = false;
        const upgradeTypes = ['engine', 'shield', 'tractorBeam', 'bombCapacity', 'boost'];
        
        for (const type of upgradeTypes) {
            if (gameState.canUpgrade(type)) {
                hasResources = true;
                break;
            }
        }
        
        // Update button appearance based on resource availability
        if (hasResources) {
            // Create a pulsing effect to draw attention
            const time = Date.now() / 1000;
            const pulse = Math.sin(time * 3) * 0.5 + 0.5; // 0 to 1 value
            const glowIntensity = 5 + (pulse * 10);
            
            button.style.boxShadow = `0 0 ${glowIntensity}px rgba(0, 255, 255, 0.7)`;
            button.style.border = '2px solid #0ff';
            button.style.color = '#0ff';
            button.textContent = 'SHIP UPGRADES AVAILABLE!';
        } else {
            // Reset appearance
            button.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
            button.style.border = '2px solid #0ff';
            button.style.color = '#0ff';
            button.textContent = 'SHIP UPGRADES';
        }
    });
}

// Toggle chat visibility
function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    const toggleButton = document.getElementById('chat-toggle');
    
    if (chatContainer) {
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'flex';
            if (toggleButton) toggleButton.textContent = 'CLOSE CHAT';
        } else {
            chatContainer.style.display = 'none';
            if (toggleButton) toggleButton.textContent = 'OPEN CHAT';
        }
    }
}

// Create chat toggle button
export function createChatToggle() {
    // Check if it already exists
    if (document.getElementById('chat-toggle')) return;
    
    const button = document.createElement('button');
    button.id = 'chat-toggle';
    button.textContent = 'OPEN CHAT';
    button.style.position = 'absolute';
    button.style.bottom = '230px';
    button.style.right = '20px';
    button.style.padding = '5px 10px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    button.style.color = '#0ff';
    button.style.border = '1px solid #0ff';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
    button.style.zIndex = '100';
    
    button.addEventListener('click', toggleChat);
    
    document.getElementById('ui-container').appendChild(button);
}

// Update bomb size indicator
export function updateBombSizeIndicator(visible = false, size = 1) {
    const indicator = document.getElementById('bomb-size-indicator');
    const sizeElement = document.getElementById('current-bomb-size');
    
    if (!indicator || !sizeElement) return;
    
    // Update size
    sizeElement.textContent = size;
    
    // Show/hide indicator
    indicator.style.display = visible ? 'block' : 'none';
}

// Create and return ship upgrades UI component
export function createUpgradesUI() {
    // Check if it already exists
    let upgradesPanel = document.getElementById('upgrades-panel');
    
    if (!upgradesPanel) {
        upgradesPanel = document.createElement('div');
        upgradesPanel.id = 'upgrades-panel';
        
        // Style the panel
        upgradesPanel.style.position = 'absolute';
        upgradesPanel.style.top = '50%';
        upgradesPanel.style.left = '50%';
        upgradesPanel.style.transform = 'translate(-50%, -50%)';
        upgradesPanel.style.width = '600px';
        upgradesPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        upgradesPanel.style.color = '#0ff';
        upgradesPanel.style.border = '2px solid #0ff';
        upgradesPanel.style.borderRadius = '10px';
        upgradesPanel.style.padding = '20px';
        upgradesPanel.style.display = 'none';
        upgradesPanel.style.zIndex = '1000';
        upgradesPanel.style.pointerEvents = 'auto';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'SHIP UPGRADES';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        upgradesPanel.appendChild(title);
        
        // Add resources display
        const resourcesDisplay = document.createElement('div');
        resourcesDisplay.id = 'upgrades-resources';
        resourcesDisplay.style.textAlign = 'center';
        resourcesDisplay.style.fontSize = '18px';
        resourcesDisplay.style.marginBottom = '20px';
        resourcesDisplay.style.padding = '10px';
        resourcesDisplay.style.border = '1px solid #0ff';
        resourcesDisplay.style.borderRadius = '5px';
        upgradesPanel.appendChild(resourcesDisplay);
        
        // Create upgrade options container
        const upgradesContainer = document.createElement('div');
        upgradesContainer.id = 'upgrades-container';
        upgradesContainer.style.display = 'grid';
        upgradesContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        upgradesContainer.style.gap = '15px';
        
        // Define the upgrades to create
        const upgradeTypes = [
            {
                id: 'engine',
                name: 'ENGINE',
                description: 'Increases max ship speed by 20% per level',
                icon: '🚀'
            },
            {
                id: 'shield',
                name: 'SHIELDS',
                description: 'Increases shield capacity by 25% per level',
                icon: '🛡️'
            },
            {
                id: 'tractorBeam',
                name: 'TRACTOR BEAM',
                description: 'Extends range by 30% and increases pull strength by 25% per level',
                icon: '🔌'
            },
            {
                id: 'bombCapacity',
                name: 'BOMB CAPACITY',
                description: 'Adds +1 bomb to capacity per level',
                icon: '💣'
            },
            {
                id: 'boost',
                name: 'BOOST SYSTEM',
                description: 'Increases boost capacity by 30% and recharge rate by 20% per level',
                icon: '⚡'
            }
        ];
        
        // Create each upgrade option
        upgradeTypes.forEach(upgrade => {
            const upgradeCard = createUpgradeCard(upgrade);
            upgradesContainer.appendChild(upgradeCard);
        });
        
        upgradesPanel.appendChild(upgradesContainer);
        
        // Add close button
        const closeButtonContainer = document.createElement('div');
        closeButtonContainer.style.textAlign = 'center';
        closeButtonContainer.style.marginTop = '20px';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'CLOSE';
        closeButton.style.padding = '10px 20px';
        closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        closeButton.style.color = '#0ff';
        closeButton.style.border = '1px solid #0ff';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '16px';
        
        closeButton.addEventListener('click', () => {
            import('./game-state.js').then(module => {
                const gameState = module.default;
                gameState.toggleUpgradeUI();
                updateUpgradesUI();
            });
        });
        
        closeButtonContainer.appendChild(closeButton);
        upgradesPanel.appendChild(closeButtonContainer);
        
        // Add to UI container
        document.getElementById('ui-container').appendChild(upgradesPanel);
    }
    
    return upgradesPanel;
}

// Create an upgrade card for a specific upgrade type
function createUpgradeCard(upgrade) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.dataset.upgradeType = upgrade.id;
    
    // Style the card
    card.style.backgroundColor = 'rgba(0, 50, 80, 0.5)';
    card.style.borderRadius = '8px';
    card.style.padding = '15px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '10px';
    card.style.border = '1px solid #0ff';
    
    // Header with icon and name
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    
    const nameElement = document.createElement('h3');
    nameElement.style.margin = '0';
    nameElement.style.color = '#0ff';
    nameElement.style.fontSize = '18px';
    nameElement.textContent = upgrade.name;
    
    const iconElement = document.createElement('div');
    iconElement.style.fontSize = '24px';
    iconElement.textContent = upgrade.icon;
    
    header.appendChild(nameElement);
    header.appendChild(iconElement);
    
    // Description
    const description = document.createElement('div');
    description.style.fontSize = '14px';
    description.style.color = '#adf';
    description.style.marginBottom = '5px';
    description.textContent = upgrade.description;
    
    // Level indicator
    const levelContainer = document.createElement('div');
    levelContainer.style.display = 'flex';
    levelContainer.style.alignItems = 'center';
    levelContainer.style.gap = '10px';
    
    const levelLabel = document.createElement('span');
    levelLabel.textContent = 'LEVEL:';
    levelLabel.style.fontSize = '14px';
    
    const levelValue = document.createElement('span');
    levelValue.className = 'upgrade-level';
    levelValue.style.fontWeight = 'bold';
    levelValue.style.fontSize = '16px';
    
    const levelMax = document.createElement('span');
    levelMax.className = 'upgrade-max-level';
    levelMax.style.fontSize = '14px';
    levelMax.style.opacity = '0.7';
    
    levelContainer.appendChild(levelLabel);
    levelContainer.appendChild(levelValue);
    levelContainer.appendChild(levelMax);
    
    // Cost
    const costContainer = document.createElement('div');
    costContainer.style.marginTop = '5px';
    costContainer.style.fontSize = '14px';
    
    const costLabel = document.createElement('span');
    costLabel.textContent = 'COST: ';
    
    const costValue = document.createElement('span');
    costValue.className = 'upgrade-cost';
    costValue.style.fontWeight = 'bold';
    costValue.style.color = '#ff0';
    
    costContainer.appendChild(costLabel);
    costContainer.appendChild(costValue);
    
    // Upgrade button
    const upgradeButton = document.createElement('button');
    upgradeButton.className = 'upgrade-button';
    upgradeButton.textContent = 'UPGRADE';
    upgradeButton.style.marginTop = '10px';
    upgradeButton.style.padding = '8px';
    upgradeButton.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
    upgradeButton.style.color = '#0ff';
    upgradeButton.style.border = '1px solid #0ff';
    upgradeButton.style.borderRadius = '5px';
    upgradeButton.style.cursor = 'pointer';
    
    upgradeButton.addEventListener('click', function() {
        const upgradeType = this.parentElement.dataset.upgradeType;
        
        import('./game-state.js').then(module => {
            const gameState = module.default;
            const success = gameState.applyUpgrade(upgradeType);
            
            if (success) {
                // Show success message
                showMessage(`${upgrade.name} UPGRADED TO LEVEL ${gameState.upgrades[`${upgradeType}Level`]}`, 2000);
                
                // Update UI
                updateUpgradesUI();
            } else {
                // Show failure message
                showMessage('NOT ENOUGH RESOURCES FOR UPGRADE', 2000);
            }
        });
    });
    
    // Assemble the card
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(levelContainer);
    card.appendChild(costContainer);
    card.appendChild(upgradeButton);
    
    return card;
}