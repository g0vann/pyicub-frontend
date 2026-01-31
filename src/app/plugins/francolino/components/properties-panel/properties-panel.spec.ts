import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PropertiesPanel } from './properties-panel';
import { GraphService } from '../../services/graph.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { GraphNode } from '../../models/graph.model';
import { SimpleChange } from '@angular/core';

describe('PropertiesPanel', () => {
  let component: PropertiesPanel;
  let fixture: ComponentFixture<PropertiesPanel>;
  let mockGraphService: jasmine.SpyObj<GraphService>;

  beforeEach(async () => {
    // Mock del GraphService
    mockGraphService = jasmine.createSpyObj('GraphService', ['updateNode', 'getCurrentGraphData']);
    mockGraphService.getCurrentGraphData.and.returnValue({ nodes: [], edges: [] });

    await TestBed.configureTestingModule({
      imports: [
        PropertiesPanel, // Standalone component
        NoopAnimationsModule,
        FormsModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule
      ],
      providers: [
        { provide: GraphService, useValue: mockGraphService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PropertiesPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should rebuild form when input node changes', () => {
    const mockNode: GraphNode = {
      id: '1',
      label: 'MyAction',
      type: 'action',
      color: '#fff',
      shape: 'rect',
      position: { x: 0, y: 0 },
      data: {
        name: 'MyAction',
        description: 'Test Desc',
        offset_ms: 500,
        wait_for_steps: [true, false]
      }
    };

    component.node = mockNode;
    // Simula il lifecycle hook ngOnChanges
    component.ngOnChanges({
      node: new SimpleChange(null, mockNode, true)
    });

    expect(component.formState.name).toBe('MyAction');
    expect(component.formState.description).toBe('Test Desc');
    expect(component.formState.offset_ms).toBe(500);
    expect(component.formState.wait_for_steps.length).toBe(2);
    expect(component.formState.wait_for_steps[0]).toBe(true);
  });

  it('should call GraphService.updateNode on save', () => {
    const mockNode: GraphNode = {
      id: '1',
      label: 'OldName',
      type: 'action',
      color: '#fff',
      shape: 'rect',
      position: { x: 0, y: 0 },
      data: { name: 'OldName' }
    };

    component.node = mockNode;
    component.ngOnChanges({ node: new SimpleChange(null, mockNode, true) });

    // Modifica i valori nel form
    component.formState.name = 'NewName';
    component.formState.description = 'Updated Desc';

    component.save();

    expect(mockGraphService.updateNode).toHaveBeenCalledWith('1', jasmine.objectContaining({
      label: 'NewName',
      data: jasmine.objectContaining({
        name: 'NewName',
        description: 'Updated Desc'
      })
    }));
  });
});