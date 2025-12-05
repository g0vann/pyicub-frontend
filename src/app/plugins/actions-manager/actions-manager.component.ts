import {Component, OnInit, OnDestroy} from '@angular/core';
import {WidgetBaseComponent} from '../../widget-base/widget-base.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-actions-manager',
  templateUrl: './actions-manager.component.html',
  styleUrl: './actions-manager.component.css'
})
export class ActionsManagerComponent extends WidgetBaseComponent implements OnInit, OnDestroy {

  actions: Action[] = []
  isLoading = true;
  search: string
  private destroy$ = new Subject<void>();

  showErrorDialog: boolean = false;
  errorMessage: string;

  nodeColors = {
    INACTIVE: 'white',
    ACTIVE: 'white',
    RUNNING: 'greenyellow',
    FAILED: 'red',
    DONE: 'green',
    TIMEOUT: 'yellow'
  }

  get filteredActions(): Action[] {

    if (!this.search) {
      return this.actions
    } else {
      return this.actions.filter(action => action.actionID.toLowerCase().includes(this.search.toLowerCase()))
    }

  }

  ngOnInit() {
    this.loadActions();

    this.appStateService.refreshPlugins$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadActions();
      });


  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActions() {
    this.isLoading = true;
    this.getRobotActions().subscribe({
        next: actions => {
          const filteredActions = actions.filter(action => action.startsWith(this.application.name + ".")).map(action => action.substring(this.application.name.length + 1))
          const newActions: Action[] = filteredActions.map(action => {
            return {actionID: action, actionState: ActionState.ACTIVE}
          })
          this.actions = newActions.sort((a, b) => {
              const nameA = a.actionID.toUpperCase();
              const nameB = b.actionID.toUpperCase();
              if (nameA < nameB) {
                return -1;
              }
              if (nameA > nameB) {
                return 1;
              }

              // sono uguali
              return 0;
          });

          this.isLoading = false;
          //console.log(this.actions)
        },
        error: err => {
          console.log(err)
          this.isLoading = false;
          this.openErrorDialog("Impossibile caricare le azioni del robot.")
        }
      }
    )
  }

  onActionClick(selectedAction: Action) {

    if (selectedAction.actionState === ActionState.ACTIVE) {

      this.actions.forEach(action => {
        if (selectedAction.actionID !== action.actionID) {
          this.updateActionState(action, ActionState.INACTIVE)
        }
      })

      this.playActionAsync(`${this.application.name}.${selectedAction.actionID}`).subscribe(reqID => {
        console.log(selectedAction.actionID)

        console.log("RISPOSTA PLAYACTION: ",reqID)

        const onRunning = () => {
          this.updateActionState(selectedAction, ActionState.RUNNING)
        }

        const onDone = () => {

          this.updateActionState(selectedAction, ActionState.DONE)
          setTimeout(() => {
            this.actions.forEach(action => {
              this.updateActionState(action, ActionState.ACTIVE)
            })
          }, 2000)

        }

        const onFailed = () => {

          this.updateActionState(selectedAction, ActionState.FAILED)
          setTimeout(() => {
            this.actions.forEach(action => {
              this.updateActionState(action, ActionState.ACTIVE)
            })
          }, 2000)
        }

        const onTimeout = () => {

          this.updateActionState(selectedAction, ActionState.TIMEOUT)
          setTimeout(() => {
            this.actions.forEach(action => {
              this.updateActionState(action, ActionState.ACTIVE)
            })
          }, 2000)
        }

        this.checkAsyncRequestStatus(reqID, undefined, onRunning, onDone, onFailed,onTimeout)

      })
    }
  }

  private updateActionState(actionToUpdate: Action, updatedState: ActionState) {
    this.actions = this.actions.map(action => {
      if (action.actionID === actionToUpdate.actionID) {
        return {actionID: action.actionID, actionState: updatedState}
      }
      return action
    })
  }

  openErrorDialog(errorMessage: string) {
    this.errorMessage = errorMessage;
    this.showErrorDialog = true;
  }

  closeErrorDialog() {
    this.errorMessage = "";
    this.showErrorDialog = false;
  }

  protected readonly ActionState = ActionState;
}

interface Action {
  actionID: string
  actionState: ActionState
}

enum ActionState {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  RUNNING = "RUNNING",
  DONE = "DONE",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT"
}
