import { TestBed } from '@angular/core/testing';
import { FrancolinoComponent } from './francolino.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('FrancolinoComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FrancolinoComponent, NoopAnimationsModule, HttpClientTestingModule]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FrancolinoComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
