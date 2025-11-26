import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, shareReplay, lastValueFrom, tap } from 'rxjs';
import { Action } from '../models/action';
import { environment } from '../../../../environments/environment';

/**
 * @interface NodeAction
 * @description Estende l'interfaccia base `Action` per rappresentare un'azione che crea un nodo.
 */
export interface NodeAction extends Action {
  _properties?: any; // Metadati per la UI del pannello delle proprietà
}

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

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private http = inject(HttpClient);

  private edgeActionsUrl = 'assets/edge-types.json';

  private nodeActionsSource = new BehaviorSubject<NodeAction[]>([]);
  nodeActions$: Observable<NodeAction[]> = this.nodeActionsSource.asObservable();

  edgeActions$: Observable<EdgeAction[]> = this.http.get<EdgeAction[]>(this.edgeActionsUrl).pipe(
    shareReplay(1)
  );

  constructor() {
    // Il costruttore ora è vuoto, il caricamento è guidato dal componente
  }

  /**
   * @method loadNodeActionsFromServer
   * @description Carica le azioni dei nodi da un endpoint del server e restituisce una Promise.
   * @param robotName Il nome del robot.
   * @param appName Il nome dell'applicazione server.
   */
  loadNodeActionsFromServer(robotName: string, appName: string): Promise<void> {
    const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions`;
    const staticInitNode: NodeAction = { id: "static-init", name: "Init", icon: "ellipse", defaultColor: "#4CAF50" };

    const request$ = this.http.get<NodeAction[]>(url).pipe(
      tap({
        next: (actionsFromServer) => {
          const allActions = [staticInitNode, ...actionsFromServer];
          this.nodeActionsSource.next(allActions);
        },
        error: (error) => {
          console.error('Failed to load node actions from server:', error);
          this.nodeActionsSource.next([staticInitNode]);
        }
      })
    );
    
    return lastValueFrom(request$, { defaultValue: undefined });
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