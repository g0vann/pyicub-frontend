/**
 * @file action.ts
 * @description Definisce la struttura dati di base per un'"Azione".
 * Un'azione è un concetto generico che rappresenta un elemento che può essere aggiunto al grafo,
 * come un nodo con una forma e un colore specifici.
 */

/**
 * @interface Action
 * @description L'interfaccia base per qualsiasi tipo di azione nell'applicazione.
 * @property {string} id - Identificatore univoco per l'azione.
 * @property {string} name - Il nome dell'azione, che può essere visualizzato nell'interfaccia utente.
 * @property {string} icon - Il nome di un'icona (es. da Material Icons) da associare all'azione.
 * @property {string} defaultColor - Il colore di default per l'elemento del grafo creato da questa azione.
 */
export interface Action {
  id: string;
  name: string;
  icon: string;      // nome icona Material
  defaultColor: string;
}