import type { FileNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Build folder tree from File list with webkitRelativePath
 */
export function buildFolderTree(files: FileList | File[]): FileNode[] {
    const root: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();

    const fileArray = Array.from(files);

    for (const file of fileArray) {
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const parts = relativePath.split('/');

        let currentPath = '';
        let parent: FileNode[] = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            let node = pathMap.get(currentPath);

            if (!node) {
                node = {
                    id: uuidv4(),
                    name: part,
                    path: currentPath,
                    type: isFile ? 'file' : 'folder',
                    size: isFile ? file.size : undefined,
                    file: isFile ? file : undefined,
                    children: isFile ? undefined : [],
                };

                pathMap.set(currentPath, node);
                parent.push(node);
            }

            if (!isFile && node.children) {
                parent = node.children;
            }
        }
    }

    return root;
}

/**
 * Flatten folder tree to file list
 */
export function flattenTree(nodes: FileNode[]): FileNode[] {
    const result: FileNode[] = [];

    for (const node of nodes) {
        if (node.type === 'file') {
            result.push(node);
        }
        if (node.children) {
            result.push(...flattenTree(node.children));
        }
    }

    return result;
}

/**
 * Calculate total size of folder tree
 */
export function calculateTreeSize(nodes: FileNode[]): number {
    return nodes.reduce((acc, node) => {
        if (node.type === 'file') return acc + (node.size || 0);
        if (node.children) return acc + calculateTreeSize(node.children);
        return acc;
    }, 0);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format transfer speed
 */
export function formatSpeed(bytesPerSecond: number): string {
    return `${formatFileSize(bytesPerSecond)}/s`;
}
