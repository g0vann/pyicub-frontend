import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { GraphService } from '../../services/graph.service';
import { GraphNode, GraphEdge } from '../../models/graph.model';

/**
 * Interface representing a node in the hierarchical tree structure before flattening.
 */
interface FileNode {
  id: string;
  label: string;
  type: 'init' | 'action' | 'ref' | 'folder'; // ref = cycle link, folder = Orphans container
  children?: FileNode[];
}

/** 
 * Interface for the flattened node used by the MatTree rendering.
 */
interface FlatNode {
  expandable: boolean;
  name: string;
  level: number;
  id: string;
  type: 'init' | 'action' | 'ref' | 'folder';
}

@Component({
  selector: 'app-tree-view-panel',
  standalone: true,
  imports: [CommonModule, MatTreeModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './tree-view-panel.html',
  styleUrls: ['./tree-view-panel.scss']
})
export class TreeViewPanel implements OnInit, OnDestroy {
  private graphService = inject(GraphService);
  private sub = new Subscription();

  // --- Tree Control & DataSource ---
  private _transformer = (node: FileNode, level: number): FlatNode => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.label,
      level: level,
      id: node.id,
      type: node.type
    };
  };

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable,
  );

  treeFlattener = new MatTreeFlattener(
    this._transformer,
    node => node.level,
    node => node.expandable,
    node => node.children,
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  ngOnInit() {
    this.sub.add(this.graphService.getGraphData().subscribe(data => {
      const treeData = this.buildTreeFromGraph(data.nodes, data.edges);
      this.dataSource.data = treeData;
      
      // Auto-expand the 'Main Flow' (root) and 'Orphans' if few items
      // For now, let's expand everything at level 0 (Init and Orphans)
      if (this.treeControl.dataNodes) {
          this.treeControl.expandAll(); 
      }
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  onNodeClick(node: FlatNode) {
    if (node.type !== 'folder') {
      this.graphService.focusOnNode(node.id);
    }
  }

  /**
   * Core Logic: Transforms the Flat Graph into a Hierarchical Tree
   */
  private buildTreeFromGraph(nodes: GraphNode[], edges: GraphEdge[]): FileNode[] {
    if (!nodes.length) return [];

    const initNode = nodes.find(n => n.type === 'start');
    if (!initNode) {
        // Fallback: if no init, just list all as orphans
        return [{
            id: 'orphans',
            label: 'Nodi Isolati / Non Connessi',
            type: 'folder',
            children: nodes.map(n => ({ id: n.id, label: n.label, type: 'action' }))
        }];
    }

    const adj = new Map<string, string[]>();
    edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push(e.target);
    });

    const visitedGlobal = new Set<string>(); // To track which nodes are reached by the main flow
    
    // --- Recursive Build ---
    const buildNode = (nodeId: string, currentPath: Set<string>): FileNode => {
        visitedGlobal.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        // Fallback safety
        if (!node) return { id: nodeId, label: 'Unknown', type: 'action' };

        const nodeType = node.type === 'start' ? 'init' : 'action';

        // Check for children
        const childrenIds = adj.get(nodeId) || [];

        // If no children, it's a leaf
        if (childrenIds.length === 0) {
            return { id: node.id, label: node.label, type: nodeType };
        }

        const childrenNodes: FileNode[] = [];
        
        childrenIds.forEach(childId => {
            // CYCLE DETECTION: Is childId already in the current recursion path?
            if (currentPath.has(childId)) {
                // Yes, it's a back-link (Cycle). Create a 'ref' node.
                const childNode = nodes.find(n => n.id === childId);
                childrenNodes.push({
                    id: childId,
                    label: `Torna a: ${childNode?.label || 'Unknown'}`,
                    type: 'ref'
                });
            } else {
                // No, it's a new step down. Recurse.
                // We create a new Set for the path to allow branching paths to have their own history
                const newPath = new Set(currentPath);
                newPath.add(childId);
                childrenNodes.push(buildNode(childId, newPath));
            }
        });

        return {
            id: node.id,
            label: node.label,
            type: nodeType,
            children: childrenNodes
        };
    };

    // Start building from Init
    const rootTree = buildNode(initNode.id, new Set([initNode.id]));

    // --- Orphans Detection ---
    const orphans = nodes.filter(n => !visitedGlobal.has(n.id));
    
    const result: FileNode[] = [rootTree];

    if (orphans.length > 0) {
        result.push({
            id: 'orphans-folder',
            label: '⚠️ Nodi non raggiungibili',
            type: 'folder',
            children: orphans.map(n => ({ id: n.id, label: n.label, type: 'action' }))
        });
    }

    return result;
  }

  hasChild = (_: number, node: FlatNode) => node.expandable;
}
