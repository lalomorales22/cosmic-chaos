/**
 * Star Generator Module
 * Creates starfield backgrounds for the cosmic environment
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import gameState from './game-state.js';

/**
 * Creates a starfield of points in 3D space
 * @param {THREE.Scene} scene - The scene to add stars to
 * @param {Object} options - Configuration options
 * @returns {THREE.Points} The star field object
 */
export function createStars(scene, options = {}) {
    const {
        count = 100000,
        color = 0xffffff,
        size = 1.5,
        distribution = 'uniform',
        universeSize = gameState.universeSize
    } = options;
    
    // Create geometry and material
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: color,
        size: size,
        sizeAttenuation: false
    });
    
    // Create vertices array for star positions
    const starVertices = [];
    
    // Generate star positions based on distribution type
    if (distribution === 'cluster') {
        // Create clustered star distribution
        createClusteredStars(count, universeSize, starVertices);
    } else {
        // Create uniform star distribution (default)
        createUniformStars(count, universeSize, starVertices);
    }
    
    // Set geometry attributes
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    
    // Create the star points
    const stars = new THREE.Points(starGeometry, starMaterial);
    
    // Add to scene
    scene.add(stars);
    
    // Store reference in game state
    gameState.stars.push(stars);
    
    return stars;
}

/**
 * Creates uniformly distributed stars
 * @param {number} count - Number of stars to create
 * @param {number} universeSize - Size of universe bounds
 * @param {Array} vertices - Array to populate with vertex positions
 */
function createUniformStars(count, universeSize, vertices) {
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * universeSize;
        const y = (Math.random() - 0.5) * universeSize;
        const z = (Math.random() - 0.5) * universeSize;
        
        vertices.push(x, y, z);
    }
}

/**
 * Creates clustered star distribution
 * @param {number} count - Number of stars to create
 * @param {number} universeSize - Size of universe bounds
 * @param {Array} vertices - Array to populate with vertex positions
 */
function createClusteredStars(count, universeSize, vertices) {
    // Create cluster centers
    const clusterCount = Math.floor(count / 1000) + 5;
    const clusterCenters = [];
    
    for (let i = 0; i < clusterCount; i++) {
        clusterCenters.push({
            x: (Math.random() - 0.5) * universeSize * 0.8,
            y: (Math.random() - 0.5) * universeSize * 0.8,
            z: (Math.random() - 0.5) * universeSize * 0.8,
            radius: 5000 + Math.random() * 15000
        });
    }
    
    // Generate stars around clusters
    for (let i = 0; i < count; i++) {
        // Select a random cluster
        const cluster = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
        
        // Generate a random offset within the cluster radius
        const radius = Math.random() * cluster.radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = cluster.x + radius * Math.sin(phi) * Math.cos(theta);
        const y = cluster.y + radius * Math.sin(phi) * Math.sin(theta);
        const z = cluster.z + radius * Math.cos(phi);
        
        vertices.push(x, y, z);
    }
}

/**
 * Creates colorful nebulae for visual interest
 * @param {THREE.Scene} scene - The scene to add nebulae to
 * @param {number} count - Number of nebulae to create
 */
export function createNebulae(scene, count = 20) {
    // Nebula colors
    const nebulaColors = [
        0x7b68ee, // Medium slate blue
        0x4b0082, // Indigo
        0x9932cc, // Dark orchid
        0x8a2be2, // Blue violet
        0x9400d3, // Dark violet
        0xff4500, // Orange-red
        0x00ced1, // Dark turquoise
        0xff1493  // Deep pink
    ];
    
    for (let i = 0; i < count; i++) {
        const nebulaSize = 10000 + Math.random() * 20000;
        const distance = gameState.universeSize * 0.4;
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        
        const x = Math.cos(angle) * Math.cos(elevation) * distance;
        const y = Math.sin(elevation) * distance;
        const z = Math.sin(angle) * Math.cos(elevation) * distance;
        
        const nebulaGeometry = new THREE.PlaneGeometry(nebulaSize, nebulaSize);
        const nebulaMaterial = new THREE.MeshBasicMaterial({
            color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)],
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.position.set(x, y, z);
        
        // Orient the nebula to face the center of the universe roughly
        nebula.lookAt(0, 0, 0);
        // Add some random rotation
        nebula.rotation.z = Math.random() * Math.PI * 2;
        
        scene.add(nebula);
    }
} 