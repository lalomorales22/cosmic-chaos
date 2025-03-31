/**
 * Wormhole Module
 * Handles creation and interaction with wormholes for interstellar travel
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import gameState from './game-state.js';
import { showMessage } from './ui.js';
import Config from '../config.js';

/**
 * Creates a wormhole at the specified position
 * @param {THREE.Vector3} position - Position for the wormhole
 * @param {number} [size=20] - Size of the wormhole
 * @param {Object} [destination=null] - Destination information for teleportation
 * @returns {Object} The created wormhole object
 */
export function createWormhole(position, size = 20, destination = null) {
    // Create base group for the wormhole
    const wormholeGroup = new THREE.Group();
    wormholeGroup.position.copy(position);
    
    // Create rings
    const ringsCount = 8;
    const rings = [];
    
    for (let i = 0; i < ringsCount; i++) {
        const ringGeometry = new THREE.TorusGeometry(
            size * (1 - i * 0.1), // Gradually smaller rings
            size * 0.05, // Thickness
            16, // Tube segments
            32  // Radial segments
        );
        
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.2 + i * 0.1, 0, 0.5 + i * 0.05), // Purple gradient
            transparent: true,
            opacity: 0.7 - i * 0.05, // Fade inner rings
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // Orient horizontally
        wormholeGroup.add(ring);
        rings.push(ring);
    }
    
    // Center distortion sphere
    const coreGeometry = new THREE.SphereGeometry(size * 0.3, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    wormholeGroup.add(core);
    
    // Create particles for visual effect
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        transparent: true,
        opacity: 0.7
    });
    
    const particlePositions = [];
    const particleCount = 1000;
    
    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * size;
        const angle = Math.random() * Math.PI * 2;
        
        particlePositions.push(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * size * 0.5,
            Math.sin(angle) * radius
        );
    }
    
    particlesGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(particlePositions, 3)
    );
    
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    wormholeGroup.add(particles);
    
    // Add point light
    const wormholeLight = new THREE.PointLight(0x8800ff, 1, size * 10);
    wormholeGroup.add(wormholeLight);
    
    // Add to scene
    gameState.mainScene.add(wormholeGroup);
    
    // Set destination if none provided
    if (!destination) {
        destination = getWormholeDestination();
    }
    
    // Create wormhole object
    const wormhole = {
        group: wormholeGroup,
        rings: rings,
        core: core,
        particles: particles,
        light: wormholeLight,
        size: size,
        rotationSpeed: 0.01 + Math.random() * 0.02,
        destination: destination
    };
    
    // Add to game state
    gameState.wormholes.push(wormhole);
    
    console.log("Created wormhole at", position, "with destination", destination);
    
    return wormhole;
}

/**
 * Generate a random destination for the wormhole
 * @returns {Object} Destination object with position and sector info
 */
function getWormholeDestination() {
    // First, get all sector keys
    const sectorKeys = Object.keys(gameState.planetsManager.sectors);
    
    // Remove the current player sector to avoid local wormholes
    const filteredSectors = sectorKeys.filter(key => {
        const sector = gameState.planetsManager.sectors[key];
        return sector.name !== gameState.playerSector;
    });
    
    // Prefer unexplored sectors for discovery (75% chance)
    const unexploredSectors = filteredSectors.filter(key => 
        !gameState.planetsManager.sectors[key].explored
    );
    
    let targetSectorKey;
    
    if (unexploredSectors.length > 0 && Math.random() < 0.75) {
        // Choose an unexplored sector
        targetSectorKey = unexploredSectors[Math.floor(Math.random() * unexploredSectors.length)];
    } else {
        // Choose any non-current sector
        targetSectorKey = filteredSectors[Math.floor(Math.random() * filteredSectors.length)];
    }
    
    // Get the sector information
    const targetSector = gameState.planetsManager.sectors[targetSectorKey];
    
    // Calculate a random position within the target sector
    const position = new THREE.Vector3(
        targetSector.center.x + (Math.random() - 0.5) * targetSector.size * 0.5,
        targetSector.center.y + (Math.random() - 0.5) * targetSector.size * 0.5,
        targetSector.center.z + (Math.random() - 0.5) * targetSector.size * 0.5
    );
    
    return {
        position: position,
        sectorKey: targetSectorKey,
        sectorName: targetSector.name
    };
}

/**
 * Update all wormholes (animations, etc.)
 * @param {number} delta - Time since last update
 */
export function updateWormholes(delta) {
    // Update each wormhole
    gameState.wormholes.forEach(wormhole => {
        // Rotate the rings in alternating directions
        wormhole.rings.forEach((ring, index) => {
            ring.rotation.z += wormhole.rotationSpeed * (index % 2 === 0 ? 1 : -1);
        });
        
        // Pulse the core
        const time = Date.now() * 0.001;
        const scale = 0.8 + Math.sin(time * 2) * 0.2;
        wormhole.core.scale.set(scale, scale, scale);
        
        // Rotate the particles
        wormhole.particles.rotation.z += wormhole.rotationSpeed * 0.5;
    });
}

/**
 * Check if player is close enough to enter any wormhole
 */
export function checkWormholeProximity() {
    // Only check if not in alien mode
    if (gameState.isAlienMode) return;
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Check each wormhole
    for (let i = 0; i < gameState.wormholes.length; i++) {
        const wormhole = gameState.wormholes[i];
        
        const wormholePosition = new THREE.Vector3();
        wormhole.group.getWorldPosition(wormholePosition);
        
        const distance = playerPosition.distanceTo(wormholePosition);
        
        // Display message when near
        if (distance < wormhole.size * 5) {
            showMessage("WORMHOLE DETECTED: APPROACH TO TRAVEL", 1000);
        }
        
        // If player is inside wormhole, teleport
        if (distance < wormhole.size * 1.5) {
            // Get destination
            const destination = wormhole.destination;
            
            // Create teleport effect
            document.getElementById('explosion-flash').style.backgroundColor = 'rgba(170, 0, 255, 0.5)';
            
            // Show message
            showMessage(`ENTERING WORMHOLE TO ${destination.sectorName}`, 3000);
            
            // Teleport player to destination after delay
            setTimeout(() => {
                // Reset flash
                document.getElementById('explosion-flash').style.backgroundColor = 'rgba(255, 100, 0, 0)';
                
                // Teleport player
                gameState.playerShip.position.copy(destination.position);
                
                // Show arrival message
                showMessage(`ARRIVED IN SECTOR ${destination.sectorName}`, 3000);
                
                // Create return wormhole at destination
                const currentPosition = wormholePosition.clone();
                
                // Create return wormhole slightly offset from arrival position
                const returnPosition = destination.position.clone();
                returnPosition.x += 100 + Math.random() * 100;
                returnPosition.z += 100 + Math.random() * 100;
                
                // Create the return wormhole
                createWormhole(returnPosition, wormhole.size, {
                    position: currentPosition,
                    sectorName: gameState.playerSector,
                    sectorKey: gameState.playerSector
                });
            }, 1000);
            
            // Update player sector - only if sectorKey exists in planetsManager
            if (gameState.planetsManager.sectors[destination.sectorKey]) {
                gameState.playerSector = destination.sectorKey;
            }
            
            // Only handle one wormhole at a time
            break;
        }
    }
} 