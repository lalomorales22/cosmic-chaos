/**
 * Player Module
 * Handles player ship, alien character, and related functionality
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import gameState from './game-state.js';
import Config from '../config.js';
import { showMessage, createExplosionFlash, updateBombSizeIndicator } from './ui.js';
import { sendAlienModeUpdate, sendBombPlacement } from './network.js';

/**
 * Creates the player's spaceship
 * @param {THREE.Scene} scene - The scene to add the ship to
 * @returns {THREE.Group} The player ship group
 */
export function createPlayerShip(scene) {
    // Ship group
    const shipGroup = new THREE.Group();
    
    // UFO body
    const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
    bodyGeometry.scale(1, 0.4, 1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888899,
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
    
    // Bottom ring
    const ringGeometry = new THREE.TorusGeometry(0.8, 0.1, 16, 32);
    const ringMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        specular: 0x666666,
        shininess: 30
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = -0.15;
    ring.rotation.x = Math.PI / 2;
    shipGroup.add(ring);
    
    // Engine lights
    const engineLightGeometry = new THREE.CircleGeometry(0.1, 16);
    const engineLightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const engineLight = new THREE.Mesh(engineLightGeometry, engineLightMaterial);
        engineLight.position.set(
            Math.cos(angle) * 0.8,
            -0.25,
            Math.sin(angle) * 0.8
        );
        engineLight.rotation.x = -Math.PI / 2;
        shipGroup.add(engineLight);
    }
    
    // Add the ship light
    const shipLight = new THREE.PointLight(0x7777ff, 0.5, 50);
    shipLight.position.set(0, 0, 0);
    shipGroup.add(shipLight);
    gameState.shipLight = shipLight;
    
    // Set initial position
    shipGroup.position.set(0, 100, 0);
    
    // Initialize ship orientation tracking for consistent controls
    gameState.shipOrientation = {
        yaw: 0,
        pitch: 0
    };
    
    // Add ship to scene
    scene.add(shipGroup);
    gameState.playerShip = shipGroup;
    
    // Set initial camera position relative to ship
    gameState.camera.position.set(0, 3, 10);
    shipGroup.add(gameState.camera);
    
    return shipGroup;
}

/**
 * Toggle between ship and alien modes
 */
export function toggleAlienMode() {
    if (!gameState.landedOnPlanet) return;
    
    gameState.isAlienMode = !gameState.isAlienMode;
    
    // Send alien mode update to server if multiplayer is enabled
    if (gameState.multiplayer && gameState.multiplayer.enabled) {
        import('./network.js').then(module => {
            module.sendAlienModeUpdate(
                gameState.isAlienMode, 
                gameState.landedOnPlanet ? gameState.landedOnPlanet.id : null
            );
        });
    }
    
    if (gameState.isAlienMode) {
        // Exit as alien
        gameState.alienModel.visible = true;
        
        // Position alien near the ship
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        // Setup the flat scene if not already set up
        if (!gameState.flatScene.getObjectByName('flatGround')) {
            // Create flat ground for alien to walk on
            const groundSize = 500; // Larger flat area
            const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 32, 32);
            
            // Use the actual planet's color for the ground
            const planetMesh = gameState.landedOnPlanet.mesh;
            const planetColor = planetMesh.material.color.clone();
            
            const groundMaterial = new THREE.MeshLambertMaterial({
                color: planetColor,
                side: THREE.DoubleSide
            });
            
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.name = 'flatGround';
            ground.rotation.x = -Math.PI / 2; // Make it flat (horizontal)
            ground.position.y = 0; // At zero level
            
            // Add ground to flat scene
            gameState.flatScene.add(ground);
            
            // Add a directional light to flat scene
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 100, 0);
            gameState.flatScene.add(directionalLight);
            
            // Add ambient light to flat scene
            const ambientLight = new THREE.AmbientLight(0x404040);
            gameState.flatScene.add(ambientLight);
            
            // Add a ship model to the flat scene as a reference point
            const shipReference = gameState.playerShip.clone();
            shipReference.name = 'shipReference';
            shipReference.position.set(0, 0, 0);
            shipReference.rotation.set(0, 0, 0);
            gameState.flatScene.add(shipReference);
        }
        
        // Reset alien position to be in front of the ship reference in flat scene
        gameState.alienModel.position.set(0, 0, 10); // In front of ship
        gameState.alienModel.rotation.set(0, Math.PI, 0); // Facing ship
        gameState.alienModel.scale.set(1, 1, 1);
        
        // Remove alien from main scene and add to flat scene
        gameState.mainScene.remove(gameState.alienModel);
        gameState.flatScene.add(gameState.alienModel);
        
        // Setup camera for alien mode - third person view
        // Remove camera from ship
        gameState.playerShip.remove(gameState.camera);
        
        // Create a camera target if it doesn't exist
        if (!gameState.cameraTarget) {
            gameState.cameraTarget = new THREE.Object3D();
        }
        
        // Remove camera target from main scene and add to flat scene
        if (gameState.cameraTarget.parent) {
            gameState.cameraTarget.parent.remove(gameState.cameraTarget);
        }
        gameState.flatScene.add(gameState.cameraTarget);
        
        // Position camera target at alien's head level
        gameState.cameraTarget.position.copy(gameState.alienModel.position);
        gameState.cameraTarget.position.y += 0.6; // Eye level
        
        // Add the camera to the flat scene
        if (gameState.camera.parent) {
            gameState.camera.parent.remove(gameState.camera);
        }
        gameState.flatScene.add(gameState.camera);
        
        // Initialize starting camera position for animation
        // Put camera behind alien (third person view)
        gameState.camera.position.set(
            gameState.alienModel.position.x,
            gameState.alienModel.position.y + 1.5,
            gameState.alienModel.position.z + 5
        );
        gameState.camera.lookAt(gameState.alienModel.position);
        
        // Reset mouse look state
        gameState.alienMouseLook = {
            x: 0,
            y: 0
        };
        
        // Switch to flat scene
        gameState.currentScene = gameState.flatScene;
        
        // Show instruction message
        showMessage("ALIEN MODE: WASD TO MOVE, MOUSE TO LOOK, B TO CYCLE BOMB SIZE, P TO PLACE BOMB, E TO RETURN", 4000);
        
    } else {
        // Return to ship
        // Remove alien from flat scene and add back to main scene
        gameState.flatScene.remove(gameState.alienModel);
        gameState.mainScene.add(gameState.alienModel);
        gameState.alienModel.visible = false;
        
        // Move camera back to ship
        if (gameState.camera.parent) {
            gameState.camera.parent.remove(gameState.camera);
        }
        gameState.playerShip.add(gameState.camera);
        gameState.camera.position.set(0, 3, 10);
        gameState.camera.rotation.set(0, 0, 0);
        
        // Preserve current ship orientation for consistent controls after returning
        // Extract current rotation into our tracking variables
        const currentRotation = new THREE.Euler().setFromQuaternion(gameState.playerShip.quaternion, 'YXZ');
        gameState.shipOrientation.yaw = currentRotation.y;
        gameState.shipOrientation.pitch = currentRotation.x;
        
        // Switch back to main scene
        gameState.currentScene = gameState.mainScene;
        
        // Show return message
        showMessage("RETURNING TO SHIP CONTROLS", 2000);
    }
}

/**
 * Check if the alien is near the ship (used for returning to ship)
 * @returns {boolean} True if alien is close enough to ship
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
        // In main scene, use the original implementation
        const alienPosition = new THREE.Vector3();
        gameState.alienModel.getWorldPosition(alienPosition);
        
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        return alienPosition.distanceTo(shipPosition) < 3;
    }
}

/**
 * Attempt to land on a nearby planet
 */
export function attemptLanding() {
    if (gameState.isAlienMode || !gameState.nearestPlanet) return;
    
    // Check if we're close enough to land
    const landingDistance = gameState.nearestPlanet.size * 2;
    if (gameState.nearestPlanetDistance <= landingDistance) {
        // Check if the player is moving slow enough to land
        if (gameState.currentVelocity && gameState.currentVelocity.length() > 1.0) {
            // Too fast to land
            showMessage("SLOW DOWN TO LAND", 2000);
            return;
        }
        
        // Landing logic is implemented in ship-controls.js
        import('./ship-controls.js').then(module => {
            module.attemptLanding();
        });
    } else {
        showMessage("TOO FAR TO LAND", 2000);
    }
}

/**
 * Take off from a planet
 */
export function takeOff() {
    if (!gameState.landedOnPlanet) return;
    
    // If in alien mode, return to ship first
    if (gameState.isAlienMode) {
        toggleAlienMode();
        setTimeout(() => {
            gameState.landedOnPlanet = null;
            showMessage("LAUNCHING", 2000);
        }, 500);
    } else {
        gameState.landedOnPlanet = null;
        showMessage("LAUNCHING", 2000);
        
        // Apply a small upward velocity
        if (gameState.currentVelocity) {
            const upVector = new THREE.Vector3(0, 1, 0);
            upVector.applyQuaternion(gameState.playerShip.quaternion);
            gameState.currentVelocity.copy(upVector.multiplyScalar(1));
        }
    }
}

/**
 * Place a bomb at the current alien position
 */
export function placeBomb() {
    if (!gameState.isAlienMode || !gameState.landedOnPlanet) {
        showMessage("MUST BE IN ALIEN MODE TO PLACE BOMBS", 2000);
        return null;
    }
    
    // Implemented in alien-controls.js
    import('./alien-controls.js').then(module => {
        module.placeBomb();
    });
}

/**
 * Create a bomb at the specified position
 * @param {THREE.Vector3} position - Position for the bomb
 * @param {number} bombScale - Size of the bomb (1-3)
 * @returns {Object} The created bomb object
 */
export function createBomb(position, bombScale = 1) {
    try {
        const bombGroup = new THREE.Group();
        bombGroup.position.copy(position);
        
        // Add small offset to prevent clipping with the ground
        bombGroup.position.y += 0.5;
        
        // Bomb body
        const bombGeometry = new THREE.SphereGeometry(0.5 * bombScale, 16, 16);
        const bombMaterial = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const bomb = new THREE.Mesh(bombGeometry, bombMaterial);
        bombGroup.add(bomb);
        
        // Add details to make it look more like a bomb
        // Add top fuse
        const fuseGeometry = new THREE.CylinderGeometry(0.05 * bombScale, 0.05 * bombScale, 0.5 * bombScale, 8);
        const fuseMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const fuse = new THREE.Mesh(fuseGeometry, fuseMaterial);
        fuse.position.y = 0.5 * bombScale;
        bombGroup.add(fuse);
        
        // Blinking light at top of fuse
        const lightGeometry = new THREE.SphereGeometry(0.1 * bombScale, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.y = 0.75 * bombScale;
        bombGroup.add(light);
        
        // Point light
        const pointLight = new THREE.PointLight(0xff0000, 1, 10 * bombScale);
        bombGroup.add(pointLight);
        
        gameState.mainScene.add(bombGroup);
        
        const newBomb = {
            group: bombGroup,
            mesh: bomb,
            light: light,
            countdown: 10, // 10 seconds
            isActive: true,
            targetPlanet: gameState.landedOnPlanet,
            size: bombScale // Store bomb size for explosion
        };
        
        gameState.bombs.push(newBomb);
        
        return newBomb;
    } catch (error) {
        console.error("Error creating bomb:", error);
        return null;
    }
}
