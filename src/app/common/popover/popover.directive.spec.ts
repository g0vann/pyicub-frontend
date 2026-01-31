import { ElementRef } from '@angular/core';
import { PopoverDirective } from './popover.directive';

describe('PopoverDirective', () => {
  it('should create an instance', () => {
    const mockElementRef = new ElementRef(document.createElement('div'));
    const directive = new PopoverDirective(mockElementRef);
    expect(directive).toBeTruthy();
  });
});
