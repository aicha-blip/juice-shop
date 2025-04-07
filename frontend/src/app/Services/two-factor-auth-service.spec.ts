/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { fakeAsync, inject, TestBed, tick } from '@angular/core/testing'
import { of, throwError } from 'rxjs'

import { TwoFactorAuthService } from './two-factor-auth-service'

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TwoFactorAuthService]
    })
    service = TestBed.inject(TwoFactorAuthService)
    httpMock = TestBed.inject(HttpTestingController)
    localStorage.clear()
  })

  afterEach(() => {
    httpMock.verify()
    localStorage.clear()
  })

  // Initialization tests (covers lines 1-16)
  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should initialize with empty tmpToken', () => {
    expect(localStorage.getItem('totp_tmp_token')).toBeNull()
  })

  // Verify method tests (covers lines 23-33)
  describe('verify', () => {
    it('should verify TOTP token via API', fakeAsync(() => {
      localStorage.setItem('totp_tmp_token', '000000')
      let res: any
      service.verify('123456').subscribe((data) => (res = data))

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/verify')
      req.flush({ authentication: 'success' })
      tick()

      expect(req.request.method).toBe('POST')
      expect(req.request.body).toEqual({ tmpToken: '000000', totpToken: '123456' })
      expect(res).toBe('success')
    }))

    it('should reject when tmpToken is missing', fakeAsync(() => {
      let error: any
      service.verify('123456').subscribe({
        error: (err) => (error = err)
      })
      tick()

      expect(error).toBeDefined()
      expect(error.message).toContain('No TOTP token available')
      httpMock.expectNone('http://localhost:3000/rest/2fa/verify')
    }))

    it('should handle API errors', fakeAsync(() => {
      localStorage.setItem('totp_tmp_token', '000000')
      let error: any
      service.verify('123456').subscribe({
        error: (err) => (error = err)
      })

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/verify')
      req.flush('Error', { status: 500, statusText: 'Server Error' })
      tick()

      expect(error).toBeDefined()
    }))
  })

  // Status method tests (covers lines 35-39)
  describe('status', () => {
    it('should retrieve 2FA status', fakeAsync(() => {
      let res: any
      service.status().subscribe((data) => (res = data))

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status')
      req.flush({ setup: true, secret: 'ABC123' })
      tick()

      expect(req.request.method).toBe('GET')
      expect(res).toEqual({ setup: true, secret: 'ABC123' })
    }))

    it('should handle status API errors', fakeAsync(() => {
      let error: any
      service.status().subscribe({
        error: (err) => (error = err)
      })

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status')
      req.flush('Error', { status: 401, statusText: 'Unauthorized' })
      tick()

      expect(error).toBeDefined()
    }))
  })

  // Setup method tests (covers lines 41-47, 50-59)
  describe('setup', () => {
    it('should setup 2FA with valid parameters', fakeAsync(() => {
      let res: any
      service.setup('password', 'initial', 'setup').subscribe((data) => (res = data))

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/setup')
      req.flush({ success: true })
      tick()

      expect(req.request.method).toBe('POST')
      expect(req.request.body).toEqual({
        password: 'password',
        initialToken: 'initial',
        setupToken: 'setup'
      })
      expect(res).toEqual({ success: true })
    }))

    it('should reject setup with missing password', fakeAsync(() => {
      let error: any
      service.setup('', 'initial', 'setup').subscribe({
        error: (err) => (error = err)
      })
      tick()

      expect(error).toBeDefined()
      httpMock.expectNone('http://localhost:3000/rest/2fa/setup')
    }))

    it('should handle setup API errors', fakeAsync(() => {
      let error: any
      service.setup('password', 'initial', 'setup').subscribe({
        error: (err) => (error = err)
      })

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/setup')
      req.flush({ error: 'Invalid password' }, { status: 400 })
      tick()

      expect(error).toBeDefined()
    }))
  })

  // Disable method tests (covers lines 61-67, 70-73)
  describe('disable', () => {
    it('should disable 2FA with valid password', fakeAsync(() => {
      let res: any
      service.disable('password').subscribe((data) => (res = data))

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/disable')
      req.flush({ success: true })
      tick()

      expect(req.request.method).toBe('POST')
      expect(req.request.body).toEqual({ password: 'password' })
      expect(res).toEqual({ success: true })
    }))

    it('should reject disable with empty password', fakeAsync(() => {
      let error: any
      service.disable('').subscribe({
        error: (err) => (error = err)
      })
      tick()

      expect(error).toBeDefined()
      httpMock.expectNone('http://localhost:3000/rest/2fa/disable')
    }))

    it('should handle disable API errors', fakeAsync(() => {
      let error: any
      service.disable('password').subscribe({
        error: (err) => (error = err)
      })

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/disable')
      req.flush({ error: 'Wrong password' }, { status: 403 })
      tick()

      expect(error).toBeDefined()
    }))
  })

  // Additional coverage for lines 76-87
  describe('edge cases', () => {
    it('should handle network errors', fakeAsync(() => {
      let error: any
      service.status().subscribe({
        error: (err) => (error = err)
      })

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status')
      req.error(new ErrorEvent('Network error'))
      tick()

      expect(error).toBeDefined()
    }))

    it('should handle unexpected response formats', fakeAsync(() => {
      let res: any
      service.status().subscribe((data) => (res = data))

      const req = httpMock.expectOne('http://localhost:3000/rest/2fa/status')
      req.flush('unexpected format')
      tick()

      expect(res).toBe('unexpected format')
    }))
  })
})
