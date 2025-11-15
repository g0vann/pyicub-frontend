/**
 * @file graph-state.ts
 * @description Questo file definisce un servizio per la gestione dello stato condiviso relativo all'interfaccia utente del grafo.
 * Attualmente, il suo unico scopo è tenere traccia del tipo di arco che l'utente ha selezionato nella palette
 * per entrare in modalità "disegno arco". Questo permette una comunicazione disaccoppiata tra
 * `ActionPaletteComponent` e `GraphEditorComponent`.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * @type EdgeType
 * @description Definisce i possibili stili di un arco, che corrispondono alle opzioni di styling di Cytoscape.
 */
export type EdgeType = 'line' | 'dashed' | 'arrow' | 'bi-arrow';

/**
 * @class GraphStateService
 * @description Servizio Angular per la gestione dello stato condiviso dell'interfaccia del grafo.
 * Utilizza un BehaviorSubject di RxJS per notificare ai componenti interessati i cambiamenti di stato in tempo reale.
 */
@Injectable({ providedIn: 'root' })
export class GraphStateService {
  /**
   * @private
   * @property {BehaviorSubject<EdgeType | null>} edgeTypeSource - Sorgente del BehaviorSubject che contiene il tipo di arco attualmente selezionato.
   * È privato per evitare che venga emesso un nuovo valore dall'esterno del servizio.
   * Il valore è `null` se l'utente non è in modalità "disegno arco".
   */
  private edgeTypeSource = new BehaviorSubject<EdgeType | null>(null);

  /**
   * @property {Observable<EdgeType | null>} currentEdgeType - Observable pubblico a cui i componenti possono sottoscriversi
   * per essere notificati quando il tipo di arco selezionato cambia.
   */
  currentEdgeType = this.edgeTypeSource.asObservable();

  /**
   * @method currentValue
   * @description Getter per ottenere il valore corrente del tipo di arco senza doversi sottoscrivere all'Observable.
   * Utile per controlli sincroni.
   * @returns {EdgeType | null} Il tipo di arco attualmente selezionato.
   */
  get currentValue() {
    return this.edgeTypeSource.value;
  }

  /**
   * @method setEdgeType
   * @description Metodo pubblico per aggiornare il tipo di arco selezionato.
   * Notifica a tutti i sottoscrittori il nuovo valore.
   * @param {EdgeType | null} edgeType - Il nuovo tipo di arco da impostare, o `null` per uscire dalla modalità disegno.
   */
  setEdgeType(edgeType: EdgeType | null) {
    this.edgeTypeSource.next(edgeType);
  }
}
