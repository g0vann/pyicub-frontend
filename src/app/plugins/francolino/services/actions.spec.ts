import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActionsService } from './actions';
import { environment } from '../../../../environments/environment';

describe('ActionsService', () => {
  let service: ActionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ActionsService]
    });
    service = TestBed.inject(ActionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load node actions from server and add static Init', () => {
    const mockActions = [
      { name: 'HeadAction', _palette: { name: 'HeadAction' } },
      { name: 'GazeAction', _palette: { name: 'GazeAction' } }
    ];

    service.loadNodeActionsFromServer('icubSim', 'iCubRESTApp');

    const expectedUrl = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/icubSim/iCubRESTApp/actions`;
    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockActions);

    service.nodeActions$.subscribe(actions => {
      // Expect 3 actions: Static Init + 2 mocked actions
      expect(actions.length).toBe(3);
      expect(actions[0].name).toBe('Init'); // Static Init should be first
      expect(actions[1].name).toBe('HeadAction');
    });
  });

  it('should handle error when loading actions', () => {
    service.loadNodeActionsFromServer('icubSim', 'iCubRESTApp');

    const expectedUrl = `${environment.apiScheme}://${environment.apiHost}:${environment.apiPort}/pyicub/icubSim/iCubRESTApp/actions`;
    const req = httpMock.expectOne(expectedUrl);
    req.error(new ErrorEvent('Network error'));

    service.nodeActions$.subscribe(actions => {
      // Should fallback to just Init node
      expect(actions.length).toBe(1);
      expect(actions[0].name).toBe('Init');
    });
  });
});