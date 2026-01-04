import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import type { FileNode } from '../types';
import { buildFolderTree, formatFileSize, calculateTreeSize } from '../utils/folderUtils';

interface FileDropZoneProps {
    onFilesSelected: (files: FileNode[]) => void;
    disabled?: boolean;
}

export function FileDropZone({ onFilesSelected, disabled = false }: FileDropZoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileNode[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const tree = buildFolderTree(files);
        setSelectedFiles(tree);
        onFilesSelected(tree);
    }, [onFilesSelected]);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragOver(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        const items = e.dataTransfer.items;
        const files: File[] = [];

        // Collect all files (including from folders)
        const processEntry = async (entry: FileSystemEntry): Promise<void> => {
            if (entry.isFile) {
                const fileEntry = entry as FileSystemFileEntry;
                return new Promise((resolve) => {
                    fileEntry.file((file) => {
                        // Add relative path
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: entry.fullPath.substring(1), // Remove leading /
                        });
                        files.push(file);
                        resolve();
                    });
                });
            } else if (entry.isDirectory) {
                const dirEntry = entry as FileSystemDirectoryEntry;
                const reader = dirEntry.createReader();
                return new Promise((resolve) => {
                    reader.readEntries(async (entries) => {
                        for (const childEntry of entries) {
                            await processEntry(childEntry);
                        }
                        resolve();
                    });
                });
            }
        };

        const processItems = async () => {
            const entries: FileSystemEntry[] = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) entries.push(entry);
            }

            for (const entry of entries) {
                await processEntry(entry);
            }

            if (files.length > 0) {
                handleFiles(files);
            }
        };

        processItems();
    }, [disabled, handleFiles]);

    const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    const clearSelection = useCallback(() => {
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    }, []);

    const totalSize = selectedFiles.length > 0 ? calculateTreeSize(selectedFiles) : 0;

    return (
        <div className="w-full">
            {selectedFiles.length === 0 ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            drop-zone lg:col-span-3 border-2 border-dashed border-white/5 rounded-xl 
            flex flex-col items-center justify-center p-12 group 
            hover:border-[var(--laser-blue)]/20 transition-all duration-700
            ${isDragOver ? 'drag-over' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
                >
                    <div className={`drop-icon text-white/10 group-hover:text-[var(--laser-blue)]/40 transition-colors mb-4 ${isDragOver ? 'text-[var(--laser-blue)]/60' : ''}`}>
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <p className="mono text-xs uppercase tracking-[0.4em] text-white/20 group-hover:text-white/50 transition-colors mb-6">
                        Drag files or folders into the monolithic field to broadcast
                    </p>

                    <div className="flex gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            className="btn-ghost mono text-[10px] uppercase px-4 py-2 rounded"
                        >
                            Select Files
                        </button>
                        <button
                            onClick={() => folderInputRef.current?.click()}
                            disabled={disabled}
                            className="btn-ghost mono text-[10px] uppercase px-4 py-2 rounded"
                        >
                            Select Folder
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                    />
                    <input
                        ref={folderInputRef}
                        type="file"
                        // @ts-expect-error webkitdirectory is not in types
                        webkitdirectory=""
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="monolith rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="mono text-sm text-white/80">
                                {selectedFiles.length} item{selectedFiles.length > 1 ? 's' : ''} selected
                            </p>
                            <p className="mono text-[10px] text-white/40 uppercase">
                                Total: {formatFileSize(totalSize)}
                            </p>
                        </div>
                        <button
                            onClick={clearSelection}
                            className="btn-ghost mono text-[10px] uppercase px-3 py-1 rounded"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {selectedFiles.map((node) => (
                            <div key={node.id} className="flex items-center gap-2 text-white/60">
                                {node.type === 'folder' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                )}
                                <span className="mono text-xs truncate flex-1">{node.name}</span>
                                {node.size && (
                                    <span className="mono text-[10px] text-white/30">{formatFileSize(node.size)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
