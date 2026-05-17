# MatrixSwarm: Development Guide

## Build Commands

To build the project for development:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

## Production Build

To build the Rust WebAssembly and the React UI for production:
```bash
npm run build
```

## Running Unit Tests (Rust)
The core logic resides in `rust-core`. To run the unit tests:
```bash
cd rust-core
cargo test
```

## Running the Swarm Demo (Docker)
We use `docker-compose` to spin up multiple "nodes" (Magistrate, Scout, Relay) to test P2P interaction.

```bash
docker-compose up --build
```
