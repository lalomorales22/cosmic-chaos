/**
 * Alien Controls Module
 * Handles controls for the alien character when landed on planets
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import gameState from './game-state.js';
import { showMessage } from './ui.js';

/**
 * Updates alien controls based on player input
 * @param {number} delta - Time elapsed since last frame
 * @param {Object} inputState - Current input state
 */
export function updateAlienControls(delta, inputState) {
    if (!gameState.isAlienMode || gameState.isLoading) return;
    
    const moveSpeed = 10 * delta; // Movement speed
    
    // Third person camera control with mouse
    const mouseSensitivity = 0.002;
    
    // Update alien's viewing direction based on mouse input
    if (typeof inputState.mouseX !== 'undefined' && typeof inputState.mouseY !== 'undefined') {
        gameState.alienMouseLook.x -= inputState.mouseX * mouseSensitivity;
        gameState.alienMouseLook.y = Math.max(
            -Math.PI / 4, // Limit looking down
            Math.min(Math.PI / 6, gameState.alienMouseLook.y + inputState.mouseY * mouseSensitivity) // Limit looking up
        );
    }
    
    // Update camera target (attached to alien)
    if (gameState.cameraTarget) {
        gameState.cameraTarget.position.copy(gameState.alienModel.position);
        gameState.cameraTarget.position.y += 0.8; // Slightly above alien's head
        
        // Apply alien's rotation based on mouse look
        // Reset rotation first
        gameState.cameraTarget.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
        
        // Apply yaw (horizontal rotation)
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x);
        gameState.cameraTarget.quaternion.multiply(yawQuat);
        
        // Apply pitch (vertical rotation - for camera only, not alien movement)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), gameState.alienMouseLook.y);
        gameState.cameraTarget.quaternion.multiply(pitchQuat);
        
        // Calculate camera position - third person view behind alien
        // Get the backward direction from alien's target
        const backward = new THREE.Vector3(0, 0, 1);
        backward.applyQuaternion(gameState.cameraTarget.quaternion);
        
        // Position camera behind alien (third person view) and offset vertically
        const cameraPos = new THREE.Vector3().addVectors(
            gameState.cameraTarget.position,
            new THREE.Vector3(
                backward.x * 3, // 3 units behind
                backward.y * 1.5 + 1, // Offset up + pitch component
                backward.z * 3 // 3 units behind
            )
        );
        
        // Update camera position
        if (gameState.camera) {
            gameState.camera.position.copy(cameraPos);
            
            // Make camera look at target (alien's head)
            gameState.camera.lookAt(gameState.cameraTarget.position);
        }
    }
    
    // Get movement direction vectors relative to camera orientation (ignoring pitch)
    // Forward direction is opposite of camera/alien look direction but with y=0 (horizontal movement)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x));
    forward.y = 0; // Keep movement parallel to ground
    forward.normalize();
    
    // Right direction is perpendicular to forward
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x));
    right.y = 0; // Keep movement parallel to ground
    right.normalize();
    
    // Calculate movement direction from input
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (inputState.moveForward) moveDirection.add(forward);
    if (inputState.moveBackward) moveDirection.sub(forward);
    if (inputState.moveRight) moveDirection.add(right);
    if (inputState.moveLeft) moveDirection.sub(right);
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(moveSpeed);
        
        // Move alien
        gameState.alienModel.position.add(moveDirection);
        
        // Keep alien on flat ground (y=0) if in flat scene
        if (gameState.currentScene === gameState.flatScene) {
            gameState.alienModel.position.y = 0;
        }
        
        // Orient alien to face movement direction
        if (moveDirection.length() > 0.1) {
            // Create a quaternion that rotates from forward vector to movement direction
            const targetRotation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(moveDirection.x, 0, moveDirection.z).normalize()
            );
            
            // Apply rotation
            gameState.alienModel.quaternion.copy(targetRotation);
        }
    }
    
    // Check if near ship for return
    if (isNearShip()) {
        showMessage("PRESS E TO RETURN TO SHIP", 1000);
    }
}

/**
 * Check if the alien is near the spaceship to return
 * @returns {boolean} True if close enough to ship
 */
export function isNearShip() {
    if (!gameState.isAlienMode) return false;
    
    // Handle different scenes
    if (gameState.currentScene === gameState.flatScene) {
        // In flat scene, check distance to the ship reference
        const shipRef = gameState.flatScene.getObjectByName('shipReference');
        if (shipRef) {
            return gameState.alienModel.position.distanceTo(shipRef.position) < 5;
        }
        return false;
    } else {
        // In main scene, check distance directly
        const alienPosition = new THREE.Vector3();
        gameState.alienModel.getWorldPosition(alienPosition);
        
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        return alienPosition.distanceTo(shipPosition) < 3;
    }
}

/**
 * Place a bomb at the alien's current position
 * @returns {Object|null} The placed bomb or null if unsuccessful
 */
export function placeBomb() {
    try {
        // Prevent placing multiple bombs on same planet
        if (gameState.landedOnPlanet.hasBomb) {
            showMessage("BOMB ALREADY PLACED ON THIS PLANET", 2000);
            return null;
        }
        
        // Make sure we have bombs left
        if (gameState.bombsRemaining <= 0) {
            showMessage("NO BOMBS REMAINING", 2000);
            return null;
        }
        
        // Get alien position for bomb placement
        let bombPosition;
        let bomb = null;
        
        if (gameState.currentScene === gameState.flatScene) {
            // In flat scene, place bomb at alien's position
            bombPosition = gameState.alienModel.position.clone();
            
            // Add bomb to main scene at corresponding position relative to planet
            // Get the planet position
            const planetPosition = new THREE.Vector3();
            gameState.landedOnPlanet.group.getWorldPosition(planetPosition);
            
            // Calculate a position on the planet surface
            const surfaceNormal = new THREE.Vector3().subVectors(
                gameState.playerShip.position,
                planetPosition
            ).normalize();
            
            // Place bomb on planet surface near the ship
            const realBombPosition = new THREE.Vector3().addVectors(
                planetPosition,
                surfaceNormal.multiplyScalar(gameState.landedOnPlanet.size + 0.5)
            );
            
            // Create bomb in main scene
            import('./player.js').then(module => {
                bomb = module.createBomb(realBombPosition, gameState.bombSize);
                bomb.targetPlanet = gameState.landedOnPlanet;
            });
        } else {
            // In main scene, place bomb at alien's position
            bombPosition = new THREE.Vector3();
            gameState.alienModel.getWorldPosition(bombPosition);
            
            // Create bomb at alien's position
            import('./player.js').then(module => {
                bomb = module.createBomb(bombPosition, gameState.bombSize);
                bomb.targetPlanet = gameState.landedOnPlanet;
            });
        }
        
        // Send bomb placement to server if multiplayer is enabled
        if (gameState.multiplayer.enabled) {
            const alienPosition = new THREE.Vector3();
            gameState.alienModel.getWorldPosition(alienPosition);
            
            import('./network.js').then(module => {
                module.sendBombPlacement(
                    gameState.landedOnPlanet.id,
                    alienPosition,
                    gameState.bombSize
                );
            });
        }
        
        // Show feedback message
        showMessage(`BOMB PLACED - DETONATION IN 10 SECONDS`, 2000);
        
        // Mark planet as having a bomb
        gameState.landedOnPlanet.hasBomb = true;
        gameState.landedOnPlanet.bombCountdown = 10;
        
        // Update HUD bombs count
        gameState.bombsRemaining--;
        
        // Update UI
        gameState.updateUI();
        
        return bomb;
    } catch (error) {
        console.error("Error placing bomb:", error);
        // Reset state to prevent game from freezing
        if (gameState.landedOnPlanet) {
            gameState.landedOnPlanet.hasBomb = true;
            gameState.bombsRemaining = Math.max(0, gameState.bombsRemaining - 1);
            gameState.updateUI();
        }
        return null;
    }
}

/**
 * Cycle through bomb sizes (1-3)
 * Shows a message with the selected bomb size
 */
export function cycleBombSize() {
    if (!gameState.isAlienMode || !gameState.landedOnPlanet) return;
    
    if (gameState.landedOnPlanet.hasBomb) {
        showMessage("BOMB ALREADY PLACED ON THIS PLANET", 2000);
    } else if (gameState.bombsRemaining <= 0) {
        showMessage("NO BOMBS REMAINING", 2000);
    } else {
        // Cycle bomb size when pressing B without placing a bomb
        gameState.bombSize = (gameState.bombSize % 3) + 1;
        showMessage(`BOMB SIZE ${gameState.bombSize} SELECTED`, 1000);
    }
} 