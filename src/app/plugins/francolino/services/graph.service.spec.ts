import { TestBed } from '@angular/core/testing';
import { GraphService } from './graph.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GraphNode } from '../models/graph.model';

describe('GraphService', () => {
  let service: GraphService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GraphService]
    });
    service = TestBed.inject(GraphService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty graph data', () => {
    const data = service.getCurrentGraphData();
    expect(data.nodes).toEqual([]);
    expect(data.edges).toEqual([]);
  });

  it('should add a node and update state', async () => {
    const nodeData: Partial<GraphNode> = { label: 'TestNode', color: 'red', type: 'action' };
    
    // addNode è async
    const promise = service.addNode(nodeData, 'TestAction');

    const req = httpMock.expectOne(req => req.url.includes('/actions/TestAction'));
    req.flush({ _palette: {}, someData: '123' });

    await promise;

    const data = service.getCurrentGraphData();
    expect(data.nodes.length).toBe(1);
    expect(data.nodes[0].label).toBe('TestNode');
  });

  it('should support Undo and Redo operations', () => {
    // 1. Initial State
    expect(service.getCurrentGraphData().nodes.length).toBe(0);

    // 2. Add Node (State A)
    service.addNode({ label: 'Node1' });
    expect(service.getCurrentGraphData().nodes.length).toBe(1);

    // 3. Add Another Node (State B)
    service.addNode({ label: 'Node2' });
    expect(service.getCurrentGraphData().nodes.length).toBe(2);

    // 4. Undo -> Should go back to State A
    service.undo();
    expect(service.getCurrentGraphData().nodes.length).toBe(1);
    expect(service.getCurrentGraphData().nodes[0].label).toBe('Node1');

    // 5. Undo -> Should go back to Initial State
    service.undo();
    expect(service.getCurrentGraphData().nodes.length).toBe(0);

    // 6. Redo -> Should go back to State A
    service.redo();
    expect(service.getCurrentGraphData().nodes.length).toBe(1);

    // 7. Redo -> Should go back to State B
    service.redo();
    expect(service.getCurrentGraphData().nodes.length).toBe(2);
  });

  it('should remove elements correctly', () => {
    // Setup: 2 nodes connected by 1 edge
    service.addNode({ id: 'n1', label: 'Node1' });
    service.addNode({ id: 'n2', label: 'Node2' });
    service.addEdge({ id: 'e1', source: 'n1', target: 'n2', type: 'arrow' });

    expect(service.getCurrentGraphData().nodes.length).toBe(2);
    expect(service.getCurrentGraphData().edges.length).toBe(1);

    // Remove Node1
    service.removeElements(['n1']);

    const data = service.getCurrentGraphData();
    expect(data.nodes.length).toBe(1);
    expect(data.nodes[0].id).toBe('n2');
    
    // Edge should be removed automatically because source is gone
    expect(data.edges.length).toBe(0);
  });
});
