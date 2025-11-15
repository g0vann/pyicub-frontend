/**
 * @file properties-panel.ts
 * @description Definisce il componente `PropertiesPanel`, il pannello laterale destro
 * che mostra le proprietà del nodo selezionato e ne permette la modifica.
 */

import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GraphNode } from '../../models/graph.model';
import { GraphService } from '../../services/graph.service';
import { debounceTime, Subject, Subscription } from 'rxjs';

/**
 * @class PropertiesPanel
 * @description Componente che visualizza un form per modificare le proprietà del nodo selezionato.
 * Non modifica più lo stato direttamente, ma notifica il `GraphService` delle modifiche.
 */
@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div *ngIf="node; else emptyState" class="properties">
      <mat-accordion multi>
        <mat-expansion-panel [expanded]="true">
          <mat-expansion-panel-header>
            <mat-panel-title>Properties</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="property-list">
            <mat-form-field appearance="outline">
              <mat-label>Colore</mat-label>
              <input matInput type="color" [ngModel]="node.color" (ngModelChange)="onPropertyChange({ color: $event })" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Attribute 1</mat-label>
              <input matInput [ngModel]="node.attribute1" (ngModelChange)="onPropertyChange({ attribute1: $event })" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Attribute 2</mat-label>
              <input matInput [ngModel]="node.attribute2" (ngModelChange)="onPropertyChange({ attribute2: $event })" />
            </mat-form-field>
          </div>
        </mat-expansion-panel>
        <mat-expansion-panel [expanded]="true">
          <mat-expansion-panel-header>
            <mat-panel-title>Label</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="property-list">
            <mat-form-field appearance="outline">
              <mat-label>Label</mat-label>
              <textarea matInput [ngModel]="node.label" (ngModelChange)="onPropertyChange({ label: $event })"></textarea>
            </mat-form-field>
          </div>
        </mat-expansion-panel>
      </mat-accordion>
    </div>

    <ng-template #emptyState>
      <p>Nessun nodo selezionato.</p>
    </ng-template>
  `,
  styles: [`
    .properties { height: 100%; }
    .property-list { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
    mat-form-field { width: 100%; }
  `]
})
export class PropertiesPanel {
  @Input() node: GraphNode | undefined;

  private graphService = inject(GraphService);
  private modelChanged = new Subject<Partial<GraphNode>>();
  private subscription: Subscription;

  constructor() {
    // Applica un debounce alle modifiche per non sovraccaricare il servizio
    // ad ogni tasto premuto. L'aggiornamento avviene solo 300ms dopo l'ultima modifica.
    this.subscription = this.modelChanged
      .pipe(debounceTime(300))
      .subscribe(changes => {
        if (this.node) {
          this.graphService.updateNode(this.node.id, changes);
        }
      });
  }

  /**
   * @method onPropertyChange
   * @description Chiamato ogni volta che un campo del form cambia.
   * Emette il cambiamento nel Subject per il debouncing.
   * @param {Partial<GraphNode>} changes - L'oggetto con le proprietà modificate.
   */
  onPropertyChange(changes: Partial<GraphNode>) {
    this.modelChanged.next(changes);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}