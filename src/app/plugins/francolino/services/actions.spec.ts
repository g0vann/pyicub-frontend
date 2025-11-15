import { TestBed } from '@angular/core/testing';

import { Actions } from './actions';

describe('Actions', () => {
  let service: Actions;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Actions);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
