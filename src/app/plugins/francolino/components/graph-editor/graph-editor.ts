/**
 * @file graph-editor.ts
 * @description Definisce il componente `GraphEditor`, il cuore visivo e interattivo dell'applicazione
 * dove il grafo viene visualizzato e manipolato.
 */

import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { Action } from '../../models/action';
import { GraphStateService, EdgeType } from '../../services/graph-state';
import { GraphService } from '../../services/graph.service';
import cytoscape, { NodeSingular } from 'cytoscape';

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
  template: `
    <div class="graph-container">
      <div class="cy-container" #cyContainer></div>
      <div class="zoom-controls">
        <button mat-fab color="primary" (click)="zoomIn()">
          <mat-icon>zoom_in</mat-icon>
        </button>
        <button mat-fab color="primary" (click)="zoomOut()">
          <mat-icon>zoom_out</mat-icon>
        </button>
        <button mat-fab color="primary" (click)="fit()">
          <mat-icon>fullscreen</mat-icon>
        </button>
      </div>
      <div class="tooltip" *ngIf="(graphState.currentEdgeType | async)">
        Per disegnare un arco clicca sul nodo di partenza e poi seleziona il nodo di destinazione
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1 1 auto;
      height: 100%;
      min-height: 0;
    }

    .graph-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      min-height: 0 !important;
      position: relative;
      overflow: hidden; /* importantissimo */
    }

    .cy-container {
      flex: 1 1 auto;
      min-height: 0 !important;
      width: 100%;
      height: 100%;
      overflow: hidden !important;
      position: relative;
      background-image:
        linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px);
      background-size: 20px 20px;
    }

    .zoom-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
    }

    .tooltip {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0,0,0,0.6);
      color: white;
      padding: 8px 16px;
      border-radius: 16px;
      font-size: 14px;
      pointer-events: none;
    }
`],
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

  ngAfterViewInit() {
    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      style: [
        { selector: 'node', style: { 'background-color': (ele: NodeSingular) => ele.data('color'), 'label': (ele: NodeSingular) => ele.data('label'), 'shape': (ele: NodeSingular) => ele.data('shape') } },
        { selector: '.circle', style: { 'width': '50px','height': '50px' } },
        { selector: '.square', style: { 'width': '50px','height': '50px' } },
        { selector: '.rectangle', style: { 'width': '70px','height': '40px' } },
        { selector: '.diamond', style: { 'width': '50px','height': '50px' } },
        { selector: 'edge', style: { 'width': 3, 'line-color': '#ccc', 'curve-style': 'bezier' } },
        { selector: 'edge[type="dashed"]', style: { 'line-style': 'dashed' } },
        { selector: 'edge[type="arrow"]', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': '#ccc' } },
        { selector: 'edge[type="bi-arrow"]', style: { 'source-arrow-shape': 'triangle', 'source-arrow-color': '#ccc', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#ccc' } },
        { selector: '.source-node', style: { 'border-width': '3px', 'border-color': '#3f51b5', 'border-style': 'solid' } }
      ],
      layout: { name: 'preset' }
    });

    // Sottoscrizione allo stato del grafo dal servizio
    this.subs.add(this.graphService.getGraphData().subscribe(graphData => {
      const cyElements = {
        nodes: graphData.nodes.map(node => ({ data: { ...node }, position: node.position })),
        edges: graphData.edges.map(edge => ({ data: { ...edge } }))
      };
      this.cy.json({ elements: cyElements }); // Aggiorna l'intera istanza di Cytoscape
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

    const position = { x: event.clientX - wrapperRect.left, y: event.clientY - wrapperRect.top };

    let shape: string = 'ellipse';
    if (action.icon === 'square') shape = 'rectangle';
    else if (action.icon === 'circle') shape = 'ellipse';
    else if (action.icon === 'rectangle' || action.icon === 'diamond') shape = action.icon;

    // NOTIFICA IL SERVIZIO invece di modificare cy direttamente
    this.graphService.addNode({
      label: action.name,
      color: action.defaultColor,
      shape: shape,
      position: position,
    });
  }

  zoomIn() { this.cy.zoom(this.cy.zoom() * 1.2); }
  zoomOut() { this.cy.zoom(this.cy.zoom() / 1.2); }
  fit() { this.cy.fit(); }
}
