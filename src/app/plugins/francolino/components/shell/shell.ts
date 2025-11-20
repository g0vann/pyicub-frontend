/**
 * @file shell.ts
 */

import { Component, inject, ViewChild, ElementRef, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

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
    GraphEditor,
    HttpClientModule
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class Shell {
  selectedNode: any;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(GraphEditor) editor!: GraphEditor;

  public graphService = inject(GraphService);
  public http = inject(HttpClient);

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

    const fsmJson: any = {
      name: 'iCubFSM',
      states: [],
      transitions: [],
      initial_state: '',
    };

    const actionPromises: Promise<{name: string, data: string}>[] = [];

    for (const node of graphData.nodes) {
      if (node.label === 'Init') {
        fsmJson.initial_state = 'init';
      } else if (node.label !== 'End') {
        const actionPromise = lastValueFrom(this.http.get(`assets/json/${node.label}.json`, { responseType: 'text' }))
          .then(data => ({ name: node.label, data }));
        actionPromises.push(actionPromise);
      }
    }

    Promise.all(actionPromises).then(actions => {
      const formattedActions = actions.map(action => {
        const actionDataIndented = action.data.split('\n').map((line, index) => {
          return (index === 0 ? '' : '    ') + line; // Indent all lines except the first
        }).join('\n');
        return `"${action.name}": ${actionDataIndented}`;
      });
      const actionsJson = formattedActions.join(',\n');

      for (const action of actions) {
          const actionObj = JSON.parse(action.data);
          fsmJson.states.push({ name: actionObj.name, description: actionObj.description });
      }

      for (const edge of graphData.edges) {
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const sourceName = sourceNode.label === 'Init' ? 'init' : sourceNode.label;
          const targetName = targetNode.label === 'Init' ? 'init' : targetNode.label;

          fsmJson.transitions.push({
            trigger: `${sourceName}>${targetName}`,
            source: sourceName,
            dest: targetName,
          });
        }
      }

      const finalJsonString = `{
  "name": "iCubFSM",
  "states": ${JSON.stringify(fsmJson.states, null, 2)},
  "transitions": ${JSON.stringify(fsmJson.transitions, null, 2)},
  "initial_state": "${fsmJson.initial_state}",
  "actions": {
    ${actionsJson}
  }
}`;

      const blob = new Blob([finalJsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.fileName || 'grafo.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
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