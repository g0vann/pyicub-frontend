/**
 * @file actions.ts
 * @description Questo file definisce e fornisce le azioni disponibili nell'applicazione.
 * Le azioni sono divise in "NodeAction" (per creare nodi nel grafo) e "EdgeAction" (per definire i tipi di archi).
 * Il servizio `ActionsService` funge da repository centralizzato per queste azioni,
 * recuperando i dati da file JSON esterni e supportando l'aggiunta dinamica.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable, shareReplay } from 'rxjs';
import { Action } from '../models/action';

/**
 * @interface NodeAction
 * @description Estende l'interfaccia base `Action` per rappresentare un'azione che crea un nodo.
 */
export interface NodeAction extends Action {}

/**
 * @interface EdgeAction
 * @description Definisce la struttura per un'azione che rappresenta un tipo di arco.
 * @property {string} id - Identificatore univoco dell'azione.
 * @property {string} name - Nome visualizzato dell'azione (es. "Linea", "Freccia").
 * @property {'line' | 'dashed' | 'arrow' | 'bi-arrow'} type - Tipo di arco, usato da Cytoscape per lo styling.
 * @property {string} icon - Nome dell'icona Material da visualizzare nella palette.
 */
export interface EdgeAction {
    id: string;
    name: string;
    type: 'line' | 'dashed' | 'arrow' | 'bi-arrow';
    icon: string;
}

/**
 * @class ActionsService
 * @description Servizio Angular che recupera le definizioni delle azioni (nodi e archi) da file JSON esterni.
 * Questo approccio disaccoppia la configurazione dalla logica dell'applicazione e ora supporta l'aggiunta di azioni in modo dinamico.
 */
@Injectable({ providedIn: 'root' })
export class ActionsService {
  private http = inject(HttpClient);

  private nodeActionsUrl = 'assets/node-types.json';
  private edgeActionsUrl = 'assets/edge-types.json';

  private nodeActionsSource = new BehaviorSubject<NodeAction[]>([]);
  nodeActions$: Observable<NodeAction[]> = this.nodeActionsSource.asObservable();

  edgeActions$: Observable<EdgeAction[]> = this.http.get<EdgeAction[]>(this.edgeActionsUrl).pipe(
    shareReplay(1)
  );

  constructor() {
    this.loadInitialNodeActions();
  }

  private async loadInitialNodeActions() {
    try {
        const initialActions = await firstValueFrom(this.http.get<NodeAction[]>(this.nodeActionsUrl));
        this.nodeActionsSource.next(initialActions);
    } catch (error) {
        console.error('Failed to load initial node actions:', error);
        this.nodeActionsSource.next([]); // Emetti un array vuoto in caso di errore
    }
  }

  /**
   * @method addNodeAction
   * @description Aggiunge una nuova azione di nodo all'elenco delle azioni disponibili.
   * @param {NodeAction} action - L'azione da aggiungere.
   */
  addNodeAction(action: NodeAction) {
    const currentActions = this.nodeActionsSource.getValue();
    // Evita duplicati basati sul nome
    if (!currentActions.find(a => a.name === action.name)) {
        this.nodeActionsSource.next([...currentActions, action]);
    }
  }

  /**
   * @method currentNodeActions
   * @description Getter per ottenere in modo sincrono le azioni dei nodi correnti.
   * @returns {NodeAction[]} L'array corrente delle azioni dei nodi.
   */
  public get currentNodeActions(): NodeAction[] {
    return this.nodeActionsSource.getValue();
  }
}