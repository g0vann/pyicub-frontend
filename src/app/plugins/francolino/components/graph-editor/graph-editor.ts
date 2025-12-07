/**
 * @file graph-editor.ts
 * @description Definisce il componente `GraphEditor`, il cuore visivo e interattivo dell'applicazione
 * dove il grafo viene visualizzato e manipolato.
 */

import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { Action } from '../../models/action';
import { GraphStateService, EdgeType } from '../../services/graph-state';
import { GraphService } from '../../services/graph.service';
import cytoscape, { NodeSingular } from 'cytoscape';
import cxtmenu from 'cytoscape-cxtmenu';

cytoscape.use(cxtmenu);

/**
 * @class GraphEditor
 * @description Componente che renderizza un grafo interattivo utilizzando la libreria Cytoscape.js.
 * Ora agisce come un componente "dumb" (di sola visualizzazione): riceve lo stato dal GraphService
 * e invia gli eventi di interazione utente (aggiunta nodi/archi) al servizio stesso.
 */
@Component({
  selector: 'app-graph-editor',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './graph-editor.html',
  styleUrls: ['./graph-editor.scss'],
  host: {
    '(dragover)': 'onDragOver($event)',
    '(drop)': 'onDrop($event)',
  }
})
export class GraphEditor implements AfterViewInit, OnDestroy {
  @ViewChild('cyContainer', { static: true }) cyContainer!: ElementRef<HTMLElement>;
  @Output() nodeSelect = new EventEmitter<any>();

  private cy!: cytoscape.Core;
  private subs = new Subscription();

  private currentEdgeType: EdgeType | null = null;
  private sourceNode: NodeSingular | null = null;

  // Inietta i servizi necessari
  public graphState = inject(GraphStateService);
  private graphService = inject(GraphService);

  @HostListener('window:keydown.delete', ['$event'])
  onDeleteKeyPress(event: KeyboardEvent) {
    const selected = this.cy.elements(':selected');
    if (selected.length > 0) {
      const idsToRemove = selected.map(el => el.id());
      this.graphService.removeElements(idsToRemove);
    }
  }

  ngAfterViewInit() {
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => ele.data('color'),
            'label': (ele: NodeSingular) => ele.data('label'),
            'shape': (ele: NodeSingular) => ele.data('shape'),
            'text-valign': 'center',
            'text-halign': 'center',
            'width': (ele: NodeSingular) => (ele.data('label') || '').length * 7 + 25,
            'height': 35,
            'padding': '0px',
            'font-size': '12px',
            'color': '#000',
            'text-wrap': 'none',
            'border-color': '#000',
            'border-width': 2,
            'border-style': 'solid'
          }
        },
        { selector: 'node[type = "start"]', style: { 'color': '#fff' } },
        { selector: 'edge', style: { 'width': 3, 'line-color': '#ccc', 'curve-style': 'bezier' } },
        { selector: ':selected', style: { 'border-width': 3, 'border-color': '#3f51b5' } },
        { selector: 'edge:selected', style: { 'line-color': '#3f51b5', 'source-arrow-color': '#3f51b5', 'target-arrow-color': '#3f51b5' } },
        { selector: 'edge[type="dashed"]', style: { 'line-style': 'dashed' } },
        { selector: 'edge[type="arrow"]', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': '#ccc' } },
        { selector: 'edge[type="bi-arrow"]', style: { 'source-arrow-shape': 'triangle', 'source-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#ccc' } },
        { selector: '.source-node', style: { 'border-width': '3px', 'border-color': '#3f51b5', 'border-style': 'solid' } }
      ],
      layout: { name: 'preset' }
    });

    (this.cy as any).cxtmenu({
      selector: 'node, edge',
      commands: [
        {
          content: '<span class="material-icons">delete</span> Elimina',
          contentAsHTML: true,
          select: (ele) => {
            this.graphService.removeElements([ele.id()]);
          }
        }
      ]
    });

    // Sottoscrizione allo stato del grafo dal servizio
    this.subs.add(this.graphService.getGraphData().subscribe(graphData => {
      console.log('GraphEditor received new graphData');
      if (!graphData || !graphData.nodes) {
          console.log('Received empty or invalid graphData. Skipping render.');
          return;
      }
      const cyElements = {
        nodes: graphData.nodes.map(node => {
            const { position, ...data } = node;
            return { data, position };
        }),
        edges: graphData.edges.map(edge => ({ data: { ...edge } }))
      };
      this.cy.json({ elements: cyElements });
      console.log('cy.json() called.');
    }));

    // Sottoscrizione alle richieste di layout
    this.subs.add(this.graphService.getLayoutRequests().subscribe(request => {
      if (request === 'fit') {
        setTimeout(() => {
          console.log('Running layout adjustments...');
          this.cy.resize();
          this.cy.fit();
          this.cy.center();
          console.log('Graph resized, fitted, and centered.');
        }, 100);
      }
    }));

    // Sottoscrizione allo stato della UI per il disegno degli archi
    this.subs.add(this.graphState.currentEdgeType.subscribe(type => {
        this.currentEdgeType = type;
        this.sourceNode = null;
        this.cy.nodes().removeClass('source-node');
    }));

    // Gestione eventi di Cytoscape
    this.setupCytoscapeEventHandlers();
    setTimeout(() => {
      this.cy.resize();
      this.cy.fit();
    }, 50);
  }

  /**
   * @method setupCytoscapeEventHandlers
   * @description Imposta tutti gli handler per gli eventi generati da Cytoscape (es. tap su un nodo).
   */
  private setupCytoscapeEventHandlers() {
    this.cy.on('tap', 'node', (event) => {
        const tappedNode = event.target;

        if (!this.currentEdgeType) {
            this.nodeSelect.emit(tappedNode.data());
            return;
        }

        if (!this.sourceNode) {
            this.sourceNode = tappedNode;
            tappedNode.addClass('source-node');
        } else {
            if (this.sourceNode.id() !== tappedNode.id()) {
                // NOTIFICA IL SERVIZIO invece di modificare cy direttamente
                this.graphService.addEdge({ source: this.sourceNode.id(), target: tappedNode.id(), type: this.currentEdgeType });
            }
            this.sourceNode.removeClass('source-node');
            this.sourceNode = null;
            this.graphState.setEdgeType(null);
        }
    });

    this.cy.on('unselect', 'node', () => {
        this.nodeSelect.emit(undefined);
    });
  }

  ngOnDestroy() {
      this.subs.unsubscribe();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const action = JSON.parse(event.dataTransfer!.getData('application/json')) as Action;
    const wrapperRect = this.cyContainer.nativeElement.getBoundingClientRect();
    const renderedPosition = {
        x: event.clientX - wrapperRect.left,
        y: event.clientY - wrapperRect.top
    };

    const pan = this.cy.pan();
    const zoom = this.cy.zoom();

    // Convert rendered position to model position
    const position = {
        x: (renderedPosition.x - pan.x) / zoom,
        y: (renderedPosition.y - pan.y) / zoom
    };

    let shape: string = action.name === 'Init' ? 'ellipse' : 'round-rectangle';

    // NOTIFICA IL SERVIZIO invece di modificare cy direttamente
    this.graphService.addNode({
      label: action.name,
      color: action.defaultColor,
      shape: shape,
      position: position,
    }, action.name);
  }

  zoomIn() { this.cy.zoom(this.cy.zoom() * 1.2); }
  zoomOut() { this.cy.zoom(this.cy.zoom() / 1.2); }
  fit() { this.cy.fit(); }
}
