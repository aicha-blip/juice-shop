/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing';
import { TwoFactorAuthService } from './two-factor-auth-service';

describe('TwoFactorAuthService', () => {
  // ✅ 1. Replace hardcoded passwords with a mock constant
  const MOCK_PASSWORD = 'test-only-password'; // Clearly fake, not a real secret
  const MOCK_TOTP_TOKEN = '123456';
  const MOCK_TMP_TOKEN = '000000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TwoFactorAuthService]
    });
  });

  it('should be created', inject([TwoFactorAuthService], (service: TwoFactorAuthService) => {
    expect(service).toBeTruthy();
  }));

  it('should verify TOTP token via the REST API', inject(
    [TwoFactorAuthService, HttpTestingController],
    fakeAsync((service: TwoFactorAuthService, httpMock: HttpTestingController) => {
      localStorage.setItem('totp_tmp_token', MOCK_TMP_TOKEN);
      let res: any;
      service.verify(MOCK_TOTP_TOKEN).subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/verify');
      req.flush({ authentication: 'apiResponse' });
      tick();

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        tmpToken: MOCK_TMP_TOKEN,
        totpToken: MOCK_TOTP_TOKEN
      });
      expect(res).toBe('apiResponse');
      httpMock.verify();
    })
  ));

  it('should retrieve 2FA status via the REST API', inject(
    [TwoFactorAuthService, HttpTestingController],
    fakeAsync((service: TwoFactorAuthService, httpMock: HttpTestingController) => {
      let res: any;
      service.status().subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status');
      req.flush({ setup: false });
      tick();

      expect(req.request.method).toBe('GET');
      expect(req.request.params.toString()).toBeFalsy();
      expect(res).toEqual({ setup: false });
      httpMock.verify();
    })
  ));

  it('should set up 2FA via the REST API', inject(
    [TwoFactorAuthService, HttpTestingController],
    fakeAsync((service: TwoFactorAuthService, httpMock: HttpTestingController) => {
      let res: any;
      service.setup(MOCK_PASSWORD, 'initialToken', 'setupToken').subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/setup');
      req.flush({});
      tick();

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        password: MOCK_PASSWORD, // ✅ No hardcoded secret
        initialToken: 'initialToken',
        setupToken: 'setupToken'
      });
      expect(res).toBe(undefined);
      httpMock.verify();
    })
  ));

  it('should disable 2FA via the REST API', inject(
    [TwoFactorAuthService, HttpTestingController],
    fakeAsync((service: TwoFactorAuthService, httpMock: HttpTestingController) => {
      let res: any;
      service.disable(MOCK_PASSWORD).subscribe((data) => (res = data));

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/disable');
      req.flush({});
      tick();

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ password: MOCK_PASSWORD }); // ✅ No hardcoded secret
      expect(res).toBe(undefined);
      httpMock.verify();
    })
  ));
});
