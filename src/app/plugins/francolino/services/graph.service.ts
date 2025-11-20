
/**
 * @file graph.service.ts
 * @description Servizio centrale per la gestione dello stato del grafo (Single Source of Truth).
 * Contiene tutti i nodi e gli archi e fornisce metodi per manipolarli.
 */

import {inject, Injectable} from '@angular/core';
import { BehaviorSubject, lastValueFrom, Observable } from 'rxjs';
import { GraphData, GraphNode, GraphEdge } from '../models/graph.model';
import { v4 as uuid } from 'uuid';
import {HttpClient} from "@angular/common/http";

/**
 * @class GraphService
 * @description Gestisce lo stato del grafo, inclusi nodi, archi e lo storico per undo/redo.
 */
@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private http = inject(HttpClient);

  private readonly graphData$ = new BehaviorSubject<GraphData>({ nodes: [], edges: [] });

  // Storico per undo/redo
  private readonly history: GraphData[] = [];
  private readonly redoStack: GraphData[] = [];
  private readonly HISTORY_MAX_LENGTH = 20;

  // Observable per lo stato dei pulsanti undo/redo
  public readonly canUndo$ = new BehaviorSubject<boolean>(false);
  public readonly canRedo$ = new BehaviorSubject<boolean>(false);

  getGraphData(): Observable<GraphData> {
    return this.graphData$.asObservable();
  }

  getCurrentGraphData(): GraphData {
    return this.graphData$.getValue();
  }

  loadGraph(data: GraphData) {
    this.pushStateToHistory(this.graphData$.getValue());
    this.graphData$.next(data);
  }

  async addNode(nodeData: Partial<GraphNode>, actionType?: string) {
    this.pushStateToHistory(this.graphData$.getValue());
    const currentState = this.graphData$.getValue();

    let actionData: any = {};
    if (actionType && actionType !== 'start' && actionType !== 'end') {
      try {
        // Fetch as text to preserve formatting
        const actionText = await lastValueFrom(this.http.get(`assets/json/${actionType}.json`, { responseType: 'text' }));
        actionData = JSON.parse(actionText); // still parse to work with it, export will be custom
      } catch (e) {
        console.error(`Could not load action template for ${actionType}`, e);
      }
    }

    const newNode: GraphNode = {
      id: uuid(),
      label: nodeData.label || actionType || '',
      color: '#ccc',
      shape: 'ellipse',
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
}