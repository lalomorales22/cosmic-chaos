/**
 * Game State Module
 * Manages the central state of the game
 */

import Config from '../config.js';

class GameState {
    constructor() {
        this.playerShip = null;
        this.camera = null;
        this.planets = [];
        this.stars = [];
        this.bombs = [];
        this.particles = [];
        this.debris = [];
        this.explosions = [];
        this.isAlienMode = false;
        this.alienModel = null;
        this.cameraTarget = null;
        this.alienMouseLook = { x: 0, y: 0 };
        this.flatGround = null;
        this.flatScene = null;
        this.mainScene = null;
        this.currentScene = null;
        this.landedOnPlanet = null;
        this.bombsRemaining = Config.bombs.startingCount;
        this.bombSize = 1;
        this.bombSizeCycled = false;
        this.bombPlaced = false;
        this.planetsDestroyed = 0;
        this.shields = 100;
        this.speed = 0;
        this.maxSpeed = Config.player.maxSpeed;
        this.boostMultiplier = Config.player.boostMultiplier;
        this.isBoostActive = false;
        this.boostFuel = Config.player.maxBoostFuel;
        this.maxBoostFuel = Config.player.maxBoostFuel;
        this.boostRechargeRate = Config.player.boostRechargeRate;
        this.boostDrainRate = Config.player.boostDrainRate;
        this.boostEffects = [];
        this.boostSound = null;
        this.isTractorBeamActive = false;
        this.nearestPlanet = null;
        this.nearestPlanetDistance = Infinity;
        this.wormholes = [];
        this.resourcesCollected = 0;
        this.isLoading = true;
        this.loadingProgress = 0;
        this.isTutorialVisible = false;
        this.universeSize = Config.universe.size;
        this.minimapElements = [];
        this.playerSector = "ALPHA-1";
        this.minimapUpdateTimer = 0;
        this.minimapUpdateInterval = Config.ui.minimapUpdateInterval;
        this.score = 0;
        
        // Ship upgrades system
        this.upgrades = {
            // Engine upgrades
            engineLevel: 0,
            maxEngineLevel: 5,
            engineUpgradeCost: 50,
            
            // Shield upgrades
            shieldLevel: 0,
            maxShieldLevel: 5,
            shieldUpgradeCost: 60,
            
            // Tractor beam upgrades
            tractorBeamLevel: 0,
            maxTractorBeamLevel: 5,
            tractorBeamUpgradeCost: 40,
            
            // Bomb upgrades
            bombCapacityLevel: 0,
            maxBombCapacityLevel: 5,
            bombCapacityUpgradeCost: 70,
            
            // Boost upgrades
            boostLevel: 0,
            maxBoostLevel: 5,
            boostUpgradeCost: 55,

            // Flag to show the upgrade UI
            isUpgradeUIVisible: false
        };
        
        this.planetsManager = {
            minPlanetCount: Config.planets.minCount,
            maxPlanetDistance: Config.planets.maxDistance,
            checkInterval: Config.planets.checkInterval,
            lastCheck: 0,
            checkTimer: 0,
            planetsPerSector: Config.planets.planetsPerSector,
            sectors: {},
            sectorSize: Config.universe.sectorSize,
        };
        this.shipOrientation = {
            yaw: 0,
            pitch: 0
        };
        this.tractorBeamEffect = null;
        this.navigationAssist = true;
        this.currentVelocity = null;
        this.activeMessages = [];
        
        // Multiplayer support
        this.multiplayer = {
            enabled: false,
            socket: null,
            playerId: null,
            playerColor: null,
            otherPlayers: new Map(),
            chatMessages: [],
            lastPositionUpdate: 0,
            lastServerMessage: 0,
            updateInterval: 100, // Increased from 50ms to 100ms for better performance
            playerLimit: 10, // Max number of players to render simultaneously
            renderedPlayers: new Set() // Track which players are currently being rendered
        };
        
        // Alien communication
        this.discoveredMessages = [
            { symbol: "⨁", meaning: "GREETINGS", discovered: false },
            { symbol: "⌬", meaning: "DANGER", discovered: false },
            { symbol: "⏣", meaning: "RESOURCES", discovered: false },
            { symbol: "⎔", meaning: "WORMHOLE", discovered: false },
            { symbol: "⏱", meaning: "TIME", discovered: false },
            { symbol: "⌭", meaning: "WEAPON", discovered: false },
            { symbol: "⌖", meaning: "TARGET", discovered: false },
            { symbol: "⌘", meaning: "COMMAND", discovered: false },
            { symbol: "⨂", meaning: "FORBIDDEN", discovered: false }
        ];
        
        // Planetary defenses
        this.planetaryDefenses = {
            enabled: true,
            turretProjectiles: [],
            missileProjectiles: [],
            shieldBubbles: [],
            lastAttackTime: 0,
            attackInterval: 5, // Seconds between planetary defense activation
        };
        
        // Initialize isPaused to true at the start
        this.isPaused = true; // Game starts paused until tutorial is dismissed
    }
    
    reset() {
        // Reset player stats
        this.bombsRemaining = Config.bombs.startingCount;
        this.bombSize = 1;
        this.planetsDestroyed = 0;
        this.shields = 100;
        this.speed = 0;
        this.isBoostActive = false;
        this.boostFuel = Config.player.maxBoostFuel;
        this.score = 0;
        this.resourcesCollected = 0;
        
        // Reset upgrades
        this.upgrades = {
            engineLevel: 0,
            maxEngineLevel: 5,
            engineUpgradeCost: 50,
            
            shieldLevel: 0,
            maxShieldLevel: 5,
            shieldUpgradeCost: 60,
            
            tractorBeamLevel: 0,
            maxTractorBeamLevel: 5,
            tractorBeamUpgradeCost: 40,
            
            bombCapacityLevel: 0,
            maxBombCapacityLevel: 5,
            bombCapacityUpgradeCost: 70,
            
            boostLevel: 0,
            maxBoostLevel: 5,
            boostUpgradeCost: 55,
            
            isUpgradeUIVisible: false
        };
        
        // Reset state
        this.isAlienMode = false;
        this.landedOnPlanet = null;
        
        // Clear arrays
        this.planets = [];
        this.bombs = [];
        this.debris = [];
        this.explosions = [];
        this.particles = [];
        this.wormholes = [];
        this.planetaryDefenses.turretProjectiles = [];
        this.planetaryDefenses.missileProjectiles = [];
        this.planetaryDefenses.shieldBubbles = [];
        
        // Update UI
        this.updateUI();
    }
    
    updateUI() {
        // Update basic stats in HUD
        const speedElement = document.getElementById('speed');
        const shieldsElement = document.getElementById('shields');
        const bombsElement = document.getElementById('bombs');
        const destroyedElement = document.getElementById('destroyed');
        const coordinatesElement = document.getElementById('coordinates');
        const sectorElement = document.getElementById('sector');
        const boostMeterFill = document.getElementById('boost-meter-fill');
        const scoreElement = document.getElementById('score');
        const resourcesElement = document.getElementById('resources');
        
        if (speedElement) speedElement.textContent = Math.abs(this.speed).toFixed(1);
        if (shieldsElement) shieldsElement.textContent = this.shields;
        if (bombsElement) bombsElement.textContent = this.bombsRemaining;
        if (destroyedElement) destroyedElement.textContent = this.planetsDestroyed;
        if (scoreElement) scoreElement.textContent = this.score;
        if (resourcesElement) resourcesElement.textContent = this.resourcesCollected;
        
        // Update coordinates if player ship exists
        if (this.playerShip) {
            const x = Math.round(this.playerShip.position.x);
            const y = Math.round(this.playerShip.position.y);
            const z = Math.round(this.playerShip.position.z);
            if (coordinatesElement) coordinatesElement.textContent = `${x},${y},${z}`;
            if (sectorElement) sectorElement.textContent = this.playerSector;
        }
        
        // Update boost meter
        if (boostMeterFill) {
            const boostPercentage = this.boostFuel / this.maxBoostFuel;
            boostMeterFill.style.transform = `scaleX(${boostPercentage})`;
            
            // Change color based on fuel level
            if (boostPercentage < 0.3) {
                boostMeterFill.style.backgroundColor = '#ff3333';
            } else if (boostPercentage < 0.6) {
                boostMeterFill.style.backgroundColor = '#ffff33';
            } else {
                boostMeterFill.style.backgroundColor = '#00ffff';
            }
        }
    }
    
    updateScore(points) {
        this.score += points;
        this.updateUI();
    }
    
    // Ship upgrade methods
    
    // Check if an upgrade is available
    canUpgrade(upgradeType) {
        const upgrades = this.upgrades;
        
        switch (upgradeType) {
            case 'engine':
                return upgrades.engineLevel < upgrades.maxEngineLevel && 
                       this.resourcesCollected >= this.getUpgradeCost('engine');
            case 'shield':
                return upgrades.shieldLevel < upgrades.maxShieldLevel && 
                       this.resourcesCollected >= this.getUpgradeCost('shield');
            case 'tractorBeam':
                return upgrades.tractorBeamLevel < upgrades.maxTractorBeamLevel && 
                       this.resourcesCollected >= this.getUpgradeCost('tractorBeam');
            case 'bombCapacity':
                return upgrades.bombCapacityLevel < upgrades.maxBombCapacityLevel && 
                       this.resourcesCollected >= this.getUpgradeCost('bombCapacity');
            case 'boost':
                return upgrades.boostLevel < upgrades.maxBoostLevel && 
                       this.resourcesCollected >= this.getUpgradeCost('boost');
            default:
                return false;
        }
    }
    
    // Get the cost of an upgrade
    getUpgradeCost(upgradeType) {
        const upgrades = this.upgrades;
        const level = upgrades[`${upgradeType}Level`];
        const baseCost = upgrades[`${upgradeType}UpgradeCost`];
        
        // Each level costs 50% more than the previous
        return Math.round(baseCost * Math.pow(1.5, level));
    }
    
    // Apply an upgrade
    applyUpgrade(upgradeType) {
        if (!this.canUpgrade(upgradeType)) return false;
        
        const cost = this.getUpgradeCost(upgradeType);
        this.resourcesCollected -= cost;
        
        const upgrades = this.upgrades;
        
        switch (upgradeType) {
            case 'engine':
                upgrades.engineLevel++;
                // Increase max speed by 20% per level
                this.maxSpeed = Config.player.maxSpeed * (1 + 0.2 * upgrades.engineLevel);
                break;
                
            case 'shield':
                upgrades.shieldLevel++;
                // Increase max shields by 25% per level
                const baseShields = 100;
                this.shields = baseShields * (1 + 0.25 * upgrades.shieldLevel);
                break;
                
            case 'tractorBeam':
                upgrades.tractorBeamLevel++;
                // Tractor beam enhancements are applied in the tractor beam logic
                break;
                
            case 'bombCapacity':
                upgrades.bombCapacityLevel++;
                // Increase bomb capacity by 1 per level
                this.bombsRemaining += 1;
                Config.bombs.startingCount = 3 + upgrades.bombCapacityLevel;
                break;
                
            case 'boost':
                upgrades.boostLevel++;
                // Improve boost in various ways
                this.maxBoostFuel = Config.player.maxBoostFuel * (1 + 0.3 * upgrades.boostLevel);
                this.boostFuel = this.maxBoostFuel; // Refill boost
                this.boostRechargeRate = Config.player.boostRechargeRate * (1 + 0.2 * upgrades.boostLevel);
                break;
        }
        
        this.updateUI();
        return true;
    }
    
    // Get tractor beam range based on upgrade level
    getTractorBeamRange() {
        const baseRange = 100;
        return baseRange * (1 + 0.3 * this.upgrades.tractorBeamLevel);
    }
    
    // Get tractor beam pull strength based on upgrade level
    getTractorBeamStrength() {
        const baseStrength = 30;
        return baseStrength * (1 + 0.25 * this.upgrades.tractorBeamLevel);
    }
    
    // Toggle upgrade UI visibility
    toggleUpgradeUI() {
        this.upgrades.isUpgradeUIVisible = !this.upgrades.isUpgradeUIVisible;
        this.isPaused = this.upgrades.isUpgradeUIVisible; // Pause game while upgrades are open
    }
    
    // Set shield damage based on current level
    takeDamage(amount) {
        // Reduce damage based on shield level (10% reduction per level)
        const damageReduction = 0.1 * this.upgrades.shieldLevel;
        const reducedDamage = amount * (1 - damageReduction);
        
        // Apply damage to shields
        this.shields = Math.max(0, this.shields - reducedDamage);
        this.updateUI();
        
        // Check if shields are depleted
        if (this.shields <= 0) {
            // Game over logic could go here
            return true; // Shields depleted
        }
        return false; // Shields still active
    }
}

// Create and export a singleton instance
const gameState = new GameState();
export default gameState;
