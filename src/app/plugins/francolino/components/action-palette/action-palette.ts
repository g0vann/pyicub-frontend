/**
 * @file action-palette.ts
 * @description Definisce il componente `ActionPalette`, il pannello laterale sinistro
 * che mostra all'utente tutte le azioni disponibili per la costruzione del grafo.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { ActionsService, NodeAction, EdgeAction } from '../../services/actions';
import { GraphStateService, EdgeType } from '../../services/graph-state';

/**
 * @class ActionPalette
 * @description Componente che visualizza un elenco di azioni per nodi e archi.
 * L'utente può trascinare i nodi da questa palette al `GraphEditor` e può selezionare
 * un tipo di arco per entrare in modalità "disegno arco".
 */
@Component({
  selector: 'app-action-palette',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './action-palette.html',
  styleUrls: ['./action-palette.scss']
})

export class ActionPalette {
  // Inietta i servizi
  private actionsService = inject(ActionsService);
  public graphState = inject(GraphStateService); // Public per il template

  /** @property {Observable<NodeAction[]>} nodeActions$ - Flusso di dati per le azioni dei nodi. */
  nodeActions$: Observable<NodeAction[]> = this.actionsService.nodeActions$;
  /** @property {Observable<EdgeAction[]>} edgeActions$ - Flusso di dati per le azioni degli archi. */
  edgeActions$: Observable<EdgeAction[]> = this.actionsService.edgeActions$;

  /**
   * @method onDragStart
   * @description Chiamato quando l'utente inizia a trascinare un'azione di tipo nodo.
   * @param {DragEvent} event - L'evento di drag & drop del browser.
   * @param {NodeAction} action - L'azione (il nodo) che l'utente sta trascinando.
   */
  onDragStart(event: DragEvent, action: NodeAction) {
    event.dataTransfer?.setData('application/json', JSON.stringify(action));
    event.dataTransfer!.effectAllowed = 'copy';
  }

  /**
   * @method selectEdgeType
   * @description Chiamato quando l'utente clicca su un tipo di arco. Imposta lo stato globale per la creazione di archi.
   * @param {EdgeType} edgeType - Il tipo di arco selezionato dall'utente.
   */
  selectEdgeType(edgeType: EdgeType) {
    // Permette di attivare/disattivare la modalità "disegno arco".
    if (this.graphState.currentValue === edgeType) {
        this.graphState.setEdgeType(null);
    } else {
        this.graphState.setEdgeType(edgeType);
    }
  }
}