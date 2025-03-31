/**
 * Portal Module
 * Manages portal creation and interaction logic
 */

import gameState from './game-state.js';
import Config from '../config.js';
import { showMessage } from './ui.js';

// Portal states for tracking
const portalState = {
    startPortal: null,
    exitPortal: null,
    startPortalBox: null,
    exitPortalBox: null,
    isFromPortal: false,
    destinationUrl: 'https://portal.pieter.com'
};

// Check if we came from a portal
export function checkIfFromPortal() {
    const urlParams = new URLSearchParams(window.location.search);
    portalState.isFromPortal = urlParams.has('portal');
    return portalState.isFromPortal;
}

// Create a start portal if we arrived from another portal
export function createStartPortal(scene) {
    if (!portalState.isFromPortal || !window.THREE) return null;

    // Create portal group to contain all portal elements
    const startPortalGroup = new THREE.Group();
    
    // Position near spawn point
    const SPAWN_POINT_X = 0;
    const SPAWN_POINT_Y = 100;
    const SPAWN_POINT_Z = 0;
    
    startPortalGroup.position.set(SPAWN_POINT_X, SPAWN_POINT_Y, SPAWN_POINT_Z);
    startPortalGroup.rotation.x = 0.35;
    startPortalGroup.rotation.y = 0;

    // Create portal effect
    const startPortalGeometry = new THREE.TorusGeometry(
        Config.portal.size, 
        2, 
        16, 
        100
    );
    const startPortalMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const startPortal = new THREE.Mesh(startPortalGeometry, startPortalMaterial);
    startPortalGroup.add(startPortal);
                    
    // Create portal inner surface
    const startPortalInnerGeometry = new THREE.CircleGeometry(Config.portal.size - 2, 32);
    const startPortalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const startPortalInner = new THREE.Mesh(startPortalInnerGeometry, startPortalInnerMaterial);
    startPortalGroup.add(startPortalInner);

    // Create particle system for portal effect
    const startPortalParticleCount = 1000;
    const startPortalParticles = new THREE.BufferGeometry();
    const startPortalPositions = new Float32Array(startPortalParticleCount * 3);
    const startPortalColors = new Float32Array(startPortalParticleCount * 3);

    for (let i = 0; i < startPortalParticleCount * 3; i += 3) {
        // Create particles in a ring around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = Config.portal.size + (Math.random() - 0.5) * 4;
        startPortalPositions[i] = Math.cos(angle) * radius;
        startPortalPositions[i + 1] = Math.sin(angle) * radius;
        startPortalPositions[i + 2] = (Math.random() - 0.5) * 4;

        // Red color with slight variation
        startPortalColors[i] = 0.8 + Math.random() * 0.2;
        startPortalColors[i + 1] = 0;
        startPortalColors[i + 2] = 0;
    }

    startPortalParticles.setAttribute('position', new THREE.BufferAttribute(startPortalPositions, 3));
    startPortalParticles.setAttribute('color', new THREE.BufferAttribute(startPortalColors, 3));

    const startPortalParticleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const startPortalParticleSystem = new THREE.Points(startPortalParticles, startPortalParticleMaterial);
    startPortalGroup.add(startPortalParticleSystem);

    // Add portal group to scene
    scene.add(startPortalGroup);

    // Create portal collision box
    portalState.startPortalBox = new THREE.Box3().setFromObject(startPortalGroup);
    
    // Store portal for animation updates
    portalState.startPortal = {
        group: startPortalGroup,
        particleSystem: startPortalParticleSystem,
        particles: startPortalParticles,
        inner: startPortalInner
    };
    
    return portalState.startPortal;
}

// Create an exit portal in the world
export function createExitPortal(scene, position = { x: -200, y: 200, z: -300 }) {
    if (!window.THREE) return null;
    
    // Create portal group to contain all portal elements
    const exitPortalGroup = new THREE.Group();
    exitPortalGroup.position.set(position.x, position.y, position.z);
    exitPortalGroup.rotation.x = 0.35;
    exitPortalGroup.rotation.y = 0;

    // Create portal effect
    const exitPortalGeometry = new THREE.TorusGeometry(
        Config.portal.size, 
        2, 
        16, 
        100
    );
    const exitPortalMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        transparent: true,
        opacity: 0.8
    });
    const exitPortal = new THREE.Mesh(exitPortalGeometry, exitPortalMaterial);
    exitPortalGroup.add(exitPortal);

    // Create portal inner surface
    const exitPortalInnerGeometry = new THREE.CircleGeometry(Config.portal.size - 2, 32);
    const exitPortalInnerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const exitPortalInner = new THREE.Mesh(exitPortalInnerGeometry, exitPortalInnerMaterial);
    exitPortalGroup.add(exitPortalInner);
    
    // Add portal label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;
    context.fillStyle = '#00ff00';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(30, 5);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 20;
    exitPortalGroup.add(label);

    // Create particle system for portal effect
    const exitPortalParticleCount = 1000;
    const exitPortalParticles = new THREE.BufferGeometry();
    const exitPortalPositions = new Float32Array(exitPortalParticleCount * 3);
    const exitPortalColors = new Float32Array(exitPortalParticleCount * 3);

    for (let i = 0; i < exitPortalParticleCount * 3; i += 3) {
        // Create particles in a ring around the portal
        const angle = Math.random() * Math.PI * 2;
        const radius = Config.portal.size + (Math.random() - 0.5) * 4;
        exitPortalPositions[i] = Math.cos(angle) * radius;
        exitPortalPositions[i + 1] = Math.sin(angle) * radius;
        exitPortalPositions[i + 2] = (Math.random() - 0.5) * 4;

        // Green color with slight variation
        exitPortalColors[i] = 0;
        exitPortalColors[i + 1] = 0.8 + Math.random() * 0.2;
        exitPortalColors[i + 2] = 0;
    }

    exitPortalParticles.setAttribute('position', new THREE.BufferAttribute(exitPortalPositions, 3));
    exitPortalParticles.setAttribute('color', new THREE.BufferAttribute(exitPortalColors, 3));

    const exitPortalParticleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const exitPortalParticleSystem = new THREE.Points(exitPortalParticles, exitPortalParticleMaterial);
    exitPortalGroup.add(exitPortalParticleSystem);

    // Add full portal group to scene
    scene.add(exitPortalGroup);

    // Create portal collision box
    portalState.exitPortalBox = new THREE.Box3().setFromObject(exitPortalGroup);
    
    // Store portal for animation updates
    portalState.exitPortal = {
        group: exitPortalGroup,
        particleSystem: exitPortalParticleSystem,
        particles: exitPortalParticles,
        inner: exitPortalInner
    };
    
    return portalState.exitPortal;
}

// Update portal animations
export function updatePortals(delta) {
    // Update start portal if it exists
    if (portalState.startPortal) {
        const positions = portalState.startPortal.particles.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
        }
        portalState.startPortal.particles.attributes.position.needsUpdate = true;
    }
    
    // Update exit portal if it exists
    if (portalState.exitPortal) {
        const positions = portalState.exitPortal.particles.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += 0.05 * Math.sin(Date.now() * 0.001 + i);
        }
        portalState.exitPortal.particles.attributes.position.needsUpdate = true;
    }
}

// Check if player entered start portal
export function checkStartPortalEntry() {
    if (!portalState.isFromPortal || !portalState.startPortalBox) return false;
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Create player bounding box
    const playerBox = new THREE.Box3().setFromObject(gameState.playerShip);
    
    // Check distance to portal
    const portalDistance = playerBox.getCenter(new THREE.Vector3())
        .distanceTo(portalState.startPortalBox.getCenter(new THREE.Vector3()));
    
    // Check if close enough to portal
    if (portalDistance < Config.portal.entryDistance) {
        // Get ref from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const refUrl = urlParams.get('ref');
        
        if (refUrl) {
            // Add https if not present
            let url = refUrl;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            // Copy over all URL params except ref
            const currentParams = new URLSearchParams(window.location.search);
            const newParams = new URLSearchParams();
            
            for (const [key, value] of currentParams) {
                if (key !== 'ref') { // Skip ref param since it's in the base URL
                    newParams.append(key, value);
                }
            }
            
            const paramString = newParams.toString();
            const fullUrl = url + (paramString ? '?' + paramString : '');
            
            // Navigate to the referrer URL
            window.location.href = fullUrl;
            return true;
        }
    }
    
    return false;
}

// Check if player entered exit portal
export function checkExitPortalEntry() {
    if (!portalState.exitPortalBox) return false;
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Create player bounding box
    const playerBox = new THREE.Box3().setFromObject(gameState.playerShip);
    
    // Check distance to portal
    const portalDistance = playerBox.getCenter(new THREE.Vector3())
        .distanceTo(portalState.exitPortalBox.getCenter(new THREE.Vector3()));
    
    // Check if within range of portal for notification
    if (portalDistance < Config.portal.entryDistance) {
        // Show notification about portal
        showMessage("APPROACHING PORTAL TO VIBEVERSE", 1000);
        
        // Check if actually entered the portal
        if (playerBox.intersectsBox(portalState.exitPortalBox)) {
            // Prepare URL parameters to pass through portal
            const currentParams = new URLSearchParams(window.location.search);
            const newParams = new URLSearchParams();
            
            // Add portal flag and player info
            newParams.append('portal', 'true');
            newParams.append('username', gameState.multiplayer.playerId || 'player');
            newParams.append('color', gameState.multiplayer.playerColor || 'white');
            newParams.append('speed', gameState.speed.toString());
            
            // Copy any existing params
            for (const [key, value] of currentParams) {
                // Don't duplicate params we already set
                if (!['portal', 'username', 'color', 'speed'].includes(key)) {
                    newParams.append(key, value);
                }
            }
            
            // Create preload iframe to speed up loading
            preloadNextPage(portalState.destinationUrl, newParams.toString());
            
            // Navigate to destination
            window.location.href = portalState.destinationUrl + 
                (newParams.toString() ? '?' + newParams.toString() : '');
            
            return true;
        }
    }
    
    return false;
}

// Preload the next page in a hidden iframe to speed up loading
function preloadNextPage(url, params) {
    // Only create iframe if it doesn't exist
    if (!document.getElementById('preloadFrame')) {
        const iframe = document.createElement('iframe');
        iframe.id = 'preloadFrame';
        iframe.style.display = 'none';
        iframe.src = url + (params ? '?' + params : '');
        document.body.appendChild(iframe);
    }
}

// Set portal destination URL
export function setPortalDestination(url) {
    portalState.destinationUrl = url;
}
