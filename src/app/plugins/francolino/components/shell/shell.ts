/**
 * @file shell.ts
 */

import { Component, inject, ViewChild, ElementRef, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule }    from '@angular/material/icon';
import { MatListModule }    from '@angular/material/list';
import { MatButtonModule }  from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ActionPalette }    from '../action-palette/action-palette';
import { PropertiesPanel }  from '../properties-panel/properties-panel';
import { GraphService }     from '../../services/graph.service';
import { GraphData }        from '../../models/graph.model';
import { GraphEditor }      from '../graph-editor/graph-editor';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    // Material
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    // App
    ActionPalette,
    PropertiesPanel,
    GraphEditor
  ],
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button><mat-icon>menu</mat-icon></button>
      <span>FrancOlino IO</span>
      <span class="spacer"></span>
      <button mat-icon-button><mat-icon>account_circle</mat-icon></button>
    </mat-toolbar>

    <mat-toolbar class="secondary-toolbar">
      <!-- Azioni sinistra -->
      <div class="cluster">
        <button mat-icon-button aria-label="Esporta" (click)="exportGraph()" matTooltip="Esporta (Ctrl+S)">
          <mat-icon>save</mat-icon>
        </button>

        <button mat-icon-button aria-label="Importa" (click)="fileInput.click()" matTooltip="Importa">
          <mat-icon>file_upload</mat-icon>
        </button>
        <input type="file" #fileInput hidden accept=".json" (change)="onFileSelected($event)" />

        <span class="v-divider" aria-hidden="true"></span>

        <span matTooltip="Annulla (Ctrl+Z)">
          <button mat-icon-button aria-label="Annulla"
                  (click)="graphService.undo()"
                  [disabled]="!(graphService.canUndo$ | async)">
            <mat-icon>undo</mat-icon>
          </button>
        </span>
        <span matTooltip="Ripristina (Ctrl+Y)">
          <button mat-icon-button aria-label="Ripristina"
                  (click)="graphService.redo()"
                  [disabled]="!(graphService.canRedo$ | async)">
            <mat-icon>redo</mat-icon>
          </button>
        </span>
      </div>

      <span class="spacer"></span>

      <!-- Nome file al centro -->
      <div class="filename" (dblclick)="startRename()" [attr.title]="fileName">
        <mat-icon>description</mat-icon>
        <input *ngIf="renaming"
               [(ngModel)]="fileName"
               (blur)="stopRename()"
               (keydown.enter)="stopRename()"
               aria-label="Nome file" />
        <span *ngIf="!renaming">{{ fileName }}</span>
      </div>

      <span class="spacer"></span>

      <!-- Searchbar custom: 36px, centrata dentro la toolbar -->
      <div class="cluster">
        <div class="searchbar">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="q" (keydown.enter)="onSearch(q)" placeholder="Cerca" />
          <button *ngIf="q" class="icon-btn" aria-label="Pulisci" (click)="q = ''">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </mat-toolbar>

    <!-- GRID a 5 colonne: [sx] [gutter] [centro] [gutter] [dx] -->
    <div class="wrap">
      <div class="grid">
        <aside class="panel left">
          <div class="scroll">
            <app-action-palette></app-action-palette>
          </div>
        </aside>

        <div class="gutter" (mousedown)="startDrag('left', $event)" matTooltip="Ridimensiona"
  matTooltipPosition="right"></div>

        <main class="panel center">
          <app-graph-editor (nodeSelect)="selectedNode = $event"></app-graph-editor>
        </main>

        <div class="gutter" (mousedown)="startDrag('right', $event)" matTooltip="Ridimensiona"
  matTooltipPosition="left"></div>

        <aside class="panel right">
          <div class="scroll">
            <app-properties-panel [node]="selectedNode"></app-properties-panel>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      min-height: 0;
    }

    .secondary-toolbar {
      background: #fff;
      border-bottom: 1px solid #ddd;
      color: #333;
      min-height: 56px;
      height: 56px;
      gap: 8px;
      display: flex;
      align-items: center; /* centra TUTTO verticalmente */
    }
    .spacer { flex: 1 1 auto; }

    .cluster {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .v-divider {
      width: 1px;
      height: 24px;
      background: rgba(0,0,0,0.15);
      margin: 0 6px;
      border-radius: 1px;
    }

    .filename {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      user-select: none;
    }
    .filename > span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: min(40vw, 520px);
    }
    .filename > input {
      width: min(40vw, 520px);
      padding: 6px 8px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      outline: none;
    }

    /* ===== Searchbar custom (36px), perfettamente centrata ===== */
    .searchbar {
      height: 36px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      border: 1px solid #ccd3da;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      width: 260px;
    }
    .searchbar mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      color: #5f6368;
    }
    .searchbar input {
      border: none;
      outline: none;
      background: transparent;
      height: 100%;
      width: 100%;
      font: inherit;
    }
    .searchbar .icon-btn {
      border: none;
      background: transparent;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
    }
    .searchbar .icon-btn:hover { background: rgba(0,0,0,0.06); }

    @media (max-width: 900px) { .searchbar { width: 200px; } }
    @media (max-width: 640px) { .searchbar { width: 150px; } }

    /* Spazio rimanente sotto le toolbar */
    .wrap {
      flex: 1;
      min-height: 0;
      padding: 16px;
    }

    /* ====== GRID ====== */
    .grid {
      display: grid;
      grid-template-columns: var(--left, 280px) 8px 1fr 8px var(--right, 320px);
      grid-template-rows: 1fr;
      gap: 16px;
      height: 100%;
      min-height: 0;
    }

    .panel {
      background: #fff;
      border: 1px solid #e8e8ef;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      padding: 16px;

      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .panel .scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;  /* scroll interno se serve */
    }
    .center { overflow: hidden; }

    /* Gutter trascinabile */
    .gutter {
      align-self: stretch;
      background: transparent;
      cursor: col-resize;
      border-radius: 8px;
      position: relative;
    }
    .gutter::after {
      content: "";
      position: absolute;
      top: 8px; bottom: 8px; left: 3px; right: 3px;
      border-radius: 4px;
      background: rgba(0,0,0,0.06);
    }

    /* Responsivo: impila i pannelli */
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto 8px auto 8px auto;
      }
      .gutter { cursor: row-resize; }
      .gutter::after { left: 8px; right: 8px; top: 3px; bottom: 3px; }
    }

    /* Tooltip scuri globali (scoped fallback) */
    :host ::ng-deep .mat-mdc-tooltip .mdc-tooltip__surface {
      background: #333 !important;
      color: #fff !important;
      border-radius: 8px;
      font-size: 12px;
      padding: 6px 10px;
    }
  `]
})
export class Shell {
  selectedNode: any;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(GraphEditor) editor!: GraphEditor;

  public graphService = inject(GraphService);

  @HostBinding('style.--left')  leftCss  = '280px';
  @HostBinding('style.--right') rightCss = '320px';

  fileName = 'Grafo.json';
  renaming = false;
  q = '';

  private dragSide: 'left'|'right' | null = null;
  private startX = 0;
  private startLeft = 280;
  private startRight = 320;

  startRename() { this.renaming = true; }
  stopRename()  { this.renaming = false; }
  onSearch(q: string) { /* TODO: ricerca nel grafo */ }
  fitGraph() { this.editor?.fit(); }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t) {
      const tag = t.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (t as any).isContentEditable) return;
    }
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (!ctrlOrMeta) return;

    const key = String(e.key || '').toLowerCase();
    if (key === 's') { e.preventDefault(); this.exportGraph(); return; }
    if (key === 'z' && e.shiftKey) { e.preventDefault(); this.graphService.redo(); return; }
    if (key === 'z') { e.preventDefault(); this.graphService.undo(); return; }
    if (key === 'y') { e.preventDefault(); this.graphService.redo(); return; }
  }

  startDrag(side: 'left'|'right', ev: MouseEvent) {
    this.dragSide = side;
    this.startX = ev.clientX;
    this.startLeft = parseInt(this.leftCss);
    this.startRight = parseInt(this.rightCss);

    const move = (e: MouseEvent) => {
      const dx = e.clientX - this.startX;
      if (this.dragSide === 'left') {
        const w = Math.max(200, Math.min(500, this.startLeft + dx));
        this.leftCss = `${w}px`;
      } else if (this.dragSide === 'right') {
        const w = Math.max(240, Math.min(540, this.startRight - dx));
        this.rightCss = `${w}px`;
      }
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      this.dragSide = null;
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    ev.preventDefault();
  }

  exportGraph() {
    const graphData = this.graphService.getCurrentGraphData();
    const jsonString = JSON.stringify(graphData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = this.fileName || 'grafo.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const graphData = JSON.parse(reader.result as string) as GraphData;
        if (graphData && Array.isArray(graphData.nodes) && Array.isArray(graphData.edges)) {
          this.graphService.loadGraph(graphData);
          this.fileName = file.name || 'Grafo.json';
        } else {
          alert('Errore: Il file JSON non ha un formato valido.');
        }
      } catch (e) {
        console.error('Errore durante il parsing del file JSON:', e);
        alert('Errore: Il file selezionato non è un JSON valido.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
}