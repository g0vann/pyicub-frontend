import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphEditor } from './graph-editor';

describe('GraphEditor', () => {
  let component: GraphEditor;
  let fixture: ComponentFixture<GraphEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraphEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
