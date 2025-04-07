/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing'
import { TranslateModule } from '@ngx-translate/core'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatCardModule } from '@angular/material/card'
import { MatInputModule } from '@angular/material/input'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { MatTooltipModule } from '@angular/material/tooltip'
import { of, throwError } from 'rxjs'
import { CookieModule } from 'ngy-cookie'

import { OAuthComponent } from './oauth.component'
import { LoginComponent } from '../login/login.component'
import { UserService } from '../Services/user.service'

describe('OAuthComponent', () => {
  let component: OAuthComponent
  let fixture: ComponentFixture<OAuthComponent>
  let userService: jasmine.SpyObj<UserService>

  // ✅ Test Constants
  const TEST_EMAIL = 'test@juice-sh.op'
  const TEST_REVERSED_PASSWORD = 'bW9jLnRzZXRAdHNldA==' // Base64 encoded 'moc.tset@tset'
  const TEST_OAUTH_TOKEN = 'mock-oauth-token-123'

  beforeEach(waitForAsync(() => {
    userService = jasmine.createSpyObj('UserService', ['oauthLogin', 'login', 'save'])
    userService.oauthLogin.and.returnValue(of({ email: TEST_EMAIL }))
    userService.login.and.returnValue(of({}))
    userService.save.and.returnValue(of({}))
    userService.isLoggedIn = jasmine.createSpyObj('isLoggedIn', ['next'])
    userService.isLoggedIn.next.and.returnValue({})

    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'login', component: LoginComponent }
        ]),
        ReactiveFormsModule,
        CookieModule.forRoot(),
        TranslateModule.forRoot(),
        MatInputModule,
        MatIconModule,
        MatCardModule,
        MatFormFieldModule,
        MatCheckboxModule,
        HttpClientTestingModule,
        MatTooltipModule,
        OAuthComponent, 
        LoginComponent
      ],
      providers: [
        { 
          provide: ActivatedRoute, 
          useValue: { 
            snapshot: { 
              data: { 
                params: `?alt=json&access_token=${TEST_OAUTH_TOKEN}` 
              } 
            } 
          } 
        },
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(OAuthComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('removes authentication token and basket id on failed OAuth login attempt', fakeAsync(() => {
    userService.oauthLogin.and.returnValue(throwError(() => new Error('Mock OAuth Error')))
    component.ngOnInit()
    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('bid')).toBeNull()
  }))

  it('creates regular user account with base64 encoded reversed email as password', fakeAsync(() => {
    userService.oauthLogin.and.returnValue(of({ email: TEST_EMAIL }))
    component.ngOnInit()
    expect(userService.save).toHaveBeenCalledWith({ 
      email: TEST_EMAIL, 
      password: TEST_REVERSED_PASSWORD, 
      passwordRepeat: TEST_REVERSED_PASSWORD 
    })
  }))

  it('logs in user after failed account creation (account may exist from previous OAuth)', fakeAsync(() => {
    userService.oauthLogin.and.returnValue(of({ email: TEST_EMAIL }))
    userService.save.and.returnValue(throwError(() => ({ error: 'Account already exists' })))
    component.ngOnInit()
    expect(userService.login).toHaveBeenCalledWith({ 
      email: TEST_EMAIL, 
      password: TEST_REVERSED_PASSWORD, 
      oauth: true 
    })
  }))

  it('removes auth tokens on failed subsequent login attempt', fakeAsync(() => {
    userService.login.and.returnValue(throwError(() => new Error('Mock Login Error')))
    component.login({ email: TEST_EMAIL })
    expect(localStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('bid')).toBeNull()
  }))
})
