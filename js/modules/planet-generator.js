/**
 * Planet Generator Module
 * Handles procedural creation of planets throughout the universe
 */

import gameState from './game-state.js';
import Config from '../config.js';
import { showMessage } from './ui.js';
import * as planetaryDefense from './planetary-defense.js';

// Available planet types
const planetTypes = Config.planets.types;

// Planet generation functions
export function initializePlanetSystem(scene) {
    // Initialize the sectors system
    initializeSectors();
    
    // Create initial planets in different sectors
    for (const sectorKey in gameState.planetsManager.sectors) {
        const sector = gameState.planetsManager.sectors[sectorKey];
        
        // Generate planets for this sector
        for (let i = 0; i < gameState.planetsManager.planetsPerSector; i++) {
            // Calculate position within sector bounds
            const position = new THREE.Vector3(
                sector.center.x + (Math.random() - 0.5) * sector.size,
                sector.center.y + (Math.random() - 0.5) * sector.size,
                sector.center.z + (Math.random() - 0.5) * sector.size
            );
            
            const size = 30 + Math.random() * 70;
            const type = getRandomPlanetType(sector.planetTypes || planetTypes);
            
            const planet = createPlanet(scene, position, size, type);
            planet.sector = sectorKey;
        }
    }
    
    // Create a few close planets for immediate gameplay
    for (let i = 0; i < 5; i++) {
        const distance = 1000 + Math.random() * 1500;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 500;
        
        const position = new THREE.Vector3(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
        );
        
        const size = 30 + Math.random() * 70;
        const type = getRandomPlanetType();
        
        createPlanet(scene, position, size, type);
    }
}

// Create a single planet
export function createPlanet(scene, position, size = 50, type = getRandomPlanetType()) {
    // Create the planet
    const planetGroup = new THREE.Group();
    planetGroup.position.copy(position);
    
    // Generate planet properties
    const planetName = getRandomPlanetName();
    const planetSize = size;
    const planetRotationSpeed = Math.random() * 0.001 - 0.0005;
    
    // Add an ID to the planet
    const planetId = 'planet-' + Math.random().toString(36).substr(2, 9);
    
    // Create geometry and material based on planet type
    let planetGeometry, planetMaterial;
    
    // Create a noise function for terrain
    const simplex = new SimplexNoise();
    
    planetGeometry = new THREE.SphereGeometry(planetSize, 64, 64);
    
    // Create different materials based on type
    let planetColor;
    
    switch (type) {
        case 'Rocky':
            planetColor = new THREE.Color(
                0.5 + Math.random() * 0.2,
                0.3 + Math.random() * 0.2,
                0.1 + Math.random() * 0.2
            );
            break;
        case 'Gaseous':
            planetColor = new THREE.Color(
                0.6 + Math.random() * 0.4,
                0.6 + Math.random() * 0.4,
                0.7 + Math.random() * 0.3
            );
            break;
        case 'Molten':
            planetColor = new THREE.Color(
                0.8 + Math.random() * 0.2,
                0.2 + Math.random() * 0.3,
                0.05 + Math.random() * 0.1
            );
            break;
        case 'Frozen':
            planetColor = new THREE.Color(
                0.8 + Math.random() * 0.2,
                0.8 + Math.random() * 0.2,
                0.9 + Math.random() * 0.1
            );
            break;
        case 'Toxic':
            planetColor = new THREE.Color(
                0.2 + Math.random() * 0.2,
                0.7 + Math.random() * 0.3,
                0.2 + Math.random() * 0.2
            );
            break;
        case 'Oceanic':
            planetColor = new THREE.Color(
                0.0 + Math.random() * 0.1,
                0.4 + Math.random() * 0.3,
                0.7 + Math.random() * 0.3
            );
            break;
        case 'Desert':
            planetColor = new THREE.Color(
                0.8 + Math.random() * 0.2,
                0.7 + Math.random() * 0.2,
                0.3 + Math.random() * 0.2
            );
            break;
        case 'Crystalline':
            planetColor = new THREE.Color(
                0.5 + Math.random() * 0.5,
                0.5 + Math.random() * 0.5,
                0.5 + Math.random() * 0.5
            );
            break;
        default:
            planetColor = new THREE.Color(
                0.5 + Math.random() * 0.5,
                0.5 + Math.random() * 0.5,
                0.5 + Math.random() * 0.5
            );
    }
    
    planetMaterial = new THREE.MeshPhongMaterial({
        color: planetColor,
        shininess: 10,
        flatShading: type === 'Rocky' || type === 'Crystalline'
    });
    
    // Create the planet mesh
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    
    // Add atmosphere if not a gaseous planet
    if (type !== 'Gaseous') {
        const atmosphereGeometry = new THREE.SphereGeometry(planetSize * 1.02, 64, 64);
        let atmosphereColor;
        
        switch (type) {
            case 'Molten':
                atmosphereColor = new THREE.Color(1, 0.3, 0.1);
                break;
            case 'Toxic':
                atmosphereColor = new THREE.Color(0.3, 1, 0.1);
                break;
            case 'Oceanic':
                atmosphereColor = new THREE.Color(0.1, 0.5, 1);
                break;
            case 'Frozen':
                atmosphereColor = new THREE.Color(0.8, 0.9, 1);
                break;
            default:
                atmosphereColor = new THREE.Color(0.8, 0.8, 1);
        }
        
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: atmosphereColor,
            transparent: true,
            opacity: 0.1
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        planetGroup.add(atmosphere);
    }
    
    // Add planet mesh to the group
    planetGroup.add(planet);
    
    // Add the planet to the scene and state
    scene.add(planetGroup);
    const planetObject = {
        group: planetGroup,
        mesh: planet,
        name: planetName,
        size: planetSize,
        rotationSpeed: planetRotationSpeed,
        type: type,
        isDestroyed: false,
        destructionProgress: 0,
        hasBomb: false,
        bombCountdown: 0,
        id: planetId  // Add ID to the planet object
    };
    
    gameState.planets.push(planetObject);
    
    // Initialize defense systems for this planet
    planetaryDefense.initializeDefenseSystem(planetObject);
    
    // Apply Level of Detail (LOD) optimization
    import('./lod-manager.js').then(module => {
        module.applyPlanetLOD(planetObject);
    });
    
    return planetObject;
}

// Initialize sectors for the universe
function initializeSectors() {
    // Create a grid of sectors to organize the universe
    const sectorSize = gameState.planetsManager.sectorSize;
    const sectorGridSize = 7; // 7x7x7 grid of sectors
    const offset = Math.floor(sectorGridSize / 2);
    
    // Generate sector grid
    for (let x = -offset; x <= offset; x++) {
        for (let y = -offset; y <= offset; y++) {
            for (let z = -offset; z <= offset; z++) {
                // Skip the center sector (0,0,0) as it's handled separately
                if (x === 0 && y === 0 && z === 0) continue;
                
                const sectorKey = `SEC-${x}:${y}:${z}`;
                const sectorName = generateSectorName(x, y, z);
                
                gameState.planetsManager.sectors[sectorKey] = {
                    name: sectorName,
                    center: new THREE.Vector3(
                        x * sectorSize,
                        y * sectorSize,
                        z * sectorSize
                    ),
                    size: sectorSize,
                    explored: false,
                    planetTypes: getRandomSectorPlanetTypes()
                };
            }
        }
    }
    
    // Add the home sector
    gameState.planetsManager.sectors["SEC-0:0:0"] = {
        name: "ALPHA-1",
        center: new THREE.Vector3(0, 0, 0),
        size: sectorSize,
        explored: true,
        planetTypes: [...planetTypes] // All types available in home sector
    };
    
    // Create special sectors with unique characteristics
    createSpecialSectors();
}

// Create special sectors with unique characteristics
function createSpecialSectors() {
    // 1. Lava sector - only molten planets
    const lavaSectorKey = `SEC-10:5:-5`;
    gameState.planetsManager.sectors[lavaSectorKey] = {
        name: "INFERNO-3",
        center: new THREE.Vector3(
            10 * gameState.planetsManager.sectorSize,
            5 * gameState.planetsManager.sectorSize,
            -5 * gameState.planetsManager.sectorSize
        ),
        size: gameState.planetsManager.sectorSize,
        explored: false,
        planetTypes: ['Molten'],
        special: true
    };
    
    // 2. Crystal sector - only crystalline planets
    const crystalSectorKey = `SEC-8:-4:10`;
    gameState.planetsManager.sectors[crystalSectorKey] = {
        name: "CRYSTAL-7",
        center: new THREE.Vector3(
            8 * gameState.planetsManager.sectorSize,
            -4 * gameState.planetsManager.sectorSize,
            10 * gameState.planetsManager.sectorSize
        ),
        size: gameState.planetsManager.sectorSize,
        explored: false,
        planetTypes: ['Crystalline'],
        special: true
    };
    
    // 3. Ice sector - only frozen planets
    const iceSectorKey = `SEC-8:9:11`;
    gameState.planetsManager.sectors[iceSectorKey] = {
        name: "GLACIUS-VOID",
        center: new THREE.Vector3(
            8 * gameState.planetsManager.sectorSize,
            9 * gameState.planetsManager.sectorSize,
            11 * gameState.planetsManager.sectorSize
        ),
        size: gameState.planetsManager.sectorSize,
        explored: false,
        planetTypes: ['Frozen'],
        special: true
    };
    
    // 4. Water sector - only oceanic planets
    const waterSectorKey = `SEC-9:-7:-10`;
    gameState.planetsManager.sectors[waterSectorKey] = {
        name: "AQUARIS-DEEP",
        center: new THREE.Vector3(
            9 * gameState.planetsManager.sectorSize,
            -7 * gameState.planetsManager.sectorSize,
            -10 * gameState.planetsManager.sectorSize
        ),
        size: gameState.planetsManager.sectorSize,
        explored: false,
        planetTypes: ['Oceanic'],
        special: true
    };
}

// Generate a random planet name
function getRandomPlanetName() {
    const prefixes = Config.planets.namePrefixes;
    const suffixes = Config.planets.nameSuffixes;
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return prefix + suffix;
}

// Generate a sector name based on coordinates
function generateSectorName(x, y, z) {
    // Greek alphabet for sector naming
    const greekLetters = [
        "ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON", 
        "ZETA", "ETA", "THETA", "IOTA", "KAPPA", 
        "LAMBDA", "MU", "NU", "XI", "OMICRON", 
        "PI", "RHO", "SIGMA", "TAU", "UPSILON", 
        "PHI", "CHI", "PSI", "OMEGA"
    ];
    
    // Use coordinates to deterministically select a name
    const index = Math.abs((x * 5 + y * 7 + z * 11) % greekLetters.length);
    const number = Math.abs((x * 3 + y * 5 + z * 7) % 9) + 1;
    
    return `${greekLetters[index]}-${number}`;
}

// Get random subset of planet types for a sector
function getRandomSectorPlanetTypes() {
    // Each sector has a subset of possible planet types
    const types = [...planetTypes];
    const typeCount = 3 + Math.floor(Math.random() * 3); // 3-5 types per sector
    
    // Shuffle and slice to get random subset
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    
    return types.slice(0, typeCount);
}

// Get a random planet type
function getRandomPlanetType(allowedTypes = planetTypes) {
    return allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
}

// Check and generate new planets as needed
export function checkAndGeneratePlanets(delta) {
    // Update planet rotations
    updatePlanetRotations(delta);
    
    // Update bomb countdowns
    updateBombCountdowns(delta);
    
    // Find nearest planet to player
    findNearestPlanet();
    
    // Only check periodically to save performance
    gameState.planetsManager.checkTimer = (gameState.planetsManager.checkTimer || 0) + delta;
    
    if (gameState.planetsManager.checkTimer < gameState.planetsManager.checkInterval) {
        return;
    }
    
    gameState.planetsManager.checkTimer = 0;
    
    // Count intact planets
    const intactPlanets = gameState.planets.filter(planet => !planet.isDestroyed).length;
    
    // Generate new planets if needed
    if (intactPlanets < gameState.planetsManager.minCount) {
        // Calculate how many planets to generate
        const planetsToGenerate = gameState.planetsManager.minCount - intactPlanets;
        
        for (let i = 0; i < planetsToGenerate; i++) {
            generateNewPlanet();
        }
    }
    
    // Update player's current sector
    updatePlayerSector();
}

// Update planet rotations
function updatePlanetRotations(delta) {
    gameState.planets.forEach(planet => {
        if (!planet.isDestroyed) {
            planet.mesh.rotation.y += planet.rotationSpeed;
        }
    });
}

// Update bomb countdowns
function updateBombCountdowns(delta) {
    gameState.planets.forEach(planet => {
        if (planet.hasBomb && !planet.isDestroyed) {
            planet.bombCountdown -= delta;
            
            if (planet.bombCountdown <= 0) {
                explodePlanet(planet);
            }
        }
    });
}

// Explode a planet
function explodePlanet(planet) {
    // Set planet as destroyed
    planet.isDestroyed = true;
    
    // Get planet position
    const planetPosition = new THREE.Vector3();
    planet.group.getWorldPosition(planetPosition);
    
    // Hide the planet
    planet.group.visible = false;
    
    // Update destroyed count
    gameState.planetsDestroyed++;
    
    // Update HUD
    const destroyedElement = document.getElementById('destroyed');
    if (destroyedElement) {
        destroyedElement.textContent = gameState.planetsDestroyed;
    }
    
    // Add score based on planet size and type
    const scoreValue = Math.floor(planet.size * 10);
    gameState.updateScore(scoreValue);
    
    // Show message
    showMessage(`PLANET ${planet.name} DESTROYED! +${scoreValue} POINTS`, 3000);
    
    // Create debris from the destroyed planet
    if (window.gameApp && window.gameApp.createDebris) {
        const debrisCount = Math.floor(planet.size * 0.5);
        window.gameApp.createDebris(planetPosition, debrisCount, planet.size * 0.1);
    }
}

// Find the nearest planet to the player
function findNearestPlanet() {
    // Skip if in alien mode or no player ship
    if (gameState.isAlienMode || !gameState.playerShip) return;
    
    let nearestDistance = Infinity;
    let nearestPlanet = null;
    
    // Get player position
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Check all planets
    gameState.planets.forEach(planet => {
        if (!planet.isDestroyed) {
            const planetPosition = new THREE.Vector3();
            planet.group.getWorldPosition(planetPosition);
            
            const distance = playerPosition.distanceTo(planetPosition) - planet.size;
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlanet = planet;
            }
        }
    });
    
    // Update gameState
    gameState.nearestPlanet = nearestPlanet;
    gameState.nearestPlanetDistance = nearestDistance;
    
    // Update HUD with nearest planet
    const nearestPlanetElement = document.getElementById('nearest-planet');
    if (nearestPlanetElement) {
        if (nearestPlanet) {
            nearestPlanetElement.textContent = 
                `${nearestPlanet.name} (${nearestPlanet.type}) - ${Math.round(nearestDistance)}`;
        } else {
            nearestPlanetElement.textContent = 'None';
        }
    }
}

// Update player's current sector
function updatePlayerSector() {
    if (!gameState.playerShip) return;
    
    const playerPos = gameState.playerShip.position;
    const sectorSize = gameState.planetsManager.sectorSize;
    
    // Calculate sector coordinates
    const sectorX = Math.floor(playerPos.x / sectorSize);
    const sectorY = Math.floor(playerPos.y / sectorSize);
    const sectorZ = Math.floor(playerPos.z / sectorSize);
    
    const sectorKey = `SEC-${sectorX}:${sectorY}:${sectorZ}`;
    
    // Look up sector name or generate if not found
    if (gameState.planetsManager.sectors[sectorKey]) {
        gameState.playerSector = gameState.planetsManager.sectors[sectorKey].name;
        
        // Mark sector as explored
        gameState.planetsManager.sectors[sectorKey].explored = true;
    } else {
        // Create a new sector if we've moved out of mapped space
        gameState.planetsManager.sectors[sectorKey] = {
            name: generateSectorName(sectorX, sectorY, sectorZ),
            center: new THREE.Vector3(
                sectorX * sectorSize,
                sectorY * sectorSize,
                sectorZ * sectorSize
            ),
            size: sectorSize,
            explored: true,
            planetTypes: getRandomSectorPlanetTypes()
        };
        
        gameState.playerSector = gameState.planetsManager.sectors[sectorKey].name;
        
        // Generate planets for the new sector
        for (let i = 0; i < gameState.planetsManager.planetsPerSector; i++) {
            const sector = gameState.planetsManager.sectors[sectorKey];
            const position = new THREE.Vector3(
                sector.center.x + (Math.random() - 0.5) * sector.size,
                sector.center.y + (Math.random() - 0.5) * sector.size,
                sector.center.z + (Math.random() - 0.5) * sector.size
            );
            
            const size = 30 + Math.random() * 70;
            const type = getRandomPlanetType(sector.planetTypes);
            
            // Get the current Three.js scene from gameState
            const scene = gameState.currentScene;
            
            const planet = createPlanet(scene, position, size, type);
            planet.sector = sectorKey;
        }
        
        // Show discovery message
        showMessage(`NEW SECTOR DISCOVERED: ${gameState.playerSector}`, 3000);
    }
    
    // Update HUD
    const sectorElement = document.getElementById('sector');
    if (sectorElement) {
        sectorElement.textContent = gameState.playerSector;
    }
}

// Generate a new planet in a distant sector
function generateNewPlanet() {
    // Get the scene from gameState
    const scene = gameState.currentScene;
    
    // Get player position
    const playerPosition = gameState.playerShip.position.clone();
    
    // Find random sector that's not too close to player
    const sectorKeys = Object.keys(gameState.planetsManager.sectors);
    let selectedSectorKey;
    let attempts = 0;
    
    do {
        selectedSectorKey = sectorKeys[Math.floor(Math.random() * sectorKeys.length)];
        const sector = gameState.planetsManager.sectors[selectedSectorKey];
        const distance = playerPosition.distanceTo(sector.center);
        
        // Accept if it's far enough away (but not too far)
        if (distance > 20000 && distance < gameState.planetsManager.maxDistance) {
            break;
        }
        
        attempts++;
    } while (attempts < 20);
    
    // If we couldn't find a good sector, create one
    if (attempts >= 20) {
        // Generate a new sector in a random direction from player
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        const distanceFromPlayer = 30000 + Math.random() * 20000;
        const newSectorCenter = playerPosition.clone().add(
            direction.multiplyScalar(distanceFromPlayer)
        );
        
        const sectorSize = gameState.planetsManager.sectorSize;
        const sectorX = Math.floor(newSectorCenter.x / sectorSize);
        const sectorY = Math.floor(newSectorCenter.y / sectorSize);
        const sectorZ = Math.floor(newSectorCenter.z / sectorSize);
        
        selectedSectorKey = `SEC-${sectorX}:${sectorY}:${sectorZ}`;
        
        if (!gameState.planetsManager.sectors[selectedSectorKey]) {
            gameState.planetsManager.sectors[selectedSectorKey] = {
                name: generateSectorName(sectorX, sectorY, sectorZ),
                center: new THREE.Vector3(
                    sectorX * sectorSize,
                    sectorY * sectorSize,
                    sectorZ * sectorSize
                ),
                size: sectorSize,
                explored: false,
                planetTypes: getRandomSectorPlanetTypes()
            };
        }
    }
    
    const sector = gameState.planetsManager.sectors[selectedSectorKey];
    
    // Random position within the sector
    const position = new THREE.Vector3(
        sector.center.x + (Math.random() - 0.5) * sector.size,
        sector.center.y + (Math.random() - 0.5) * sector.size,
        sector.center.z + (Math.random() - 0.5) * sector.size
    );
    
    // Size and type
    const size = 30 + Math.random() * 70;
    const type = getRandomPlanetType(sector.planetTypes);
    
    // Create the planet
    const planet = createPlanet(scene, position, size, type);
    planet.sector = selectedSectorKey;
    
    return planet;
}

// Destroy a planet
export function destroyPlanet(planet) {
    if (planet.isDestroyed) return;
    
    // Mark planet as destroyed
    planet.isDestroyed = true;
    
    // Clean up any defense systems
    if (planet.hasDefenses) {
        // Disable defenses to prevent further attacks
        planet.hasDefenses = false;
        
        // Remove shield if it exists
        if (planet.defenseSystems && planet.defenseSystems.hasShield) {
            if (planet.defenseSystems.shieldMesh) {
                planet.defenseSystems.shieldMesh.visible = false;
            }
        }
    }
    
    // Send planet destruction to server if multiplayer is enabled
    if (gameState.multiplayer.enabled) {
        import('./network.js').then(module => {
            module.sendPlanetDestruction(planet.id);
        });
    }
    
    // Create explosion
    const planetPosition = new THREE.Vector3();
    planet.group.getWorldPosition(planetPosition);
    
    // Size explosion based on planet size and bomb size
    let explosionSize = planet.size * 2;
    
    // Create additional debris based on planet size
    const debrisCount = Math.floor(planet.size * 0.5);
    import('../app.js').then(module => {
        window.gameApp.createDebris(planetPosition, debrisCount, planet.size * 0.1);
    });

    // Additionally, create valuable debris for collecting with tractor beam
    import('./object-pool.js').then(module => {
        // Create a smaller number of high-value debris chunks
        const valuableDebrisCount = Math.floor(planet.size * 0.3);
        
        for (let i = 0; i < valuableDebrisCount; i++) {
            // Random position near the planet center
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * planet.size * 2,
                (Math.random() - 0.5) * planet.size * 2,
                (Math.random() - 0.5) * planet.size * 2
            );
            
            const debrisPosition = planetPosition.clone().add(offset);
            
            // Random velocity away from center
            const direction = offset.clone().normalize();
            const speed = 5 + Math.random() * 15;
            const velocity = direction.multiplyScalar(speed);
            
            // Create valuable debris based on planet type
            let color, value;
            
            switch(planet.type) {
                case 'Crystalline':
                    color = 0x00ffff; // Cyan
                    value = Math.floor(Math.random() * 10) + 15; // 15-25
                    break;
                case 'Molten':
                    color = 0xff6600; // Orange
                    value = Math.floor(Math.random() * 8) + 12; // 12-20
                    break;
                case 'Oceanic':
                    color = 0x0088ff; // Blue
                    value = Math.floor(Math.random() * 6) + 10; // 10-16
                    break;
                default:
                    color = 0xaaaaaa; // Gray
                    value = Math.floor(Math.random() * 5) + 5; // 5-10
            }
            
            module.getDebris(gameState.mainScene, {
                position: debrisPosition,
                velocity: velocity,
                size: 1 + Math.random() * 1.5,
                color: color,
                life: 20 + Math.random() * 10,
                value: value // Set explicit resource value
            });
        }
    });
    
    // Hide the planet
    planet.group.visible = false;
    
    // Award resources based on planet size and type
    const baseResources = Math.floor(planet.size / 2);
    let resourceMultiplier = 1;
    
    // Certain planet types yield more resources
    switch(planet.type) {
        case 'Crystalline':
            resourceMultiplier = 2;
            break;
        case 'Molten':
            resourceMultiplier = 1.5;
            break;
        case 'Oceanic':
            resourceMultiplier = 1.25;
            break;
    }
    
    const resourcesGained = Math.floor(baseResources * resourceMultiplier);
    gameState.resourcesCollected += resourcesGained;
    
    // Increment counter and update UI
    gameState.planetsDestroyed++;
    document.getElementById('destroyed').textContent = gameState.planetsDestroyed;
    
    // Show destruction rating with resources gained
    import('./ui.js').then(module => {
        module.showDestructionRating(planet, resourcesGained);
        module.createExplosionFlash(`rgba(255, 100, 0, ${0.3 + (planet.size / 200)})`);
        module.showMessage(`PLANET DESTROYED: +${resourcesGained} RESOURCES`, 3000);
    });
    
    // Add score based on planet size
    const scoreGain = planet.size * 10;
    gameState.updateScore(scoreGain);
    
    // If a player is landed on this planet, force them to take off
    if (gameState.landedOnPlanet === planet) {
        // Force exit alien mode
        if (gameState.isAlienMode) {
            import('./player.js').then(module => {
                module.toggleAlienMode();
            });
        }
        
        // Take off from the planet
        gameState.landedOnPlanet = null;
    }
    
    // Remove the planet after a delay
    setTimeout(() => {
        if (planet.group.parent) {
            planet.group.parent.remove(planet.group);
        }
    }, 5000);
} 