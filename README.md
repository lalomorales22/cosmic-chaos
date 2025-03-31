# COSMIC CHAOS: UFO DESTROYER

A multiplayer 3D space game where players pilot UFOs to explore and destroy procedurally generated planets across a vast universe.

## Features

- Fly a UFO spaceship with intuitive WASD + mouse controls
- Explore a vast procedurally generated universe
- Land on planets and deploy an alien explorer
- Place bombs to destroy planets and collect resources
- Travel through wormholes to discover new galaxies
- Connect with other players in multiplayer mode
- Chat with other players in real-time
- Use tractor beams to collect resources from destroyed planets
- Upgrade your ship using collected resources (shields, engine, weapons)
- Overcome planetary defense systems (turrets, missiles, shields)
- Travel between websites using special portals

## Technology Stack

- **Frontend**: JavaScript, Three.js for 3D rendering
- **Backend**: Node.js, Express, WebSocket
- **Networking**: WebSocket for real-time multiplayer communication

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ufo-game
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Game Controls

- **WASD**: Move ship
- **Mouse**: Steer/look
- **Shift**: Boost (watch fuel meter!)
- **Space**: Fire tractor beam
- **B**: Cycle bomb sizes (when on planet as alien)
- **P**: Place bomb (when on planet as alien)
- **L**: Land on planet / Take off
- **E**: Exit ship as alien / Return to ship
- **ESC**: Toggle tutorial

## Multiplayer

The game includes a multiplayer mode that allows players to see each other, chat, and interact in the same universe. 

To enable multiplayer, click the "ENABLE MULTIPLAYER" button in the game interface.

## Ship Upgrades

Collected resources can be used to upgrade your ship's systems:

- **Engine**: Increases maximum speed
- **Shields**: Improves damage resistance and shield capacity
- **Tractor Beam**: Extends range and pull strength
- **Bombs**: Increases bomb capacity
- **Boost**: Improves boost capacity and recharge rate

Access the upgrade panel by clicking the "SHIP UPGRADES" button.

## Planetary Defenses

Some planets are protected by defense systems:

- **Turrets**: Fire direct projectiles at your ship
- **Missiles**: Track and home in on your ship
- **Shields**: Protect planets from smaller bombs (level 3 bombs can penetrate)

Destroying planets with defenses yields more resources.

## Portal System

The game features a special portal system that allows players to travel between different instances or even different websites. The portal system passes player information through URL parameters to maintain continuity.

## Development

### Project Structure

- `js/` - JavaScript module files
  - `modules/` - Game module files
  - `config.js` - Game configuration
  - `app.js` - Main application entry point
- `public/` - Public files served to the client
  - `assets/` - CSS and other assets
  - `index.html` - Main HTML file
- `server.js` - WebSocket and Express server

### Current Status

See [status.md](status.md) for the current development status and planned features.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for the 3D rendering engine
- SimplexNoise for procedural generation
