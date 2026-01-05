import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Store connected peers
const peers = new Map();

// Get local IP addresses
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }

    return addresses;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        peers: peers.size,
        serverIPs: getLocalIPs()
    });
});

io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`);

    // Handle peer registration
    socket.on('register', (peerInfo) => {
        const peer = {
            id: socket.id,
            name: peerInfo.name,
            ip: peerInfo.ip,
            os: peerInfo.os,
            deviceType: peerInfo.deviceType,
            status: 'online',
            sharedFiles: [],  // Files this peer has staged for sharing
        };

        peers.set(socket.id, peer);
        console.log(`[+] Peer registered: ${peer.name} (${peer.ip})`);

        // Send current peer list to new peer
        socket.emit('peer-list', Array.from(peers.values()).filter(p => p.id !== socket.id));

        // Notify all other peers about new peer
        socket.broadcast.emit('peer-joined', peer);
    });

    // Handle shared files update
    socket.on('share-files', (files) => {
        const peer = peers.get(socket.id);
        if (peer) {
            peer.sharedFiles = files;
            console.log(`[*] ${peer.name} shared ${files.length} files`);
            // Broadcast to all peers including sender
            io.emit('peer-updated', peer);
        }
    });

    // Handle WebRTC signaling
    socket.on('signal', (message) => {
        const { to, type, payload } = message;
        const targetPeer = peers.get(to);
        console.log(`[>] Signal ${type} from ${socket.id} to ${to} (target exists: ${!!targetPeer})`);

        if (!targetPeer) {
            console.log(`[!] Warning: Target peer ${to} not found in peers map. Current peers:`, Array.from(peers.keys()));
        }

        // Forward signal to target peer
        io.to(to).emit('signal', {
            type,
            from: socket.id,
            to,
            payload,
        });
    });

    // Handle transfer status updates
    socket.on('transfer-start', (data) => {
        const peer = peers.get(socket.id);
        if (peer) {
            peer.status = 'transferring';
            io.emit('peer-updated', peer);
        }
    });

    socket.on('transfer-end', () => {
        const peer = peers.get(socket.id);
        if (peer) {
            peer.status = 'online';
            io.emit('peer-updated', peer);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const peer = peers.get(socket.id);
        if (peer) {
            console.log(`[-] Peer disconnected: ${peer.name}`);
            peers.delete(socket.id);
            io.emit('peer-left', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3001;
const localIPs = getLocalIPs();

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    FLUX.OS SIGNALING SERVER              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Status: ONLINE                                          ║`);
    console.log(`║  Port:   ${PORT}                                            ║`);
    console.log('╟──────────────────────────────────────────────────────────╢');
    console.log('║  Access URLs:                                            ║');
    console.log(`║    Local:   http://localhost:${PORT}                        ║`);
    localIPs.forEach(ip => {
        const paddedUrl = `http://${ip}:${PORT}`.padEnd(38);
        console.log(`║    Network: ${paddedUrl}║`);
    });
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
});
