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
  template: `
    <mat-accordion multi>
      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Nodi</mat-panel-title>
        </mat-expansion-panel-header>
        <div class="palette-section">
            <mat-form-field appearance="outline" class="search-bar">
                <mat-label>Search</mat-label>
                <input matInput>
                <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <!-- La griglia ora itera su un Observable usando la pipe async -->
            <div class="palette-grid" *ngIf="nodeActions$ | async as nodeActions">
              <div
                *ngFor="let action of nodeActions"
                class="palette-item node-item"
                draggable="true"
                (dragstart)="onDragStart($event, action)"
              >
                <div class="node-shape" [ngClass]="action.icon" [style.background]="action.defaultColor"></div>
              </div>
            </div>
        </div>
      </mat-expansion-panel>
      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>Archi</mat-panel-title>
        </mat-expansion-panel-header>
        <div class="palette-list" *ngIf="edgeActions$ | async as edgeActions">
            <div
                *ngFor="let edge of edgeActions"
                class="palette-item edge-item"
                (click)="selectEdgeType(edge.type)"
                [class.selected]="(graphState.currentEdgeType | async) === edge.type"
            >
                <mat-icon>{{edge.icon}}</mat-icon>
                <span>{{edge.name}}</span>
            </div>
        </div>
      </mat-expansion-panel>
    </mat-accordion>
  `,
  styles: [`
    :host {
        display: block;
        height: 100%;
    }
    mat-accordion {
        height: 100%;
    }
    .palette-section {
        padding: 8px;
    }
    .search-bar {
        width: 100%;
    }
    .palette-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding-top: 16px;
    }
    .node-item {
      position: relative;
      width: 100%;
      padding-bottom: 100%; /* 1:1 Aspect Ratio */
      cursor: grab;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
      transition: background .2s;
    }
    .node-item:active { cursor: grabbing; background: #f0f0f0; }
    .node-shape {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 70%; height: 70%;
    }

    .palette-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
    }
    .edge-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
        border: 1px solid transparent;
        border-radius: 4px;
    }
    .edge-item:hover {
        background: #f0f0f0;
    }
    .edge-item.selected {
        background: #e0e0ff;
        border-color: #3f51b5;
    }
  `]
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