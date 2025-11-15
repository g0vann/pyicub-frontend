/**
 * @file graph.model.ts
 * @description Definisce i modelli di dati per la struttura del grafo.
 */

import { EdgeType } from "../services/graph-state";

/**
 * @interface GraphNode
 * @description Rappresenta un singolo nodo all'interno del grafo.
 * Contiene tutte le informazioni necessarie per la sua visualizzazione e la sua logica.
 */
export interface GraphNode {
  id: string;                  // ID univoco del nodo
  label: string;               // Etichetta visualizzata sul nodo
  color: string;               // Colore di sfondo del nodo
  shape: string;               // Forma del nodo (usata da Cytoscape, es. 'ellipse', 'rectangle')
  position: { x: number; y: number }; // Posizione del nodo sulla canvas

  // Proprietà aggiuntive per i dati personalizzati
  attribute1?: string;
  attribute2?: string;
}

/**
 * @interface GraphEdge
 * @description Rappresenta un singolo arco (o connessione) tra due nodi.
 */
export interface GraphEdge {
  id: string;        // ID univoco dell'arco
  source: string;    // ID del nodo di partenza
  target: string;    // ID del nodo di arrivo
  type: EdgeType;    // Tipo di arco (es. 'line', 'arrow') per lo styling
  label?: string;    // Etichetta opzionale sull'arco
}

/**
 * @interface GraphData
 * @description Rappresenta l'intero stato del grafo.
 * È un contenitore semplice per gli array di nodi e archi.
 * Questa sarà la struttura dati che salveremo ed esporteremo.
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
