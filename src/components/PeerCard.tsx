import type { Peer } from '../types';

interface PeerCardProps {
    peer: Peer;
    isSelected: boolean;
    isConnected: boolean;
    onSelect: (peer: Peer) => void;
}

export function PeerCard({ peer, isSelected, isConnected, onSelect }: PeerCardProps) {
    const hasSharedFiles = peer.sharedFiles && peer.sharedFiles.length > 0;
    const sharedFileCount = peer.sharedFiles?.length || 0;

    const getDeviceIcon = () => {
        if (peer.deviceType === 'mobile') {
            return (
                <svg className="w-6 h-6 text-white/60 group-hover:text-[var(--laser-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            );
        }

        return (
            <svg className="w-6 h-6 text-white/60 group-hover:text-[var(--laser-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        );
    };

    const getStatusText = () => {
        if (peer.status === 'transferring') return 'Transferring...';
        if (hasSharedFiles) return `${sharedFileCount} file${sharedFileCount > 1 ? 's' : ''} available`;
        if (isConnected) return 'Connected';
        return 'Ready to receive';
    };

    return (
        <div
            onClick={() => onSelect(peer)}
            className={`
        peer-node monolith rounded-lg p-6 group cursor-pointer border-white/5 bg-opacity-50 backdrop-blur-md relative
        ${isSelected ? 'selected' : ''}
        ${peer.status === 'transferring' ? 'transferring' : ''}
        ${hasSharedFiles ? 'has-files' : ''}
      `}
        >
            {/* Shared Files Badge */}
            {hasSharedFiles && (
                <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-[var(--laser-blue)] rounded-full shadow-lg shadow-cyan-500/30 animate-pulse">
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                    </svg>
                    <span className="mono text-[10px] font-bold text-black">{sharedFileCount}</span>
                </div>
            )}

            <div className="flex justify-between items-start mb-8">
                <div className={`
          w-12 h-12 bg-white/5 rounded border border-white/10 flex items-center justify-center 
          group-hover:border-[var(--laser-blue)] transition-colors
          ${isSelected ? 'border-[var(--laser-blue)] bg-[var(--laser-blue)]/10' : ''}
          ${hasSharedFiles ? 'border-[var(--laser-blue)]/50' : ''}
        `}>
                    {getDeviceIcon()}
                </div>
                <div className={`status-pulse ${!isConnected ? 'opacity-50' : ''} ${hasSharedFiles ? 'bg-[var(--laser-blue)]' : ''}`} />
            </div>

            <h3 className="mono text-lg font-medium text-white/90">{peer.name}</h3>
            <p className="mono text-[10px] text-white/40 mb-6 uppercase tracking-wider">
                {peer.os} • {peer.deviceType === 'mobile' ? 'Mobile' : 'Peer-to-Peer'}
            </p>

            <div className="flex gap-2">
                <div className="flex-1 h-[1px] bg-white/10 self-center" />
                <span className={`mono text-[9px] uppercase ${hasSharedFiles ? 'text-[var(--laser-blue)]' : isConnected ? 'text-[var(--success-green)]' : 'text-[var(--laser-blue)]'}`}>
                    {getStatusText()}
                </span>
            </div>
        </div>
    );
}
