/**
 * @file shell.ts
 */

import { Component, inject, ViewChild, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom, map, Observable, forkJoin, Subscription } from 'rxjs';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule }    from '@angular/material/icon';
import { MatListModule }    from '@angular/material/list';
import { MatButtonModule }  from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ActionPalette }    from '../action-palette/action-palette';
import { PropertiesPanel }  from '../properties-panel/properties-panel';
import { TreeViewPanel }    from '../tree-view-panel/tree-view-panel';
import { GraphService }     from '../../services/graph.service';
import { GraphStateService } from '../../services/graph-state';
import { GraphData, GraphEdge, GraphNode } from '../../models/graph.model';
import { GraphEditor }      from '../graph-editor/graph-editor';
import { AppStateService } from '../../../../services/app-state.service';
import { environment } from '../../../../../environments/environment';
import { v4 as uuid } from 'uuid';
import { ActionsService, NodeAction } from '../../services/actions';
import { PluginFeedbackService } from '../../services/plugin-feedback.service';

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
    MatAutocompleteModule,
    // App
    ActionPalette,
    PropertiesPanel,
    TreeViewPanel,
    GraphEditor,
    HttpClientModule
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss']
})
export class Shell implements OnInit, OnDestroy {
  selectedNode: any;
  nodeSuggestions: string[] = [];
  public isGraphEmpty$!: Observable<boolean>;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(GraphEditor) editor!: GraphEditor;

  public graphService = inject(GraphService);
  public graphState = inject(GraphStateService);
  public actionsService = inject(ActionsService);
  public appStateService = inject(AppStateService);
  public feedback = inject(PluginFeedbackService);

  constructor(public http: HttpClient) {}

  @HostBinding('style.--left')  leftCss  = '280px';
  @HostBinding('style.--right') rightCss = '320px';

  fileName = 'Grafo.json';
  renaming = false;
  q = '';
  searchError = '';
  feedbackPromptValue = '';
  private readonly subs = new Subscription();

  private showMessage(message: string, _action = 'OK', _duration = 4000) {
    this.feedback.show(message);
  }

  private showToast(message: string, duration = 3000) {
    this.feedback.showToast(message, duration);
  }

  ngOnInit(): void {
    this.isGraphEmpty$ = this.graphService.getGraphData().pipe(
      map(graphData => graphData.nodes.length === 0)
    );

    const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
    this.actionsService.loadNodeActionsFromServer(robotName, "iCubRESTApp");

    this.subs.add(this.feedback.message$.subscribe(msg => {
      if (msg?.mode === 'prompt') {
        this.feedbackPromptValue = msg.defaultValue || '';
      }
    }));

    // Keep selection in sync with graph mutations (delete/context-menu/clear).
    this.subs.add(this.graphService.getGraphData().subscribe(graphData => {
      this.nodeSuggestions = Array.from(
        new Set(
          graphData.nodes
            .map(n => (n.label || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      if (!this.selectedNode?.id) return;
      const selectedId = this.selectedNode.id as string;
      const existsAsNode = graphData.nodes.some(n => n.id === selectedId);
      const existsAsEdge = graphData.edges.some(e => e.id === selectedId);
      if (!existsAsNode && !existsAsEdge) {
        this.selectedNode = undefined;
      }
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private dragSide: 'left'|'right' | null = null;
  private startX = 0;
  private startLeft = 280;
  private startRight = 320;

  startRename() { this.renaming = true; }
  stopRename()  { this.renaming = false; }
  
  onSearch(q: string) {
    if (!q || !q.trim()) {
      this.searchError = '';
      return;
    }

    const term = q.trim().toLowerCase();
    const nodes = this.graphService.getCurrentGraphData().nodes;
    
    // Cerca nodo per etichetta (case insensitive)
    const foundNode = nodes.find(n => (n.label || '').toLowerCase() === term);

    if (foundNode) {
      this.searchError = '';
      this.graphService.focusOnNode(foundNode.id);
    } else {
      this.searchError = 'no state found';
    }
  }

  get filteredNodeSuggestions(): string[] {
    const term = (this.q || '').trim().toLowerCase();
    if (!term) return this.nodeSuggestions.slice(0, 10);
    return this.nodeSuggestions
      .filter(name => name.toLowerCase().includes(term))
      .slice(0, 10);
  }

  onSuggestionSelected(value: string) {
    this.q = value;
    this.searchError = '';
    this.onSearch(value);
  }

  fitGraph() { this.editor?.fit(); }

  private isCanvasEmpty(): boolean {
    const data = this.graphService.getCurrentGraphData();
    return data.nodes.length === 0 && data.edges.length === 0;
  }

  async triggerImportJson() {
    if (!this.isCanvasEmpty()) {
      const confirmed = await this.feedback.confirm(
        'Il canvas non e vuoto. Importando un nuovo JSON il contenuto attuale verra sostituito. Continuare?',
        'Conferma import'
      );
      if (!confirmed) return;
    }
    this.fileInput?.nativeElement.click();
  }

  private getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  onPromptConfirm() {
    this.feedback.resolvePrompt(this.feedbackPromptValue);
  }

  onPromptCancel() {
    this.feedback.resolvePrompt(null);
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
            const confirmed = await this.feedback.confirm(
              `The following actions are missing:\n- ${missingActions.join('\n- ')}\n\nDo you want to create them on the server? Their definitions will be extracted from the imported file.`
            );

            if (confirmed) {
              const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
              const missingActionDefinitions = missingActions.map(name => fileContent.actions[name]).filter(Boolean);

              await this.createMissingActionsOnServer(missingActionDefinitions);
              await this.actionsService.loadNodeActionsFromServer(robotName, "iCubRESTApp");
            } else {
              const proceed = await this.feedback.confirm("Continue loading without creating actions? Nodes may not appear correctly.");
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
          this.showMessage('Error: The JSON file does not have a valid format.');
          return;
        }

        if (graphData) {
          console.log('Loading graph data into service...');
          this.graphService.loadGraph(graphData);
          this.fileName = file.name || 'Grafo.json';
          this.showToast('Import JSON completato con successo.');
        }

      } catch (e) {
        console.error('Error parsing JSON file:', e);
        this.showMessage('Error: The selected file is not a valid JSON.');
      } finally {
        input.value = '';
      }
    };

    reader.readAsText(file);
  }

  private async createMissingActionsOnServer(actionDefinitions: any[]): Promise<void> {
    const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
    const appName = 'iCubRESTApp';
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
    const appName = 'iCubRESTApp';

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

  private validateGraph(): string[] {
    const { nodes, edges } = this.graphService.getCurrentGraphData();
    const errors: string[] = [];

    // 1. Controllo grafo vuoto
    if (nodes.length === 0) {
      return ['Il grafo è vuoto.'];
    }

    // 2. Controllo esistenza Init
    const initNode = nodes.find(n => n.type === 'start');
    if (!initNode) {
      return ['Manca il nodo "Init". È obbligatorio per definire l\'inizio e la fine del ciclo.'];
    }

    // 3. Controllo specifico Init: Esattamente 1 IN e 1 OUT
    const initInCount = edges.filter(e => e.target === initNode.id).length;
    const initOutCount = edges.filter(e => e.source === initNode.id).length;

    if (initInCount !== 1) {
      errors.push(`Il nodo "Init" deve avere ESATTAMENTE un arco in entrata (ne ha ${initInCount}). Il grafo deve chiudersi univocamente su Init.`);
    }
    if (initOutCount !== 1) {
      errors.push(`Il nodo "Init" deve avere ESATTAMENTE un arco in uscita (ne ha ${initOutCount}).`);
    }

    // --- Ora bisogna verificare la raggiungibilità e la chiusura del grafo, ovvero che INIT sia il primo e ultimo nodo e che non ci siano diramazioni del grafo che non terminano in INIT ---
    // Costruzione liste di adiacenza per algoritmi di visita
    const adj = new Map<string, string[]>();    // Grafo normale
    const revAdj = new Map<string, string[]>(); // Grafo inverso (archi girati)

    nodes.forEach(n => {
      adj.set(n.id, []);
      revAdj.set(n.id, []);
    });

    edges.forEach(e => {
      // Nota: e.source e e.target potrebbero riferirsi a nodi non più esistenti se c'è bug di sync,
      // quindi controlliamo che esistano nelle map
      if (adj.has(e.source) && adj.has(e.target)) {
        adj.get(e.source)?.push(e.target);
        revAdj.get(e.target)?.push(e.source);
      }
    });

    // Helper per BFS (Visita in ampiezza)
    const bfs = (startNodeId: string, graph: Map<string, string[]>): Set<string> => {
      const visited = new Set<string>();
      const queue = [startNodeId];
      visited.add(startNodeId);

      while (queue.length > 0) {
        const u = queue.shift()!;
        const neighbors = graph.get(u) || [];
        for (const v of neighbors) {
          if (!visited.has(v)) {
            visited.add(v);
            queue.push(v);
          }
        }
      }
      return visited;
    };

    // 4. Analisi Raggiungibilità
    // Insieme dei nodi raggiungibili partendo da Init
    const reachableFromInit = bfs(initNode.id, adj);
    
    // Insieme dei nodi che possono raggiungere Init (BFS sul grafo inverso partendo da Init)
    const canReachInit = bfs(initNode.id, revAdj);

    // 5. Verifica "Chiusura" e "Isole"
    nodes.forEach(node => {
      // A. Nodo Isola (non raggiungibile da Init)
      if (!reachableFromInit.has(node.id)) {
        // Init è sempre raggiungibile da sé stesso, quindi questo colpisce gli altri
        errors.push(`Il nodo "${node.label}" non è collegato al flusso principale (non raggiungibile da Init).`);
      } else {
        // B. Vicolo cieco o Loop infinito (raggiungibile DA Init, ma non può tornare A Init)
        if (!canReachInit.has(node.id)) {
           errors.push(`Il nodo "${node.label}" rompe il ciclo: è possibile raggiungerlo, ma da lì non si può tornare a Init.`);
        }
      }
    });

    return errors;
  }

  private _performDownload() {
    const errors = this.validateGraph();
    if (errors.length > 0) {
      this.showMessage('Impossibile esportare il grafo: ' + errors.join(' | '), 'OK', 7000);
      return;
    }
    const { jsonString } = this._generateFsmJson({ clean: false });
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName || 'Grafo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.showToast('Download JSON completato con successo.');
  }

  downloadFsm() {
    this._performDownload();
  }

  async clearCanvas() {
    const confirmed = await this.feedback.confirm(
      'Vuoi azzerare il canvas? Tutti i nodi e le transizioni verranno rimossi.',
      'Azzera canvas'
    );
    if (!confirmed) return;

    this.graphService.clearGraph();
    this.fileName = 'Grafo.json';
    this.selectedNode = undefined;
    this.q = '';
    this.searchError = '';
    this.graphState.setEdgeType(null);
    this.showToast('Canvas azzerato con successo.');
  }

  async saveFsm() {
    const errors = this.validateGraph();
    if (errors.length > 0) {
      this.showMessage('Impossibile salvare il grafo: ' + errors.join(' | '), 'OK', 7000);
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
      const backendUrl = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/icubSim/iCubRESTApp/fsm.load_fsm?sync`;
      console.log('DEBUG: saveFsm calling URL:', backendUrl);
      await lastValueFrom(
        this.http.post(backendUrl, jsonString, { headers: { 'Content-Type': 'application/json' } })
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      this.appStateService.triggerFsmPluginReload();
      this.showToast('FSM salvato sul backend con successo.');
    } catch (e) {
      console.error('Error sending FSM to backend', e);
      this.showMessage('Errore nell\'invio della FSM al backend. Il file e stato comunque scaricato localmente.', 'OK', 7000);
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
    if (!this.isCanvasEmpty()) {
      const confirmed = await this.feedback.confirm(
        'Il canvas non e vuoto. Ricaricando lo stato dal robot il contenuto attuale verra sostituito. Continuare?',
        'Conferma ricarica'
      );
      if (!confirmed) return;
    }

    try {
      const robotName = this.appStateService.selectedRobot?.name || 'icubSim';
      const appName = 'iCubRESTApp';
      const url = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/${robotName}/${appName}/fsm.get_full_fsm?sync`;
      
      // Since it's registered via __register_method__, it's a POST request.
      const fsmData = await lastValueFrom(this.http.post<any>(url, {}));
      
      if (fsmData) {
        // We can re-use the same transformation logic as file import
        const graphData = await this.transformFsmToGraphData(fsmData);
        if (graphData) {
          this.graphService.loadGraph(graphData);
          this.fileName = fsmData.name ? `${fsmData.name}.json` : 'fsm_from_server.json';
          console.log('Successfully loaded FSM from server.');
          this.showToast('Stato ricaricato dal robot con successo.');
        }
      } else {
        this.showMessage('Error: Received empty FSM data from the server.');
      }
    } catch (e) {
      console.error('Error loading FSM from server:', e);
      this.showMessage('Error: Could not load FSM from the server.');
    }
  }
}
