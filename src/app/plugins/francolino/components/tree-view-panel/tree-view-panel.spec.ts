import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeViewPanel } from './tree-view-panel';
import { GraphService } from '../../services/graph.service';
import { of } from 'rxjs';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TreeViewPanel', () => {
  let component: TreeViewPanel;
  let fixture: ComponentFixture<TreeViewPanel>;
  let mockGraphService: any;

  beforeEach(async () => {
    mockGraphService = {
      getGraphData: () => of({ nodes: [], edges: [] }),
      focusOnNode: jasmine.createSpy('focusOnNode')
    };

    await TestBed.configureTestingModule({
      imports: [
        TreeViewPanel,
        MatTreeModule,
        MatIconModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: GraphService, useValue: mockGraphService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TreeViewPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build tree correctly when graph data is provided', () => {
    const mockNodes: any[] = [
      { id: '1', label: 'Init', type: 'start' },
      { id: '2', label: 'Action1', type: 'action' }
    ];
    const mockEdges: any[] = [
      { source: '1', target: '2' }
    ];

    // Accediamo alla funzione privata per il test (casting any per semplicità di test unitario)
    const tree = (component as any).buildTreeFromGraph(mockNodes, mockEdges);
    
    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].id).toBe('1');
    expect(tree[0].children.length).toBe(1);
    expect(tree[0].children[0].id).toBe('2');
  });
});
