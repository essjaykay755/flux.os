import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { usePeerConnection } from './hooks/usePeerConnection';
import { Header } from './components/Header';
import { PeerCard } from './components/PeerCard';
import { FileDropZone } from './components/FileDropZone';
import { TransferProgress } from './components/TransferProgress';
import { FileExplorer } from './components/FileExplorer';
import { SharedFilesBrowser } from './components/SharedFilesBrowser';
import { Footer } from './components/Footer';
import type { Peer, FileNode } from './types';

function App() {
  const { peers, isConnected, localPeer, sendSignal, onSignal, shareFiles } = useSocket();
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileNode[]>([]);
  const [browsingPeer, setBrowsingPeer] = useState<Peer | null>(null);

  const {
    connectToPeer,
    sendFiles,
    transferState,
    receivedFiles,
    connectedPeers,
    isReady,
  } = usePeerConnection({
    localPeerId: localPeer?.id || '',
    sendSignal,
    onSignal,
  });

  const handlePeerSelect = useCallback((peer: Peer) => {
    // If peer has shared files, open the browser modal
    if (peer.sharedFiles && peer.sharedFiles.length > 0) {
      setBrowsingPeer(peer);
      return;
    }
    // Otherwise toggle selection for sending
    setSelectedPeer(prev => prev?.id === peer.id ? null : peer);
    if (!connectedPeers.has(peer.id)) {
      connectToPeer(peer.id);
    }
  }, [connectedPeers, connectToPeer]);

  const handleFilesSelected = useCallback((files: FileNode[]) => {
    setSelectedFiles(files);
  }, []);

  // Broadcast selected files to all peers
  useEffect(() => {
    shareFiles(selectedFiles);
  }, [selectedFiles, shareFiles]);

  const handleRequestFiles = useCallback((files: FileNode[]) => {
    // Connect and request the files from the browsing peer
    if (browsingPeer) {
      setSelectedPeer(browsingPeer);
      if (!connectedPeers.has(browsingPeer.id)) {
        connectToPeer(browsingPeer.id);
      }
      // TODO: Request specific files via WebRTC data channel
      console.log('Requesting files:', files);
    }
  }, [browsingPeer, connectedPeers, connectToPeer]);

  const handleSendFiles = useCallback(async () => {
    if (selectedPeer && selectedFiles.length > 0) {
      await sendFiles(selectedFiles, selectedPeer.id);
      setSelectedFiles([]);
    }
  }, [selectedPeer, selectedFiles, sendFiles]);

  const handleClearReceivedFiles = useCallback(() => {
    // Clear received files logic
  }, []);

  const isTransferring = transferState.status !== 'idle';

  return (
    <div className="flex items-center justify-center p-8 min-h-screen">
      {/* Noise SVG Filter */}
      <svg className="hidden">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <div className="grain" style={{ filter: 'url(#noise)' }} />

      {/* Main Viewport */}
      <main className="w-full max-w-6xl flex flex-col relative z-10">
        <Header localPeer={localPeer} isConnected={isConnected} />

        {/* Peer Discovery Environment */}
        <section className="monolith rounded-xl radar-grid p-8 relative flex flex-col">
          <div className="scan-line" />

          <div className="absolute top-4 left-6 mono text-[9px] text-white/20 uppercase tracking-widest">
            {isConnected ? 'Scanning active nodes...' : 'Connecting to network...'}
          </div>
          <div className="absolute bottom-4 right-6 mono text-[9px] text-white/20 uppercase tracking-widest">
            {isReady ? 'WebRTC Ready' : 'Loading WebRTC...'}
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 relative z-20">
              {/* Transfer Progress */}
              {isTransferring && (
                <TransferProgress
                  peerName={selectedPeer?.name || 'Unknown'}
                  fileName={transferState.fileName}
                  progress={transferState.progress}
                  speed={transferState.speed}
                  totalSize={transferState.totalSize}
                  transferredSize={transferState.transferredSize}
                  direction={transferState.status === 'sending' ? 'sending' : 'receiving'}
                />
              )}

              {/* Peer Cards */}
              {peers.map((peer) => (
                <PeerCard
                  key={peer.id}
                  peer={peer}
                  isSelected={selectedPeer?.id === peer.id}
                  isConnected={connectedPeers.has(peer.id)}
                  onSelect={handlePeerSelect}
                />
              ))}

              {/* Empty State */}
              {peers.length === 0 && !isTransferring && (
                <div className="lg:col-span-3 text-center py-12">
                  <p className="mono text-sm text-white/30 uppercase tracking-wider">
                    {isConnected
                      ? 'No peers detected on network. Open this app on another device to connect.'
                      : 'Establishing connection to signaling server...'}
                  </p>
                </div>
              )}
            </div>

            {/* File Explorer */}
            {receivedFiles.length > 0 && (
              <div className="mt-8">
                <FileExplorer files={receivedFiles} onClear={handleClearReceivedFiles} />
              </div>
            )}

            {/* File Drop Zone */}
            <div className="mt-8">
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                disabled={!isConnected || isTransferring}
              />
            </div>

            {/* Send Button */}
            {selectedFiles.length > 0 && selectedPeer && !isTransferring && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSendFiles}
                  disabled={!connectedPeers.has(selectedPeer.id)}
                  className="btn-primary mono text-sm uppercase px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectedPeers.has(selectedPeer.id)
                    ? `Send to ${selectedPeer.name}`
                    : `Connecting to ${selectedPeer.name}...`}
                </button>
              </div>
            )}

            {selectedFiles.length > 0 && !selectedPeer && !isTransferring && (
              <div className="mt-4 text-center">
                <p className="mono text-xs text-white/40 uppercase">
                  Select a peer to send files
                </p>
              </div>
            )}
          </div>
        </section>

        <Footer isConnected={isConnected} peerCount={peers.length} />
      </main>

      {/* Interactive Overlay */}
      <div className="fixed bottom-12 right-12 flex flex-col items-end gap-2 pointer-events-none opacity-20">
        <div className="mono text-[8px] uppercase tracking-tighter">System Output:</div>
        {isConnected && (
          <>
            <div className="mono text-[8px] uppercase tracking-tighter">&gt;&gt; Signaling tunnel established</div>
            <div className="mono text-[8px] uppercase tracking-tighter">&gt;&gt; Port 3001 open</div>
            <div className="mono text-[8px] uppercase tracking-tighter">&gt;&gt; {peers.length} peer(s) detected</div>
          </>
        )}
      </div>

      {/* Shared Files Browser Modal */}
      {browsingPeer && (
        <SharedFilesBrowser
          peer={browsingPeer}
          onClose={() => setBrowsingPeer(null)}
          onRequestFiles={handleRequestFiles}
        />
      )}
    </div>
  );
}

export default App;
