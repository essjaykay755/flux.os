import { useState } from 'react';
import type { Peer, FileNode } from '../types';

interface SharedFilesBrowserProps {
    peer: Peer;
    onClose: () => void;
    onRequestFiles: (files: FileNode[]) => void;
}

export function SharedFilesBrowser({ peer, onClose, onRequestFiles }: SharedFilesBrowserProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const sharedFiles = peer.sharedFiles || [];

    const toggleFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    const selectAll = () => {
        const allIds = new Set<string>();
        const collectIds = (nodes: FileNode[]) => {
            nodes.forEach(node => {
                allIds.add(node.id);
                if (node.children) collectIds(node.children);
            });
        };
        collectIds(sharedFiles);
        setSelectedFiles(allIds);
    };

    const handleRequestDownload = () => {
        const filesToRequest = sharedFiles.filter(f => selectedFiles.has(f.id));
        onRequestFiles(filesToRequest);
        onClose();
    };

    const formatSize = (bytes?: number): string => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const renderFileNode = (node: FileNode, depth = 0) => {
        const isSelected = selectedFiles.has(node.id);
        const isFolder = node.type === 'folder';

        return (
            <div key={node.id}>
                <div
                    className={`
                        flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? 'bg-[var(--laser-blue)]/20 border border-[var(--laser-blue)]/50' : 'hover:bg-white/5'}
                    `}
                    style={{ marginLeft: depth * 20 }}
                    onClick={() => toggleFile(node.id)}
                >
                    {/* Checkbox */}
                    <div className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                        ${isSelected ? 'bg-[var(--laser-blue)] border-[var(--laser-blue)]' : 'border-white/30'}
                    `}>
                        {isSelected && (
                            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>

                    {/* Icon */}
                    {isFolder ? (
                        <svg className="w-5 h-5 text-[var(--laser-blue)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                        </svg>
                    )}

                    {/* Name */}
                    <span className="mono text-sm text-white/90 flex-1 truncate">{node.name}</span>

                    {/* Size */}
                    <span className="mono text-[10px] text-white/40">{formatSize(node.size)}</span>
                </div>

                {/* Children */}
                {node.children && node.children.map(child => renderFileNode(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
            <div className="monolith w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-semibold text-white/90">
                            Files from <span className="text-[var(--laser-blue)]">{peer.name}</span>
                        </h2>
                        <p className="mono text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                            {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''} available • Select files to download
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {sharedFiles.length === 0 ? (
                        <div className="text-center py-12 text-white/40">
                            <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                            <p className="mono text-sm">No files shared</p>
                        </div>
                    ) : (
                        sharedFiles.map(file => renderFileNode(file))
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/5">
                    <button
                        onClick={selectAll}
                        className="mono text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors"
                    >
                        Select All
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-white/20 mono text-sm text-white/60 hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRequestDownload}
                            disabled={selectedFiles.size === 0}
                            className={`
                                px-4 py-2 rounded-lg mono text-sm font-medium transition-all
                                ${selectedFiles.size > 0
                                    ? 'bg-[var(--laser-blue)] text-black hover:bg-[var(--laser-blue)]/80'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'}
                            `}
                        >
                            Download {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
