/**
 * @file shell.ts
 */

import { Component, inject, ViewChild, ElementRef, HostBinding, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom, map, Observable, forkJoin } from 'rxjs';

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
export class Shell implements OnInit {
  selectedNode: any;
  public isGraphEmpty$!: Observable<boolean>;

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

  ngOnInit(): void {
    this.isGraphEmpty$ = this.graphService.getGraphData().pipe(
      map(graphData => graphData.nodes.length === 0)
    );

    const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
    this.actionsService.loadNodeActionsFromServer(robotName, "DynamicFSMServer");
  }

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

        if (fileContent.states && fileContent.transitions && fileContent.initial_state) {
          console.log('Detected FSM format. Processing...');

          const availableActions = this.actionsService.currentNodeActions;
          const availableActionNames = new Set(availableActions.map(a => a.name));
          const requiredActionNames: string[] = fileContent.states.map((s: any) => s.name);
          const missingActions = requiredActionNames.filter(name => !availableActionNames.has(name) && name !== 'init');

          if (missingActions.length > 0) {
            const confirmed = window.confirm(
              `The following actions are missing:\n- ${missingActions.join('\n- ')}\n\nDo you want to create them on the server? Their definitions will be extracted from the imported file.`
            );

            if (confirmed) {
              const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
              const missingActionDefinitions = missingActions.map(name => fileContent.actions[name]).filter(Boolean);

              await this.createMissingActionsOnServer(missingActionDefinitions);
              await this.actionsService.loadNodeActionsFromServer(robotName, "DynamicFSMServer");
            } else {
              const proceed = window.confirm("Continue loading without creating actions? Nodes may not appear correctly.");
              if (!proceed) {
                input.value = '';
                return;
              }
            }
          }
          graphData = await this.transformFsmToGraphData(fileContent);

        } else if (fileContent.nodes && fileContent.edges) {
          console.log('Detected GraphData format.');
          graphData = fileContent as GraphData;

        } else {
          alert('Error: The JSON file does not have a valid format.');
          return;
        }

        if (graphData) {
          console.log('Loading graph data into service...');
          this.graphService.loadGraph(graphData);
          this.fileName = file.name || 'Grafo.json';
        }

      } catch (e) {
        console.error('Error parsing JSON file:', e);
        alert('Error: The selected file is not a valid JSON.');
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  private async createMissingActionsOnServer(actionDefinitions: any[]): Promise<void> {
    const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
    const appName = 'DynamicFSMServer';
    const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions`;

    const creationObservables = actionDefinitions.map(actionDataFromFile => {
      const actionName = actionDataFromFile.name;
      const newActionPayload = {
        ...actionDataFromFile
      };
      newActionPayload.name = actionName;
      return this.http.post(url, newActionPayload);
    });

    if (creationObservables.length > 0) {
      await lastValueFrom(forkJoin(creationObservables));
      console.log(`Created ${creationObservables.length} missing actions on the server.`);
    }
  }

  private async transformFsmToGraphData(fsmData: any): Promise<GraphData> {
    const edges: GraphEdge[] = [];
    let nodes: GraphNode[] = [];

    const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
    const appName = 'DynamicFSMServer';

    const getActionDetails = async (actionName: string): Promise<any> => {
      if (!actionName || actionName === 'init') {
        return null;
      }
      try {
        const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/actions/${actionName}`;
        return await lastValueFrom(this.http.get<any>(url));
      } catch (e) {
        console.warn(`Could not load action template for ${actionName} from server`, e);
        return null;
      }
    };

    const sanitizeActionData = (data: any, name: string) => {
      if (!data || typeof data !== 'object') return data;
      const clone = JSON.parse(JSON.stringify(data));
      delete clone._palette;
      delete clone._properties;
      delete clone.id;
      clone.name = name;
      return clone;
    };

    if (fsmData.gui_metadata && fsmData.gui_metadata.nodes) {
      const metadataNodes = fsmData.gui_metadata.nodes;
      const nodePromises = Object.keys(metadataNodes).map(async (nodeId) => {
        const nodeMeta = metadataNodes[nodeId];
        const actionName = nodeMeta.label;

        if (actionName === 'init') {
          return { id: nodeId, label: 'Init', color: '#4CAF50', shape: 'ellipse', position: nodeMeta.position, type: 'start', data: {} } as GraphNode;
        }

        const fullActionData = await getActionDetails(actionName);
        const { _palette, _properties, ...actionData } = fullActionData || {};

        const fsmActionData = fsmData.actions ? fsmData.actions[actionName] : {};

        return {
          id: nodeId,
          label: actionName,
          color: '#ffffff',
          shape: 'round-rectangle',
          position: nodeMeta.position,
          type: 'action',
          data: sanitizeActionData(this.unwrapFloats(fsmActionData || actionData), actionName)
        } as GraphNode;
      });

      nodes = await Promise.all(nodePromises);
    }
    
    if (nodes.length === 0) {
      const initNode: GraphNode = { id: uuid(), label: 'Init', color: '#4CAF50', shape: 'ellipse', position: { x: 400, y: 300 }, type: 'start', data: {} };
      nodes.push(initNode);

      const radius = 250;
      const totalActionNodes = fsmData.states.length;
      const angleStep = totalActionNodes > 0 ? (2 * Math.PI) / totalActionNodes : 0;
      
      const nodePromises = fsmData.states.map(async (state: any, index: number) => {
        const actionName = state.name;
        if (actionName === 'init') return null;

        const fullActionData = await getActionDetails(actionName);
        const { _palette, _properties, ...actionData } = fullActionData || {};
        const fsmActionData = fsmData.actions ? fsmData.actions[actionName] : {};

        const angle = angleStep * index;
        const x = initNode.position.x + radius * Math.cos(angle);
        const y = initNode.position.y + radius * Math.sin(angle);

        return {
          id: uuid(),
          label: actionName,
          color: '#ffffff',
          shape: 'round-rectangle',
          position: { x, y },
          type: 'action',
          data: sanitizeActionData(this.unwrapFloats(fsmActionData || actionData), actionName)
        } as GraphNode;
      });

      const newNodes = (await Promise.all(nodePromises)).filter(n => n !== null);
      nodes.push(...newNodes);
    }

    fsmData.transitions.forEach((transition: any) => {
      let sourceNode: GraphNode | undefined;
      let targetNode: GraphNode | undefined;

      if (transition.source_id) {
        sourceNode = nodes.find(n => n.id === transition.source_id);
      } else if (transition.source === 'init') {
        sourceNode = nodes.find(n => n.type === 'start');
      } else {
        sourceNode = nodes.find(n => n.label === transition.source);
      }

      if (transition.dest_id) {
        targetNode = nodes.find(n => n.id === transition.dest_id);
      } else if (transition.dest === 'init') {
        targetNode = nodes.find(n => n.type === 'start');
      } else {
        targetNode = nodes.find(n => n.label === transition.dest);
      }

      if (sourceNode && targetNode) {
        edges.push({ id: uuid(), source: sourceNode.id, target: targetNode.id, type: 'arrow', label: transition.trigger });
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

    const sanitizeActionData = (data: any, name: string) => {
      const clone = JSON.parse(JSON.stringify(data || {}));
      if (clone && typeof clone === 'object') {
        delete clone._palette;
        delete clone._properties;
        delete clone.id;
        clone.name = name;
      }
      return clone;
    };

    const fsmJson: any = {
      name: 'iCubFSM',
      states: [],
      transitions: [],
      initial_state: '',
      actions: {},
      gui_metadata: { nodes: {} }
    };

    for (const node of graphData.nodes) {
      if (node.type === 'start') {
        fsmJson.initial_state = 'init';
        fsmJson.gui_metadata.nodes[node.id] = { label: 'init', position: node.position };
      } else if (node.type === 'action') {
        fsmJson.states.push({ name: node.label, description: node.data?.description });
        fsmJson.actions[node.label] = sanitizeActionData(node.data, node.label);
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
            obj.forEach((item, i) => {
                if (typeof item === 'number' && (key === 'target_joints' || key === 'checkpoints') && Number.isInteger(item)) {
                    obj[i] = { "__float": item };
                } else if (typeof item === 'object') {
                    traverseAndMark(item, key);
                }
            });
            return;
        }
        if (typeof obj === 'object') {
            Object.entries(obj).forEach(([k, value]) => {
                if ((k === 'duration' || k === 'timeout') && typeof value === 'number') {
                    obj[k] = { "__float": value };
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
      return numberStr.includes('.') ? numberStr : num.toFixed(1);
    });

    return { jsonString, fsmJson };
  }

  private unwrapFloats(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.unwrapFloats(item));
    if (obj.hasOwnProperty('__float') && typeof obj.__float === 'number') return obj.__float;
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            newObj[key] = this.unwrapFloats(obj[key]);
        }
    }
    return newObj;
  }

  private _performDownload() {
    if (this.graphService.getCurrentGraphData().nodes.length === 0) {
      alert('Il grafo è vuoto. Aggiungi almeno un nodo prima di esportare.');
      return;
    }
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

  downloadFsm() {
    this._performDownload();
  }

  async saveFsm() {
    if (this.graphService.getCurrentGraphData().nodes.length === 0) {
      alert('Il grafo è vuoto. Aggiungi almeno un nodo prima di salvare.');
      return;
    }
    // this._performDownload();

    const { jsonString } = this._generateFsmJson({ clean: true });
    // const blob = new Blob([jsonString], { type: 'application/json' });
    // const url = window.URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = this.fileName || 'grafo.json';
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // window.URL.revokeObjectURL(url);

    try {
      const backendUrl = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/icubSim/DynamicFSMServer/load_fsm?sync`;
      await lastValueFrom(
        this.http.post(backendUrl, jsonString, { headers: { 'Content-Type': 'application/json' } })
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      this.appStateService.triggerFsmPluginReload();
      alert('FSM salvato sul backend con successo!');
    } catch (e) {
      console.error('Error sending FSM to backend', e);
      alert('Errore nell\'invio della FSM al backend. Il file è stato comunque scaricato localmente.');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName?.toLowerCase() === 'input' || t.tagName?.toLowerCase() === 'textarea' || t.isContentEditable)) return;
    
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (!ctrlOrMeta) return;

    const key = String(e.key || '').toLowerCase();
    if (key === 's') { e.preventDefault(); this.saveFsm(); return; }
    if (key === 'z') { e.preventDefault(); this.graphService.undo(); return; }
    if (key === 'y') { e.preventDefault(); this.graphService.redo(); return; }
  }

  async loadFsmFromServer() {
    try {
      const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
      const appName = 'DynamicFSMServer';
      const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/get_full_fsm?sync`;
      
      // Since it's registered via __register_method__, it's a POST request.
      const fsmData = await lastValueFrom(this.http.post<any>(url, {}));
      
      if (fsmData) {
        // We can re-use the same transformation logic as file import
        const graphData = await this.transformFsmToGraphData(fsmData);
        if (graphData) {
          this.graphService.loadGraph(graphData);
          this.fileName = fsmData.name ? `${fsmData.name}.json` : 'fsm_from_server.json';
          console.log('Successfully loaded FSM from server.');
        }
      } else {
        alert('Error: Received empty FSM data from the server.');
      }
    } catch (e) {
      console.error('Error loading FSM from server:', e);
      alert('Error: Could not load FSM from the server.');
    }
  }
}
