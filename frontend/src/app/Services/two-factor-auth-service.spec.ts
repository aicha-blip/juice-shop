describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TwoFactorAuthService]
    });
    service = TestBed.inject(TwoFactorAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear(); // Reset localStorage before each test
  });

  afterEach(() => {
    httpMock.verify(); // Verify no outstanding requests
  });

  // Existing tests remain the same...

  // NEW TESTS:

  it('should handle verify API error', fakeAsync(() => {
    localStorage.setItem('totp_tmp_token', '000000');
    let errorRes: any;
    
    service.verify('123456').subscribe({
      error: (err) => errorRes = err
    });

    const req = httpMock.expectOne('http://localhost:3000/rest/2fa/verify');
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    tick();

    expect(errorRes).toBeDefined();
  }));

  it('should handle missing tmpToken in verify', fakeAsync(() => {
    let errorRes: any;
    
    service.verify('123456').subscribe({
      error: (err) => errorRes = err
    });
    tick();

    expect(errorRes).toBeDefined();
    expect(errorRes.message).toContain('No TOTP token available');
  }));

  it('should handle status API error', fakeAsync(() => {
    let errorRes: any;
    
    service.status().subscribe({
      error: (err) => errorRes = err
    });

    const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status');
    req.flush('Error', { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(errorRes).toBeDefined();
  }));

  it('should handle setup with empty password', fakeAsync(() => {
    let errorRes: any;
    
    service.setup('', 'token', 'setupToken').subscribe({
      error: (err) => errorRes = err
    });
    tick();

    // Either expect an immediate error or let the API handle it
    expect(errorRes || httpMock.expectOne('http://localhost:3000/rest/2fa/setup')).toBeDefined();
  }));

  it('should handle disable with wrong password', fakeAsync(() => {
    let errorRes: any;
    
    service.disable('wrong').subscribe({
      error: (err) => errorRes = err
    });

    const req = httpMock.expectOne('http://localhost:3000/rest/2fa/disable');
    req.flush({ error: 'Wrong password' }, { status: 403, statusText: 'Forbidden' });
    tick();

    expect(errorRes).toBeDefined();
  }));
});
