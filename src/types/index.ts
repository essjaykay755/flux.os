// Peer device information
export interface Peer {
    id: string;
    name: string;
    ip: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    status: 'online' | 'transferring' | 'offline';
    sharedFiles?: FileNode[];  // Files this peer has staged for sharing
}

// File node in folder structure
export interface FileNode {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: number;
    children?: FileNode[];
    file?: File;
}

// Transfer state
export interface Transfer {
    id: string;
    peerId: string;
    peerName: string;
    fileName: string;
    totalSize: number;
    transferredSize: number;
    speed: number;
    status: 'pending' | 'transferring' | 'completed' | 'failed';
    direction: 'sending' | 'receiving';
    files?: FileNode[];
}

// Message types for signaling
export type SignalMessage = {
    type: 'offer' | 'answer' | 'ice-candidate';
    from: string;
    to: string;
    payload: unknown;
};

// File chunk for transfer
export interface FileChunk {
    fileId: string;
    chunkIndex: number;
    totalChunks: number;
    data: ArrayBuffer;
}

// Transfer metadata
export interface TransferMetadata {
    type: 'file-start' | 'file-end' | 'folder-structure';
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    filePath?: string;
    totalChunks?: number;
    structure?: FileNode[];
}

// Socket events
export interface ServerToClientEvents {
    'peer-joined': (peer: Peer) => void;
    'peer-left': (peerId: string) => void;
    'peer-list': (peers: Peer[]) => void;
    'signal': (message: SignalMessage) => void;
}

export interface ClientToServerEvents {
    'register': (peer: Omit<Peer, 'status'>) => void;
    'signal': (message: SignalMessage) => void;
    'share-files': (files: FileNode[]) => void;
}
