import type { Peer } from '../types';

interface HeaderProps {
    localPeer: Peer | null;
    isConnected: boolean;
}

export function Header({ localPeer, isConnected }: HeaderProps) {
    return (
        <header className="flex justify-between items-end mb-12 px-2">
            <div>
                <div className="flex items-baseline gap-4">
                    <h1 className="text-4xl font-bold tracking-tighter uppercase glitch-text cursor-default">
                        Flux<span className="text-[var(--laser-blue)]">.</span>OS
                    </h1>
                    <span className="mono text-[10px] uppercase tracking-widest text-white/30">
                        by Subhojit Karmakar
                    </span>
                </div>
                <p className="mono text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1">
                    Local Network P2P Protocol v4.0.2
                </p>
            </div>

            <div className="flex gap-8 items-end">
                <div className="text-right">
                    <p className="mono text-[9px] uppercase text-white/30 mb-1">Local Identity</p>
                    <p className="mono text-sm font-medium">
                        {localPeer?.name || 'Detecting...'}{' '}
                        <span className="text-[var(--laser-blue)]">/ {localPeer?.os || '...'}</span>
                    </p>
                </div>
                <div className="text-right border-l border-white/10 pl-8">
                    <p className="mono text-[9px] uppercase text-white/30 mb-1">Status</p>
                    <p className={`mono text-sm font-medium ${isConnected ? 'text-[var(--success-green)]' : 'text-[var(--precision-red)]'}`}>
                        {isConnected ? 'Connected' : 'Offline'}
                    </p>
                </div>
                <div className="text-right border-l border-white/10 pl-8">
                    <p className="mono text-[9px] uppercase text-white/30 mb-1">Encryption</p>
                    <p className="mono text-sm font-medium">AES-256-GCM</p>
                </div>
            </div>
        </header>
    );
}
