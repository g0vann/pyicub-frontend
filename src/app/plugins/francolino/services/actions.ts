/**
 * @file actions.ts
 * @description Questo file definisce e fornisce le azioni disponibili nell'applicazione.
 * Le azioni sono divise in "NodeAction" (per creare nodi nel grafo) e "EdgeAction" (per definire i tipi di archi).
 * Il servizio `ActionsService` funge da repository centralizzato per queste azioni,
 * recuperando i dati da file JSON esterni.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
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
 * Questo approccio disaccoppia la configurazione dalla logica dell'applicazione.
 */
@Injectable({ providedIn: 'root' })
export class ActionsService {
  // Inietta il client HTTP utilizzando la nuova funzione `inject`.
  private http = inject(HttpClient);

  // Definisce i percorsi ai file JSON di configurazione.
  private nodeActionsUrl = 'assets/node-types.json';
  private edgeActionsUrl = 'assets/edge-types.json';

  /**
   * @property {Observable<NodeAction[]>} nodeActions$ - Un flusso Observable che contiene l'array delle azioni per i nodi.
   * Utilizza `shareReplay(1)` per fare in modo che la richiesta HTTP venga eseguita una sola volta
   * e che il risultato venga messo in cache e riproposto a tutti i sottoscrittori successivi.
   */
  nodeActions$: Observable<NodeAction[]> = this.http.get<NodeAction[]>(this.nodeActionsUrl).pipe(
    shareReplay(1)
  );

  /**
   * @property {Observable<EdgeAction[]>} edgeActions$ - Un flusso Observable per le azioni degli archi, con lo stesso principio di caching.
   */
  edgeActions$: Observable<EdgeAction[]> = this.http.get<EdgeAction[]>(this.edgeActionsUrl).pipe(
    shareReplay(1)
  );
}
