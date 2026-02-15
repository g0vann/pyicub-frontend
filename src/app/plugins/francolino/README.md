# FSM Editor (Francolino)

Plugin Angular per la modellazione grafica di una FSM (Finite State Machine) dentro la dashboard Pyicub.

## Contesto accademico

Questo plugin e stato sviluppato come progetto d'esame del corso **Software Architecture Design** presso l'**Universita degli Studi di Napoli Federico II**, sotto la supervisione della **Professoressa Fasolino**.

## Cosa fa

- Permette di costruire una FSM con drag&drop di nodi e collegamento archi su canvas.
- Mostra e modifica i parametri del nodo selezionato (Properties Panel).
- Visualizza la struttura del grafo in forma ad albero (Tree View).
- Importa/esporta JSON.
- Carica la FSM dal robot e salva la FSM sul backend Pyicub.

## Struttura principale

- `francolino.component.ts`: entrypoint widget del plugin.
- `components/shell/*`: layout principale e toolbar.
- `components/graph-editor/*`: canvas Cytoscape (nodi, archi, selezione, delete).
- `components/action-palette/*`: palette nodi/archi e import azioni.
- `components/properties-panel/*`: editing parametri azione.
- `components/tree-view-panel/*`: vista gerarchica del flusso.
- `services/graph.service.ts`: stato del grafo (single source of truth), undo/redo.
- `services/actions.ts`: catalogo azioni nodo/arco da backend.
- `services/plugin-feedback.service.ts`: modal/confirm/prompt/toast interni al plugin.

## Regole funzionali gia implementate

- `Init` puo esistere una sola volta nel canvas.
- Eliminando un elemento dal canvas, il Properties Panel si deseleziona correttamente.
- `Init` non puo essere eliminata dal server dalla Action Palette.
- Import JSON / load da robot chiedono conferma se il canvas non e vuoto.
- Pulsante "Azzera canvas" svuota il grafo e resetta nome file a `grafo.json`.

## UX e feedback

- Toast di successo per operazioni principali (salvataggio FSM, download, update parametri, ecc.).
- Dialog di conferma/prompt/error centrati nel plugin (non alert browser per il flusso interno Francolino).
- Searchbar con autocomplete sui nodi presenti nel canvas e focus automatico sul nodo trovato.

## Integrazione backend (alto livello)

Il plugin usa endpoint REST Pyicub tramite `HttpClient`:

- lettura catalogo azioni,
- salvataggio FSM,
- caricamento FSM corrente dal robot,
- gestione import/delete azioni lato server.

Host/porta/scheme dipendono da `src/environments/environment.ts`.

## Shortcut utili

- `Delete`: elimina elementi selezionati nel canvas.
- `Esc`: esce dalla modalita disegno arco.
- `Ctrl+S`: salva FSM sul backend (shortcut gestita nel plugin).
- `Ctrl+Z` / `Ctrl+Y`: undo/redo (toolbar).

## Test (unit)

Spec principali:

- `components/shell/shell.spec.ts`
- `components/graph-editor/graph-editor.spec.ts`
- `components/action-palette/action-palette.spec.ts`
- `components/properties-panel/properties-panel.spec.ts`
- `components/tree-view-panel/tree-view-panel.spec.ts`
- `services/graph.service.spec.ts`

Esecuzione:

```bash
ng test
```
