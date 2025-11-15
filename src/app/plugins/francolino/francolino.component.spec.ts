import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrancolinoComponent } from './francolino.component';

describe('FrancolinoComponent', () => {
  let component: FrancolinoComponent;
  let fixture: ComponentFixture<FrancolinoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FrancolinoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FrancolinoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
