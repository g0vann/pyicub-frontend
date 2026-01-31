import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionPalette } from './action-palette';
import { ActionsService } from '../../services/actions';
import { GraphStateService } from '../../services/graph-state';
import { AppStateService } from '../../../../services/app-state.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ActionPalette', () => {
  let component: ActionPalette;
  let fixture: ComponentFixture<ActionPalette>;
  let mockActionsService: any;
  let mockGraphState: any;
  let mockAppState: any;

  beforeEach(async () => {
    // Mock Services
    mockActionsService = {
      nodeActions$: new BehaviorSubject([
        { id: '1', name: 'HeadAction', icon: 'rect', defaultColor: '#fff' },
        { id: '2', name: 'WalkAction', icon: 'rect', defaultColor: '#fff' },
        { id: '3', name: 'GazeAction', icon: 'rect', defaultColor: '#fff' }
      ]),
      edgeActions$: of([]),
      currentNodeActions: []
    };

    mockGraphState = {
      currentEdgeType: new BehaviorSubject(null),
      currentValue: null,
      setEdgeType: jasmine.createSpy('setEdgeType')
    };

    mockAppState = {
      selectedRobot: { name: 'icubSim' }
    };

    await TestBed.configureTestingModule({
      imports: [
        ActionPalette, // Standalone
        HttpClientTestingModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ActionsService, useValue: mockActionsService },
        { provide: GraphStateService, useValue: mockGraphState },
        { provide: AppStateService, useValue: mockAppState }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionPalette);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter actions based on search term', (done) => {
    // 1. Initial State: All 3 actions
    component.filteredNodeActions$.subscribe(actions => {
      if (component.searchTerm === '') {
        expect(actions.length).toBe(3);
      }
    });

    // 2. Set Search Term
    component.searchTerm = 'Head';
    component.onSearchChange('Head');

    // 3. Verify Filtered State
    component.filteredNodeActions$.subscribe(actions => {
      if (component.searchTerm === 'Head') {
        expect(actions.length).toBe(1);
        expect(actions[0].name).toBe('HeadAction');
        done();
      }
    });
  });

  it('should toggle edge drawing mode', () => {
    // Select 'arrow' type
    component.selectEdgeType('arrow');
    expect(mockGraphState.setEdgeType).toHaveBeenCalledWith('arrow');

    // Reset mock to simulate state change
    mockGraphState.currentValue = 'arrow'; 
    
    // Deselect (toggle off)
    component.selectEdgeType('arrow');
    expect(mockGraphState.setEdgeType).toHaveBeenCalledWith(null);
  });
});