# Flux.OS

> A SharedDrop.io-style P2P file sharing app for local networks with a stunning cyberpunk UI.

![Flux.OS](https://img.shields.io/badge/WebRTC-P2P-00e5ff) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🔗 **Peer Discovery** - Automatic detection of devices on your local network
- 📁 **File & Folder Transfer** - Send individual files or entire folders with structure preserved
- 📊 **Real-time Progress** - Track transfer progress with speed indicators
- 🔒 **Direct P2P** - Files transfer directly between devices via WebRTC (no cloud)
- 🎨 **Cyberpunk UI** - Stunning machined-metal aesthetic with radar animations

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Start the Signaling Server

```bash
cd server
node index.js
```

Server runs on `http://localhost:3001`

### 3. Start the Frontend (new terminal)

```bash
npm run dev
```

App runs on `http://localhost:5173`

### 4. Connect Multiple Devices

Open `http://localhost:5173` on multiple browsers/devices on the same network. Devices will automatically discover each other.

## Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## Architecture

```
┌─────────────────┐     WebSocket     ┌─────────────────┐
│   Browser A     │◄──────────────────►│ Signaling Server│
│   (React App)   │                    │   (Socket.IO)   │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  WebRTC DataChannel (P2P)            │
         │◄────────────────────────────────────►│
         │                                      │
┌────────▼────────┐                    ┌────────▼────────┐
│   Browser B     │◄──────────────────►│ Signaling Server│
│   (React App)   │     WebSocket      │   (Socket.IO)   │
└─────────────────┘                    └─────────────────┘
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite
- **WebRTC**: simple-peer
- **Signaling**: Socket.IO (Express server)
- **Build**: Vite with React Compiler

## Project Structure

```
flux.os/
├── src/
│   ├── components/     # UI components (Header, PeerCard, FileDropZone, etc.)
│   ├── hooks/          # useSocket, usePeerConnection
│   ├── utils/          # File/folder utilities
│   └── types/          # TypeScript interfaces
├── server/
│   └── index.js        # Socket.IO signaling server
└── public/             # Static assets
```

## Environment Variables

Create a `.env` file (optional):

```env
VITE_SIGNALING_SERVER=http://localhost:3001
```

## License

MIT
