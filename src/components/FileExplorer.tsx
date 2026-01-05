import { useState, useCallback } from 'react';
import type { FileNode } from '../types';
import { formatFileSize } from '../utils/folderUtils';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

interface FileExplorerProps {
    files: FileNode[];
    onClear: () => void;
}

export function FileExplorer({ files, onClear }: FileExplorerProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    const downloadFile = useCallback((node: FileNode) => {
        console.log('[FileExplorer] Attempting to download:', node.name, 'file object:', node.file);
        if (node.file) {
            saveAs(node.file, node.name);
        } else {
            console.warn('[FileExplorer] No file object available for:', node.name);
        }
    }, []);

    const downloadFolder = useCallback(async (nodes: FileNode[]) => {
        const zip = new JSZip();

        const addToZip = (nodeList: FileNode[], basePath = '') => {
            for (const node of nodeList) {
                const path = basePath ? `${basePath}/${node.name}` : node.name;
                if (node.type === 'file' && node.file) {
                    zip.file(path, node.file);
                } else if (node.children) {
                    addToZip(node.children, path);
                }
            }
        };

        addToZip(nodes);
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'flux-os-download.zip');
    }, []);

    const downloadAll = useCallback(() => {
        downloadFolder(files);
    }, [files, downloadFolder]);

    const renderNode = (node: FileNode, depth = 0) => {
        const isExpanded = expandedFolders.has(node.id);

        return (
            <div key={node.id}>
                <div
                    className="file-tree-item flex items-center gap-2 py-2 px-3 rounded cursor-pointer"
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    onClick={() => node.type === 'folder' ? toggleFolder(node.id) : downloadFile(node)}
                >
                    {node.type === 'folder' ? (
                        <>
                            <svg
                                className={`w-3 h-3 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                            </svg>
                            <svg className="w-4 h-4 text-[var(--laser-blue)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </>
                    ) : (
                        <>
                            <div className="w-3" />
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </>
                    )}

                    <span className="mono text-xs text-white/70 flex-1 truncate">{node.name}</span>

                    {node.size && (
                        <span className="mono text-[10px] text-white/30">{formatFileSize(node.size)}</span>
                    )}

                    {node.type === 'file' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(node);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-[var(--laser-blue)] transition-opacity p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}

                    {node.type === 'folder' && node.children && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadFolder(node.children!);
                            }}
                            className="opacity-0 group-hover:opacity-100 hover:text-[var(--laser-blue)] transition-opacity p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                    )}
                </div>

                {node.type === 'folder' && isExpanded && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (files.length === 0) return null;

    return (
        <div className="monolith rounded-xl p-4">
            <div className="flex justify-between items-center mb-4 px-3">
                <div>
                    <h3 className="mono text-sm text-white/80">Received Files</h3>
                    <p className="mono text-[10px] text-white/40 uppercase">
                        Click file to download • Click folder to expand
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadAll}
                        className="btn-primary mono text-[10px] uppercase px-3 py-1.5 rounded"
                    >
                        Download All
                    </button>
                    <button
                        onClick={onClear}
                        className="btn-ghost mono text-[10px] uppercase px-3 py-1.5 rounded"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto group">
                {files.map(node => renderNode(node))}
            </div>
        </div>
    );
}
