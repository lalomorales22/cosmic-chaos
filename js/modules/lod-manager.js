/**
 * Level of Detail (LOD) Manager Module
 * Improves performance by reducing detail of distant objects
 */

import gameState from './game-state.js';

// Distance thresholds for LOD levels (in game units)
const LOD_THRESHOLDS = {
    HIGH: 500,    // High detail below 500 units
    MEDIUM: 1000, // Medium detail between 500-1000 units
    LOW: 2000,    // Low detail between 1000-2000 units
    ULTRA_LOW: 5000 // Ultra low detail between 2000-5000 units
    // Beyond 5000 units, some objects may be culled entirely
};

// Track objects managed by LOD system
const managedObjects = {
    planets: [],
    wormholes: [],
    otherPlayers: []
};

// LOD Models cache - store different detail versions of models
const lodModels = {
    planets: {},
    wormholes: {},
    playerShips: {}
};

/**
 * Initialize LOD system
 */
export function initializeLOD(scene) {
    console.log("Initializing LOD system for better performance");
    
    // Create LOD models for planets
    createPlanetLODModels(scene);
    
    // Create LOD models for wormholes
    createWormholeLODModels(scene);
    
    // Create LOD models for player ships
    createPlayerShipLODModels(scene);
}

/**
 * Create different detail levels for planet models
 */
function createPlanetLODModels(scene) {
    // Define different LOD levels for planets
    lodModels.planets = {
        HIGH: {
            geometrySphere: new THREE.SphereGeometry(1, 32, 32),
            geometryAtmosphere: new THREE.SphereGeometry(1.02, 32, 32)
        },
        MEDIUM: {
            geometrySphere: new THREE.SphereGeometry(1, 16, 16),
            geometryAtmosphere: new THREE.SphereGeometry(1.02, 16, 16)
        },
        LOW: {
            geometrySphere: new THREE.SphereGeometry(1, 8, 8),
            geometryAtmosphere: new THREE.SphereGeometry(1.02, 8, 8)
        },
        ULTRA_LOW: {
            geometrySphere: new THREE.SphereGeometry(1, 4, 4),
            geometryAtmosphere: new THREE.SphereGeometry(1.02, 4, 4)
        }
    };
}

/**
 * Create different detail levels for wormhole models
 */
function createWormholeLODModels(scene) {
    // Define different LOD levels for wormholes
    lodModels.wormholes = {
        HIGH: {
            geometryTorus: new THREE.TorusGeometry(15, 3, 16, 100)
        },
        MEDIUM: {
            geometryTorus: new THREE.TorusGeometry(15, 3, 12, 50)
        },
        LOW: {
            geometryTorus: new THREE.TorusGeometry(15, 3, 8, 24)
        },
        ULTRA_LOW: {
            geometryTorus: new THREE.TorusGeometry(15, 3, 6, 16)
        }
    };
}

/**
 * Create different detail levels for player ship models
 */
function createPlayerShipLODModels(scene) {
    // In a full implementation, you'd create simpler ship models
    // For this example, we'll just use placeholder objects
    lodModels.playerShips = {
        HIGH: null, // Will use the original model
        MEDIUM: null, // Will use the original model with fewer animations
        LOW: null, // Will use a simplified model
        ULTRA_LOW: null // Will use a very basic model or just a colored box
    };
}

/**
 * Add a planet to be managed by the LOD system
 */
export function addPlanetToLOD(planet) {
    // Store original geometries for reference
    if (!planet.originalGeometries) {
        planet.originalGeometries = {
            planet: planet.mesh.geometry,
            atmosphere: planet.group.children.length > 1 ? planet.group.children[0].geometry : null
        };
    }
    
    // Add to managed objects
    managedObjects.planets.push(planet);
    
    // Set initial LOD
    updatePlanetLOD(planet, 'HIGH');
    
    return planet;
}

/**
 * Add a wormhole to be managed by the LOD system
 */
export function addWormholeToLOD(wormhole) {
    // Store original geometries for reference
    if (!wormhole.originalGeometries) {
        wormhole.originalGeometries = {
            torus: wormhole.torus.geometry
        };
    }
    
    // Add to managed objects
    managedObjects.wormholes.push(wormhole);
    
    // Set initial LOD
    updateWormholeLOD(wormhole, 'HIGH');
    
    return wormhole;
}

/**
 * Add an other player to be managed by the LOD system
 */
export function addPlayerToLOD(player) {
    // Add to managed objects
    managedObjects.otherPlayers.push(player);
    
    // No need to set initial LOD for players as it's handled during update
    
    return player;
}

/**
 * Update the LOD level of a planet based on distance
 */
function updatePlanetLOD(planet, level) {
    if (!planet || planet.isDestroyed) return;
    
    // If planet already at this LOD level, do nothing
    if (planet.currentLOD === level) return;
    
    // Update planet mesh geometry
    if (planet.mesh && lodModels.planets[level]) {
        const oldGeometry = planet.mesh.geometry;
        planet.mesh.geometry = lodModels.planets[level].geometrySphere.clone();
        planet.mesh.geometry.scale(planet.size, planet.size, planet.size);
        
        // Dispose of old geometry to free memory if it's not the original
        if (oldGeometry !== planet.originalGeometries.planet) {
            oldGeometry.dispose();
        }
        
        // Update atmosphere if it exists
        if (planet.group.children.length > 1 && planet.group.children[0] !== planet.mesh) {
            const atmosphere = planet.group.children[0];
            const oldAtmosphereGeometry = atmosphere.geometry;
            atmosphere.geometry = lodModels.planets[level].geometryAtmosphere.clone();
            atmosphere.geometry.scale(planet.size, planet.size, planet.size);
            
            // Dispose of old geometry to free memory if it's not the original
            if (oldAtmosphereGeometry !== planet.originalGeometries.atmosphere) {
                oldAtmosphereGeometry.dispose();
            }
        }
    }
    
    // Set current LOD level
    planet.currentLOD = level;
}

/**
 * Update the LOD level of a wormhole based on distance
 */
function updateWormholeLOD(wormhole, level) {
    if (!wormhole) return;
    
    // If wormhole already at this LOD level, do nothing
    if (wormhole.currentLOD === level) return;
    
    // Update wormhole mesh geometry
    if (wormhole.torus && lodModels.wormholes[level]) {
        const oldGeometry = wormhole.torus.geometry;
        wormhole.torus.geometry = lodModels.wormholes[level].geometryTorus.clone();
        
        // Dispose of old geometry to free memory if it's not the original
        if (oldGeometry !== wormhole.originalGeometries.torus) {
            oldGeometry.dispose();
        }
    }
    
    // Set current LOD level
    wormhole.currentLOD = level;
}

/**
 * Update the LOD level of another player based on distance
 */
function updatePlayerLOD(player, distance) {
    if (!player || !player.mesh) return;
    
    let level;
    
    // Determine LOD level based on distance
    if (distance < LOD_THRESHOLDS.HIGH) {
        level = 'HIGH';
    } else if (distance < LOD_THRESHOLDS.MEDIUM) {
        level = 'MEDIUM';
    } else if (distance < LOD_THRESHOLDS.LOW) {
        level = 'LOW';
    } else if (distance < LOD_THRESHOLDS.ULTRA_LOW) {
        level = 'ULTRA_LOW';
    } else {
        // Beyond ultra low threshold, just hide the player to save resources
        player.mesh.visible = false;
        player.currentLOD = 'CULLED';
        return;
    }
    
    // If player already at this LOD level, just ensure visibility
    if (player.currentLOD === level) {
        player.mesh.visible = true;
        return;
    }
    
    // Make player visible
    player.mesh.visible = true;
    
    // In a real implementation, you would swap models here
    // For this example, we'll just adjust the player's rendering properties
    
    switch (level) {
        case 'HIGH':
            // Full detail
            if (player.nameTag) player.nameTag.visible = true;
            break;
            
        case 'MEDIUM':
            // Medium detail
            if (player.nameTag) player.nameTag.visible = true;
            break;
            
        case 'LOW':
            // Low detail - hide name tag
            if (player.nameTag) player.nameTag.visible = false;
            break;
            
        case 'ULTRA_LOW':
            // Ultra low detail - hide name tag and any effects
            if (player.nameTag) player.nameTag.visible = false;
            break;
    }
    
    // Set current LOD level
    player.currentLOD = level;
}

/**
 * Main update function - adjust LOD for all managed objects
 */
export function updateLOD() {
    if (!gameState.playerShip) return;
    
    // Get player position
    const playerPos = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPos);
    
    // Update planets LOD
    updatePlanetsLOD(playerPos);
    
    // Update wormholes LOD
    updateWormholesLOD(playerPos);
    
    // Update other players LOD
    updatePlayersLOD(playerPos);
}

/**
 * Update LOD for all planets
 */
function updatePlanetsLOD(playerPos) {
    managedObjects.planets.forEach(planet => {
        if (!planet || planet.isDestroyed) return;
        
        // Get planet position
        const planetPos = new THREE.Vector3();
        planet.group.getWorldPosition(planetPos);
        
        // Calculate distance to player
        const distance = planetPos.distanceTo(playerPos);
        
        // Determine LOD level based on distance
        let level;
        if (distance < LOD_THRESHOLDS.HIGH) {
            level = 'HIGH';
        } else if (distance < LOD_THRESHOLDS.MEDIUM) {
            level = 'MEDIUM';
        } else if (distance < LOD_THRESHOLDS.LOW) {
            level = 'LOW';
        } else if (distance < LOD_THRESHOLDS.ULTRA_LOW) {
            level = 'ULTRA_LOW';
        } else {
            // Very distant planets can be hidden entirely
            planet.group.visible = false;
            return;
        }
        
        // Ensure planet is visible
        planet.group.visible = true;
        
        // Update LOD if needed
        updatePlanetLOD(planet, level);
    });
}

/**
 * Update LOD for all wormholes
 */
function updateWormholesLOD(playerPos) {
    managedObjects.wormholes.forEach(wormhole => {
        if (!wormhole) return;
        
        // Get wormhole position
        const wormholePos = new THREE.Vector3();
        wormhole.group.getWorldPosition(wormholePos);
        
        // Calculate distance to player
        const distance = wormholePos.distanceTo(playerPos);
        
        // Determine LOD level based on distance
        let level;
        if (distance < LOD_THRESHOLDS.HIGH) {
            level = 'HIGH';
        } else if (distance < LOD_THRESHOLDS.MEDIUM) {
            level = 'MEDIUM';
        } else if (distance < LOD_THRESHOLDS.LOW) {
            level = 'LOW';
        } else if (distance < LOD_THRESHOLDS.ULTRA_LOW) {
            level = 'ULTRA_LOW';
        } else {
            // Very distant wormholes can be hidden entirely
            wormhole.group.visible = false;
            return;
        }
        
        // Ensure wormhole is visible
        wormhole.group.visible = true;
        
        // Update LOD if needed
        updateWormholeLOD(wormhole, level);
    });
}

/**
 * Update LOD for all other players
 */
function updatePlayersLOD(playerPos) {
    // First clean up disconnected players
    managedObjects.otherPlayers = managedObjects.otherPlayers.filter(player => {
        return player && player.mesh;
    });
    
    // Get other players from game state
    if (gameState.multiplayer.enabled) {
        gameState.multiplayer.otherPlayers.forEach(player => {
            if (!player || !player.mesh) return;
            
            // Get player position
            const playerPosition = player.mesh.position;
            
            // Calculate distance to player
            const distance = playerPosition.distanceTo(playerPos);
            
            // Update LOD based on distance
            updatePlayerLOD(player, distance);
        });
    }
}

/**
 * Apply LOD to a newly created planet
 */
export function applyPlanetLOD(planet) {
    if (!planet) return planet;
    
    // Register with LOD system
    addPlanetToLOD(planet);
    
    return planet;
}

/**
 * Apply LOD to a newly created wormhole
 */
export function applyWormholeLOD(wormhole) {
    if (!wormhole) return wormhole;
    
    // Register with LOD system
    addWormholeToLOD(wormhole);
    
    return wormhole;
}

/**
 * Get LOD statistics for debugging
 */
export function getLODStats() {
    // Count planets at each LOD level
    const planetStats = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        ULTRA_LOW: 0,
        CULLED: 0
    };
    
    managedObjects.planets.forEach(planet => {
        if (!planet || planet.isDestroyed) return;
        
        if (!planet.group.visible) {
            planetStats.CULLED++;
        } else if (planet.currentLOD) {
            planetStats[planet.currentLOD]++;
        }
    });
    
    // Count wormholes at each LOD level
    const wormholeStats = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        ULTRA_LOW: 0,
        CULLED: 0
    };
    
    managedObjects.wormholes.forEach(wormhole => {
        if (!wormhole) return;
        
        if (!wormhole.group.visible) {
            wormholeStats.CULLED++;
        } else if (wormhole.currentLOD) {
            wormholeStats[wormhole.currentLOD]++;
        }
    });
    
    // Count players at each LOD level
    const playerStats = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        ULTRA_LOW: 0,
        CULLED: 0
    };
    
    managedObjects.otherPlayers.forEach(player => {
        if (!player || !player.mesh) return;
        
        if (!player.mesh.visible) {
            playerStats.CULLED++;
        } else if (player.currentLOD) {
            playerStats[player.currentLOD]++;
        }
    });
    
    return {
        planets: planetStats,
        wormholes: wormholeStats,
        players: playerStats,
        thresholds: LOD_THRESHOLDS
    };
} 