/**
 * Ship Controls Module
 * Handles player spaceship movement and controls
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import gameState from './game-state.js';
import { showMessage } from './ui.js';
import Config from '../config.js';

/**
 * Updates ship controls based on player input
 * @param {number} delta - Time elapsed since last frame
 * @param {Object} inputState - Current input state
 */
export function updateShipControls(delta, inputState) {
    if (gameState.isAlienMode || gameState.isLoading) return;
    
    // Calculate movement speed with improved acceleration and deceleration
    const maxSpeed = gameState.maxSpeed;
    const acceleration = 0.8 * delta; // Slightly reduced for more control
    const deceleration = 1.5 * delta; // Increased for faster stopping
    
    // Apply boost if active and has fuel
    const canBoost = gameState.boostFuel > 0 && inputState.boost;
    gameState.isBoostActive = canBoost;
    const speedMultiplier = gameState.isBoostActive ? gameState.boostMultiplier : 1;
    
    // Update boost mechanics
    updateBoostMechanics(delta, inputState.boost);
    
    // Create movement vectors for all directions
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(gameState.playerShip.quaternion);
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(gameState.playerShip.quaternion);
    const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(gameState.playerShip.quaternion);
    
    // Store current velocity vector if not yet initialized
    if (!gameState.currentVelocity) {
        gameState.currentVelocity = new THREE.Vector3(0, 0, 0);
    }
    
    // Calculate desired movement direction from input
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (inputState.moveForward) moveDirection.add(forwardVector);
    if (inputState.moveBackward) moveDirection.sub(forwardVector);
    if (inputState.moveRight) moveDirection.add(rightVector);
    if (inputState.moveLeft) moveDirection.sub(rightVector);
    if (inputState.moveUp) moveDirection.add(upVector);
    
    // Flag to determine if there's any directional input
    const hasInput = moveDirection.length() > 0;
    
    if (hasInput) {
        // Normalize direction
        moveDirection.normalize();
        
        // Apply acceleration towards the desired direction
        const targetVelocity = moveDirection.clone().multiplyScalar(maxSpeed * speedMultiplier);
        
        // Smoothly interpolate current velocity towards target velocity
        gameState.currentVelocity.lerp(targetVelocity, acceleration);
        
        // Speed HUD shows magnitude of current velocity
        gameState.speed = gameState.currentVelocity.length();
    } else {
        // No input - gradually decelerate to zero
        if (gameState.currentVelocity.length() > 0) {
            // Apply deceleration towards zero velocity
            if (gameState.currentVelocity.length() < deceleration) {
                // If very slow, just stop completely
                gameState.currentVelocity.set(0, 0, 0);
            } else {
                // Apply deceleration in the opposite direction of movement
                const decelerationVector = gameState.currentVelocity.clone().normalize().multiplyScalar(-deceleration);
                gameState.currentVelocity.add(decelerationVector);
            }
            
            // Update speed display
            gameState.speed = gameState.currentVelocity.length();
        }
    }
    
    // Apply the current velocity to the ship position
    gameState.playerShip.position.add(gameState.currentVelocity);
    
    // Use a better camera control system that prevents gimbal lock
    // and ensures consistent up/down control
    
    // Track yaw and pitch separately rather than directly manipulating rotation
    if (!gameState.shipOrientation) {
        gameState.shipOrientation = {
            yaw: 0,
            pitch: 0
        };
    }
    
    // Only update if we have mouse input
    if (typeof inputState.mouseX !== 'undefined' && typeof inputState.mouseY !== 'undefined') {
        // Update orientation based on mouse movement
        const lookSpeed = 0.07;
        gameState.shipOrientation.yaw -= inputState.mouseX * lookSpeed;
        gameState.shipOrientation.pitch += inputState.mouseY * lookSpeed;
        
        // Clamp pitch to prevent flipping
        const pitchLimit = Math.PI / 2.5;
        gameState.shipOrientation.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, gameState.shipOrientation.pitch));
        
        // Apply rotations in the correct order using quaternions to avoid gimbal lock
        // Reset rotation first
        gameState.playerShip.rotation.set(0, 0, 0);
        gameState.playerShip.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
        
        // Apply yaw (rotation around Y axis)
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.shipOrientation.yaw);
        gameState.playerShip.quaternion.multiply(yawQuat);
        
        // Apply pitch (rotation around X axis)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), gameState.shipOrientation.pitch);
        gameState.playerShip.quaternion.multiply(pitchQuat);
        
        // Add roll effect while turning (bank into turns)
        if (Math.abs(inputState.mouseX) > 0.05) {
            // Calculate roll based on turning rate and direction
            const targetRoll = -inputState.mouseX * 0.5; // Max roll of 0.5 radians
            
            // Apply roll (rotation around Z axis)
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetRoll);
            gameState.playerShip.quaternion.multiply(rollQuat);
        }
    }
}

/**
 * Update boost mechanics for the ship
 * @param {number} delta - Time elapsed since last frame
 * @param {boolean} boostActive - Whether boost is active
 */
function updateBoostMechanics(delta, boostActive) {
    // Update boost fuel
    if (gameState.isBoostActive && gameState.boostFuel > 0) {
        // Drain fuel while boosting
        gameState.boostFuel = Math.max(0, gameState.boostFuel - gameState.boostDrainRate * delta);
        
        // Create boost particles if not in alien mode
        if (!gameState.isAlienMode && gameState.boostFuel > 0 && Math.random() > 0.5) {
            createBoostParticle();
        }
    } else if (!gameState.isBoostActive && gameState.boostFuel < gameState.maxBoostFuel) {
        // Recharge fuel when not boosting
        gameState.boostFuel = Math.min(
            gameState.maxBoostFuel, 
            gameState.boostFuel + gameState.boostRechargeRate * delta
        );
    }
}

/**
 * Create a particle for boost visual effect
 */
function createBoostParticle() {
    // Skip if no scene or player ship
    if (!gameState.mainScene || !gameState.playerShip) return;
    
    // Create a particle behind the ship for boost effect
    const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.5, 0.8, 1),
        transparent: true,
        opacity: 0.7
    });
    
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // Position behind the ship
    const shipPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(shipPosition);
    
    const shipDirection = new THREE.Vector3(0, 0, 1); // Backward
    shipDirection.applyQuaternion(gameState.playerShip.quaternion);
    shipDirection.multiplyScalar(2 + Math.random() * 0.5);
    
    particle.position.copy(shipPosition).add(shipDirection);
    
    // Add slight randomness to position
    particle.position.x += (Math.random() - 0.5) * 0.5;
    particle.position.y += (Math.random() - 0.5) * 0.5;
    particle.position.z += (Math.random() - 0.5) * 0.5;
    
    // Set velocity
    const velocity = shipDirection.clone().multiplyScalar(0.5);
    
    gameState.mainScene.add(particle);
    
    gameState.boostEffects.push({
        mesh: particle,
        velocity: velocity,
        life: 1 + Math.random() * 0.5 // 1-1.5 seconds
    });
}

/**
 * Updates boost effect particles
 * @param {number} delta - Time elapsed since last frame
 */
export function updateBoostEffect(delta) {
    if (!gameState.mainScene) return;
    
    // Update boost particles
    for (let i = gameState.boostEffects.length - 1; i >= 0; i--) {
        const effect = gameState.boostEffects[i];
        
        if (!effect || !effect.mesh) {
            gameState.boostEffects.splice(i, 1);
            continue;
        }
        
        // Update position
        effect.mesh.position.add(effect.velocity);
        
        // Update size
        effect.mesh.scale.multiplyScalar(0.95);
        
        // Update life
        effect.life -= delta;
        
        // Update opacity
        effect.mesh.material.opacity = effect.life / 1.5;
        
        // Remove if dead
        if (effect.life <= 0) {
            gameState.mainScene.remove(effect.mesh);
            gameState.boostEffects.splice(i, 1);
        }
    }
}

/**
 * Attempt to land the ship on a planet
 */
export function attemptLanding() {
    if (gameState.isAlienMode || !gameState.nearestPlanet || gameState.isLoading) return;
    
    // Check if we're close enough to land
    if (gameState.nearestPlanetDistance <= gameState.nearestPlanet.size * 2) {
        // Check if the player is moving slow enough to land
        if (gameState.currentVelocity && gameState.currentVelocity.length() > 1.0) {
            // Too fast to land
            showMessage("SLOW DOWN TO LAND", 2000);
            return;
        }
        
        // Store the initial ship state for animation
        const initialPosition = gameState.playerShip.position.clone();
        const initialRotation = gameState.playerShip.quaternion.clone();
        
        // Calculate landing position and orientation
        const planetPosition = new THREE.Vector3();
        gameState.nearestPlanet.group.getWorldPosition(planetPosition);
        
        // Vector from planet to ship (normalized)
        const landingDirection = new THREE.Vector3().subVectors(
            initialPosition,
            planetPosition
        ).normalize();
        
        // Calculate final landing position - slightly above planet surface
        const landingPosition = new THREE.Vector3().addVectors(
            planetPosition,
            landingDirection.multiplyScalar(gameState.nearestPlanet.size + 1)
        );
        
        // Calculate landing orientation to face the planet surface
        const landingUp = landingDirection.clone(); // Normal to surface is away from planet center
        const landingForward = new THREE.Vector3(0, 1, 0);
        landingForward.crossVectors(landingUp, new THREE.Vector3(1, 0, 0));
        const landingRight = new THREE.Vector3();
        landingRight.crossVectors(landingForward, landingUp);
        
        // Create a rotation matrix from these directions
        const rotMatrix = new THREE.Matrix4().makeBasis(
            landingRight,
            landingUp,
            landingForward
        );
        
        const landingRotation = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);
        
        // Animate landing
        let startTime = null;
        const duration = 2000; // in milliseconds
        
        // Stop any current velocity
        gameState.currentVelocity = new THREE.Vector3(0, 0, 0);
        gameState.speed = 0;
        
        // Display landing message
        showMessage("LANDING SEQUENCE INITIATED", 2000);
        
        // Animation function for smooth landing
        function animateLanding(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-in and ease-out
            const easeProgress = progress < 0.5 ? 
                  2 * progress * progress : 
                  -1 + (4 - 2 * progress) * progress;
            
            // Interpolate position
            gameState.playerShip.position.lerpVectors(
                initialPosition,
                landingPosition,
                easeProgress
            );
            
            // Interpolate rotation (slerp for quaternions)
            gameState.playerShip.quaternion.slerpQuaternions(
                initialRotation,
                landingRotation,
                easeProgress
            );
            
            if (progress < 1) {
                requestAnimationFrame(animateLanding);
            } else {
                // Set landed planet
                gameState.landedOnPlanet = gameState.nearestPlanet;
                
                // Show success message
                showMessage("LANDING SUCCESSFUL", 2000);
                
                // Automatically enter alien mode after landing with a slight delay
                setTimeout(() => {
                    // Function to toggle alien mode would be called here
                    // This is typically handled by a separate module
                    import('./player.js').then(module => {
                        module.toggleAlienMode();
                    });
                }, 500);
            }
        }
        
        requestAnimationFrame(animateLanding);
    } else {
        showMessage("TOO FAR TO LAND", 2000);
    }
}

/**
 * Take off from a planet
 */
export function takeOff() {
    if (!gameState.landedOnPlanet) return;
    
    // Reset landed planet
    gameState.landedOnPlanet = null;
    
    // Show message
    showMessage("LAUNCHING", 2000);
    
    // Apply a small upward velocity
    if (gameState.currentVelocity) {
        const upVector = new THREE.Vector3(0, 1, 0);
        upVector.applyQuaternion(gameState.playerShip.quaternion);
        gameState.currentVelocity.copy(upVector.multiplyScalar(1));
    }
} 