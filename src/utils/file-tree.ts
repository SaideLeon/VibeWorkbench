import { FileNode } from '@/types';

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children?: TreeNode[];
  level: number;
}

export interface FlatNode extends TreeNode {
  isExpanded?: boolean;
  hasChildren?: boolean;
}

export function buildTree(files: FileNode[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map: Record<string, TreeNode> = {};

  // Sort files by path to ensure parent folders come before children or are easily inferable
  // Actually, sorting by path length or just path string helps
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Helper to find or create parent nodes
  // Since GitHub API returns all paths, we might have 'src' and 'src/index.ts'
  // But sometimes we might have 'src/index.ts' without 'src' explicitly if recursive=1 behaves oddly (unlikely)
  // But let's assume we have all entries.
  
  // Actually, building a tree from flat paths:
  
  const nodes: Record<string, TreeNode> = {};
  
  // First pass: create all nodes
  sortedFiles.forEach(file => {
    nodes[file.path] = {
      id: file.path,
      name: file.path.split('/').pop() || '',
      path: file.path,
      type: file.type,
      children: [],
      level: 0 // Will be set later
    };
  });

  // Second pass: structure them
  sortedFiles.forEach(file => {
    const node = nodes[file.path];
    const parts = file.path.split('/');
    
    if (parts.length === 1) {
      node.level = 0;
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = nodes[parentPath];
      
      if (parent) {
        node.level = parent.level + 1;
        parent.children?.push(node);
      } else {
        // Parent missing from list (should not happen with full recursive tree, but possible)
        // If missing, treat as root or create implicit parent? 
        // For safety, treat as root but with deeper level? Or just add to root.
        node.level = parts.length - 1;
        root.push(node);
      }
    }
  });

  // Sort children: folders first, then files
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'tree' ? -1 : 1;
    });
    nodes.forEach(node => {
      if (node.children) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return root;
}

export function flattenTree(
  nodes: TreeNode[], 
  expandedIds: Set<string>, 
  result: FlatNode[] = []
): FlatNode[] {
  for (const node of nodes) {
    const isExpanded = expandedIds.has(node.path);
    result.push({
      ...node,
      isExpanded,
      hasChildren: node.children && node.children.length > 0
    });

    if (isExpanded && node.children) {
      flattenTree(node.children, expandedIds, result);
    }
  }
  return result;
}
