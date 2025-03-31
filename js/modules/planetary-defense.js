/**
 * Planetary Defense System Module
 * Handles planet defense mechanisms that attack the player
 */

import gameState from './game-state.js';
import { showMessage } from './ui.js';

// Constants for defense system
const TURRET_DAMAGE = 5;
const MISSILE_DAMAGE = 15;
const ATTACK_PROBABILITY = 0.3; // 30% chance of attack when player is near
const DEFENSIVE_PLANET_PROBABILITY = 0.4; // 40% of planets have defenses

// Initialize the defense system for a planet
export function initializeDefenseSystem(planet) {
    // Determine if this planet should have defenses based on probability
    if (Math.random() > DEFENSIVE_PLANET_PROBABILITY) {
        planet.hasDefenses = false;
        return;
    }
    
    planet.hasDefenses = true;
    
    // Randomize defense systems
    planet.defenseSystems = {
        hasTurrets: Math.random() > 0.3, // 70% chance for turrets
        hasMissiles: Math.random() > 0.6, // 40% chance for missiles
        hasShield: Math.random() > 0.7, // 30% chance for shield
        attackCooldown: 0,
        attackRange: planet.size * 5, // Attack range is 5x planet size
        turretPositions: [], // Will store turret positions
        missilePositions: [], // Will store missile launcher positions
        shieldActive: false,
        lastAttackTime: 0
    };
    
    // Create turret positions around the planet
    if (planet.defenseSystems.hasTurrets) {
        const turretCount = Math.floor(Math.random() * 3) + 2; // 2-4 turrets
        for (let i = 0; i < turretCount; i++) {
            // Position turrets evenly around the planet
            const angle = (i / turretCount) * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            
            const x = Math.cos(angle) * Math.cos(elevation);
            const y = Math.sin(elevation);
            const z = Math.sin(angle) * Math.cos(elevation);
            
            // Position slightly above planet surface
            const position = {
                x: x * (planet.size * 1.05),
                y: y * (planet.size * 1.05),
                z: z * (planet.size * 1.05)
            };
            
            planet.defenseSystems.turretPositions.push(position);
        }
    }
    
    // Create missile positions
    if (planet.defenseSystems.hasMissiles) {
        const missileCount = Math.floor(Math.random() * 2) + 1; // 1-2 missile launchers
        for (let i = 0; i < missileCount; i++) {
            // Position missile launchers evenly around the planet
            const angle = (i / missileCount) * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            
            const x = Math.cos(angle) * Math.cos(elevation);
            const y = Math.sin(elevation);
            const z = Math.sin(angle) * Math.cos(elevation);
            
            // Position slightly above planet surface
            const position = {
                x: x * (planet.size * 1.05),
                y: y * (planet.size * 1.05),
                z: z * (planet.size * 1.05)
            };
            
            planet.defenseSystems.missilePositions.push(position);
        }
    }
    
    // Shield properties
    if (planet.defenseSystems.hasShield) {
        planet.defenseSystems.shieldActive = true;
        planet.defenseSystems.shieldHealth = 100;
        createPlanetShield(planet);
    }
}

// Create a shield visual around the planet
function createPlanetShield(planet) {
    const shieldGeometry = new THREE.SphereGeometry(planet.size * 1.2, 32, 32);
    const shieldMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    planet.group.add(shield);
    planet.defenseSystems.shieldMesh = shield;
    
    // Add shield to the game state for tracking
    gameState.planetaryDefenses.shieldBubbles.push({
        mesh: shield,
        planet: planet,
        activationTime: Date.now(),
        pulseDirection: 1,
        pulseAmount: 0
    });
}

// Update the planet defense systems
export function updatePlanetaryDefenses(delta) {
    // Only check defenses if they're enabled in the game state
    if (!gameState.planetaryDefenses.enabled) return;
    
    // Get player position
    if (!gameState.playerShip) return;
    const playerPosition = new THREE.Vector3();
    gameState.playerShip.getWorldPosition(playerPosition);
    
    // Check each planet with defenses
    gameState.planets.forEach(planet => {
        if (!planet.hasDefenses || planet.isDestroyed) return;
        
        // Get planet position
        const planetPosition = new THREE.Vector3();
        planet.group.getWorldPosition(planetPosition);
        
        // Calculate distance to player
        const distanceToPlayer = planetPosition.distanceTo(playerPosition);
        
        // Only activate defenses if player is within range
        if (distanceToPlayer < planet.defenseSystems.attackRange) {
            // Add a cooldown between attacks
            planet.defenseSystems.attackCooldown -= delta;
            
            // Evaluate if we should attack based on proximity and random chance
            const proximityFactor = 1 - (distanceToPlayer / planet.defenseSystems.attackRange);
            const attackProbability = ATTACK_PROBABILITY * proximityFactor;
            
            // Only try to attack if cooldown is over
            if (planet.defenseSystems.attackCooldown <= 0) {
                // If planet has a shield and it's the player's first time getting close
                if (planet.defenseSystems.hasShield && 
                    planet.defenseSystems.shieldActive && 
                    !planet.defenseSystems.shieldWarningShown) {
                    
                    showMessage(`WARNING: ${planet.name.toUpperCase()} HAS ACTIVE DEFENSE SHIELD`, 3000);
                    planet.defenseSystems.shieldWarningShown = true;
                }
                
                // Check if it's time for an attack
                if (Math.random() < attackProbability) {
                    // Choose attack type based on available systems
                    if (planet.defenseSystems.hasTurrets && Math.random() < 0.7) {
                        launchTurretAttack(planet, playerPosition);
                    } else if (planet.defenseSystems.hasMissiles) {
                        launchMissileAttack(planet, playerPosition);
                    }
                    
                    // Reset attack cooldown
                    planet.defenseSystems.attackCooldown = 2 + Math.random() * 3; // 2-5 seconds
                    planet.defenseSystems.lastAttackTime = Date.now();
                }
            }
        }
    });
    
    // Update existing projectiles
    updateProjectiles(delta);
    
    // Update shield visuals
    updateShields(delta);
}

// Launch a turret attack from a planet
function launchTurretAttack(planet, playerPosition) {
    if (!planet.defenseSystems.hasTurrets) return;
    
    // Get a random turret position
    const turretIndex = Math.floor(Math.random() * planet.defenseSystems.turretPositions.length);
    const turretPosition = planet.defenseSystems.turretPositions[turretIndex];
    
    // Convert turret position to world coordinates
    const worldTurretPosition = new THREE.Vector3(
        planet.group.position.x + turretPosition.x,
        planet.group.position.y + turretPosition.y,
        planet.group.position.z + turretPosition.z
    );
    
    // Calculate direction to player
    const direction = new THREE.Vector3()
        .subVectors(playerPosition, worldTurretPosition)
        .normalize();
    
    // Create projectile
    const projectileGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Position at turret
    projectile.position.copy(worldTurretPosition);
    
    // Create point light for the projectile
    const projectileLight = new THREE.PointLight(0xff0000, 1, 10);
    projectile.add(projectileLight);
    
    // Add to scene
    gameState.mainScene.add(projectile);
    
    // Add to projectiles array for tracking
    const speed = 100; // Units per second
    gameState.planetaryDefenses.turretProjectiles.push({
        mesh: projectile,
        direction: direction,
        speed: speed,
        lifespan: 5, // 5 seconds max lifespan
        damage: TURRET_DAMAGE,
        source: planet
    });
    
    // Add muzzle flash effect
    createMuzzleFlash(worldTurretPosition, direction);
}

// Launch a missile attack from a planet
function launchMissileAttack(planet, playerPosition) {
    if (!planet.defenseSystems.hasMissiles) return;
    
    // Get a random missile launcher position
    const launcherIndex = Math.floor(Math.random() * planet.defenseSystems.missilePositions.length);
    const launcherPosition = planet.defenseSystems.missilePositions[launcherIndex];
    
    // Convert missile position to world coordinates
    const worldLauncherPosition = new THREE.Vector3(
        planet.group.position.x + launcherPosition.x,
        planet.group.position.y + launcherPosition.y,
        planet.group.position.z + launcherPosition.z
    );
    
    // Calculate initial direction to player
    const direction = new THREE.Vector3()
        .subVectors(playerPosition, worldLauncherPosition)
        .normalize();
    
    // Create missile
    const missileGeometry = new THREE.CylinderGeometry(0.2, 0.5, 2, 8);
    const missileMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const missile = new THREE.Mesh(missileGeometry, missileMaterial);
    
    // Position at launcher
    missile.position.copy(worldLauncherPosition);
    
    // Orient missile to point in direction of travel
    missile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    // Create thruster effect
    const thrusterGeometry = new THREE.ConeGeometry(0.3, 1, 8);
    const thrusterMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        transparent: true,
        opacity: 0.7
    });
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    thruster.position.y = -1.2;
    thruster.rotation.x = Math.PI;
    missile.add(thruster);
    
    // Create point light for thruster
    const thrusterLight = new THREE.PointLight(0xff6600, 1, 5);
    thrusterLight.position.y = -1;
    missile.add(thrusterLight);
    
    // Add to scene
    gameState.mainScene.add(missile);
    
    // Add to missiles array for tracking
    const speed = 50; // Units per second
    gameState.planetaryDefenses.missileProjectiles.push({
        mesh: missile,
        thruster: thruster,
        direction: direction,
        speed: speed,
        acceleration: 10, // Units per second squared
        maxSpeed: 120, // Maximum speed
        turnRate: 1.5, // How quickly it can adjust course
        lifespan: 10, // 10 seconds max lifespan
        damage: MISSILE_DAMAGE,
        source: planet
    });
    
    // Show warning message
    showMessage("MISSILE LAUNCH DETECTED", 1500);
    
    // Add launch effect
    createMissilelaunchEffect(worldLauncherPosition);
}

// Create a muzzle flash effect
function createMuzzleFlash(position, direction) {
    // Create a flash geometry
    const flashGeometry = new THREE.SphereGeometry(1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    // Position at turret
    flash.position.copy(position);
    
    // Move slightly in fire direction
    flash.position.add(direction.clone().multiplyScalar(1));
    
    // Add to scene
    gameState.mainScene.add(flash);
    
    // Create light
    const flashLight = new THREE.PointLight(0xff6600, 2, 10);
    flash.add(flashLight);
    
    // Animate and remove
    let scale = 1;
    let opacity = 0.8;
    
    function animateFlash() {
        scale -= 0.1;
        opacity -= 0.08;
        
        if (scale <= 0 || opacity <= 0) {
            gameState.mainScene.remove(flash);
            return;
        }
        
        flash.scale.set(scale, scale, scale);
        flashMaterial.opacity = opacity;
        
        requestAnimationFrame(animateFlash);
    }
    
    animateFlash();
}

// Create a missile launch effect
function createMissilelaunchEffect(position) {
    // Create smoke particles
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.7
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at launch point
        particle.position.copy(position);
        
        // Random offset
        particle.position.x += (Math.random() - 0.5) * 1;
        particle.position.y += (Math.random() - 0.5) * 1;
        particle.position.z += (Math.random() - 0.5) * 1;
        
        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2 + 2, // Bias upward
            (Math.random() - 0.5) * 2
        );
        
        // Add to scene
        gameState.mainScene.add(particle);
        
        particles.push({
            mesh: particle,
            velocity: velocity,
            life: 1 + Math.random() * 1 // 1-2 seconds
        });
    }
    
    // Animate particles
    function animateParticles() {
        let allDead = true;
        
        particles.forEach(particle => {
            if (particle.life > 0) {
                allDead = false;
                
                // Move particle
                particle.mesh.position.add(particle.velocity.clone().multiplyScalar(0.016));
                
                // Slow down
                particle.velocity.multiplyScalar(0.95);
                
                // Update life
                particle.life -= 0.016;
                
                // Update opacity
                particle.mesh.material.opacity = particle.life / 2;
                
                // Expand
                particle.mesh.scale.multiplyScalar(1.01);
            } else {
                // Remove particle
                gameState.mainScene.remove(particle.mesh);
            }
        });
        
        if (!allDead) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

// Update projectiles movement and collision detection
function updateProjectiles(delta) {
    // Update turret projectiles
    for (let i = gameState.planetaryDefenses.turretProjectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.planetaryDefenses.turretProjectiles[i];
        
        // Move projectile
        const moveAmount = projectile.speed * delta;
        projectile.mesh.position.add(projectile.direction.clone().multiplyScalar(moveAmount));
        
        // Update lifespan
        projectile.lifespan -= delta;
        
        // Check collision with player
        if (gameState.playerShip && !gameState.isAlienMode) {
            const playerPosition = new THREE.Vector3();
            gameState.playerShip.getWorldPosition(playerPosition);
            
            const distance = projectile.mesh.position.distanceTo(playerPosition);
            const hitDistance = 2; // Collision distance
            
            if (distance < hitDistance) {
                // Player hit!
                handlePlayerHit(projectile.damage, "TURRET FIRE");
                
                // Remove projectile
                gameState.mainScene.remove(projectile.mesh);
                gameState.planetaryDefenses.turretProjectiles.splice(i, 1);
                continue;
            }
        }
        
        // Remove if lifespan expired
        if (projectile.lifespan <= 0) {
            gameState.mainScene.remove(projectile.mesh);
            gameState.planetaryDefenses.turretProjectiles.splice(i, 1);
        }
    }
    
    // Update missiles
    for (let i = gameState.planetaryDefenses.missileProjectiles.length - 1; i >= 0; i--) {
        const missile = gameState.planetaryDefenses.missileProjectiles[i];
        
        // Update missile if player ship exists and player is not in alien mode
        if (gameState.playerShip && !gameState.isAlienMode) {
            // Get current player position for homing
            const playerPosition = new THREE.Vector3();
            gameState.playerShip.getWorldPosition(playerPosition);
            
            // Calculate desired direction to player
            const toPlayer = new THREE.Vector3().subVectors(
                playerPosition,
                missile.mesh.position
            ).normalize();
            
            // Smoothly adjust direction using turn rate
            const adjustedDirection = new THREE.Vector3()
                .addVectors(
                    missile.direction.clone().multiplyScalar(1 - missile.turnRate * delta),
                    toPlayer.clone().multiplyScalar(missile.turnRate * delta)
                )
                .normalize();
            
            missile.direction = adjustedDirection;
            
            // Orient missile to point in direction of travel
            missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), missile.direction);
            
            // Increase speed (acceleration)
            missile.speed = Math.min(missile.maxSpeed, missile.speed + missile.acceleration * delta);
            
            // Move missile
            const moveAmount = missile.speed * delta;
            missile.mesh.position.add(missile.direction.clone().multiplyScalar(moveAmount));
            
            // Animate thruster
            if (missile.thruster) {
                missile.thruster.scale.y = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
            }
            
            // Update lifespan
            missile.lifespan -= delta;
            
            // Check collision with player
            const distance = missile.mesh.position.distanceTo(playerPosition);
            const hitDistance = 3; // Missile has larger collision radius
            
            if (distance < hitDistance) {
                // Player hit!
                handlePlayerHit(missile.damage, "MISSILE IMPACT");
                
                // Create explosion effect
                createExplosionEffect(missile.mesh.position);
                
                // Remove missile
                gameState.mainScene.remove(missile.mesh);
                gameState.planetaryDefenses.missileProjectiles.splice(i, 1);
                continue;
            }
        }
        
        // Remove if lifespan expired
        if (missile.lifespan <= 0) {
            gameState.mainScene.remove(missile.mesh);
            gameState.planetaryDefenses.missileProjectiles.splice(i, 1);
        }
    }
}

// Handle player being hit by projectile
function handlePlayerHit(damage, damageSource) {
    // Check if shields are depleted
    const shieldsDown = gameState.takeDamage(damage);
    
    // Shake camera to indicate hit
    shakeCamera();
    
    // Create hit flash effect
    const flash = document.getElementById('explosion-flash');
    flash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
        flash.style.backgroundColor = 'rgba(255, 100, 0, 0)';
    }, 200);
    
    // Show damage message
    showMessage(`${damageSource} HIT: -${damage} SHIELDS`, 2000);
    
    if (shieldsDown) {
        // Shields are depleted!
        showMessage("WARNING: SHIELDS DEPLETED", 3000);
        
        // Add further game over logic here if needed
    }
}

// Create explosion effect when missile hits player
function createExplosionEffect(position) {
    // Create explosion geometry
    const explosionGeometry = new THREE.SphereGeometry(1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    
    // Position at impact point
    explosion.position.copy(position);
    
    // Add to scene
    gameState.mainScene.add(explosion);
    
    // Create light
    const explosionLight = new THREE.PointLight(0xff6600, 5, 20);
    explosion.add(explosionLight);
    
    // Add particles
    const particleCount = 30;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Position at explosion center
        particle.position.copy(position);
        
        // Random velocity in all directions
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        velocity.normalize().multiplyScalar(5 + Math.random() * 10);
        
        // Add to scene
        gameState.mainScene.add(particle);
        
        particles.push({
            mesh: particle,
            velocity: velocity,
            life: 1 + Math.random() * 1 // 1-2 seconds
        });
    }
    
    // Animate explosion
    let scale = 1;
    let opacity = 0.8;
    let lightIntensity = 5;
    
    function animateExplosion() {
        scale += 0.2;
        opacity -= 0.05;
        lightIntensity -= 0.3;
        
        if (opacity <= 0) {
            gameState.mainScene.remove(explosion);
            return;
        }
        
        explosion.scale.set(scale, scale, scale);
        explosionMaterial.opacity = opacity;
        explosionLight.intensity = Math.max(0, lightIntensity);
        
        requestAnimationFrame(animateExplosion);
    }
    
    // Animate particles
    function animateParticles() {
        let allDead = true;
        
        particles.forEach(particle => {
            if (particle.life > 0) {
                allDead = false;
                
                // Move particle
                particle.mesh.position.add(particle.velocity.clone().multiplyScalar(0.016));
                
                // Slow down
                particle.velocity.multiplyScalar(0.95);
                
                // Update life
                particle.life -= 0.016;
                
                // Update opacity
                particle.mesh.material.opacity = particle.life;
            } else {
                // Remove particle
                gameState.mainScene.remove(particle.mesh);
            }
        });
        
        if (!allDead) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateExplosion();
    animateParticles();
}

// Shake the camera to indicate damage
function shakeCamera() {
    const camera = gameState.camera;
    const originalPosition = camera.position.clone();
    const shakeIntensity = 0.3;
    let shakeTime = 0;
    const shakeDuration = 0.5; // seconds
    
    function updateShake() {
        shakeTime += 0.016; // Approximately 60fps
        
        if (shakeTime < shakeDuration) {
            // Calculate shake offset
            const shakeOffset = new THREE.Vector3(
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity
            );
            
            // Apply shake with diminishing intensity
            const damping = 1 - (shakeTime / shakeDuration);
            camera.position.copy(originalPosition).add(shakeOffset.multiplyScalar(damping));
            
            requestAnimationFrame(updateShake);
        } else {
            // Reset to original position
            camera.position.copy(originalPosition);
        }
    }
    
    updateShake();
}

// Update shield visuals
function updateShields(delta) {
    gameState.planetaryDefenses.shieldBubbles.forEach((shield, index) => {
        if (!shield.mesh) return;
        
        // Check if planet is destroyed
        if (shield.planet.isDestroyed) {
            if (shield.mesh.parent) {
                shield.mesh.parent.remove(shield.mesh);
            }
            gameState.planetaryDefenses.shieldBubbles.splice(index, 1);
            return;
        }
        
        // Create pulsing effect
        shield.pulseAmount += shield.pulseDirection * delta;
        
        if (shield.pulseAmount > 0.2) {
            shield.pulseDirection = -1;
        } else if (shield.pulseAmount < 0) {
            shield.pulseDirection = 1;
        }
        
        // Update shield opacity based on pulse
        shield.mesh.material.opacity = 0.2 + shield.pulseAmount;
    });
}

// Check if player's bomb can penetrate shield
export function canBombPenetrate(planet) {
    // Bomb always works if no defenses or no shield
    if (!planet.hasDefenses || !planet.defenseSystems.hasShield) return true;
    
    // If shield is active, check if bomb size can penetrate
    if (planet.defenseSystems.shieldActive) {
        // Only the largest bombs (level 3) can penetrate shields
        return gameState.bombSize >= 3;
    }
    
    return true;
}

// Deactivate shield when hit by a large bomb
export function deactivateShield(planet) {
    if (!planet.hasDefenses || !planet.defenseSystems.hasShield) return;
    
    planet.defenseSystems.shieldActive = false;
    
    // Make shield invisible
    if (planet.defenseSystems.shieldMesh) {
        planet.defenseSystems.shieldMesh.visible = false;
        
        // Remove from tracking array
        const shieldIndex = gameState.planetaryDefenses.shieldBubbles.findIndex(
            shield => shield.planet === planet
        );
        
        if (shieldIndex !== -1) {
            gameState.planetaryDefenses.shieldBubbles.splice(shieldIndex, 1);
        }
    }
    
    // Show shield down message
    showMessage(`${planet.name.toUpperCase()} SHIELD DEACTIVATED`, 2000);
} 