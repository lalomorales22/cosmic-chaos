/**
 * Player Module
 * Handles player ship and alien control
 */

import gameState from './game-state.js';
import Config from '../config.js';
import { showMessage, createExplosionFlash, updateBombSizeIndicator } from './ui.js';
import { sendAlienModeUpdate, sendBombPlacement } from './network.js';

// Toggle between ship and alien modes
export function toggleAlienMode() {
    if (!gameState.landedOnPlanet) return;
    
    gameState.isAlienMode = !gameState.isAlienMode;
    
    // Send alien mode update to server if multiplayer is enabled
    if (gameState.multiplayer.enabled) {
        sendAlienModeUpdate(
            gameState.isAlienMode, 
            gameState.landedOnPlanet ? gameState.landedOnPlanet.id : null
        );
    }
    
    if (gameState.isAlienMode) {
        // Exit as alien
        gameState.alienModel.visible = true;
        
        // Show bomb size indicator
        updateBombSizeIndicator(true, gameState.bombSize);
        
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
        
        // Show message about controls
        showMessage("ALIEN MODE: WASD TO MOVE, MOUSE TO LOOK, B TO CYCLE BOMB SIZE, P TO PLACE BOMB, E TO RETURN", 4000);
    } else {
        // Return to ship
        // Remove alien from flat scene and add back to main scene
        gameState.flatScene.remove(gameState.alienModel);
        gameState.mainScene.add(gameState.alienModel);
        gameState.alienModel.visible = false;
        
        // Hide bomb size indicator
        updateBombSizeIndicator(false);
        
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
        showMessage("RETURNING TO SHIP", 2000);
    }
}

// Check if alien is near the ship
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
        // In main scene
        const alienPosition = new THREE.Vector3();
        gameState.alienModel.getWorldPosition(alienPosition);
        
        const shipPosition = new THREE.Vector3();
        gameState.playerShip.getWorldPosition(shipPosition);
        
        return alienPosition.distanceTo(shipPosition) < 3;
    }
}

// Attempt to land on nearest planet
export function attemptLanding() {
    if (gameState.isAlienMode || !gameState.nearestPlanet || gameState.isLoading) return;
    
    // Check if we're close enough to land
    if (gameState.nearestPlanetDistance <= gameState.nearestPlanet.size * 2) {
        // Check if player is moving slow enough to land
        if (gameState.currentVelocity && gameState.currentVelocity.length() > 1.0) {
            // Too fast to land
            showMessage("SLOW DOWN TO LAND", 2000);
            return;
        }
        
        // Show landing message
        showMessage("LANDING SEQUENCE INITIATED", 2000);
        
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
        
        // Create landing lights effect
        createLandingEffect(planetPosition, landingPosition);
        
        // Animate landing
        let startTime = null;
        const duration = 2000; // in milliseconds
        
        // Stop any current velocity
        gameState.currentVelocity = new THREE.Vector3(0, 0, 0);
        gameState.speed = 0;
        
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
            
            // Add some gentle ship wobble during landing
            if (progress < 0.8) {
                const wobbleAmount = (1 - progress) * 0.03;
                gameState.playerShip.position.x += Math.sin(elapsed * 0.01) * wobbleAmount;
                gameState.playerShip.position.z += Math.cos(elapsed * 0.01) * wobbleAmount;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateLanding);
            } else {
                // Set landed planet
                gameState.landedOnPlanet = gameState.nearestPlanet;
                
                // Show success message
                showMessage("LANDING SUCCESSFUL", 2000);
                
                // Create a flash effect for landing
                createExplosionFlash('rgba(0, 255, 255, 0.3)');
                
                // Automatically enter alien mode after landing with a slight delay
                setTimeout(() => {
                    toggleAlienMode();
                }, 500);
            }
        }
        
        requestAnimationFrame(animateLanding);
    } else {
        showMessage("TOO FAR TO LAND", 2000);
    }
}

// Create landing effect (landing lights)
function createLandingEffect(planetPosition, landingPosition) {
    // Create landing beam effect
    const landingBeamGeometry = new THREE.CylinderGeometry(0.1, 2, 10, 16, 1, true);
    const landingBeamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const landingBeam = new THREE.Mesh(landingBeamGeometry, landingBeamMaterial);
    
    // Position the beam pointing from ship to landing spot
    const beamDirection = new THREE.Vector3().subVectors(landingPosition, planetPosition).normalize();
    landingBeam.position.copy(landingPosition.clone().sub(beamDirection.clone().multiplyScalar(5)));
    
    // Orient the beam
    landingBeam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        beamDirection
    );
    
    // Add the beam to the scene
    gameState.mainScene.add(landingBeam);
    
    // Create a point light at landing position
    const landingLight = new THREE.PointLight(0x00ffff, 2, 20);
    landingLight.position.copy(landingPosition);
    gameState.mainScene.add(landingLight);
    
    // Create landing circles/rings
    const ringGeometry = new THREE.RingGeometry(2, 2.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    const landingRing = new THREE.Mesh(ringGeometry, ringMaterial);
    landingRing.position.copy(landingPosition.clone().add(beamDirection.clone().multiplyScalar(0.1)));
    landingRing.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        beamDirection
    );
    gameState.mainScene.add(landingRing);
    
    // Animate the landing effects
    const animateLandingEffects = () => {
        // Only continue animation if landing is in progress
        if (!gameState.landedOnPlanet) {
            landingBeamMaterial.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
            ringMaterial.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;
            landingLight.intensity = 2 + Math.sin(Date.now() * 0.01) * 1;
            
            requestAnimationFrame(animateLandingEffects);
        } else {
            // Clean up landing effects once landed
            setTimeout(() => {
                gameState.mainScene.remove(landingBeam);
                gameState.mainScene.remove(landingLight);
                gameState.mainScene.remove(landingRing);
            }, 1000);
        }
    };
    
    requestAnimationFrame(animateLandingEffects);
}

// Prepare flat scene for alien exploration
function prepareFlatScene(planet) {
    // Clear any existing ground
    const existingGround = gameState.flatScene.getObjectByName('flatGround');
    if (existingGround) {
        gameState.flatScene.remove(existingGround);
    }
    
    // Create larger flat ground for alien to walk on
    const groundSize = 500;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 64, 64);
    
    // Use planet's material color with slight variation
    const planetColor = planet.mesh.material.color.clone();
    const groundColor = new THREE.Color(
        planetColor.r * (0.8 + Math.random() * 0.4),
        planetColor.g * (0.8 + Math.random() * 0.4),
        planetColor.b * (0.8 + Math.random() * 0.4)
    );
    
    // Create texture based on planet type
    let groundTexture;
    switch (planet.type) {
        case 'Rocky':
            addRockyDetails();
            break;
        case 'Frozen':
            addIceDetails();
            break;
        case 'Desert':
            addDesertDetails();
            break;
        case 'Oceanic':
            addWaterDetails();
            break;
        default:
            // Default terrain
            addDefaultDetails();
    }
    
    function addRockyDetails() {
        // Add some rocks
        for (let i = 0; i < 50; i++) {
            const rockGeometry = new THREE.DodecahedronGeometry(Math.random() * 3 + 1, 0);
            const rockMaterial = new THREE.MeshLambertMaterial({
                color: groundColor.clone().multiplyScalar(0.8 + Math.random() * 0.4)
            });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Random position
            rock.position.set(
                (Math.random() - 0.5) * groundSize * 0.8,
                Math.random() * 2,
                (Math.random() - 0.5) * groundSize * 0.8
            );
            
            // Random rotation
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            gameState.flatScene.add(rock);
        }
    }
    
    function addIceDetails() {
        // Add ice formations
        for (let i = 0; i < 30; i++) {
            const iceGeometry = new THREE.ConeGeometry(Math.random() * 4 + 2, Math.random() * 8 + 5, 5);
            const iceMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(0.9, 0.95, 1),
                transparent: true,
                opacity: 0.8,
                specular: 0xffffff,
                shininess: 100
            });
            const ice = new THREE.Mesh(iceGeometry, iceMaterial);
            
            // Random position
            ice.position.set(
                (Math.random() - 0.5) * groundSize * 0.7,
                0,
                (Math.random() - 0.5) * groundSize * 0.7
            );
            
            gameState.flatScene.add(ice);
        }
    }
    
    function addDesertDetails() {
        // Add sand dunes and rocks
        for (let i = 0; i < 40; i++) {
            const duneGeometry = new THREE.SphereGeometry(Math.random() * 5 + 3, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
            const duneMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color(0.9, 0.7, 0.3)
            });
            const dune = new THREE.Mesh(duneGeometry, duneMaterial);
            
            // Random position
            dune.position.set(
                (Math.random() - 0.5) * groundSize * 0.8,
                -1,
                (Math.random() - 0.5) * groundSize * 0.8
            );
            
            // Random rotation around y-axis
            dune.rotation.y = Math.random() * Math.PI * 2;
            
            gameState.flatScene.add(dune);
        }
    }
    
    function addWaterDetails() {
        // Create animated water surface
        const waterGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 32, 32);
        const waterMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(0.2, 0.4, 0.8),
            transparent: true,
            opacity: 0.8,
            specular: 0xffffff,
            shininess: 100
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.2;
        gameState.flatScene.add(water);
        
        // Animate water
        const waterVerts = waterGeometry.attributes.position;
        const waterAnimation = () => {
            const time = Date.now() * 0.001;
            for (let i = 0; i < waterVerts.count; i++) {
                const x = waterVerts.getX(i);
                const z = waterVerts.getZ(i);
                const y = Math.sin(x * 0.05 + time) * Math.cos(z * 0.05 + time) * 0.5;
                waterVerts.setY(i, y);
            }
            waterGeometry.attributes.position.needsUpdate = true;
            
            requestAnimationFrame(waterAnimation);
        };
        
        waterAnimation();
    }
    
    function addDefaultDetails() {
        // Add some generic terrain features
        for (let i = 0; i < 30; i++) {
            const featureGeometry = new THREE.SphereGeometry(Math.random() * 3 + 1, 8, 8);
            const featureMaterial = new THREE.MeshLambertMaterial({
                color: groundColor.clone().multiplyScalar(0.8 + Math.random() * 0.4)
            });
            const feature = new THREE.Mesh(featureGeometry, featureMaterial);
            
            // Random position
            feature.position.set(
                (Math.random() - 0.5) * groundSize * 0.8,
                Math.random() * 2,
                (Math.random() - 0.5) * groundSize * 0.8
            );
            
            gameState.flatScene.add(feature);
        }
    }
    
    // Create the basic ground
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: groundColor,
        side: THREE.DoubleSide
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = 'flatGround';
    ground.rotation.x = -Math.PI / 2; // Make it horizontal
    ground.position.y = 0; // At zero level
    
    // Add ground to flat scene
    gameState.flatScene.add(ground);
    
    // Add directional light to flat scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 200, 100);
    directionalLight.castShadow = true;
    gameState.flatScene.add(directionalLight);
    
    // Add ambient light to flat scene
    const ambientLight = new THREE.AmbientLight(0x404040);
    gameState.flatScene.add(ambientLight);
    
    // Add a ship model to the flat scene as a reference point
    const shipReference = new THREE.Group();
    shipReference.name = 'shipReference';
    
    // Create a simpler ship model for the reference
    const shipBodyGeometry = new THREE.SphereGeometry(2, 16, 16);
    shipBodyGeometry.scale(1, 0.4, 1);
    const shipBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const shipBody = new THREE.Mesh(shipBodyGeometry, shipBodyMaterial);
    shipReference.add(shipBody);
    
    // Add dome
    const shipDomeGeometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const shipDomeMaterial = new THREE.MeshLambertMaterial({
        color: 0x44aaff,
        transparent: true,
        opacity: 0.7
    });
    const shipDome = new THREE.Mesh(shipDomeGeometry, shipDomeMaterial);
    shipDome.position.y = 0.5;
    shipReference.add(shipDome);
    
    // Add landing gear
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x888899 });
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        
        leg.position.set(
            Math.cos(angle) * 1.5,
            -1.5,
            Math.sin(angle) * 1.5
        );
        
        leg.rotation.x = Math.PI / 6;
        leg.rotation.y = -angle;
        
        shipReference.add(leg);
    }
    
    // Add a light under the ship
    const shipLight = new THREE.PointLight(0x7777ff, 1, 20);
    shipLight.position.y = -1;
    shipReference.add(shipLight);
    
    // Position the ship at center of scene
    shipReference.position.set(0, 3, 0);
    gameState.flatScene.add(shipReference);
}

// Take off from planet
export function takeOff() {
    gameState.landedOnPlanet = null;
    showMessage("TAKEOFF SUCCESSFUL", 2000);
}

// Place a bomb on a planet
export function placeBomb() {
    try {
        // Import planetary defense module for shield checks
        import('./planetary-defense.js').then(module => {
            // Prevent placing multiple bombs on same planet
            if (gameState.landedOnPlanet.hasBomb) {
                showMessage("BOMB ALREADY PLACED ON THIS PLANET", 2000);
                return;
            }
            
            // Make sure we have bombs left
            if (gameState.bombsRemaining <= 0) {
                showMessage("NO BOMBS REMAINING", 2000);
                return;
            }
            
            // Check if the planet has shields that need to be penetrated
            if (!module.canBombPenetrate(gameState.landedOnPlanet)) {
                // Level 3 bombs are required for shield penetration
                if (gameState.bombSize < 3) {
                    showMessage("PLANET SHIELD DETECTED: REQUIRES LEVEL 3 BOMB", 3000);
                    return;
                }
                
                // Deactivate the shield when placing a level 3 bomb
                module.deactivateShield(gameState.landedOnPlanet);
            }
            
            // Get alien position for bomb placement
            let bombPosition;
            
            if (gameState.currentScene === gameState.flatScene) {
                // In flat scene, place bomb at alien's position
                bombPosition = gameState.alienModel.position.clone();
                
                // Add bomb to main scene at corresponding position relative to planet
                // Get the planet position
                const planetPosition = new THREE.Vector3();
                gameState.landedOnPlanet.group.getWorldPosition(planetPosition);
                
                // Calculate a position on the planet surface
                const surfaceNormal = new THREE.Vector3().subVectors(
                    gameState.playerShip.position,
                    planetPosition
                ).normalize();
                
                // Place bomb on planet surface near the ship
                const realBombPosition = new THREE.Vector3().addVectors(
                    planetPosition,
                    surfaceNormal.multiplyScalar(gameState.landedOnPlanet.size + 0.5)
                );
                
                // Add bomb to main scene
                const bomb = createBomb(realBombPosition);
                bomb.targetPlanet = gameState.landedOnPlanet;
            } else {
                // In main scene, use original implementation
                bombPosition = new THREE.Vector3();
                gameState.alienModel.getWorldPosition(bombPosition);
                
                // Create bomb at alien's position
                const bomb = createBomb(bombPosition);
                bomb.targetPlanet = gameState.landedOnPlanet;
            }
            
            // Send bomb placement to server if multiplayer is enabled
            if (gameState.multiplayer.enabled) {
                const alienPosition = new THREE.Vector3();
                gameState.alienModel.getWorldPosition(alienPosition);
                
                sendBombPlacement(
                    gameState.landedOnPlanet.id,
                    alienPosition
                );
            }
            
            // Show feedback message
            showMessage(`LEVEL ${gameState.bombSize} BOMB PLACED - DETONATION IN 10 SECONDS`, 2000);
            
            // Mark planet as having a bomb
            gameState.landedOnPlanet.hasBomb = true;
            gameState.landedOnPlanet.bombCountdown = 10;
            
            // Update HUD bombs count
            gameState.bombsRemaining--;
            document.getElementById('bombs').textContent = gameState.bombsRemaining;
            
            // Reset bomb size cycle state
            gameState.bombSizeCycled = false;
            gameState.bombPlaced = true;
        });
    } catch (error) {
        console.error("Error placing bomb:", error);
        // Reset state to prevent game from freezing
        gameState.landedOnPlanet.hasBomb = true;
        gameState.bombsRemaining = Math.max(0, gameState.bombsRemaining - 1);
        document.getElementById('bombs').textContent = gameState.bombsRemaining;
    }
}

// Update ship controls
export function updateShipControls(delta, inputState) {
    if (gameState.isAlienMode || gameState.isLoading) return;
    
    // Calculate movement speed with acceleration and deceleration
    const maxSpeed = gameState.maxSpeed;
    const acceleration = 0.8 * delta;
    const deceleration = 1.5 * delta;
    
    // Handle boost mechanics
    updateBoostMechanics(delta, inputState);
    
    // Apply boost if active and has fuel
    const canBoost = gameState.boostFuel > 0 && inputState.boost;
    gameState.isBoostActive = canBoost;
    const speedMultiplier = gameState.isBoostActive ? gameState.boostMultiplier : 1;
    
    // Create movement vectors for all directions
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(gameState.playerShip.quaternion);
    const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(gameState.playerShip.quaternion);
    const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(gameState.playerShip.quaternion);
    
    // Initialize current velocity vector if needed
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
    
    // Apply movement based on input
    const hasInput = moveDirection.length() > 0;
    
    if (hasInput) {
        // Normalize and apply acceleration
        moveDirection.normalize();
        const targetVelocity = moveDirection.clone().multiplyScalar(maxSpeed * speedMultiplier);
        gameState.currentVelocity.lerp(targetVelocity, acceleration);
        gameState.speed = gameState.currentVelocity.length();
    } else {
        // Decelerate when no input
        if (gameState.currentVelocity.length() > 0) {
            if (gameState.currentVelocity.length() < deceleration) {
                gameState.currentVelocity.set(0, 0, 0);
            } else {
                const decelerationVector = gameState.currentVelocity.clone().normalize().multiplyScalar(-deceleration);
                gameState.currentVelocity.add(decelerationVector);
            }
            gameState.speed = gameState.currentVelocity.length();
        }
    }
    
    // Apply velocity to position
    gameState.playerShip.position.add(gameState.currentVelocity);
    
    // Update ship orientation based on mouse input
    updateShipOrientation(inputState);
    
    // Update HUD
    const speedElement = document.getElementById('speed');
    if (speedElement) {
        speedElement.textContent = Math.abs(gameState.speed).toFixed(1);
    }
}

// Update ship orientation based on mouse input
function updateShipOrientation(inputState) {
    // Track orientation to prevent gimbal lock
    if (!gameState.shipOrientation) {
        gameState.shipOrientation = { yaw: 0, pitch: 0 };
    }
    
    // Update based on mouse movement
    const lookSpeed = 0.07;
    gameState.shipOrientation.yaw -= inputState.mouseX * lookSpeed;
    gameState.shipOrientation.pitch += inputState.mouseY * lookSpeed;
    
    // Clamp pitch to prevent flipping
    const pitchLimit = Math.PI / 2.5;
    gameState.shipOrientation.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, gameState.shipOrientation.pitch));
    
    // Apply rotations using quaternions
    gameState.playerShip.rotation.set(0, 0, 0);
    gameState.playerShip.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    
    // Apply yaw (Y axis)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.shipOrientation.yaw);
    gameState.playerShip.quaternion.multiply(yawQuat);
    
    // Apply pitch (X axis) 
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), gameState.shipOrientation.pitch);
    gameState.playerShip.quaternion.multiply(pitchQuat);
    
    // Add banking effect while turning
    if (Math.abs(inputState.mouseX) > 0.05) {
        const targetRoll = -inputState.mouseX * 0.5;
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetRoll);
        gameState.playerShip.quaternion.multiply(rollQuat);
    }
}

// Update boost mechanics
function updateBoostMechanics(delta, inputState) {
    // Update boost fuel
    if (gameState.isBoostActive && gameState.boostFuel > 0) {
        // Drain fuel
        gameState.boostFuel = Math.max(0, gameState.boostFuel - gameState.boostDrainRate * delta);
        
        // Create boost particles
        if (!gameState.isAlienMode && gameState.boostFuel > 0 && Math.random() > 0.5) {
            createBoostParticle();
        }
        
        // First activation effect
        if (inputState.boost && !gameState.wasBoostActive) {
            createExplosionFlash('rgba(0, 255, 255, 0.2)');
        }
    } else if (!gameState.isBoostActive && gameState.boostFuel < gameState.maxBoostFuel) {
        // Recharge when not boosting
        gameState.boostFuel = Math.min(
            gameState.maxBoostFuel, 
            gameState.boostFuel + gameState.boostRechargeRate * delta
        );
    }
    
    // Store previous boost state
    gameState.wasBoostActive = gameState.isBoostActive;
    
    // Update boost meter UI
    const boostMeterFill = document.getElementById('boost-meter-fill');
    if (boostMeterFill) {
        const boostPercentage = gameState.boostFuel / gameState.maxBoostFuel;
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

// Create a boost particle effect
function createBoostParticle() {
    if (!window.THREE) return;
    
    // Create a particle behind the ship
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
    
    // Add slight randomness
    particle.position.x += (Math.random() - 0.5) * 0.5;
    particle.position.y += (Math.random() - 0.5) * 0.5;
    particle.position.z += (Math.random() - 0.5) * 0.5;
    
    // Set velocity
    const velocity = shipDirection.clone().multiplyScalar(0.5);
    
    // Add to scene
    gameState.mainScene.add(particle);
    
    // Add to boost effects array
    gameState.boostEffects.push({
        mesh: particle,
        velocity: velocity,
        life: 1 + Math.random() * 0.5
    });
}

// Update alien controls
export function updateAlienControls(delta, inputState) {
    if (!gameState.isAlienMode || gameState.isLoading) return;
    
    const moveSpeed = 10 * delta; // Increased speed
    
    // Third person camera control with mouse
    const mouseSensitivity = 0.002;
    
    // Update alien's viewing direction based on mouse input
    gameState.alienMouseLook.x -= inputState.mouseX * mouseSensitivity;
    gameState.alienMouseLook.y = Math.max(
        -Math.PI / 4, // Limit looking down
        Math.min(Math.PI / 6, gameState.alienMouseLook.y + inputState.mouseY * mouseSensitivity) // Limit looking up
    );
    
    // Update camera target (attached to alien)
    gameState.cameraTarget.position.copy(gameState.alienModel.position);
    gameState.cameraTarget.position.y += 0.8; // Slightly above alien's head
    
    // Apply alien's rotation based on mouse look
    // Reset rotation first
    gameState.cameraTarget.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    
    // Apply yaw (horizontal rotation)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x);
    gameState.cameraTarget.quaternion.multiply(yawQuat);
    
    // Apply pitch (vertical rotation - for camera only, not alien movement)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), gameState.alienMouseLook.y);
    gameState.cameraTarget.quaternion.multiply(pitchQuat);
    
    // Calculate camera position - third person view behind alien
    // Get the backward direction from alien's target
    const backward = new THREE.Vector3(0, 0, 1);
    backward.applyQuaternion(gameState.cameraTarget.quaternion);
    
    // Position camera behind alien (third person view) and offset vertically
    const cameraPos = new THREE.Vector3().addVectors(
        gameState.cameraTarget.position,
        new THREE.Vector3(
            backward.x * 3, // 3 units behind
            backward.y * 1.5 + 1, // Offset up + pitch component
            backward.z * 3 // 3 units behind
        )
    );
    
    // Update camera position
    gameState.camera.position.copy(cameraPos);
    
    // Make camera look at target (alien's head)
    gameState.camera.lookAt(gameState.cameraTarget.position);
    
    // Get movement direction vectors relative to camera orientation (ignoring pitch)
    // Forward direction is opposite of camera/alien look direction but with y=0 (horizontal movement)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x));
    forward.y = 0; // Keep movement parallel to ground
    forward.normalize();
    
    // Right direction is perpendicular to forward
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gameState.alienMouseLook.x));
    right.y = 0; // Keep movement parallel to ground
    right.normalize();
    
    // Calculate movement direction from input
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (inputState.moveForward) moveDirection.add(forward);
    if (inputState.moveBackward) moveDirection.sub(forward);
    if (inputState.moveRight) moveDirection.add(right);
    if (inputState.moveLeft) moveDirection.sub(right);
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(moveSpeed);
        
        // Move alien
        gameState.alienModel.position.add(moveDirection);
        
        // Keep alien on flat ground (y=0)
        gameState.alienModel.position.y = 0;
        
        // Orient alien to face movement direction
        if (moveDirection.length() > 0.1) {
            // Create a quaternion that rotates from forward vector to movement direction
            const targetRotation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(moveDirection.x, 0, moveDirection.z).normalize()
            );
            
            // Apply rotation
            gameState.alienModel.quaternion.copy(targetRotation);
        }
    }
    
    // Handle bomb cycle with B key
    if (inputState.cycleBombSize) {
        // Cycle between 1, 2, and 3
        if (!gameState.bombSizeCycled) { // Prevent multiple cycles on key hold
            gameState.bombSize = (gameState.bombSize % 3) + 1;
            showMessage(`BOMB SIZE ${gameState.bombSize} SELECTED`, 1000);
            // Update bomb size indicator
            updateBombSizeIndicator(true, gameState.bombSize);
            gameState.bombSizeCycled = true;
        }
    } else {
        gameState.bombSizeCycled = false;
    }
    
    // Handle bomb placement with P key
    if (inputState.placeBomb) {
        if (!gameState.bombPlaced) { // Prevent multiple placements on key hold
            placeBomb();
            gameState.bombPlaced = true;
        }
    } else {
        gameState.bombPlaced = false;
    }
    
    // Check if near ship for return
    // Get ship reference in flat scene
    const shipRef = gameState.flatScene.getObjectByName('shipReference');
    if (shipRef) {
        const distanceToShip = gameState.alienModel.position.distanceTo(shipRef.position);
        if (distanceToShip < 5) {
            showMessage("PRESS E TO RETURN TO SHIP", 1000);
        }
    }
}

// Create a bomb at the specified position
function createBomb(position, bombSize = 1) {
    try {
        const bombGroup = new THREE.Group();
        bombGroup.position.copy(position);
        
        // Add small offset to prevent clipping with the ground
        bombGroup.position.y += 0.5;
        
        // Scale bomb size based on the selected bomb size
        const bombScale = bombSize;
        
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
        
        // Point light - intensity increases with bomb size
        const pointLight = new THREE.PointLight(0xff0000, 1 * bombScale, 10 * bombScale);
        bombGroup.add(pointLight);
        
        // Add to scene
        gameState.mainScene.add(bombGroup);
        
        // Create blinking animation that speeds up over time
        let startTime = Date.now();
        const animateBlink = () => {
            if (!bombGroup.parent) return;
            
            const currentTime = Date.now();
            const elapsedTime = (currentTime - startTime) / 1000; // in seconds
            const remainingTime = 10 - elapsedTime;
            
            if (remainingTime <= 0) return;
            
            // Blink faster as time runs out
            const blinkSpeed = 5 + (10 - remainingTime) * 2;
            const pulseIntensity = Math.sin(currentTime * 0.001 * blinkSpeed) * 0.5 + 0.5;
            
            if (light && light.material) {
                light.material.opacity = 0.5 + pulseIntensity * 0.5;
            }
            
            if (pointLight) {
                pointLight.intensity = (0.5 + pulseIntensity) * bombScale;
            }
            
            requestAnimationFrame(animateBlink);
        };
        
        // Start animation
        animateBlink();
        
        // Create bomb object with all relevant information
        const newBomb = {
            group: bombGroup,
            mesh: bomb,
            light: light,
            pointLight: pointLight,
            countdown: 10, // 10 seconds
            isActive: true,
            targetPlanet: gameState.landedOnPlanet,
            size: bombScale // Store bomb size for explosion
        };
        
        // Add to bombs array
        gameState.bombs.push(newBomb);
        
        return newBomb;
    } catch (error) {
        console.error("Error creating bomb:", error);
        return null;
    }
}
