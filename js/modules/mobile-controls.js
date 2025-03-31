/**
 * Mobile Controls Module
 * Provides touch-based joystick controls for mobile devices
 */

import gameState from './game-state.js';
import inputHandler from './input-handler.js';
import { showMessage } from './ui.js';
import { toggleAlienMode, isNearShip, attemptLanding, takeOff, placeBomb } from './player.js';

class MobileControls {
    constructor() {
        this.isEnabled = false;
        this.isMobileDevice = false;
        this.moveJoystick = null;
        this.lookJoystick = null;
        this.actionButtons = [];
        this.joystickSize = 100;
        this.deadzone = 0.2;
        
        // Wait for DOM to be loaded before checking mobile device
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.checkMobileDevice());
        } else {
            this.checkMobileDevice();
        }
    }
    
    // Check if the device is mobile
    checkMobileDevice() {
        this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Enable mobile controls if on a mobile device
        if (this.isMobileDevice) {
            // Wrap in a try-catch to prevent uncaught exceptions
            try {
                // Delay the initialization to ensure DOM is fully loaded
                setTimeout(() => {
                    this.enable();
                }, 500);
            } catch (error) {
                console.error('Error enabling mobile controls:', error);
                showMessage("ERROR ENABLING MOBILE CONTROLS", 2000);
            }
        }
        
        // Also add window resize listener to handle orientation changes
        window.addEventListener('resize', () => {
            if (this.isEnabled) {
                this.updateJoystickPositions();
            }
        });
    }
    
    // Manually enable mobile controls (useful for testing on desktop)
    enable() {
        if (this.isEnabled) return;
        
        // Ensure the UI container exists
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) {
            console.error('UI container not found. Mobile controls cannot be enabled.');
            this.createFallbackControls();
            return;
        }
        
        this.isEnabled = true;
        
        try {
            this.createJoysticks();
            this.createActionButtons();
            showMessage("MOBILE CONTROLS ENABLED", 2000);
        } catch (error) {
            console.error('Error creating mobile controls:', error);
            this.createFallbackControls();
        }
    }
    
    // Disable mobile controls
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.removeJoysticks();
        this.removeActionButtons();
        showMessage("MOBILE CONTROLS DISABLED", 2000);
    }
    
    // Create the virtual joysticks
    createJoysticks() {
        const uiContainer = document.getElementById('ui-container');
        
        // Create container for both joysticks
        const joysticksContainer = document.createElement('div');
        joysticksContainer.id = 'joysticks-container';
        joysticksContainer.style.position = 'absolute';
        joysticksContainer.style.left = '0';
        joysticksContainer.style.bottom = '0';
        joysticksContainer.style.width = '100%';
        joysticksContainer.style.height = '200px';
        joysticksContainer.style.pointerEvents = 'auto';
        joysticksContainer.style.zIndex = '500';
        
        // Create left joystick (WASD movement)
        const moveJoystickContainer = document.createElement('div');
        moveJoystickContainer.id = 'move-joystick-container';
        moveJoystickContainer.style.position = 'absolute';
        moveJoystickContainer.style.left = '50px';
        moveJoystickContainer.style.bottom = '50px';
        moveJoystickContainer.style.width = this.joystickSize + 'px';
        moveJoystickContainer.style.height = this.joystickSize + 'px';
        moveJoystickContainer.style.background = 'rgba(0, 255, 255, 0.2)';
        moveJoystickContainer.style.border = '2px solid #0ff';
        moveJoystickContainer.style.borderRadius = '50%';
        
        const moveJoystick = document.createElement('div');
        moveJoystick.id = 'move-joystick';
        moveJoystick.style.position = 'absolute';
        moveJoystick.style.left = '50%';
        moveJoystick.style.top = '50%';
        moveJoystick.style.width = '40px';
        moveJoystick.style.height = '40px';
        moveJoystick.style.background = '#0ff';
        moveJoystick.style.border = '2px solid #fff';
        moveJoystick.style.borderRadius = '50%';
        moveJoystick.style.transform = 'translate(-50%, -50%)';
        moveJoystick.style.transition = 'transform 0.1s';
        
        moveJoystickContainer.appendChild(moveJoystick);
        joysticksContainer.appendChild(moveJoystickContainer);
        
        // Create right joystick (mouse look)
        const lookJoystickContainer = document.createElement('div');
        lookJoystickContainer.id = 'look-joystick-container';
        lookJoystickContainer.style.position = 'absolute';
        lookJoystickContainer.style.right = '50px';
        lookJoystickContainer.style.bottom = '50px';
        lookJoystickContainer.style.width = this.joystickSize + 'px';
        lookJoystickContainer.style.height = this.joystickSize + 'px';
        lookJoystickContainer.style.background = 'rgba(0, 255, 255, 0.2)';
        lookJoystickContainer.style.border = '2px solid #0ff';
        lookJoystickContainer.style.borderRadius = '50%';
        
        const lookJoystick = document.createElement('div');
        lookJoystick.id = 'look-joystick';
        lookJoystick.style.position = 'absolute';
        lookJoystick.style.left = '50%';
        lookJoystick.style.top = '50%';
        lookJoystick.style.width = '40px';
        lookJoystick.style.height = '40px';
        lookJoystick.style.background = '#0ff';
        lookJoystick.style.border = '2px solid #fff';
        lookJoystick.style.borderRadius = '50%';
        lookJoystick.style.transform = 'translate(-50%, -50%)';
        lookJoystick.style.transition = 'transform 0.1s';
        
        lookJoystickContainer.appendChild(lookJoystick);
        joysticksContainer.appendChild(lookJoystickContainer);
        
        uiContainer.appendChild(joysticksContainer);
        
        // Store references BEFORE setting up event handlers
        this.moveJoystick = {
            container: moveJoystickContainer,
            stick: moveJoystick,
            active: false,
            position: { x: 0, y: 0 },
            value: { x: 0, y: 0 }
        };
        
        this.lookJoystick = {
            container: lookJoystickContainer,
            stick: lookJoystick,
            active: false,
            position: { x: 0, y: 0 },
            value: { x: 0, y: 0 }
        };
        
        // Set up joystick touch handlers after references are created
        this.setupJoystickTouchHandlers();
    }
    
    // Create action buttons for mobile
    createActionButtons() {
        const uiContainer = document.getElementById('ui-container');
        
        // Create container for action buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'mobile-buttons-container';
        buttonsContainer.style.position = 'absolute';
        buttonsContainer.style.right = '10px';
        buttonsContainer.style.top = '250px';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.alignItems = 'flex-end';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.pointerEvents = 'auto';
        buttonsContainer.style.zIndex = '500';
        
        // Define buttons
        const buttons = [
            { id: 'boost-button', text: 'BOOST', action: 'boost' },
            { id: 'land-button', text: 'LAND/TAKE OFF', action: 'land' },
            { id: 'tractor-beam-button', text: 'TRACTOR BEAM', action: 'tractorBeam' },
            { id: 'alien-button', text: 'ALIEN MODE', action: 'alienMode' },
            { id: 'bomb-button', text: 'PLACE BOMB', action: 'placeBomb' }
        ];
        
        buttons.forEach(button => {
            const buttonElement = document.createElement('button');
            buttonElement.id = button.id;
            buttonElement.textContent = button.text;
            buttonElement.style.padding = '10px';
            buttonElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            buttonElement.style.color = '#0ff';
            buttonElement.style.border = '1px solid #0ff';
            buttonElement.style.borderRadius = '5px';
            buttonElement.style.marginBottom = '10px';
            buttonElement.style.width = '120px';
            buttonElement.style.fontSize = '14px';
            
            // Add button handlers
            this.setupButtonHandlers(buttonElement, button.action);
            
            buttonsContainer.appendChild(buttonElement);
            this.actionButtons.push(buttonElement);
        });
        
        uiContainer.appendChild(buttonsContainer);
    }
    
    // Setup joystick touch handlers for the joysticks
    setupJoystickTouchHandlers() {
        // Only setup if joysticks exist
        if (this.moveJoystick && this.moveJoystick.container) {
            // Left joystick (movement)
            this.setupJoystickEvents(this.moveJoystick, (x, y) => {
                // Convert joystick position to input state
                inputHandler.inputState.moveForward = y < -this.deadzone;
                inputHandler.inputState.moveBackward = y > this.deadzone;
                inputHandler.inputState.moveLeft = x < -this.deadzone;
                inputHandler.inputState.moveRight = x > this.deadzone;
            });
        }
        
        if (this.lookJoystick && this.lookJoystick.container) {
            // Right joystick (look)
            this.setupJoystickEvents(this.lookJoystick, (x, y) => {
                // Convert joystick position to mouse look
                // Scale to appropriate range
                inputHandler.inputState.mouseX = x * 0.5; // Reduced sensitivity for better control
                inputHandler.inputState.mouseY = y * 0.5;
            });
        }
    }
    
    // Setup events for a joystick
    setupJoystickEvents(joystick, updateCallback) {
        // Add null check to prevent errors
        if (!joystick || !joystick.container || !joystick.stick) {
            console.warn('Attempted to setup events for invalid joystick');
            return;
        }
        
        const container = joystick.container;
        const stick = joystick.stick;
        
        // Touch start
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            // Calculate the relative position within the joystick container
            const x = touch.clientX - rect.left - rect.width / 2;
            const y = touch.clientY - rect.top - rect.height / 2;
            
            this.moveJoystickStick(joystick, x, y);
            joystick.active = true;
        });
        
        // Touch move
        container.addEventListener('touchmove', (e) => {
            if (!joystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = container.getBoundingClientRect();
            
            // Calculate the relative position within the joystick container
            const x = touch.clientX - rect.left - rect.width / 2;
            const y = touch.clientY - rect.top - rect.height / 2;
            
            this.moveJoystickStick(joystick, x, y);
        });
        
        // Touch end
        container.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.resetJoystick(joystick);
            joystick.active = false;
            
            // Call update with zeros to reset input
            updateCallback(0, 0);
        });
        
        // Touch cancel
        container.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.resetJoystick(joystick);
            joystick.active = false;
            
            // Call update with zeros to reset input
            updateCallback(0, 0);
        });
    }
    
    // Setup handlers for action buttons
    setupButtonHandlers(button, action) {
        // Handle button actions on touch
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.executeButtonAction(action, true);
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.executeButtonAction(action, false);
        });
    }
    
    // Execute an action based on button press/release
    executeButtonAction(action, isPressed) {
        switch (action) {
            case 'boost':
                inputHandler.inputState.boost = isPressed;
                break;
            case 'tractorBeam':
                gameState.isTractorBeamActive = isPressed;
                break;
            case 'land':
                if (isPressed) {
                    if (!gameState.isAlienMode && !gameState.landedOnPlanet) {
                        attemptLanding();
                    } else if (gameState.landedOnPlanet) {
                        takeOff();
                    }
                }
                break;
            case 'alienMode':
                if (isPressed) {
                    if (gameState.isAlienMode) {
                        if (isNearShip()) {
                            toggleAlienMode();
                        }
                    } else if (gameState.landedOnPlanet) {
                        toggleAlienMode();
                    }
                }
                break;
            case 'placeBomb':
                if (isPressed && gameState.isAlienMode && gameState.landedOnPlanet && !gameState.landedOnPlanet.hasBomb) {
                    placeBomb();
                }
                break;
        }
    }
    
    // Move joystick stick within constraints
    moveJoystickStick(joystick, x, y) {
        // Calculate the distance from center
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = this.joystickSize / 2 - 20; // Adjust for stick radius
        
        // If the distance is greater than the max, scale it down
        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            x *= scale;
            y *= scale;
        }
        
        // Update joystick position
        joystick.stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        // Calculate normalized values (-1 to 1)
        const normalizedX = x / maxDistance;
        const normalizedY = y / maxDistance;
        
        // Update joystick values
        joystick.value.x = normalizedX;
        joystick.value.y = normalizedY;
        
        // Call the update callback specific to this joystick
        if (joystick === this.moveJoystick) {
            // Movement joystick (WASD)
            inputHandler.inputState.moveForward = normalizedY < -this.deadzone;
            inputHandler.inputState.moveBackward = normalizedY > this.deadzone;
            inputHandler.inputState.moveLeft = normalizedX < -this.deadzone;
            inputHandler.inputState.moveRight = normalizedX > this.deadzone;
        } else if (joystick === this.lookJoystick) {
            // Look joystick (mouse)
            inputHandler.inputState.mouseX = normalizedX * 0.5; // Reduced sensitivity for better control
            inputHandler.inputState.mouseY = normalizedY * 0.5;
        }
    }
    
    // Reset joystick to center position
    resetJoystick(joystick) {
        // Add null check
        if (!joystick || !joystick.stick) return;
        
        joystick.stick.style.transform = 'translate(-50%, -50%)';
        joystick.value.x = 0;
        joystick.value.y = 0;
    }
    
    // Update joystick positions (e.g., after orientation change)
    updateJoystickPositions() {
        // Add null checks
        if (!this.moveJoystick || !this.lookJoystick) return;
        
        // Reset sticks to their default positions
        if (this.moveJoystick && this.moveJoystick.stick) {
            this.resetJoystick(this.moveJoystick);
        }
        
        if (this.lookJoystick && this.lookJoystick.stick) {
            this.resetJoystick(this.lookJoystick);
        }
    }
    
    // Remove joysticks from the DOM
    removeJoysticks() {
        const joysticksContainer = document.getElementById('joysticks-container');
        if (joysticksContainer) {
            joysticksContainer.remove();
        }
        
        this.moveJoystick = null;
        this.lookJoystick = null;
    }
    
    // Remove action buttons from the DOM
    removeActionButtons() {
        const buttonsContainer = document.getElementById('mobile-buttons-container');
        if (buttonsContainer) {
            buttonsContainer.remove();
        }
        
        this.actionButtons = [];
    }
    
    // Toggle mobile controls
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    // Create simplified fallback controls if full controls fail
    createFallbackControls() {
        console.log('Creating fallback mobile controls');
        const body = document.body;
        
        // Create a simple overlay with instructions
        const fallbackControls = document.createElement('div');
        fallbackControls.id = 'fallback-mobile-controls';
        fallbackControls.style.position = 'fixed';
        fallbackControls.style.bottom = '10px';
        fallbackControls.style.left = '10px';
        fallbackControls.style.right = '10px';
        fallbackControls.style.padding = '10px';
        fallbackControls.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        fallbackControls.style.color = '#0ff';
        fallbackControls.style.border = '1px solid #0ff';
        fallbackControls.style.borderRadius = '5px';
        fallbackControls.style.zIndex = '1000';
        fallbackControls.style.textAlign = 'center';
        
        fallbackControls.innerHTML = `
            <div>MOBILE CONTROLS UNAVAILABLE</div>
            <div style="margin: 10px 0;">Tap anywhere to simulate keys:</div>
            <div style="display: flex; justify-content: space-around; margin-top: 10px;">
                <button id="mobile-move-forward" style="padding: 15px; width: 70px;">W</button>
            </div>
            <div style="display: flex; justify-content: space-around; margin: 10px 0;">
                <button id="mobile-move-left" style="padding: 15px; width: 70px;">A</button>
                <button id="mobile-move-backward" style="padding: 15px; width: 70px;">S</button>
                <button id="mobile-move-right" style="padding: 15px; width: 70px;">D</button>
            </div>
            <div style="display: flex; justify-content: space-around; margin-top: 5px;">
                <button id="mobile-boost" style="padding: 15px; width: 100px;">BOOST</button>
                <button id="mobile-land" style="padding: 15px; width: 100px;">LAND/TAKE OFF</button>
                <button id="mobile-beam" style="padding: 15px; width: 100px;">TRACTOR BEAM</button>
            </div>
        `;
        
        body.appendChild(fallbackControls);
        
        // Add event listeners to the fallback controls
        document.getElementById('mobile-move-forward').addEventListener('touchstart', () => {
            inputHandler.inputState.moveForward = true;
        });
        document.getElementById('mobile-move-forward').addEventListener('touchend', () => {
            inputHandler.inputState.moveForward = false;
        });
        
        document.getElementById('mobile-move-backward').addEventListener('touchstart', () => {
            inputHandler.inputState.moveBackward = true;
        });
        document.getElementById('mobile-move-backward').addEventListener('touchend', () => {
            inputHandler.inputState.moveBackward = false;
        });
        
        document.getElementById('mobile-move-left').addEventListener('touchstart', () => {
            inputHandler.inputState.moveLeft = true;
        });
        document.getElementById('mobile-move-left').addEventListener('touchend', () => {
            inputHandler.inputState.moveLeft = false;
        });
        
        document.getElementById('mobile-move-right').addEventListener('touchstart', () => {
            inputHandler.inputState.moveRight = true;
        });
        document.getElementById('mobile-move-right').addEventListener('touchend', () => {
            inputHandler.inputState.moveRight = false;
        });
        
        document.getElementById('mobile-boost').addEventListener('touchstart', () => {
            inputHandler.inputState.boost = true;
        });
        document.getElementById('mobile-boost').addEventListener('touchend', () => {
            inputHandler.inputState.boost = false;
        });
        
        document.getElementById('mobile-land').addEventListener('touchstart', () => {
            if (!gameState.isAlienMode && !gameState.landedOnPlanet) {
                attemptLanding();
            } else if (gameState.landedOnPlanet) {
                takeOff();
            }
        });
        
        document.getElementById('mobile-beam').addEventListener('touchstart', () => {
            gameState.isTractorBeamActive = true;
        });
        document.getElementById('mobile-beam').addEventListener('touchend', () => {
            gameState.isTractorBeamActive = false;
        });
        
        showMessage("SIMPLIFIED MOBILE CONTROLS ENABLED", 3000);
    }
}

// Create and export a singleton instance
const mobileControls = new MobileControls();
export default mobileControls; 
