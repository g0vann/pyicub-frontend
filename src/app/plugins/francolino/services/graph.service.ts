/**
 * @file graph.service.ts
 * @description Servizio centrale per la gestione dello stato del grafo (Single Source of Truth).
 * Contiene tutti i nodi e gli archi e fornisce metodi per manipolarli.
 */

import {inject, Injectable} from '@angular/core';
import { BehaviorSubject, lastValueFrom, Observable, Subject } from 'rxjs';
import { GraphData, GraphNode, GraphEdge } from '../models/graph.model';
import { v4 as uuid } from 'uuid';
import {HttpClient} from "@angular/common/http";
import { environment } from '../../../../environments/environment';

/**
 * @class GraphService
 * @description Gestisce lo stato del grafo, inclusi nodi, archi e lo storico per undo/redo.
 */
@Injectable({
  providedIn: 'root'
})
export class GraphService {

  private readonly graphData$ = new BehaviorSubject<GraphData>({ nodes: [], edges: [] });
  private readonly layoutRequest$ = new Subject<'fit'>();

  // Storico per undo/redo
  private readonly history: GraphData[] = [];
  private readonly redoStack: GraphData[] = [];
  private readonly HISTORY_MAX_LENGTH = 20;

  // Observable per lo stato dei pulsanti undo/redo
  public readonly canUndo$ = new BehaviorSubject<boolean>(false);
  public readonly canRedo$ = new BehaviorSubject<boolean>(false);

  // Canale per richiedere il focus su un nodo specifico (es. dalla search bar)
  private readonly focusNodeSource = new Subject<string>();
  public readonly focusNode$ = this.focusNodeSource.asObservable();

  constructor(private http: HttpClient) {}

  getGraphData(): Observable<GraphData> {
    return this.graphData$.asObservable();
  }

  getLayoutRequests(): Observable<'fit'> {
    return this.layoutRequest$.asObservable();
  }

  getCurrentGraphData(): GraphData {
    return this.graphData$.getValue();
  }

  loadGraph(data: GraphData) {
    this.pushStateToHistory(this.graphData$.getValue());
    this.graphData$.next(data);
    this.layoutRequest$.next('fit');
  }

  async addNode(nodeData: Partial<GraphNode>, actionType?: string) {
    this.pushStateToHistory(this.graphData$.getValue());
    const currentState = this.graphData$.getValue();

    let actionData: any = {};

    if (actionType && actionType !== 'start' && actionType !== 'end') {
      try {
        // TODO: Il nome del robot e dell'app dovrebbero essere dinamici
        const robotName = 'icubSim';
        const appName = 'iCubRESTApp';
        const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions/${actionType}`;
        
        const fullActionData = await lastValueFrom(this.http.get<any>(url));
        
        // Separa i metadati dal corpo principale dell'azione
        const { _palette, _properties, ...rest } = fullActionData;
        actionData = rest;
        
        // Se abbiamo definito una label specifica (es. per univocità), aggiorniamo anche il nome nel payload dati
        if (nodeData.label) {
          actionData.name = nodeData.label;
        }

      } catch (e) {
        console.error(`Could not load action template for ${actionType} from server`, e);
        // Fallback o gestione dell'errore
      }
    }

    const isInit = actionType === 'Init';
    const newNode: GraphNode = {
      id: uuid(),
      label: nodeData.label || actionType || '',
      color: nodeData.color || (isInit ? '#4CAF50' : '#ffffff'),
      shape: nodeData.shape || (isInit ? 'ellipse' : 'round-rectangle'),
      position: { x: 100, y: 100 },
      ...nodeData,
      type: actionType ? (actionType === 'Init' ? 'start' : (actionType === 'End' ? 'end' : 'action')) : 'action',
      data: actionData
    } as GraphNode;

    this.graphData$.next({ ...currentState, nodes: [...currentState.nodes, newNode] });
  }


  updateNode(nodeId: string, newProperties: Partial<GraphNode>) {
    this.pushStateToHistory(this.graphData$.getValue());
    const currentState = this.graphData$.getValue();
    const updatedNodes = currentState.nodes.map(node =>
      node.id === nodeId ? { ...node, ...newProperties } : node
    );

    this.graphData$.next({ ...currentState, nodes: updatedNodes });
  }

  addEdge(edgeData: Partial<GraphEdge>) {
    this.pushStateToHistory(this.graphData$.getValue());
    const currentState = this.graphData$.getValue();
    const newEdge: GraphEdge = {
      id: uuid(),
      source: '',
      target: '',
      type: 'line',
      ...edgeData
    } as GraphEdge;

    if (!newEdge.source || !newEdge.target) {
      console.error("Source and target are required for an edge");
      return;
    }

    this.graphData$.next({ ...currentState, edges: [...currentState.edges, newEdge] });
  }

  removeElements(elementIds: string[]) {
    if (!elementIds || elementIds.length === 0) {
      return;
    }
    this.pushStateToHistory(this.graphData$.getValue());
    const currentState = this.graphData$.getValue();
    const idsToRemove = new Set(elementIds);

    // Identify the full set of nodes to be removed
    const nodesToRemove = new Set(currentState.nodes.filter(node => idsToRemove.has(node.id)).map(n => n.id));

    // Filter nodes
    const remainingNodes = currentState.nodes.filter(node => !nodesToRemove.has(node.id));

    // Filter edges - remove edges that are explicitly selected OR are connected to a removed node
    const remainingEdges = currentState.edges.filter(edge =>
      !idsToRemove.has(edge.id) &&
      !nodesToRemove.has(edge.source) &&
      !nodesToRemove.has(edge.target)
    );

    this.graphData$.next({ nodes: remainingNodes, edges: remainingEdges });
  }

  /**
   * @method undo
   * @description Annulla l'ultima modifica, ripristinando lo stato precedente del grafo.
   */
  undo() {
    if (this.history.length === 0) return;

    const currentState = this.graphData$.getValue();
    this.redoStack.push(currentState);

    const prevState = this.history.pop()!;
    this.graphData$.next(prevState);
    this.updateHistoryState();
  }

  /**
   * @method redo
   * @description Ripristina l'ultima modifica annullata.
   */
  redo() {
    if (this.redoStack.length === 0) return;

    const currentState = this.graphData$.getValue();
    this.history.push(currentState);

    const nextState = this.redoStack.pop()!;
    this.graphData$.next(nextState);
    this.updateHistoryState();
  }

  /**
   * @private
   * @method pushStateToHistory
   * @description Salva lo stato corrente nello storico dell'undo e gestisce la logica dello storico.
   */
  private pushStateToHistory(state: GraphData) {
    // Se si fa una nuova azione, la coda di redo viene pulita.
    if (this.redoStack.length > 0) {
      this.redoStack.length = 0;
    }

    this.history.push(state);

    // Mantiene la dimensione dello storico entro il limite.
    if (this.history.length > this.HISTORY_MAX_LENGTH) {
      this.history.shift(); // Rimuove lo stato più vecchio
    }
    this.updateHistoryState();
  }

  /**
   * @private
   * @method updateHistoryState
   * @description Aggiorna gli observable che indicano alla UI se undo/redo sono possibili..
   */
  private updateHistoryState() {
    this.canUndo$.next(this.history.length > 0);
    this.canRedo$.next(this.redoStack.length > 0);
  }

  focusOnNode(nodeId: string) {
    this.focusNodeSource.next(nodeId);
  }
}
