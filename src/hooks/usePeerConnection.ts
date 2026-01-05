import { useCallback, useRef, useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import type { SignalMessage, FileNode, TransferMetadata } from '../types';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks - max safe size for WebRTC

// Dynamically imported simple-peer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SimplePeer: any = null;

interface UsePeerConnectionProps {
    localPeerId: string;
    sendSignal: (message: Omit<SignalMessage, 'from'>) => void;
    onSignal: (callback: (message: SignalMessage) => void) => void;
    stagedFiles?: FileNode[];  // Files staged for sharing
}

interface TransferState {
    status: 'idle' | 'sending' | 'receiving';
    fileName: string;
    progress: number;
    speed: number;
    totalSize: number;
    transferredSize: number;
}

interface UsePeerConnectionReturn {
    connectToPeer: (peerId: string) => void;
    sendFiles: (files: FileNode[], targetPeerId: string) => Promise<void>;
    requestFiles: (files: FileNode[], fromPeerId: string) => void;
    transferState: TransferState;
    receivedFiles: FileNode[];
    connectedPeers: Set<string>;
    isReady: boolean;
}

export function usePeerConnection({
    localPeerId: _localPeerId,
    sendSignal,
    onSignal,
    stagedFiles = [],
}: UsePeerConnectionProps): UsePeerConnectionReturn {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const peersRef = useRef<Map<string, any>>(new Map());
    const stagedFilesRef = useRef<FileNode[]>([]);
    const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
    const [isReady, setIsReady] = useState(false);
    const [transferState, setTransferState] = useState<TransferState>({
        status: 'idle',
        fileName: '',
        progress: 0,
        speed: 0,
        totalSize: 0,
        transferredSize: 0,
    });
    const [receivedFiles, setReceivedFiles] = useState<FileNode[]>([]);

    // Buffer for receiving file chunks
    const receiveBufferRef = useRef<Map<string, ArrayBuffer[]>>(new Map());
    const fileMetadataRef = useRef<Map<string, TransferMetadata>>(new Map());

    // Load simple-peer dynamically
    useEffect(() => {
        import('simple-peer').then((module) => {
            SimplePeer = module.default;
            setIsReady(true);
            console.log('[Peer] simple-peer loaded successfully');
        }).catch((err) => {
            console.error('[Peer] Failed to load simple-peer:', err);
        });
    }, []);

    // Keep stagedFilesRef updated
    useEffect(() => {
        stagedFilesRef.current = stagedFiles;
    }, [stagedFiles]);

    // Ref for sendFilesInternal to avoid circular dependency
    const sendFilesInternalRef = useRef<((files: FileNode[], targetPeerId: string) => Promise<void>) | null>(null);

    // Handle incoming data
    const handleIncomingData = useCallback((data: Uint8Array, fromPeerId: string) => {
        // Try to parse as JSON (metadata)
        try {
            const text = new TextDecoder().decode(data);
            const metadata = JSON.parse(text) as TransferMetadata;

            if (metadata.type === 'folder-structure') {
                console.log('[Peer] Received folder structure');
            } else if (metadata.type === 'file-start') {
                console.log(`[Peer] Starting to receive: ${metadata.fileName}`);
                fileMetadataRef.current.set(metadata.fileId!, metadata);
                receiveBufferRef.current.set(metadata.fileId!, []);
                setTransferState({
                    status: 'receiving',
                    fileName: metadata.fileName!,
                    progress: 0,
                    speed: 0,
                    totalSize: metadata.fileSize!,
                    transferredSize: 0,
                });
            } else if (metadata.type === 'file-end') {
                console.log(`[Peer] Finished receiving: ${metadata.fileId}`);
                const chunks = receiveBufferRef.current.get(metadata.fileId!) || [];
                const fileMetadata = fileMetadataRef.current.get(metadata.fileId!);

                if (fileMetadata && chunks.length > 0) {
                    const blob = new Blob(chunks);
                    const file = new File([blob], fileMetadata.fileName!, { type: 'application/octet-stream' });

                    // Trigger browser download immediately using file-saver
                    console.log(`[Peer] Triggering download for: ${fileMetadata.fileName}, size: ${blob.size}`);
                    try {
                        saveAs(blob, fileMetadata.fileName!);
                        console.log(`[Peer] Download triggered successfully for: ${fileMetadata.fileName}`);
                    } catch (downloadError) {
                        console.error(`[Peer] Download failed for ${fileMetadata.fileName}:`, downloadError);
                    }

                    const fileNode: FileNode = {
                        id: metadata.fileId!,
                        name: fileMetadata.fileName!,
                        path: fileMetadata.filePath || fileMetadata.fileName!,
                        type: 'file',
                        size: blob.size,
                        file: file,
                    };

                    setReceivedFiles(prev => [...prev, fileNode]);
                }

                receiveBufferRef.current.delete(metadata.fileId!);
                fileMetadataRef.current.delete(metadata.fileId!);
                setTransferState(prev => ({
                    ...prev,
                    status: 'idle',
                    progress: 100,
                }));
            } else if (metadata.type === 'file-request') {
                // Someone is requesting files from us
                console.log('[Peer] Received file request from', fromPeerId, ':', metadata.requestedFiles?.length, 'files');
                if (metadata.requestedFiles && sendFilesInternalRef.current) {
                    // Recursively find files with File objects from our staged files
                    const requestedIds = new Set(metadata.requestedFiles.map(f => f.id));

                    const findFilesRecursively = (nodes: FileNode[]): FileNode[] => {
                        const result: FileNode[] = [];
                        for (const node of nodes) {
                            if (requestedIds.has(node.id) && node.file) {
                                result.push(node);
                            }
                            if (node.children) {
                                result.push(...findFilesRecursively(node.children));
                            }
                        }
                        return result;
                    };

                    const filesToSend = findFilesRecursively(stagedFilesRef.current);
                    console.log('[Peer] Found', filesToSend.length, 'files to send');
                    if (filesToSend.length > 0) {
                        // Send the files back to the requester
                        sendFilesInternalRef.current(filesToSend, fromPeerId);
                    } else {
                        console.warn('[Peer] No matching files found for request. Requested IDs:', [...requestedIds]);
                    }
                }
            }
        } catch {
            // Binary chunk data
            const view = new DataView(data.buffer);
            const fileIdLength = view.getUint16(0);
            const fileId = new TextDecoder().decode(data.slice(2, 2 + fileIdLength));
            const chunkData = data.slice(2 + fileIdLength).buffer;

            const chunks = receiveBufferRef.current.get(fileId);
            if (chunks) {
                chunks.push(chunkData);

                const metadata = fileMetadataRef.current.get(fileId);
                if (metadata) {
                    const transferred = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
                    setTransferState(prev => ({
                        ...prev,
                        transferredSize: transferred,
                        progress: Math.round((transferred / metadata.fileSize!) * 100),
                    }));
                }
            }
        }
    }, []);

    // Create peer connection
    const createPeer = useCallback((targetPeerId: string, initiator: boolean) => {
        if (!SimplePeer) {
            console.error('[Peer] simple-peer not loaded yet');
            return null;
        }

        // Check if we already have this peer
        if (peersRef.current.has(targetPeerId)) {
            const existingPeer = peersRef.current.get(targetPeerId)!;
            // Check if peer is still connected
            if (existingPeer.connected) {
                console.log(`[Peer] Reusing existing connected peer for ${targetPeerId}`);
                return existingPeer;
            } else {
                // Peer exists but not connected, destroy and recreate
                console.log(`[Peer] Destroying stale peer for ${targetPeerId}`);
                try { existingPeer.destroy(); } catch (e) { console.log('[Peer] Error destroying peer:', e); }
                peersRef.current.delete(targetPeerId);
            }
        }

        console.log(`[Peer] Creating ${initiator ? 'initiator' : 'responder'} connection to ${targetPeerId}`);

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            channelConfig: {
                ordered: true, // Keep ordered for reliability
                maxRetransmits: 30, // Allow retransmits for reliability
            },
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });

        peer.on('signal', (data: unknown) => {
            const signalData = data as { type?: string };
            const type = signalData.type === 'offer' ? 'offer' :
                signalData.type === 'answer' ? 'answer' : 'ice-candidate';
            sendSignal({
                type: type as 'offer' | 'answer' | 'ice-candidate',
                to: targetPeerId,
                payload: data,
            });
        });

        peer.on('connect', () => {
            console.log(`[Peer] Connected to ${targetPeerId}`);
            setConnectedPeers(prev => new Set([...prev, targetPeerId]));
        });

        peer.on('close', () => {
            console.log(`[Peer] Disconnected from ${targetPeerId}`);
            peersRef.current.delete(targetPeerId);
            setConnectedPeers(prev => {
                const next = new Set(prev);
                next.delete(targetPeerId);
                return next;
            });
        });

        peer.on('error', (err: Error) => {
            console.error(`[Peer] Error with ${targetPeerId}:`, err);
        });

        peer.on('data', (data: Uint8Array) => {
            handleIncomingData(data, targetPeerId);
        });

        peersRef.current.set(targetPeerId, peer);
        return peer;
    }, [sendSignal, handleIncomingData]);

    // Handle incoming signals
    useEffect(() => {
        console.log('[Peer] Setting up signal handler');
        onSignal((message: SignalMessage) => {
            const { from, type, payload } = message;
            console.log(`[Peer] Processing signal: ${type} from ${from}`);

            let peer = peersRef.current.get(from);
            if (!peer && type === 'offer') {
                console.log(`[Peer] Creating new peer for incoming offer from ${from}`);
                peer = createPeer(from, false) ?? undefined;
            }

            if (peer) {
                console.log(`[Peer] Passing signal to peer connection`);
                peer.signal(payload as Parameters<typeof peer.signal>[0]);
            } else {
                console.warn(`[Peer] No peer found for signal from ${from}`);
            }
        });
    }, [onSignal, createPeer]);

    // Connect to a peer
    const connectToPeer = useCallback((peerId: string) => {
        if (!peersRef.current.has(peerId)) {
            createPeer(peerId, true);
        }
    }, [createPeer]);

    // Send files to a peer
    const sendFiles = useCallback(async (files: FileNode[], targetPeerId: string) => {
        const peer = peersRef.current.get(targetPeerId);
        if (!peer) {
            console.error('[Peer] No connection to', targetPeerId);
            return;
        }

        const calculateSize = (nodes: FileNode[]): number => {
            return nodes.reduce((acc, node) => {
                if (node.type === 'file') return acc + (node.size || 0);
                if (node.children) return acc + calculateSize(node.children);
                return acc;
            }, 0);
        };

        const totalSize = calculateSize(files);
        let transferredSize = 0;
        const startTime = Date.now();

        const structureMetadata: TransferMetadata = {
            type: 'folder-structure',
            structure: files,
        };
        peer.send(JSON.stringify(structureMetadata));

        const flattenFiles = (nodes: FileNode[], basePath = ''): FileNode[] => {
            const result: FileNode[] = [];
            for (const node of nodes) {
                const path = basePath ? `${basePath}/${node.name}` : node.name;
                if (node.type === 'file' && node.file) {
                    result.push({ ...node, path });
                }
                if (node.children) {
                    result.push(...flattenFiles(node.children, path));
                }
            }
            return result;
        };

        const allFiles = flattenFiles(files);

        for (const fileNode of allFiles) {
            if (!fileNode.file) continue;

            const file = fileNode.file;
            const fileId = crypto.randomUUID();

            const startMetadata: TransferMetadata = {
                type: 'file-start',
                fileId,
                fileName: fileNode.name,
                filePath: fileNode.path,
                fileSize: file.size,
                totalChunks: Math.ceil(file.size / CHUNK_SIZE),
            };
            peer.send(JSON.stringify(startMetadata));

            const buffer = await file.arrayBuffer();
            let offset = 0;
            let chunksSent = 0;
            console.log(`[Transfer] Starting to send ${file.name}, size: ${file.size}, chunks: ${Math.ceil(file.size / CHUNK_SIZE)}`);

            while (offset < buffer.byteLength) {
                const chunk = buffer.slice(offset, offset + CHUNK_SIZE);

                const fileIdBytes = new TextEncoder().encode(fileId);
                const prefixedChunk = new Uint8Array(2 + fileIdBytes.length + chunk.byteLength);
                const view = new DataView(prefixedChunk.buffer);
                view.setUint16(0, fileIdBytes.length);
                prefixedChunk.set(fileIdBytes, 2);
                prefixedChunk.set(new Uint8Array(chunk), 2 + fileIdBytes.length);

                peer.send(prefixedChunk);

                offset += CHUNK_SIZE;
                transferredSize += chunk.byteLength;
                chunksSent++;

                // Update state less frequently for better performance (every 5 chunks)
                if (chunksSent % 5 === 0 || offset >= buffer.byteLength) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? transferredSize / elapsed : 0;

                    setTransferState({
                        status: 'sending',
                        fileName: fileNode.name,
                        progress: Math.round((transferredSize / totalSize) * 100),
                        speed,
                        totalSize,
                        transferredSize,
                    });
                }

                // Flow control: if buffer is getting full, wait for it to drain
                // Check bufferedAmount on the data channel if available
                const channel = peer._channel as RTCDataChannel | undefined;
                if (channel && channel.bufferedAmount > 1024 * 1024) {
                    // Wait for buffer to drain below 256KB before continuing
                    await new Promise<void>(resolve => {
                        const checkBuffer = () => {
                            if (!channel || channel.bufferedAmount < 256 * 1024) {
                                resolve();
                            } else {
                                setTimeout(checkBuffer, 10);
                            }
                        };
                        checkBuffer();
                    });
                }
            }

            const endMetadata: TransferMetadata = {
                type: 'file-end',
                fileId,
            };
            peer.send(JSON.stringify(endMetadata));
        }

        setTransferState({
            status: 'idle',
            fileName: '',
            progress: 100,
            speed: 0,
            totalSize: 0,
            transferredSize: 0,
        });
    }, []);

    // Set the ref so handleIncomingData can use sendFiles
    useEffect(() => {
        sendFilesInternalRef.current = sendFiles;
    }, [sendFiles]);

    // Request files from a peer (sends a file-request message)
    const requestFiles = useCallback((files: FileNode[], fromPeerId: string) => {
        const peer = peersRef.current.get(fromPeerId);
        if (!peer) {
            console.error('[Peer] No connection to', fromPeerId, 'for file request');
            return;
        }

        console.log('[Peer] Requesting', files.length, 'files from', fromPeerId);

        const requestMetadata = {
            type: 'file-request',
            requestedFiles: files.map(f => ({ id: f.id, name: f.name, path: f.path, type: f.type, size: f.size })),
            fromPeerId: fromPeerId,  // This is actually the requester's peer ID, but we need a way to know who to send back to
        };

        // We need to send the local peer ID so the sender knows where to send
        // For now, we'll use the existing peer connection (which already knows the target)
        peer.send(JSON.stringify(requestMetadata));
    }, []);

    return {
        connectToPeer,
        sendFiles,
        requestFiles,
        transferState,
        receivedFiles,
        connectedPeers,
        isReady,
    };
}
