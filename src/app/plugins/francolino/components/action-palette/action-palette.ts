/**
 * @file action-palette.ts
 * @description Definisce il componente `ActionPalette`, il pannello laterale sinistro
 * che mostra all'utente tutte le azioni disponibili per la costruzione del grafo.
 */

import { Component, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { ActionsService, NodeAction, EdgeAction } from '../../services/actions';
import { GraphStateService, EdgeType } from '../../services/graph-state';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AppStateService } from '../../../../services/app-state.service';
import { lastValueFrom } from 'rxjs';

/**
 * @class ActionPalette
 * @description Componente che visualizza un elenco di azioni per nodi e archi.
 * L'utente può trascinare i nodi da questa palette al `GraphEditor` e può selezionare
 * un tipo di arco per entrare in modalità "disegno arco".
 */
@Component({
  selector: 'app-action-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, MatExpansionModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, HttpClientModule],
  templateUrl: './action-palette.html',
  styleUrls: ['./action-palette.scss']
})

export class ActionPalette {
  // Inietta i servizi
  private actionsService = inject(ActionsService);
  public graphState = inject(GraphStateService); // Public per il template
  private http = inject(HttpClient);
  private appState = inject(AppStateService);
  @ViewChild('actionFileInput') actionFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('paletteWrapper') paletteWrapper!: ElementRef<HTMLElement>;
  @ViewChild('contextMenu') contextMenuRef!: ElementRef<HTMLElement>;
  searchTerm = '';
  contextMenuAction: NodeAction | null = null;
  contextMenuX = 0;
  contextMenuY = 0;

  /** @property {Observable<NodeAction[]>} nodeActions$ - Flusso di dati per le azioni dei nodi. */
  nodeActions$: Observable<NodeAction[]> = this.actionsService.nodeActions$;
  searchTerm$ = new BehaviorSubject<string>('');
  filteredNodeActions$: Observable<NodeAction[]> = combineLatest([this.nodeActions$, this.searchTerm$]).pipe(
    map(([actions, term]) => {
      const q = (term || '').toLowerCase().trim();
      if (!q) return actions;
      return actions.filter(a => a.name.toLowerCase().includes(q));
    })
  );
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

  onContextMenu(event: MouseEvent, action: NodeAction) {
    event.preventDefault();
    this.contextMenuAction = action;
    const wrapper = this.paletteWrapper?.nativeElement;
    const rect = wrapper?.getBoundingClientRect();
    if (rect) {
      const baseX = event.clientX - rect.left + wrapper.scrollLeft;
      const baseY = event.clientY - rect.top + wrapper.scrollTop;
      this.contextMenuX = baseX;
      this.contextMenuY = baseY;
      setTimeout(() => {
        const menuEl = this.contextMenuRef?.nativeElement;
        if (!menuEl) return;
        const menuW = menuEl.offsetWidth || 0;
        const menuH = menuEl.offsetHeight || 0;
        const margin = 6;
        // posiziona verso il centro: se c'è poco spazio a destra, apri a sinistra
        const spaceRight = rect.width - (baseX - wrapper.scrollLeft);
        let x = spaceRight < menuW + margin ? baseX - menuW - margin : baseX + margin;
        // clamp orizzontale
        const minX = wrapper.scrollLeft;
        const maxX = wrapper.scrollLeft + rect.width - menuW - margin;
        x = Math.max(minX, Math.min(x, maxX));

        // verticale: prova sotto, se non c'è spazio vai sopra
        const spaceBelow = rect.height - (baseY - wrapper.scrollTop);
        let y = spaceBelow < menuH + margin ? baseY - menuH - margin : baseY + margin;
        const minY = wrapper.scrollTop;
        const maxY = wrapper.scrollTop + rect.height - menuH - margin;
        y = Math.max(minY, Math.min(y, maxY));

        this.contextMenuX = x;
        this.contextMenuY = y;
      });
    } else {
      this.contextMenuX = event.clientX;
      this.contextMenuY = event.clientY;
    }
  }

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuAction = null;
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

  onSearchChange(value: string) {
    this.searchTerm$.next(value || '');
  }

  triggerImportAction() {
    this.actionFileInput?.nativeElement.click();
  }

  async onActionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== 'object') throw new Error('Formato non valido');
        if (!parsed.name || typeof parsed.name !== 'string') throw new Error('Campo "name" obbligatorio');

        const robotName = this.appState.selectedRobot?.name || 'icubSim';
        const appName = 'iCubRESTApp';
        const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions?sync`;

        await lastValueFrom(this.http.post(url, parsed, { headers: { 'Content-Type': 'application/json' } }));
        await this.actionsService.loadNodeActionsFromServer(robotName, appName);
        alert('Azione importata e salvata con successo.');
      } catch (err) {
        console.error('Errore importazione azione', err);
        alert('Errore durante l\'importazione dell\'azione. Verifica il JSON.');
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  async deleteAction(action: NodeAction) {
    if (!action || action.name === 'Init') return;
    this.closeContextMenu();
    const confirmed = window.confirm(`Vuoi eliminare l'azione '${action.name}' dal server? Potrebbe essere usata da FSM salvate.`);
    if (!confirmed) return;

    const robotName = this.appState.selectedRobot?.name || 'icubSim';
    const appName = 'iCubRESTApp';
    const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions/${action.name}/delete`;
    try {
      await lastValueFrom(this.http.get(url));
      await this.actionsService.loadNodeActionsFromServer(robotName, appName);
      alert(`Azione '${action.name}' eliminata con successo.`);
    } catch (err) {
      console.error('Errore eliminazione azione', err);
      alert('Errore durante l\'eliminazione dell\'azione. Verifica che non sia in uso o riprova.');
    }
  }

  handleDeleteFromMenu() {
    if (this.contextMenuAction) {
      this.deleteAction(this.contextMenuAction);
    }
  }
}
