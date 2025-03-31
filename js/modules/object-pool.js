/**
 * Object Pool Module
 * Manages reusable game objects to improve performance by reducing garbage collection
 */

import gameState from './game-state.js';
import Config from '../config.js';

// Maintain pools for different object types
const pools = {
    particles: [],
    debris: [],
    explosions: [],
    projectiles: []
};

// Inactive objects (available for reuse)
const inactive = {
    particles: [],
    debris: [],
    explosions: [],
    projectiles: []
};

// Maximum capacity for each pool
const maxPoolSize = {
    particles: 500,
    debris: 200,
    explosions: 20,
    projectiles: 50
};

/**
 * Initialize the object pool with pre-created objects
 */
export function initializeObjectPools(scene) {
    console.log("Initializing object pools for better performance");
    
    // Create initial particle pool
    for (let i = 0; i < 100; i++) {
        createParticle(scene);
    }
    
    // Create initial debris pool
    for (let i = 0; i < 50; i++) {
        createDebris(scene);
    }
    
    // Create initial explosion pool
    for (let i = 0; i < 5; i++) {
        createExplosion(scene);
    }
    
    // Create initial projectile pool
    for (let i = 0; i < 10; i++) {
        createProjectile(scene);
    }
    
    console.log(`Object pools initialized: ${pools.particles.length} particles, ${pools.debris.length} debris, ${pools.explosions.length} explosions, ${pools.projectiles.length} projectiles`);
}

/**
 * Create a particle and add it to the pool
 */
function createParticle(scene) {
    // Check if we've reached maximum pool size
    if (pools.particles.length >= maxPoolSize.particles) return null;
    
    // Create particle geometry and material
    const geometry = new THREE.SphereGeometry(0.5, 4, 4);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    
    // Create mesh
    const particle = new THREE.Mesh(geometry, material);
    particle.visible = false;
    particle.isActive = false;
    
    // Add to scene and pools
    scene.add(particle);
    pools.particles.push(particle);
    inactive.particles.push(particle);
    
    return particle;
}

/**
 * Create debris and add it to the pool
 */
function createDebris(scene) {
    // Check if we've reached maximum pool size
    if (pools.debris.length >= maxPoolSize.debris) return null;
    
    // Create debris geometry and material
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshPhongMaterial({
        color: 0x777777,
        flatShading: true
    });
    
    // Create mesh
    const debris = new THREE.Mesh(geometry, material);
    debris.visible = false;
    debris.isActive = false;
    
    // Add to scene and pools
    scene.add(debris);
    pools.debris.push(debris);
    inactive.debris.push(debris);
    
    return debris;
}

/**
 * Create explosion and add it to the pool
 */
function createExplosion(scene) {
    // Check if we've reached maximum pool size
    if (pools.explosions.length >= maxPoolSize.explosions) return null;
    
    // Create explosion geometry and material
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    
    // Create mesh
    const explosion = new THREE.Mesh(geometry, material);
    explosion.visible = false;
    explosion.isActive = false;
    
    // Create light for explosion
    const light = new THREE.PointLight(0xff6600, 5, 20);
    light.visible = false;
    explosion.add(light);
    explosion.light = light;
    
    // Add to scene and pools
    scene.add(explosion);
    pools.explosions.push(explosion);
    inactive.explosions.push(explosion);
    
    return explosion;
}

/**
 * Create projectile and add it to the pool
 */
function createProjectile(scene) {
    // Check if we've reached maximum pool size
    if (pools.projectiles.length >= maxPoolSize.projectiles) return null;
    
    // Create projectile geometry and material
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000
    });
    
    // Create mesh
    const projectile = new THREE.Mesh(geometry, material);
    projectile.visible = false;
    projectile.isActive = false;
    
    // Create light for projectile
    const light = new THREE.PointLight(0xff0000, 1, 10);
    light.visible = false;
    projectile.add(light);
    projectile.light = light;
    
    // Add to scene and pools
    scene.add(projectile);
    pools.projectiles.push(projectile);
    inactive.projectiles.push(projectile);
    
    return projectile;
}

/**
 * Get a particle from the pool or create a new one if needed
 */
export function getParticle(scene, options = {}) {
    let particle;
    
    if (inactive.particles.length > 0) {
        // Reuse existing particle
        particle = inactive.particles.pop();
    } else {
        // Create new particle if pool isn't full
        particle = createParticle(scene);
        
        // If pool is full, use the oldest active particle
        if (!particle && pools.particles.length > 0) {
            // Find the oldest active particle
            // In a real implementation, you would track creation time
            // For simplicity, we'll just take the first one
            particle = pools.particles[0];
            
            // Reset properties
            resetParticle(particle);
        }
    }
    
    // Configure particle with options
    if (particle) {
        // Position
        if (options.position) {
            particle.position.copy(options.position);
        }
        
        // Color
        if (options.color) {
            particle.material.color.set(options.color);
        }
        
        // Size
        if (options.size) {
            particle.scale.set(options.size, options.size, options.size);
        }
        
        // Opacity
        if (options.opacity !== undefined) {
            particle.material.opacity = options.opacity;
        }
        
        // Velocity (for updating position)
        particle.velocity = options.velocity || new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        
        // Life (in seconds)
        particle.life = options.life || 1.0;
        particle.maxLife = particle.life;
        
        // Activate
        particle.visible = true;
        particle.isActive = true;
    }
    
    return particle;
}

/**
 * Get debris from the pool or create new if needed
 */
export function getDebris(scene, options = {}) {
    let debris;
    
    if (inactive.debris.length > 0) {
        // Reuse existing debris
        debris = inactive.debris.pop();
    } else {
        // Create new debris if pool isn't full
        debris = createDebris(scene);
        
        // If pool is full, use the oldest active debris
        if (!debris && pools.debris.length > 0) {
            debris = pools.debris[0];
            
            // Reset properties
            resetDebris(debris);
        }
    }
    
    // Configure debris with options
    if (debris) {
        // Position
        if (options.position) {
            debris.position.copy(options.position);
        }
        
        // Color
        if (options.color) {
            debris.material.color.set(options.color);
        }
        
        // Size
        if (options.size) {
            debris.scale.set(options.size, options.size, options.size);
        }
        
        // Add random rotation
        debris.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        // Velocity (for updating position)
        debris.velocity = options.velocity || new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        
        // Angular velocity (for rotation)
        debris.angularVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        // Life (in seconds)
        debris.life = options.life || 5.0;
        debris.maxLife = debris.life;
        
        // Resource value - determine how many resources player gets when collecting
        debris.value = options.value || Math.floor(Math.random() * 10) + 1;
        
        // Activate
        debris.visible = true;
        debris.isActive = true;
    }
    
    return debris;
}

/**
 * Get explosion from the pool or create new if needed
 */
export function getExplosion(scene, options = {}) {
    let explosion;
    
    if (inactive.explosions.length > 0) {
        // Reuse existing explosion
        explosion = inactive.explosions.pop();
    } else {
        // Create new explosion if pool isn't full
        explosion = createExplosion(scene);
        
        // If pool is full, use the oldest active explosion
        if (!explosion && pools.explosions.length > 0) {
            explosion = pools.explosions[0];
            
            // Reset properties
            resetExplosion(explosion);
        }
    }
    
    // Configure explosion with options
    if (explosion) {
        // Position
        if (options.position) {
            explosion.position.copy(options.position);
        }
        
        // Color
        if (options.color) {
            explosion.material.color.set(options.color);
            explosion.light.color.set(options.color);
        }
        
        // Size
        explosion.scale.set(1, 1, 1); // Reset scale
        explosion.targetScale = options.size || 5;
        
        // Light intensity
        explosion.light.intensity = options.intensity || 5;
        
        // Life (in seconds)
        explosion.life = options.life || 2.0;
        explosion.maxLife = explosion.life;
        
        // Growth rate
        explosion.growthRate = explosion.targetScale / (explosion.life * 0.5);
        
        // Activate
        explosion.visible = true;
        explosion.isActive = true;
        explosion.light.visible = true;
    }
    
    return explosion;
}

/**
 * Get projectile from the pool or create new if needed
 */
export function getProjectile(scene, options = {}) {
    let projectile;
    
    if (inactive.projectiles.length > 0) {
        // Reuse existing projectile
        projectile = inactive.projectiles.pop();
    } else {
        // Create new projectile if pool isn't full
        projectile = createProjectile(scene);
        
        // If pool is full, use the oldest active projectile
        if (!projectile && pools.projectiles.length > 0) {
            projectile = pools.projectiles[0];
            
            // Reset properties
            resetProjectile(projectile);
        }
    }
    
    // Configure projectile with options
    if (projectile) {
        // Position
        if (options.position) {
            projectile.position.copy(options.position);
        }
        
        // Color
        if (options.color) {
            projectile.material.color.set(options.color);
            projectile.light.color.set(options.color);
        }
        
        // Size
        if (options.size) {
            projectile.scale.set(options.size, options.size, options.size);
        }
        
        // Direction and speed
        projectile.direction = options.direction || new THREE.Vector3(0, 0, 1);
        projectile.speed = options.speed || 100;
        
        // Damage
        projectile.damage = options.damage || 5;
        
        // Source (which planet/entity fired it)
        projectile.source = options.source || null;
        
        // Life (in seconds)
        projectile.life = options.life || 5.0;
        projectile.maxLife = projectile.life;
        
        // Activate
        projectile.visible = true;
        projectile.isActive = true;
        projectile.light.visible = true;
    }
    
    return projectile;
}

/**
 * Reset a particle to be reused
 */
function resetParticle(particle) {
    // Remove from active objects if it's there
    const index = inactive.particles.indexOf(particle);
    if (index !== -1) {
        inactive.particles.splice(index, 1);
    }
    
    // Reset properties
    particle.material.opacity = 0.8;
    particle.scale.set(1, 1, 1);
    particle.velocity = null;
    particle.life = 0;
    particle.maxLife = 0;
    
    // Deactivate
    particle.visible = false;
    particle.isActive = false;
    
    // Add to inactive pool
    inactive.particles.push(particle);
}

/**
 * Reset debris to be reused
 */
function resetDebris(debris) {
    // Remove from active objects if it's there
    const index = inactive.debris.indexOf(debris);
    if (index !== -1) {
        inactive.debris.splice(index, 1);
    }
    
    // Reset properties
    debris.scale.set(1, 1, 1);
    debris.velocity = null;
    debris.angularVelocity = null;
    debris.life = 0;
    debris.maxLife = 0;
    
    // Deactivate
    debris.visible = false;
    debris.isActive = false;
    
    // Add to inactive pool
    inactive.debris.push(debris);
}

/**
 * Reset explosion to be reused
 */
function resetExplosion(explosion) {
    // Remove from active objects if it's there
    const index = inactive.explosions.indexOf(explosion);
    if (index !== -1) {
        inactive.explosions.splice(index, 1);
    }
    
    // Reset properties
    explosion.scale.set(1, 1, 1);
    explosion.material.opacity = 0.8;
    explosion.targetScale = 0;
    explosion.growthRate = 0;
    explosion.life = 0;
    explosion.maxLife = 0;
    
    // Turn off light
    explosion.light.intensity = 0;
    explosion.light.visible = false;
    
    // Deactivate
    explosion.visible = false;
    explosion.isActive = false;
    
    // Add to inactive pool
    inactive.explosions.push(explosion);
}

/**
 * Reset projectile to be reused
 */
function resetProjectile(projectile) {
    // Remove from active objects if it's there
    const index = inactive.projectiles.indexOf(projectile);
    if (index !== -1) {
        inactive.projectiles.splice(index, 1);
    }
    
    // Reset properties
    projectile.scale.set(1, 1, 1);
    projectile.direction = null;
    projectile.speed = 0;
    projectile.damage = 0;
    projectile.source = null;
    projectile.life = 0;
    projectile.maxLife = 0;
    
    // Turn off light
    projectile.light.visible = false;
    
    // Deactivate
    projectile.visible = false;
    projectile.isActive = false;
    
    // Add to inactive pool
    inactive.projectiles.push(projectile);
}

/**
 * Return an object back to the pool
 */
export function releaseObject(object, type) {
    if (!object) return;
    
    switch (type) {
        case 'particle':
            resetParticle(object);
            break;
        case 'debris':
            resetDebris(object);
            break;
        case 'explosion':
            resetExplosion(object);
            break;
        case 'projectile':
            resetProjectile(object);
            break;
    }
}

/**
 * Update all active objects in the pools
 */
export function updateObjectPools(delta) {
    // Update particles
    for (let i = 0; i < pools.particles.length; i++) {
        const particle = pools.particles[i];
        
        if (particle.isActive) {
            // Update life
            particle.life -= delta;
            
            if (particle.life <= 0) {
                resetParticle(particle);
                continue;
            }
            
            // Update position
            if (particle.velocity) {
                particle.position.add(particle.velocity.clone().multiplyScalar(delta));
            }
            
            // Update opacity based on life
            const lifeRatio = particle.life / particle.maxLife;
            particle.material.opacity = lifeRatio * 0.8;
            
            // Slow down
            if (particle.velocity) {
                particle.velocity.multiplyScalar(0.95);
            }
        }
    }
    
    // Update debris
    for (let i = 0; i < pools.debris.length; i++) {
        const debris = pools.debris[i];
        
        if (debris.isActive) {
            // Update life
            debris.life -= delta;
            
            if (debris.life <= 0) {
                resetDebris(debris);
                continue;
            }
            
            // Update position
            if (debris.velocity) {
                debris.position.add(debris.velocity.clone().multiplyScalar(delta));
            }
            
            // Update rotation
            if (debris.angularVelocity) {
                debris.rotation.x += debris.angularVelocity.x;
                debris.rotation.y += debris.angularVelocity.y;
                debris.rotation.z += debris.angularVelocity.z;
            }
            
            // Slow down
            if (debris.velocity) {
                debris.velocity.multiplyScalar(0.98);
            }
            
            // Check for tractor beam collection when the beam is active
            if (gameState.isTractorBeamActive && !gameState.isAlienMode && gameState.playerShip) {
                const shipPosition = new THREE.Vector3();
                gameState.playerShip.getWorldPosition(shipPosition);
                
                // Check if debris is close enough to collect
                const distance = debris.position.distanceTo(shipPosition);
                if (distance < 5) {
                    // Add resources and score
                    if (debris.value) {
                        gameState.resourcesCollected += debris.value;
                        
                        // Add score based on debris value
                        const scoreValue = debris.value * 10;
                        gameState.updateScore(scoreValue);
                        
                        // Import UI module to show message
                        import('./ui.js').then(module => {
                            if (module && module.showMessage) {
                                module.showMessage(`RESOURCE COLLECTED: +${debris.value} UNITS (+${scoreValue} POINTS)`, 1500);
                            }
                        });
                        
                        // Occasionally remind about ship upgrades
                        if (Math.random() < 0.2 && gameState.resourcesCollected >= 40) {
                            import('./ui.js').then(module => {
                                if (module && module.showMessage) {
                                    module.showMessage("RESOURCES CAN BE USED FOR SHIP UPGRADES - PRESS SHIP UPGRADES BUTTON", 3000);
                                }
                            });
                        }
                    }
                    
                    // Reset debris
                    resetDebris(debris);
                    continue;
                }
                
                // Pull debris toward ship when in range
                const tractorBeamRange = gameState.getTractorBeamRange ? gameState.getTractorBeamRange() : 100;
                if (distance < tractorBeamRange) {
                    // Calculate pull direction
                    const pullDirection = new THREE.Vector3().subVectors(shipPosition, debris.position).normalize();
                    
                    // Add pull force proportional to distance
                    const pullStrength = (gameState.getTractorBeamStrength ? gameState.getTractorBeamStrength() : 30) * delta * (1 - distance / tractorBeamRange);
                    debris.velocity.add(pullDirection.multiplyScalar(pullStrength));
                }
            }
        }
    }
    
    // Update explosions
    for (let i = 0; i < pools.explosions.length; i++) {
        const explosion = pools.explosions[i];
        
        if (explosion.isActive) {
            // Update life
            explosion.life -= delta;
            
            if (explosion.life <= 0) {
                resetExplosion(explosion);
                continue;
            }
            
            // Calculate life ratio
            const lifeRatio = explosion.life / explosion.maxLife;
            
            // First half of life: grow
            if (lifeRatio > 0.5) {
                const scale = explosion.scale.x + explosion.growthRate * delta;
                explosion.scale.set(scale, scale, scale);
            } 
            // Second half: fade
            else {
                explosion.material.opacity = lifeRatio * 1.6; // Fade out
                explosion.light.intensity = lifeRatio * 5; // Dim light
            }
        }
    }
    
    // Update projectiles
    for (let i = 0; i < pools.projectiles.length; i++) {
        const projectile = pools.projectiles[i];
        
        if (projectile.isActive) {
            // Update life
            projectile.life -= delta;
            
            if (projectile.life <= 0) {
                resetProjectile(projectile);
                continue;
            }
            
            // Update position
            if (projectile.direction && projectile.speed) {
                const moveAmount = projectile.speed * delta;
                projectile.position.add(projectile.direction.clone().multiplyScalar(moveAmount));
            }
            
            // Check for collisions with player
            if (gameState.playerShip && !gameState.isAlienMode) {
                const playerPosition = new THREE.Vector3();
                gameState.playerShip.getWorldPosition(playerPosition);
                
                const distance = projectile.position.distanceTo(playerPosition);
                const hitDistance = 2; // Collision distance
                
                if (distance < hitDistance) {
                    // Import planetary defense module to handle hit
                    import('./planetary-defense.js').then(module => {
                        if (typeof module.handlePlayerHit === 'function') {
                            module.handlePlayerHit(projectile.damage, "PROJECTILE HIT");
                        }
                    });
                    
                    // Create explosion at hit location
                    getExplosion(gameState.mainScene, {
                        position: projectile.position.clone(),
                        color: 0xff6600,
                        size: 2,
                        life: 1
                    });
                    
                    // Reset projectile
                    resetProjectile(projectile);
                }
            }
        }
    }
}

/**
 * Get pool statistics for debugging
 */
export function getPoolStats() {
    return {
        particles: {
            total: pools.particles.length,
            active: pools.particles.length - inactive.particles.length,
            inactive: inactive.particles.length
        },
        debris: {
            total: pools.debris.length,
            active: pools.debris.length - inactive.debris.length,
            inactive: inactive.debris.length
        },
        explosions: {
            total: pools.explosions.length,
            active: pools.explosions.length - inactive.explosions.length,
            inactive: inactive.explosions.length
        },
        projectiles: {
            total: pools.projectiles.length,
            active: pools.projectiles.length - inactive.projectiles.length,
            inactive: inactive.projectiles.length
        }
    };
} 