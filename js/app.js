/**
 * COSMIC CHAOS: UFO DESTROYER
 * Main application entry point
 */

import gameState from './modules/game-state.js';
import inputHandler from './modules/input-handler.js';
import * as ui from './modules/ui.js';
import * as network from './modules/network.js';
import * as portal from './modules/portal.js';
import Config from './config.js';
import { updateShipControls, updateAlienControls } from './modules/player.js';
import * as planetGenerator from './modules/planet-generator.js';
import { showMessage, createExplosionFlash } from './modules/ui.js';
import mobileControls from './modules/mobile-controls.js';

// Main application class
class GameApp {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.clock = null;
        
        // Initialize the game
        this.initialize();
    }
    
    // Initialize the game
    initialize() {
        // Set up Three.js renderer and scene
        this.initThreeJS();
        
        // Initialize game systems
        this.initGameSystems();
        
        // Initialize performance optimization systems
        this.initPerformanceOptimizations();
        
        // Check if we arrived via portal
        const isFromPortal = portal.checkIfFromPortal();
        
        // Set up lighting
        this.initLighting();
        
        // Create the starfield background
        this.createStarfield();
        
        // Create player ship
        this.createPlayerShip();
        
        // Create alien model
        this.createAlienModel();
        
        // Create planets
        this.createPlanets();
        
        // Create portal(s)
        if (isFromPortal) {
            portal.createStartPortal(this.scene);
        }
        
        // Create exit portal
        portal.createExitPortal(this.scene);
        
        // Create a wormhole
        this.createWormhole();
        
        // Add multiplayer toggle button
        this.addMultiplayerToggle();
        
        // Add mobile controls toggle button
        this.addMobileControlsToggle();
        
        // Add ship upgrades button
        ui.addUpgradesButton();
        
        // Initialize alien symbols
        ui.updateAlienSymbols();
        
        // Start animation loop
        this.animate();
        
        // Expose public methods
        this.exposePublicMethods();
    }
    
    // Initialize Three.js
    initThreeJS() {
        // Create main scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
        
        // Add fog for atmospheric effect
        this.scene.fog = new THREE.FogExp2(0x000011, Config.graphics.fogDensity);
        
        // Create camera with far plane for big universe
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            Config.graphics.farPlane
        );
        gameState.camera = camera;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // Create clock for timing
        this.clock = new THREE.Clock();
        gameState.clock = this.clock;
        
        // Create flat scene for alien exploration
        gameState.flatScene = new THREE.Scene();
        gameState.flatScene.background = new THREE.Color(0x000011);
        
        // Store reference to main scene
        gameState.mainScene = this.scene;
        gameState.currentScene = this.scene;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            gameState.camera.aspect = window.innerWidth / window.innerHeight;
            gameState.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    // Set up lighting
    initLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x333344);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(1000, 1000, 1000);
        this.scene.add(sunLight);
        
        // Add a point light to the player's ship for better visibility
        const shipLight = new THREE.PointLight(0x7777ff, 0.5, 50);
        shipLight.position.set(0, 0, 0);
        gameState.shipLight = shipLight;
    }
    
    // Create starfield background
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            sizeAttenuation: false
        });
        
        const starVertices = [];
        
        // Create stars
        for (let i = 0; i < 200000; i++) {
            const x = (Math.random() - 0.5) * gameState.universeSize;
            const y = (Math.random() - 0.5) * gameState.universeSize;
            const z = (Math.random() - 0.5) * gameState.universeSize;
            
            starVertices.push(x, y, z);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
        gameState.stars.push(stars);
        
        // Create distant nebulae
        this.createDistantNebulae();
    }
    
    // Create distant nebulae for visual interest
    createDistantNebulae() {
        // Create several colorful nebulae in the distance
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
        
        for (let i = 0; i < 20; i++) {
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
            
            this.scene.add(nebula);
        }
    }
    
    // Create player ship
    createPlayerShip() {
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
        
        // Add the ship light to the ship
        shipGroup.add(gameState.shipLight);
        
        // Set initial position
        shipGroup.position.set(Config.player.startPosition.x, Config.player.startPosition.y, Config.player.startPosition.z);
        
        // Initialize ship orientation tracking to prevent unwanted rotation
        gameState.shipOrientation = {
            yaw: 0,
            pitch: 0
        };
        
        // Add ship to scene
        this.scene.add(shipGroup);
        gameState.playerShip = shipGroup;
        
        // Set initial camera position relative to ship
        gameState.camera.position.set(0, 3, 10);
        shipGroup.add(gameState.camera);
    }
    
    // Create alien model
    createAlienModel() {
        // Create a simple alien model
        const alienGroup = new THREE.Group();
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        headGeometry.scale(0.8, 1.2, 1);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.6;
        alienGroup.add(head);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0.65, 0.15);
        alienGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0.65, 0.15);
        alienGroup.add(rightEye);
        
        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.4, 16);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        alienGroup.add(body);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.2, 0.3, 0);
        leftArm.rotation.z = Math.PI / 4;
        alienGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.2, 0.3, 0);
        rightArm.rotation.z = -Math.PI / 4;
        alienGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.07, 0.05, 0);
        alienGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.07, 0.05, 0);
        alienGroup.add(rightLeg);
        
        // Add a small light to see in the dark
        const alienLight = new THREE.PointLight(0x88aaff, 0.7, 10);
        alienLight.position.set(0, 0.5, 0);
        alienGroup.add(alienLight);
        
        // Hide initially
        alienGroup.visible = false;
        this.scene.add(alienGroup);
        gameState.alienModel = alienGroup;
    }
    
    // Create planets
    createPlanets() {
        // Initialize the planet generation system
        planetGenerator.initializePlanetSystem(this.scene);
    }
    
    // Create a wormhole
    createWormhole() {
        // Ensure we have a main scene
        if (!gameState.mainScene) {
            console.error("Cannot create wormhole: main scene does not exist.");
            return;
        }
        
        // Create a base group for the wormhole
        const wormholeGroup = new THREE.Group();
        
        // Random position for the wormhole
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * Config.universe.size * 0.5,
            (Math.random() - 0.5) * Config.universe.size * 0.5,
            (Math.random() - 0.5) * Config.universe.size * 0.5
        );
        
        // Set position
        wormholeGroup.position.copy(position);
        
        // Create the torus geometry
        const torusGeometry = new THREE.TorusGeometry(15, 3, 16, 100);
        const torusMaterial = new THREE.MeshPhongMaterial({
            color: 0x8844ff,
            emissive: 0x4422aa,
            shininess: 30
        });
        
        // Create the torus mesh
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        
        // Create the black hole (center)
        const blackHoleGeometry = new THREE.SphereGeometry(10, 32, 32);
        const blackHoleMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7
        });
        
        // Create the black hole mesh
        const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
        
        // Create ambient light for the wormhole
        const ambientLight = new THREE.AmbientLight(0x4400dd, 0.5);
        
        // Create point light for the wormhole
        const pointLight = new THREE.PointLight(0x8844ff, 1, 100);
        
        // Add everything to the wormhole group
        wormholeGroup.add(torus);
        wormholeGroup.add(blackHole);
        wormholeGroup.add(ambientLight);
        wormholeGroup.add(pointLight);
        
        // Add to scene
        gameState.mainScene.add(wormholeGroup);
        
        // Store destination information
        const destination = {
            x: (Math.random() - 0.5) * Config.universe.size * 0.8,
            y: (Math.random() - 0.5) * Config.universe.size * 0.8,
            z: (Math.random() - 0.5) * Config.universe.size * 0.8
        };
        
        // Create a wormhole object to store in game state
        const wormhole = {
            group: wormholeGroup,
            torus: torus,
            blackHole: blackHole,
            position: position,
            destination: destination,
            rotationSpeed: Math.random() * 0.01 + 0.005,
            pulsateSpeed: Math.random() * 0.002 + 0.001,
            pulsateDirection: 1,
            pulsateAmount: 0
        };
        
        // Add to game state
        gameState.wormholes.push(wormhole);
        
        // Apply Level of Detail (LOD) optimization
        import('./modules/lod-manager.js').then(module => {
            module.applyWormholeLOD(wormhole);
        });
        
        console.log("Created wormhole at", position);
    }
    
    // Add multiplayer toggle button
    addMultiplayerToggle() {
        const button = document.createElement('button');
        button.id = 'multiplayer-toggle';
        button.textContent = 'ENABLE MULTIPLAYER';
        button.style.position = 'absolute';
        button.style.top = '440px';  // Position below ship upgrades
        button.style.right = '20px'; // Align with right edge
        button.style.padding = '10px';
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        button.style.color = '#0ff';
        button.style.border = '1px solid #0ff';
        button.style.borderRadius = '10px';
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
        
        // Add a debounce mechanism to prevent rapid toggling
        let lastClickTime = 0;
        
        button.addEventListener('click', () => {
            try {
                // Debounce clicks to prevent rapid toggling which can cause issues
                const now = Date.now();
                if (now - lastClickTime < 2000) {
                    console.log('Toggling too quickly, ignoring click');
                    return;
                }
                lastClickTime = now;
                
                if (gameState.multiplayer.enabled) {
                    // Disable multiplayer with explicit user intention flag
                    network.disableMultiplayer(true);
                    button.textContent = 'ENABLE MULTIPLAYER';
                    
                    // Ensure game state is clean
                    gameState.multiplayer.otherPlayers.clear();
                } else {
                    // Show connecting status
                    button.textContent = 'CONNECTING...';
                    button.disabled = true; // Prevent additional clicks during connection
                    
                    // Enable multiplayer
                    network.initMultiplayer();
                    
                    // Reset button state after a delay
                    setTimeout(() => {
                        button.disabled = false;
                        button.textContent = gameState.multiplayer.enabled ? 
                            'DISABLE MULTIPLAYER' : 'ENABLE MULTIPLAYER';
                    }, 3000);
                }
            } catch (error) {
                console.error("Error toggling multiplayer:", error);
                button.disabled = false;
                button.textContent = 'ENABLE MULTIPLAYER';
            }
        });
        
        document.getElementById('ui-container').appendChild(button);
    }
    
    // Add mobile controls toggle button
    addMobileControlsToggle() {
        const uiContainer = document.getElementById('ui-container');
        
        // Create mobile controls toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'mobile-controls-toggle';
        toggleButton.textContent = 'TOGGLE MOBILE CONTROLS';
        toggleButton.style.position = 'absolute';
        toggleButton.style.top = '490px';
        toggleButton.style.right = '20px';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        toggleButton.style.color = '#0ff';
        toggleButton.style.border = '1px solid #0ff';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.zIndex = '1000';
        toggleButton.style.pointerEvents = 'auto';
        
        toggleButton.addEventListener('click', () => {
            mobileControls.toggle();
        });
        
        uiContainer.appendChild(toggleButton);
    }
    
    // Hide tutorial
    hideTutorial() {
        document.getElementById('tutorial').classList.add('hidden');
        gameState.isTutorialVisible = false;
        gameState.isPaused = false; // Unpause the game when tutorial is dismissed
        
        // Reset input state to prevent accumulated movements
        if (inputHandler) {
            inputHandler.inputState.mouseX = 0;
            inputHandler.inputState.mouseY = 0;
        }
    }
    
    // Animation loop
    animate() {
        try {
            // Exit if page is not visible
            if (document.hidden) {
                requestAnimationFrame(() => this.animate());
                return;
            }
            
            // Request next frame
            requestAnimationFrame(() => this.animate());
            
            // Handle loading screen
            if (gameState.isLoading) {
                this.updateLoading();
                return;
            }
            
            // Check if game is paused (tutorial or other UI screen is showing)
            const isPaused = gameState.isTutorialVisible || gameState.isPaused;
            
            // Get delta time
            const delta = this.clock.getDelta();
            
            // Only update game elements if not paused
            if (!isPaused) {
                // Update controls
                if (gameState.isAlienMode) {
                    updateAlienControls(delta, inputHandler.inputState);
                } else {
                    updateShipControls(delta, inputHandler.inputState);
                }
                
                // Check and update planets
                planetGenerator.checkAndGeneratePlanets(delta);
                
                // Update nearest planet information
                this.updateNearestPlanet();
                
                // Check portal entry
                portal.checkStartPortalEntry();
                portal.checkExitPortalEntry();
                
                // Update portals
                portal.updatePortals(delta);
                
                // Update bombs
                this.updateBombs(delta);
                
                // Update debris and particles using object pooling
                this.updatePooledObjects(delta);
                
                // Update tractor beam
                this.updateTractorBeam();
                
                // Create random debris at a fixed interval for player to collect
                this.updateDebrisGeneration(delta);
                
                // Update planetary defense systems
                import('./modules/planetary-defense.js').then(module => {
                    module.updatePlanetaryDefenses(delta);
                });
                
                // Update LOD (Level of Detail) for objects
                import('./modules/lod-manager.js').then(module => {
                    module.updateLOD();
                });
                
                // Send position updates if in multiplayer mode - less frequently for better performance
                if (gameState.multiplayer.enabled && !gameState.isAlienMode) {
                    // Only update every 3rd frame or so, based on a timing threshold
                    const now = Date.now();
                    // Increase update interval to reduce network load (was 50ms in game-state.js)
                    if (now - gameState.multiplayer.lastPositionUpdate >= 100) {
                        network.sendPositionUpdate();
                    }
                }
            }
            
            // Always update UI even when paused
            ui.updateMinimap();
            ui.updateOrientationIndicator();
            ui.updateUpgradesUI();
            gameState.updateUI();
            
            // Check multiplayer connection status less frequently
            const now = Date.now();
            if (!gameState.lastConnectionCheck || now - gameState.lastConnectionCheck > 5000) {
                this.checkMultiplayerConnection();
                gameState.lastConnectionCheck = now;
            }
            
            // Render the current scene
            this.renderer.render(gameState.currentScene, gameState.camera);
        } catch (error) {
            console.error("Error in animation loop:", error);
            // Attempt to continue the animation loop despite the error
            requestAnimationFrame(() => this.animate());
        }
    }
    
    // Check multiplayer connection status
    checkMultiplayerConnection() {
        if (!gameState.multiplayer.enabled) return;
        
        const now = Date.now();
        const lastMessageTime = gameState.multiplayer.lastServerMessage;
        
        // If we haven't received a message from the server in 15 seconds, try to reconnect
        if (lastMessageTime && now - lastMessageTime > 15000) {
            console.warn('Connection to server may be lost. Attempting to reconnect...');
            showMessage('CONNECTION LOST - RECONNECTING...', 3000);
            
            // Close current connection if still open
            if (gameState.multiplayer.socket) {
                gameState.multiplayer.socket.close();
            }
            
            // Try to reconnect after a short delay
            setTimeout(() => {
                network.initMultiplayer();
            }, 1000);
            
            // Reset the timestamp to prevent multiple reconnection attempts
            gameState.multiplayer.lastServerMessage = now;
        }
    }
    
    // Update loading progress
    updateLoading() {
        // Simulate loading progress
        gameState.loadingProgress += 0.5;
        document.getElementById('loading-bar').style.width = Math.min(100, gameState.loadingProgress) + '%';
        
        // Complete loading
        if (gameState.loadingProgress >= 100) {
            gameState.isLoading = false;
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('tutorial').classList.remove('hidden');
            gameState.isTutorialVisible = true;
        }
    }
    
    // Update bombs countdown and state
    updateBombs(delta) {
        // Loop through bombs in reverse to safely remove items
        for (let i = gameState.bombs.length - 1; i >= 0; i--) {
            const bomb = gameState.bombs[i];
            if (!bomb.isActive) continue;
            
            // Update countdown
            bomb.countdown -= delta;
            
            // Check if bomb should explode
            if (bomb.countdown <= 0) {
                // Remove bomb
                gameState.mainScene.remove(bomb.group);
                bomb.isActive = false;
                
                // Create explosion
                const explosionPosition = new THREE.Vector3();
                bomb.group.getWorldPosition(explosionPosition);
                
                // Create explosion effect based on bomb size
                const explosionSize = 30 * bomb.size;
                
                // Flash screen proportional to bomb size
                const flashColor = `rgba(255, 100, 0, ${0.3 * bomb.size})`;
                createExplosionFlash(flashColor);
                
                // Show explosion message
                showMessage(`EXPLOSION DETECTED - MAGNITUDE ${bomb.size}`, 2000);
                
                // Destroy planet
                if (bomb.targetPlanet && !bomb.targetPlanet.isDestroyed) {
                    planetGenerator.destroyPlanet(bomb.targetPlanet);
                }
                
                // Remove bomb from array
                gameState.bombs.splice(i, 1);
            }
        }
    }
    
    // Expose public methods for external access
    exposePublicMethods() {
        // Create global access to game methods
        window.gameApp = {
            hideTutorial: this.hideTutorial,
            createDebris: (position, count, size) => this.createDebris(position, count, size)
        };
        
        // Expose portal module for minimap access
        window.portal = portal;
    }
    
    // Initialize game systems
    initGameSystems() {
        // Initialize planets manager
        if (!gameState.planetsManager) {
            gameState.planetsManager = {
                minPlanetCount: Config.planets.minCount,
                maxPlanetDistance: Config.planets.maxDistance,
                checkInterval: Config.planets.checkInterval,
                checkTimer: 0,
                lastCheck: 0,
                planetsPerSector: Config.planets.planetsPerSector,
                sectors: {},
                sectorSize: Config.universe.sectorSize,
            };
        }
        
        // Reset state properties
        gameState.planets = [];
        gameState.stars = [];
        gameState.wormholes = [];
        gameState.nearestPlanet = null;
        gameState.nearestPlanetDistance = Infinity;
        gameState.playerSector = "ALPHA-1";
    }
    
    // Update nearest planet information
    updateNearestPlanet() {
        let nearest = null;
        let minDistance = Infinity;
        
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        // Loop through all planets to find the nearest one
        gameState.planets.forEach(planet => {
            if (planet.isDestroyed) return;
            
            const planetPosition = new THREE.Vector3();
            planet.group.getWorldPosition(planetPosition);
            
            // Calculate distance (accounting for planet size)
            const distance = shipPosition.distanceTo(planetPosition) - planet.size;
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = planet;
            }
        });
        
        // Update game state
        gameState.nearestPlanet = nearest;
        gameState.nearestPlanetDistance = minDistance;
        
        // Update UI elements
        if (nearest) {
            document.getElementById('planet-name').textContent = nearest.name;
            document.getElementById('planet-distance').textContent = Math.floor(minDistance);
            document.getElementById('planet-composition').textContent = nearest.type;
            document.getElementById('planet-status').textContent = nearest.hasBomb ? 'BOMB PLANTED' : 'INTACT';
        } else {
            document.getElementById('planet-name').textContent = 'NONE';
            document.getElementById('planet-distance').textContent = '∞';
            document.getElementById('planet-composition').textContent = 'UNKNOWN';
            document.getElementById('planet-status').textContent = 'INTACT';
        }
    }
    
    // Update tractor beam
    updateTractorBeam() {
        // Only active when not in alien mode and tractor beam is on
        if (gameState.isAlienMode || !gameState.isTractorBeamActive) {
            // Remove tractor beam if it exists
            if (gameState.tractorBeamEffect) {
                gameState.mainScene.remove(gameState.tractorBeamEffect);
                gameState.tractorBeamEffect = null;
            }
            return;
        }
        
        // Create tractor beam if it doesn't exist
        if (!gameState.tractorBeamEffect) {
            const beamGeometry = new THREE.CylinderGeometry(5, 20, 100, 16, 1, true);
            const beamMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            
            gameState.tractorBeamEffect = new THREE.Mesh(beamGeometry, beamMaterial);
            gameState.mainScene.add(gameState.tractorBeamEffect);
        }
        
        // Position and orient tractor beam in front of the ship
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        // Forward direction from ship
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyQuaternion(gameState.playerShip.quaternion);
        
        // Position beam in front of ship
        gameState.tractorBeamEffect.position.copy(shipPosition);
        gameState.tractorBeamEffect.position.add(forwardVector.multiplyScalar(50));
        
        // Rotate beam to match ship orientation
        gameState.tractorBeamEffect.quaternion.copy(gameState.playerShip.quaternion);
        gameState.tractorBeamEffect.rotation.x += Math.PI / 2; // Adjust to point forward
        
        // Animate beam effect
        const time = Date.now() * 0.001;
        gameState.tractorBeamEffect.material.opacity = 0.2 + Math.sin(time * 5) * 0.1;
        
        // Update debris interaction with tractor beam
        this.updateDebrisWithTractorBeam();
    }
    
    // Update debris interaction with tractor beam
    updateDebrisWithTractorBeam() {
        if (!gameState.isTractorBeamActive || gameState.isAlienMode) return;
        
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        // Forward direction from ship
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyQuaternion(gameState.playerShip.quaternion);
        
        // Define tractor beam properties
        const tractorBeamRange = 100 * (1 + 0.3 * gameState.upgrades.tractorBeamLevel); // Range increases with upgrades
        const tractorBeamWidth = 20 * (1 + 0.15 * gameState.upgrades.tractorBeamLevel); // Width increases with upgrades
        const tractorBeamPullStrength = 30 * (1 + 0.25 * gameState.upgrades.tractorBeamLevel); // Strength increases with upgrades
        
        // Process each debris item
        for (let i = gameState.debris.length - 1; i >= 0; i--) {
            const debris = gameState.debris[i];
            const debrisPosition = debris.mesh.position.clone();
            
            // Calculate distance to the tractor beam axis (using point-line distance formula)
            const shipToDebris = debrisPosition.clone().sub(shipPosition);
            const projectionLength = shipToDebris.dot(forwardVector);
            
            // Skip if behind the ship or too far ahead
            if (projectionLength < 0 || projectionLength > tractorBeamRange) continue;
            
            // Project the point onto the beam axis
            const projectedPoint = shipPosition.clone().add(forwardVector.clone().multiplyScalar(projectionLength));
            
            // Calculate perpendicular distance to the beam axis
            const perpendicularDistance = debrisPosition.distanceTo(projectedPoint);
            
            // Skip if outside the beam width
            if (perpendicularDistance > tractorBeamWidth) continue;
            
            // Calculate pull direction (toward the beam axis, then forward along it)
            const pullDirection = new THREE.Vector3();
            
            // Component toward beam axis (stronger the closer to axis)
            if (perpendicularDistance > 0.1) {
                const towardAxis = projectedPoint.clone().sub(debrisPosition).normalize();
                const axisWeight = 1 - (perpendicularDistance / tractorBeamWidth);
                pullDirection.add(towardAxis.multiplyScalar(axisWeight));
            }
            
            // Component toward ship (stronger the closer to ship)
            const towardShip = shipPosition.clone().sub(debrisPosition).normalize();
            const distanceRatio = 1 - (debrisPosition.distanceTo(shipPosition) / tractorBeamRange);
            pullDirection.add(towardShip.multiplyScalar(distanceRatio));
            
            // Normalize the final direction
            if (pullDirection.length() > 0) {
                pullDirection.normalize();
                
                // Apply pull force to debris
                const pullStrength = tractorBeamPullStrength * (1 - (debrisPosition.distanceTo(shipPosition) / tractorBeamRange));
                debris.velocity.add(pullDirection.multiplyScalar(pullStrength * this.clock.getDelta()));
            }
            
            // Check if close enough to collect
            if (debrisPosition.distanceTo(shipPosition) < 5) {
                // Add resource value
                gameState.resourcesCollected += debris.value;
                
                // Add score based on debris value
                const scoreValue = debris.value * 10;
                gameState.updateScore(scoreValue);
                
                // Show message
                showMessage(`RESOURCE COLLECTED: +${debris.value} (+${scoreValue} POINTS)`, 1000);
                
                // Create a visual effect for resource collection
                this.createResourceCollectionEffect(debrisPosition);
                
                // Occasionally remind player about upgrades
                if (Math.random() < 0.2 && gameState.resourcesCollected >= 40) {
                    // Don't show this reminder too frequently
                    const now = Date.now();
                    if (!this.lastUpgradeReminder || now - this.lastUpgradeReminder > 30000) { // 30 seconds between reminders
                        showMessage("RESOURCES CAN BE USED FOR SHIP UPGRADES - PRESS SHIP UPGRADES BUTTON", 3000);
                        this.lastUpgradeReminder = now;
                    }
                }
                
                // Remove debris
                gameState.mainScene.remove(debris.mesh);
                gameState.debris.splice(i, 1);
            }
        }
    }
    
    // Create a visual effect when collecting resources
    createResourceCollectionEffect(position) {
        // Create a flash of light at the collection point
        const light = new THREE.PointLight(0x00ffff, 2, 10);
        light.position.copy(position);
        gameState.mainScene.add(light);
        
        // Fade out and remove the light
        setTimeout(() => {
            light.intensity = 1;
            setTimeout(() => {
                light.intensity = 0.5;
                setTimeout(() => {
                    gameState.mainScene.remove(light);
                }, 100);
            }, 100);
        }, 100);
        
        // Create particle burst effect using object pool
        import('./modules/object-pool.js').then(module => {
            for (let i = 0; i < 5; i++) {
                // Create particles that radiate outward
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                );
                
                module.getParticle(gameState.mainScene, {
                    position: position.clone(),
                    velocity: velocity,
                    color: 0x00ffff,
                    size: 0.5,
                    life: 0.5
                });
            }
        });
    }
    
    // Update debris positions and rotations
    updateDebris(delta) {
        // Loop through debris in reverse to safely remove items
        for (let i = gameState.debris.length - 1; i >= 0; i--) {
            const debris = gameState.debris[i];
            
            // Update position based on velocity
            debris.mesh.position.add(debris.velocity.clone().multiplyScalar(delta));
            
            // Update rotation based on rotation velocity
            debris.mesh.rotation.x += debris.rotationVelocity.x * delta;
            debris.mesh.rotation.y += debris.rotationVelocity.y * delta;
            debris.mesh.rotation.z += debris.rotationVelocity.z * delta;
            
            // Apply drag to slow down over time
            debris.velocity.multiplyScalar(0.99);
            
            // Update lifetime
            debris.life -= delta;
            
            // Remove if lifetime is over
            if (debris.life <= 0) {
                gameState.mainScene.remove(debris.mesh);
                gameState.debris.splice(i, 1);
            }
        }
    }
    
    // Create debris using object pooling
    createDebris(position, count = 5, size = 1) {
        import('./modules/object-pool.js').then(module => {
            for (let i = 0; i < count; i++) {
                // Random velocity for each debris piece
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20
                );
                
                // Random size variation
                const debrisSize = size * (0.5 + Math.random() * 0.5);
                
                // Random color
                const colors = [0x777777, 0x555555, 0x999999];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                // Get debris from pool
                module.getDebris(this.scene, {
                    position: position.clone(),
                    velocity: velocity,
                    size: debrisSize,
                    color: color,
                    life: 5 + Math.random() * 5 // 5-10 seconds lifespan
                });
            }
        });
    }
    
    // Initialize performance optimization systems
    initPerformanceOptimizations() {
        console.log("Initializing performance optimization systems");
        
        // Initialize object pooling system
        import('./modules/object-pool.js').then(module => {
            module.initializeObjectPools(this.scene);
        });
        
        // Initialize Level of Detail (LOD) system
        import('./modules/lod-manager.js').then(module => {
            module.initializeLOD(this.scene);
        });
    }
    
    // Update all pooled objects (debris, particles, etc.)
    updatePooledObjects(delta) {
        // Update object pools
        import('./modules/object-pool.js').then(module => {
            module.updateObjectPools(delta);
        });
    }
    
    // Generate debris randomly for the player to collect
    updateDebrisGeneration(delta) {
        // Initialize the timer if it doesn't exist
        if (!this.debrisGenerationTimer) {
            this.debrisGenerationTimer = 0;
            this.debrisGenerationInterval = 8; // Generate debris every 8 seconds
        }
        
        // Update the timer
        this.debrisGenerationTimer += delta;
        
        // Check if it's time to generate debris
        if (this.debrisGenerationTimer >= this.debrisGenerationInterval) {
            // Reset timer
            this.debrisGenerationTimer = 0;
            
            // Get player position
            const playerPosition = new THREE.Vector3();
            gameState.playerShip.getWorldPosition(playerPosition);
            
            // Generate debris at random positions around the player
            const debrisCount = Math.floor(Math.random() * 3) + 2; // 2-4 pieces
            
            for (let i = 0; i < debrisCount; i++) {
                // Random position within 80-150 units of the player
                const distance = 80 + Math.random() * 70;
                const angle = Math.random() * Math.PI * 2;
                const height = (Math.random() - 0.5) * 40;
                
                const position = new THREE.Vector3(
                    playerPosition.x + Math.cos(angle) * distance,
                    playerPosition.y + height,
                    playerPosition.z + Math.sin(angle) * distance
                );
                
                // Create debris with a higher value (more valuable resource)
                import('./modules/object-pool.js').then(module => {
                    // Random velocity
                    const velocity = new THREE.Vector3(
                        (Math.random() - 0.5) * 5,
                        (Math.random() - 0.5) * 5,
                        (Math.random() - 0.5) * 5
                    );
                    
                    // Create debris with a random value between 5-20
                    const value = Math.floor(Math.random() * 16) + 5;
                    
                    // Get debris from pool with higher value
                    module.getDebris(this.scene, {
                        position: position,
                        velocity: velocity, 
                        size: 1.5 + Math.random(),
                        color: 0x88aaff, // Blueish color to distinguish valuable resources
                        life: 15, // Longer life
                        value: value // Set the resource value
                    });
                });
            }
            
            // Show a hint message occasionally
            if (Math.random() < 0.3) {
                showMessage("RESOURCE DEBRIS DETECTED NEARBY - USE TRACTOR BEAM TO COLLECT", 3000);
            }
        }
    }
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameApp();
});
