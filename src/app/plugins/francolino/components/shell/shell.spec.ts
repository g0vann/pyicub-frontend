import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Shell } from './shell';
import { GraphService } from '../../services/graph.service';
import { ActionsService } from '../../services/actions';
import { AppStateService } from '../../../../services/app-state.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;
  let httpMock: HttpTestingController;
  let mockGraphService: any;
  let mockActionsService: any;
  let mockAppState: any;

  beforeEach(async () => {
    mockGraphService = {
      getGraphData: () => new BehaviorSubject({ nodes: [{ id: '1', type: 'start' }], edges: [] }), // Non-empty graph
      getCurrentGraphData: () => ({ nodes: [{ id: '1', type: 'start' }], edges: [] }),
      undo: jasmine.createSpy('undo'),
      redo: jasmine.createSpy('redo'),
      canUndo$: of(true),
      canRedo$: of(false)
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
        { provide: AppStateService, useValue: mockAppState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call backend API on saveFsm', fakeAsync(() => {
    component.saveFsm();

    const req = httpMock.expectOne(req => 
      req.url.includes('/fsm.load_fsm') && req.method === 'POST'
    );
    expect(req.request.body).toBeDefined(); // Should send JSON string
    
    req.flush({ status: 'success' }); // Simulate success response
    tick(500); // Wait for potential delays/timeouts in code

    expect(mockAppState.triggerFsmPluginReload).toHaveBeenCalled();
  }));

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