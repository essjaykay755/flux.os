import { formatFileSize, formatSpeed } from '../utils/folderUtils';

interface TransferProgressProps {
    peerName: string;
    fileName: string;
    progress: number;
    speed: number;
    totalSize: number;
    transferredSize: number;
    direction: 'sending' | 'receiving';
}

export function TransferProgress({
    peerName,
    fileName,
    progress,
    speed,
    totalSize,
    transferredSize,
    direction,
}: TransferProgressProps) {
    return (
        <div className="peer-node transferring monolith rounded-lg p-6 border-[var(--laser-blue)]/30 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-[var(--laser-blue)]/10 rounded border border-[var(--laser-blue)]/50 flex items-center justify-center">
                    {direction === 'sending' ? (
                        <svg className="w-6 h-6 text-[var(--laser-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-[var(--laser-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                    )}
                </div>
                <span className="mono text-[10px] text-[var(--laser-blue)] animate-pulse">
                    {formatSpeed(speed)}
                </span>
            </div>

            <h3 className="mono text-lg font-medium text-white/90">{peerName}</h3>
            <p className="mono text-[10px] text-white/40 mb-4 uppercase tracking-wider truncate">
                {direction === 'sending' ? 'Sending' : 'Receiving'}: {fileName}
            </p>

            <div className="w-full bg-white/5 h-1 relative overflow-hidden rounded-full">
                <div
                    className="progress-glow absolute top-0 left-0 h-full bg-[var(--laser-blue)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex justify-between mt-2">
                <span className="mono text-[9px] text-white/30 uppercase">{progress}% Completed</span>
                <span className="mono text-[9px] text-white/30 uppercase">
                    {formatFileSize(transferredSize)} / {formatFileSize(totalSize)}
                </span>
            </div>
        </div>
    );
}
