interface FooterProps {
    isConnected: boolean;
    peerCount: number;
}

export function Footer({ isConnected, peerCount }: FooterProps) {
    return (
        <footer className="mt-8 flex justify-between items-center px-2">
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    <span className="mono text-[10px] uppercase tracking-widest text-white/40">
                        {isConnected ? 'Secure Tunnel Active' : 'Disconnected'}
                    </span>
                </div>
                <div className="mono text-[10px] uppercase tracking-widest text-white/20">|</div>
                <div className="mono text-[10px] uppercase tracking-widest text-white/40">
                    Peers: {peerCount}
                </div>
                <div className="mono text-[10px] uppercase tracking-widest text-white/20">|</div>
                <div className="mono text-[10px] uppercase tracking-widest text-white/40">
                    Latency: 2ms
                </div>
            </div>

            <div className="flex items-center gap-4">
                <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-[10px] uppercase border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all"
                >
                    GitHub
                </a>
            </div>
        </footer>
    );
}
