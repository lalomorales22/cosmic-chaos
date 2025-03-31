/**
 * Game Configuration
 * Central place for all game settings and constants
 */

const Config = {
    // Universe settings
    universe: {
        size: 200000,
        sectorSize: 10000
    },
    
    // Player settings
    player: {
        maxSpeed: 3,
        boostMultiplier: 6.0,
        maxBoostFuel: 100,
        boostRechargeRate: 15,
        boostDrainRate: 20,
        startPosition: { x: 0, y: 100, z: 0 }
    },
    
    // Planet settings
    planets: {
        minCount: 25,
        maxDistance: 50000,
        checkInterval: 5,
        planetsPerSector: 8,
        types: [
            'Rocky', 'Gaseous', 'Molten', 'Frozen', 
            'Toxic', 'Oceanic', 'Desert', 'Crystalline'
        ],
        namePrefixes: [
            'Zor', 'Xen', 'Qua', 'Vril', 'Nyx', 
            'Trag', 'Plex', 'Kron', 'Glib', 'Blip'
        ],
        nameSuffixes: [
            'zar', 'tron', 'plex', 'ton', 'thor', 
            'mor', 'gor', 'nox', 'lax', 'dox'
        ]
    },
    
    // Bomb settings
    bombs: {
        countdownTime: 10,
        startingCount: 3,
        maxSize: 3
    },
    
    // Multiplayer settings
    multiplayer: {
        updateInterval: 100
    },
    
    // Alien mode settings
    alien: {
        moveSpeed: 10
    },
    
    // Portal settings
    portal: {
        size: 15,
        entryDistance: 50
    },
    
    // Graphics settings
    graphics: {
        fogDensity: 0.00002,
        farPlane: 500000
    },
    
    // UI settings
    ui: {
        minimapRadius: 10000,
        minimapUpdateInterval: 0.2,
        maxPlanetsOnMinimap: 10
    }
};

export default Config;
