/**
 * Input Handler Module
 * Manages user input for keyboard and mouse
 */

import gameState from './game-state.js';
import { showMessage } from './ui.js';
import { toggleAlienMode, isNearShip, attemptLanding, takeOff, placeBomb } from './player.js';

class InputHandler {
    constructor() {
        this.inputState = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            moveUp: false,
            moveDown: false,
            boost: false,
            placeBomb: false,
            cycleBombSize: false,
            mouseX: 0,
            mouseY: 0
        };
        
        this.setupInputHandlers();
    }
    
    setupInputHandlers() {
        // Keyboard down
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        // Keyboard up
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
        
        // Mouse movement for orientation
        document.addEventListener('mousemove', (event) => {
            this.inputState.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            this.inputState.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
        });
    }
    
    handleKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
                this.inputState.moveForward = true;
                break;
            case 'KeyS':
                this.inputState.moveBackward = true;
                break;
            case 'KeyA':
                this.inputState.moveLeft = true;
                break;
            case 'KeyD':
                this.inputState.moveRight = true;
                break;
            case 'KeyQ':
                this.inputState.moveUp = true;
                break;
            case 'KeyE':
                if (gameState.isAlienMode) {
                    // Return to ship
                    if (isNearShip()) {
                        toggleAlienMode();
                    }
                } else if (gameState.landedOnPlanet) {
                    // Exit as alien
                    toggleAlienMode();
                }
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                // Only activate boost if there's fuel
                if (gameState.boostFuel > 0) {
                    this.inputState.boost = true;
                }
                break;
            case 'KeyL':
                if (!gameState.isAlienMode && !gameState.landedOnPlanet) {
                    attemptLanding();
                } else if (gameState.landedOnPlanet) {
                    takeOff();
                }
                break;
            case 'KeyB':
                if (gameState.isAlienMode && gameState.landedOnPlanet) {
                    this.inputState.cycleBombSize = true;
                }
                break;
            case 'KeyP':
                if (gameState.isAlienMode && gameState.landedOnPlanet && !gameState.landedOnPlanet.hasBomb) {
                    // Directly call placeBomb for immediate feedback
                    placeBomb();
                }
                break;
            case 'Space':
                if (!gameState.isAlienMode) {
                    gameState.isTractorBeamActive = true;
                }
                break;
            case 'Escape':
                this.toggleTutorial();
                break;
        }
    }
    
    handleKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.inputState.moveForward = false;
                break;
            case 'KeyS':
                this.inputState.moveBackward = false;
                break;
            case 'KeyA':
                this.inputState.moveLeft = false;
                break;
            case 'KeyD':
                this.inputState.moveRight = false;
                break;
            case 'KeyQ':
                this.inputState.moveUp = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.inputState.boost = false;
                break;
            case 'KeyB':
                this.inputState.cycleBombSize = false;
                break;
            case 'KeyP':
                this.inputState.placeBomb = false;
                break;
            case 'Space':
                gameState.isTractorBeamActive = false;
                this.inputState.placeBomb = false;
                break;
        }
    }
    
    toggleTutorial() {
        const tutorial = document.getElementById('tutorial');
        gameState.isTutorialVisible = !gameState.isTutorialVisible;
        
        // Reset mouse inputs to prevent accumulated movement after unpausing
        this.inputState.mouseX = 0;
        this.inputState.mouseY = 0;
        
        if (gameState.isTutorialVisible) {
            tutorial.classList.remove('hidden');
            gameState.isPaused = true; // Pause the game when tutorial is visible
        } else {
            tutorial.classList.add('hidden');
            gameState.isPaused = false; // Unpause when tutorial is hidden
        }
    }
}

// Create and export a singleton instance
const inputHandler = new InputHandler();
export default inputHandler;
