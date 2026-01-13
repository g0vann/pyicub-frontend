import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Action } from '../../models/action';
import { GraphStateService, EdgeType } from '../../services/graph-state';
import { GraphService } from '../../services/graph.service';
import cytoscape, { NodeSingular } from 'cytoscape';
import cxtmenu from 'cytoscape-cxtmenu';

cytoscape.use(cxtmenu);

@Component({
  selector: 'app-graph-editor',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
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

  // Variabili per il Drag & Connect manuale
  private isDrawingEdge = false;
  private dragSourceNode: NodeSingular | null = null;
  private ghostNode: NodeSingular | null = null;
  private ghostEdge: any = null;
  private currentHoverNode: NodeSingular | null = null;

  public graphState = inject(GraphStateService);
  private graphService = inject(GraphService);
  private snackBar = inject(MatSnackBar);

  @HostListener('window:keydown.delete', ['$event'])
  onDeleteKeyPress(event: KeyboardEvent) {
    const selected = this.cy.elements(':selected');
    if (selected.length > 0) {
      const idsToRemove = selected.map(el => el.id());
      this.graphService.removeElements(idsToRemove);
    }
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKeyPress(event: KeyboardEvent) {
    this.cy.nodes().removeClass('search-highlight');
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
        { selector: 'edge[type="arrow"]', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': '#ccc' } },
        
        // Stile specifico per i self-loops (autoarchi) per migliorare l'estetica sui rettangoli
        { 
            selector: 'edge:loop', 
            style: { 
                'control-point-step-size': 80, // Aumentato per rendere il loop più "alto"
                'loop-direction': '-45deg',    // Posizione (in alto a destra)
                'loop-sweep': '-45deg'         // Curva più stretta e allungata
            } 
        },

        // Stile evidenziazione ricerca
        {
            selector: '.search-highlight',
            style: {
                'border-color': '#FBC02D', // Giallo Oro
                'border-width': 4,
                'background-color': '#FFF9C4', // Giallo chiarissimo
                'transition-property': 'background-color, border-color, border-width',
                'transition-duration': 300
            } as any // Cast any per evitare errori TS su transition properties se mancano typing
        },
        
        // Stile per evidenziare il target durante il drag & connect
        { 
            selector: '.target-hover', 
            style: { 
                'border-width': 4, 
                'border-color': '#3f51b5',
                'border-style': 'double'
            } 
        },

        // Stile per elementi fantasma (durante il trascinamento)
        { 
            selector: '.ghost-node', 
            style: { 
                'background-opacity': 0, 
                'border-width': 0, 
                'width': 1, 
                'height': 1, 
                'label': '',
                'events': 'no'
            } 
        },
        { 
            selector: '.ghost-edge', 
            style: { 
                'line-style': 'dashed', 
                'line-color': '#3f51b5', 
                'target-arrow-shape': 'triangle', 
                'target-arrow-color': '#3f51b5',
                'width': 2,
                'events': 'no'
            } 
        }
      ],
      layout: { name: 'preset' },
      // Importante: permette il panning solo se non clicchi su nodi
      boxSelectionEnabled: false, 
    });

    (this.cy as any).cxtmenu({
      selector: 'node, edge',
      commands: [
        {
          content: '<span class="material-icons">delete</span> Elimina',
          contentAsHTML: true,
          select: (ele: any) => {
            this.graphService.removeElements([ele.id()]);
          }
        }
      ]
    });

    this.subs.add(this.graphService.getGraphData().subscribe(graphData => {
      if (!graphData || !graphData.nodes) return;
      
      const cyElements = {
        nodes: graphData.nodes.map(node => ({ data: node, position: node.position })),
        edges: graphData.edges.map(edge => ({ data: edge }))
      };
      this.cy.json({ elements: cyElements });
    }));

    this.subs.add(this.graphService.getLayoutRequests().subscribe(request => {
      if (request === 'fit') {
        setTimeout(() => {
          this.cy.resize();
          this.cy.fit();
          this.cy.center();
        }, 100);
      }
    }));

    this.subs.add(this.graphState.currentEdgeType.subscribe(type => {
        this.currentEdgeType = type;
        // Se cambio strumento, resetto eventuali stati di disegno
        this.resetDrawingState();
    }));

    // Sottoscrizione alla richiesta di focus (Ricerca)
    this.subs.add(this.graphService.focusNode$.subscribe(nodeId => {
        const node = this.cy.getElementById(nodeId);
        if (node.nonempty()) {
            // Rimuovi highlight precedenti
            this.cy.nodes().removeClass('search-highlight');
            
            // Aggiungi highlight al nuovo nodo
            node.addClass('search-highlight');

            // Anima zoom e pan verso il nodo
            this.cy.animate({
                fit: { eles: node, padding: 200 }, // Padding generoso per contesto
                duration: 500,
                easing: 'ease-in-out-cubic'
            } as any);
        }
    }));

    this.setupManualDragToConnect();
  }

  /**
   * Implementazione manuale "Drag & Connect"
   */
  private setupManualDragToConnect() {
    // 1. Inizio trascinamento (TAPSTART su NODO)
    this.cy.on('tapstart', 'node', (evt) => {
        const node = evt.target;
        
        // Se ho un arco selezionato, inizio il disegno invece di spostare il nodo
        if (this.currentEdgeType) {
            this.isDrawingEdge = true;
            this.dragSourceNode = node;
            
            // Blocca il nodo per non spostarlo
            node.ungrabify(); 

            // Crea nodo fantasma alla posizione del mouse (inizialmente sopra il source)
            const pos = evt.position;
            this.ghostNode = this.cy.add({
                group: 'nodes',
                classes: 'ghost-node',
                position: { x: pos.x, y: pos.y },
                data: { id: 'ghost_node_temp' }
            });

            // Crea arco fantasma dal source al ghost
            this.ghostEdge = this.cy.add({
                group: 'edges',
                classes: 'ghost-edge',
                data: { 
                    source: node.id(), 
                    target: this.ghostNode.id(),
                    id: 'ghost_edge_temp'
                }
            });
        } else {
            // Comportamento standard: seleziona il nodo
            this.nodeSelect.emit(node.data());
        }
    });

    // 2. Movimento mouse (MOUSEMOVE su tutto il container)
    this.cy.on('mousemove', (evt) => {
        if (this.isDrawingEdge && this.ghostNode) {
            const pos = evt.position;
            this.ghostNode.position(pos);

            // Hit Testing Manuale
            // Troviamo il nodo sotto il cursore verificando le bounding box
            // Escludiamo solo il nodo fantasma
            const hoverNode = this.cy.nodes().filter(n => {
                if (n.id() === 'ghost_node_temp') return false;
                const bb = n.boundingBox();
                return pos.x >= bb.x1 && pos.x <= bb.x2 && pos.y >= bb.y1 && pos.y <= bb.y2;
            }).first() as NodeSingular;

            // Gestione classe highlight
            if (hoverNode && hoverNode.length > 0) {
                if (this.currentHoverNode?.id() !== hoverNode.id()) {
                    // Cambio nodo: pulisci vecchio, evidenzia nuovo
                    if (this.currentHoverNode) this.currentHoverNode.removeClass('target-hover');
                    hoverNode.addClass('target-hover');
                    this.currentHoverNode = hoverNode;
                }
            } else {
                // Nessun nodo sotto: pulisci se c'era
                if (this.currentHoverNode) {
                    this.currentHoverNode.removeClass('target-hover');
                    this.currentHoverNode = null;
                }
            }
        }
    });

    // 3. Rilascio (TAPEND su tutto il container)
    this.cy.on('tapend', (evt) => {
        if (this.isDrawingEdge) {
            // Usiamo il nodo calcolato nel mousemove come target affidabile
            const targetNode = this.currentHoverNode;

            if (targetNode && targetNode.id() !== 'ghost_node_temp') {
                this.graphService.addEdge({
                    source: this.dragSourceNode!.id(),
                    target: targetNode.id(),
                    type: this.currentEdgeType!
                });
            }

            this.resetDrawingState();
        }
    });

    // Gestione deselezione (click su sfondo) e pulizia ricerca
    this.cy.on('tap', (evt) => {
        // Rimuovi evidenziazione ricerca a qualsiasi click
        this.cy.nodes().removeClass('search-highlight');

        if (evt.target === this.cy) {
            this.nodeSelect.emit(undefined);
        }
    });
  }

  private resetDrawingState() {
      this.isDrawingEdge = false;
      
      // Rimuovi evidenziazione da tutti i nodi
      this.cy.nodes().removeClass('target-hover');
      this.currentHoverNode = null;

      // Rimuovi elementi fantasma
      if (this.ghostEdge) this.cy.remove(this.ghostEdge);
      if (this.ghostNode) this.cy.remove(this.ghostNode);
      
      this.ghostEdge = null;
      this.ghostNode = null;

      // Sblocca il nodo sorgente se esiste
      if (this.dragSourceNode) {
          try {
            this.dragSourceNode.grabify();
          } catch(e) { /* Nodo potrebbe essere stato rimosso */ }
          this.dragSourceNode = null;
      }
  }

  ngOnDestroy() {
      this.subs.unsubscribe();
  }

  // ... Drag & Drop da Palette (invariato) ...
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const action = JSON.parse(event.dataTransfer!.getData('application/json')) as Action;
    const wrapperRect = this.cyContainer.nativeElement.getBoundingClientRect();
    
    // Calcola posizione corretta tenendo conto di pan e zoom
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    const x = (event.clientX - wrapperRect.left - pan.x) / zoom;
    const y = (event.clientY - wrapperRect.top - pan.y) / zoom;

    let shape: string = action.name === 'Init' ? 'ellipse' : 'round-rectangle';

    // Generazione Nome Univoco
    let uniqueName = action.name;
    const existingNodes = this.graphService.getCurrentGraphData().nodes;
    
    // Controlla se il nome base esiste già
    const baseNameExists = existingNodes.some(n => n.label === uniqueName);

    if (baseNameExists) {
        let suffix = 1;
        while (existingNodes.some(n => n.label === `${uniqueName}${suffix}`)) {
            suffix++;
        }
        uniqueName = `${uniqueName}${suffix}`;
    }

    if (uniqueName !== action.name) {
      this.snackBar.open(`Nome duplicato! Il nodo è stato rinominato in "${uniqueName}"`, 'OK', {
        duration: 4000,
        verticalPosition: 'top',
        horizontalPosition: 'center'
      });
    }

    this.graphService.addNode({
      label: uniqueName,
      color: action.defaultColor,
      shape: shape,
      position: { x, y },
    }, action.name); // action.name originale serve per fetchare il template corretto dal server
  }

  zoomIn() { this.cy.zoom(this.cy.zoom() * 1.2); }
  zoomOut() { this.cy.zoom(this.cy.zoom() / 1.2); }
  fit() { this.cy.fit(); }
}