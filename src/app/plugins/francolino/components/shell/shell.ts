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
import { GraphData, GraphEdge, GraphNode } from '../../models/graph.model';
import { GraphEditor }      from '../graph-editor/graph-editor';
import { AppStateService } from '../../../../services/app-state.service';
import { environment } from '../../../../../environments/environment';
import { v4 as uuid } from 'uuid';
import { ActionsService, NodeAction } from '../../services/actions';

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
  public actionsService = inject(ActionsService);
  public http = inject(HttpClient);
  public appStateService = inject(AppStateService);

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

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }



  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const fileContent = JSON.parse(reader.result as string);
        let graphData: GraphData | null = null;

        // Gestione formato FSM
        if (fileContent.states && fileContent.transitions && fileContent.initial_state) {
          console.log('Detected FSM format. Processing...');

          const availableActions = this.actionsService.currentNodeActions;
          const availableActionNames = new Set(availableActions.map(a => a.name));
          const requiredActionNames: string[] = fileContent.states.map((s: any) => s.name);
          const missingActions = requiredActionNames.filter(name => !availableActionNames.has(name) && name !== 'init');

          if (missingActions.length > 0) {
            const confirmed = window.confirm(
              `The following actions are missing:\n- ${missingActions.join('\n- ')}\n\nDo you want to add them to the palette? They will be represented as colored squares.`
            );

            if (confirmed) {
              missingActions.forEach(name => {
                this.actionsService.addNodeAction({
                  id: uuid(),
                  name: name,
                  icon: 'rectangle',
                  defaultColor: this.getRandomColor()
                });
              });
            } else {
              const proceed = window.confirm("Continue loading without adding actions? Nodes may not appear correctly.");
              if (!proceed) {
                input.value = '';
                return; // Annulla importazione
              }
            }
          }
          graphData = this.transformFsmToGraphData(fileContent);

        // Gestione formato GraphData
        } else if (fileContent.nodes && fileContent.edges) {
          console.log('Detected GraphData format.');
          graphData = fileContent as GraphData;

        // Formato non valido
        } else {
          alert('Error: The JSON file does not have a valid format.');
          return;
        }

        // Caricamento del grafo se i dati sono stati generati
        if (graphData) {
          console.log('Loading graph data into service...');
          this.graphService.loadGraph(graphData);
          this.fileName = file.name || 'Grafo.json';
        }

      } catch (e) {
        console.error('Error parsing JSON file:', e);
        alert('Error: The selected file is not a valid JSON.');
      } finally {
        // Resetta l'input per permettere di selezionare lo stesso file di nuovo
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  private transformFsmToGraphData(fsmData: any): GraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const actionsMap = new Map(this.actionsService.currentNodeActions.map(a => [a.name, a]));

    // New logic: Prioritize gui_metadata for node creation.
    if (fsmData.gui_metadata && fsmData.gui_metadata.nodes) {
      const metadataNodes = fsmData.gui_metadata.nodes;
      // Check if we are using the new format (keys are UUIDs, values have a 'label' property)
      // or the old format (keys are labels, values have only 'position'). We check the 'init' node.
      const isNewFormat = metadataNodes.init ? false : Object.values(metadataNodes).some((val: any) => val.hasOwnProperty('label'));

      if (isNewFormat) {
        console.log('New FSM metadata format detected. Loading nodes from metadata.');
        for (const nodeId in metadataNodes) {
          const nodeMeta = metadataNodes[nodeId];
          const actionDef = actionsMap.get(nodeMeta.label);

          if (nodeMeta.label === 'init') {
            nodes.push({
              id: nodeId,
              label: 'Init', // Display label
              color: '#4CAF50',
              shape: 'ellipse',
              position: nodeMeta.position,
              type: 'start', // Crucial for robust edge connection
              data: {}
            });
          } else {
            nodes.push({
              id: nodeId,
              label: nodeMeta.label,
              color: actionDef?.defaultColor || '#2196F3',
              shape: actionDef?.icon || 'rectangle',
              position: nodeMeta.position,
              type: 'action',
              data: this.unwrapFloats(fsmData.actions[nodeMeta.label] || {})
            });
          }
        }
      }
    }
    
    // Fallback if no nodes were created from metadata (e.g. old format or missing metadata)
    if (nodes.length === 0) {
      console.log('Old FSM format or no metadata. Falling back to loading from `states` array.');
      
      const initNode: GraphNode = {
          id: uuid(), // Unique ID
          label: 'Init',
          color: '#4CAF50',
          shape: 'ellipse',
          position: { x: 400, y: 300 }, // Centered start position
          type: 'start',
          data: {}
      };
      nodes.push(initNode);

      // Arrange other nodes in a circle around the init node
      const radius = 250;
      const totalActionNodes = fsmData.states.length;
      const angleStep = totalActionNodes > 0 ? (2 * Math.PI) / totalActionNodes : 0;

      fsmData.states.forEach((state: any, index: number) => {
          const actionDef = actionsMap.get(state.name);
          const angle = angleStep * index;
          const x = initNode.position.x + radius * Math.cos(angle);
          const y = initNode.position.y + radius * Math.sin(angle);

          nodes.push({
              id: uuid(), // Generate unique ID for each node
              label: state.name,
              color: actionDef?.defaultColor || '#2196F3',
              shape: actionDef?.icon || 'rectangle',
              position: { x, y },
              type: 'action',
              data: this.unwrapFloats(fsmData.actions[state.name] || {})
          });
      });
    }

    // Edge creation logic: Now more robust for the 'init' node.
    // It remains ambiguous for duplicate action labels.
    fsmData.transitions.forEach((transition: any) => {
      let sourceNode: GraphNode | undefined;
      let targetNode: GraphNode | undefined;

      // Find source node - preferentially use unique ID if available
      if (transition.source_id) {
        sourceNode = nodes.find(n => n.id === transition.source_id);
      } else if (transition.source === 'init') {
        sourceNode = nodes.find(n => n.type === 'start');
      } else {
        sourceNode = nodes.find(n => n.label === transition.source);
      }

      // Find target node - preferentially use unique ID if available
      if (transition.dest_id) {
        targetNode = nodes.find(n => n.id === transition.dest_id);
      } else if (transition.dest === 'init') {
        targetNode = nodes.find(n => n.type === 'start');
      } else {
        targetNode = nodes.find(n => n.label === transition.dest);
      }

      if (sourceNode && targetNode) {
        edges.push({
          id: uuid(),
          source: sourceNode.id,
          target: targetNode.id,
          type: 'arrow',
          label: transition.trigger
        });
      } else {
        console.warn('Could not create edge, source or target not found:', transition);
      }
    });

    return { nodes, edges };
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


  private _generateFsmJson(options: { clean: boolean } = { clean: false }): { jsonString: string, fsmJson: any } {
    const graphData = this.graphService.getCurrentGraphData();

    const fsmJson: any = {
      name: 'iCubFSM',
      states: [],
      transitions: [],
      initial_state: '',
      actions: {},
      gui_metadata: {
        nodes: {}
      }
    };

    for (const node of graphData.nodes) {
      if (node.type === 'start') {
        fsmJson.initial_state = 'init';
        fsmJson.gui_metadata.nodes[node.id] = { label: 'init', position: node.position };
      } else if (node.type === 'action') {
        fsmJson.states.push({ name: node.label, description: node.data?.description });
        fsmJson.actions[node.label] = JSON.parse(JSON.stringify(node.data || {})); // Deep copy
        fsmJson.gui_metadata.nodes[node.id] = { label: node.label, position: node.position };
      }
    }

    for (const edge of graphData.edges) {
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
            const sourceName = sourceNode.type === 'start' ? 'init' : sourceNode.label;
            const targetName = targetNode.type === 'start' ? 'init' : targetNode.label;

            fsmJson.transitions.push({
                trigger: edge.label || `${sourceName}>${targetName}`,
                source: sourceName,
                dest: targetName,
                source_id: sourceNode.id,
                dest_id: targetNode.id
            });
        }
    }

    // If 'clean' option is true, remove all data used only for the GUI editor
    if (options.clean) {
      delete fsmJson.gui_metadata;
      if (fsmJson.transitions) {
        fsmJson.transitions.forEach((t: any) => {
          delete t.source_id;
          delete t.dest_id;
        });
      }
    }

    const traverseAndMark = (obj: any, key = '') => {
        if (!obj) return;
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                if(typeof obj[i] === 'number') {
                    if (key === 'target_joints' || key === 'checkpoints') {
                       if (Number.isInteger(obj[i])) {
                          obj[i] = { __float: obj[i] };
                       }
                    }
                } else if (typeof obj[i] === 'object') {
                    traverseAndMark(obj[i], key);
                }
            }
            return;
        }
        if (typeof obj === 'object') {
            Object.entries(obj).forEach(([k, value]) => {
                if (k === 'duration' || k === 'timeout') {
                    if (typeof value === 'number') {
                        obj[k] = { __float: value };
                    }
                } else {
                    traverseAndMark(value, k);
                }
            });
        }
    };
    
    traverseAndMark(fsmJson.actions);

    let jsonString = JSON.stringify(fsmJson, null, 2);
    jsonString = jsonString.replace(/{\s*"__float":\s*(-?\d+\.?\d*)\s*}/g, (match, numberStr) => {
      const num = parseFloat(numberStr);
      if (numberStr.includes('.')) {
        return numberStr;
      }
      return num.toFixed(1);
    });

    return { jsonString, fsmJson };
  }

  private unwrapFloats(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => this.unwrapFloats(item));
    }

    if (obj.hasOwnProperty('__float') && typeof obj.__float === 'number') {
        return obj.__float;
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            newObj[key] = this.unwrapFloats(obj[key]);
        }
    }
    return newObj;
  }

  downloadFsm() {
    const { jsonString } = this._generateFsmJson({ clean: false });
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName || 'grafo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async saveFsm() {
    const { fsmJson } = this._generateFsmJson({ clean: true });
    try {
      const backendUrl = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/icubSim/DynamicFSMServer/load_fsm`;
      console.log(fsmJson);
      await lastValueFrom(this.http.post(backendUrl, fsmJson));
      this.appStateService.triggerFsmPluginReload();
      alert('FSM salvata con successo!');
    } catch (e) {
      console.error('Error sending FSM to backend', e);
      alert('Errore nell\'invio della FSM al backend');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t) {
      const tag = t.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (t instanceof HTMLElement && t.isContentEditable)) return;
    }
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (!ctrlOrMeta) return;

    const key = String(e.key || '').toLowerCase();
    if (key === 's') { e.preventDefault(); this.saveFsm(); return; }
    if (key === 'z') { e.preventDefault(); this.graphService.undo(); return; }
    if (key === 'y') { e.preventDefault(); this.graphService.redo(); return; }
  }
}