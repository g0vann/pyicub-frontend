import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Shell } from './shell';
import { GraphService } from '../../services/graph.service';
import { ActionsService } from '../../services/actions';
import { AppStateService } from '../../../../services/app-state.service';
import { GraphStateService } from '../../services/graph-state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { of, BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;
  let mockGraphService: any;
  let mockActionsService: any;
  let mockAppState: any;
  let mockGraphState: any;

  beforeEach(async () => {
    mockGraphService = {
      getGraphData: () => new BehaviorSubject({
        nodes: [{ id: '1', type: 'start', label: 'Init', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: '1', target: '1', type: 'arrow' }]
      }),
      getCurrentGraphData: () => ({
        nodes: [{ id: '1', type: 'start', label: 'Init', position: { x: 0, y: 0 } }],
        edges: [{ id: 'e1', source: '1', target: '1', type: 'arrow' }]
      }),
      getLayoutRequests: () => of(null),
      focusNode$: of(null),
      undo: jasmine.createSpy('undo'),
      redo: jasmine.createSpy('redo'),
      canUndo$: of(true),
      canRedo$: of(false)
    };

    mockGraphState = {
      currentEdgeType: of(null),
      setEdgeType: jasmine.createSpy('setEdgeType')
    };

    mockActionsService = {
      loadNodeActionsFromServer: jasmine.createSpy('loadNodeActionsFromServer'),
      nodeActions$: of([]),
      currentNodeActions: []
    };

    mockAppState = {
      selectedRobot: { name: 'icubSim' },
      triggerFsmPluginReload: jasmine.createSpy('triggerFsmPluginReload')
    };

    await TestBed.configureTestingModule({
      imports: [
        Shell,
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: GraphService, useValue: mockGraphService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: AppStateService, useValue: mockAppState },
        { provide: GraphStateService, useValue: mockGraphState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    spyOn(window, 'alert'); // Spy on alert to suppress and verify
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call backend API on saveFsm', async () => {
    // Force validation to pass regardless of mock graph shape
    component['validateGraph'] = () => [];

    // Spy on HttpClient.post to assert backend call
    const postSpy = spyOn(component['http'], 'post').and.returnValue(of({ status: 'success' }));

    await component.saveFsm();

    // Verify success alert and backend invocation
    expect(window.alert).toHaveBeenCalled();
    expect((window.alert as jasmine.Spy).calls.mostRecent().args[0]).toContain('salvato');
    expect(postSpy).toHaveBeenCalled();
    expect(mockAppState.triggerFsmPluginReload).toHaveBeenCalled();
  });

  it('should handle keyboard shortcuts', () => {
    const saveSpy = spyOn(component, 'saveFsm');

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true
    });

    window.dispatchEvent(event);
    expect(saveSpy).toHaveBeenCalled();
  });
});
