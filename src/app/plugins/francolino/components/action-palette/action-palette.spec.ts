import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionPalette } from './action-palette';

describe('ActionPalette', () => {
  let component: ActionPalette;
  let fixture: ComponentFixture<ActionPalette>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionPalette]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionPalette);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
