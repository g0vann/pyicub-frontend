import { TestBed } from '@angular/core/testing';
import { FrancolinoComponent } from './francolino.component';

describe('FrancolinoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FrancolinoComponent]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FrancolinoComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
