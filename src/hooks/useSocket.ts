import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Peer, SignalMessage, FileNode } from '../types';

const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3001';

interface UseSocketReturn {
    socket: Socket | null;
    peers: Peer[];
    isConnected: boolean;
    localPeer: Peer | null;
    sendSignal: (message: Omit<SignalMessage, 'from'>) => void;
    onSignal: (callback: (message: SignalMessage) => void) => void;
    shareFiles: (files: FileNode[]) => void;
}

export function useSocket(): UseSocketReturn {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [peers, setPeers] = useState<Peer[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [localPeer, setLocalPeer] = useState<Peer | null>(null);
    const signalCallbackRef = useRef<((message: SignalMessage) => void) | null>(null);

    // Get device info
    const getDeviceInfo = useCallback(() => {
        const userAgent = navigator.userAgent;
        let os = 'Unknown';
        let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) {
            os = 'Android';
            deviceType = 'mobile';
        }
        else if (userAgent.includes('iPhone')) {
            os = 'iOS';
            deviceType = 'mobile';
        }
        else if (userAgent.includes('iPad')) {
            os = 'iPadOS';
            deviceType = 'tablet';
        }

        // Generate a device name
        const storedName = localStorage.getItem('flux-device-name');
        const name = storedName || `${os}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        if (!storedName) {
            localStorage.setItem('flux-device-name', name);
        }

        return { os, deviceType, name };
    }, []);

    useEffect(() => {
        const newSocket = io(SIGNALING_SERVER, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to signaling server');
            setIsConnected(true);

            // Register this peer
            const deviceInfo = getDeviceInfo();
            const peerInfo: Omit<Peer, 'status'> = {
                id: newSocket.id!,
                name: deviceInfo.name,
                ip: 'detecting...',
                os: deviceInfo.os,
                deviceType: deviceInfo.deviceType,
            };

            setLocalPeer({ ...peerInfo, status: 'online' });
            newSocket.emit('register', peerInfo);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected from signaling server');
            setIsConnected(false);
        });

        newSocket.on('peer-list', (peerList: Peer[]) => {
            console.log('[Socket] Received peer list:', peerList);
            setPeers(peerList);
        });

        newSocket.on('peer-joined', (peer: Peer) => {
            console.log('[Socket] Peer joined:', peer);
            setPeers(prev => [...prev.filter(p => p.id !== peer.id), peer]);
        });

        newSocket.on('peer-left', (peerId: string) => {
            console.log('[Socket] Peer left:', peerId);
            setPeers(prev => prev.filter(p => p.id !== peerId));
        });

        newSocket.on('peer-updated', (peer: Peer) => {
            setPeers(prev => prev.map(p => p.id === peer.id ? peer : p));
        });

        newSocket.on('signal', (message: SignalMessage) => {
            console.log('[Socket] Received signal:', message.type, 'from:', message.from, 'payload type:', typeof message.payload);
            if (signalCallbackRef.current) {
                console.log('[Socket] Calling signal callback');
                signalCallbackRef.current(message);
            } else {
                console.warn('[Socket] No signal callback registered!');
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [getDeviceInfo]);

    const sendSignal = useCallback((message: Omit<SignalMessage, 'from'>) => {
        if (socket) {
            console.log('[Socket] Sending signal:', message.type, 'to', message.to);
            socket.emit('signal', message);
        } else {
            console.error('[Socket] Cannot send signal - socket not connected');
        }
    }, [socket]);

    const onSignal = useCallback((callback: (message: SignalMessage) => void) => {
        console.log('[Socket] Signal callback being registered');
        signalCallbackRef.current = callback;
    }, []);

    const shareFiles = useCallback((files: FileNode[]) => {
        if (socket) {
            // Send file metadata only (not actual file content)
            const fileMetadata = files.map(f => ({
                id: f.id,
                name: f.name,
                path: f.path,
                type: f.type,
                size: f.size,
                children: f.children?.map(c => ({
                    id: c.id,
                    name: c.name,
                    path: c.path,
                    type: c.type,
                    size: c.size,
                })),
            }));
            socket.emit('share-files', fileMetadata);
        }
    }, [socket]);

    return {
        socket,
        peers,
        isConnected,
        localPeer,
        sendSignal,
        onSignal,
        shareFiles,
    };
}
