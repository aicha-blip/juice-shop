/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')
import * as security from '../../lib/insecurity'
import { expect } from '@jest/globals'
import config from 'config'

const REST_URL = 'http://localhost:3000/rest'

// ==================== 🔐 SECURE TEST CONSTANTS ====================
const TEST_USERS = {
  admin: {
    email: 'test-admin@juice-sh.op',
    password: 'mock-admin-password-123'
  },
  jim: {
    email: `test-jim@${config.get<string>('application.domain')}`,
    password: 'mock-user-password-456'
  }
}

const jsonHeader = { ContentType: 'application/json' }
const authHeader = { 
  Authorization: `Bearer ${security.authorize({ data: { email: TEST_USERS.admin.email } })}`, 
  'content-type': 'application/json' 
}

describe('/rest/user/authentication-details', () => {
  it('GET all users with password replaced by asterisks', () => {
    return frisby.get(`${REST_URL}/user/authentication-details`, { headers: authHeader })
      .expect('status', 200)
      .expect('json', 'data.?', {
        password: '********************************'
      })
  })

  it('GET returns lastLoginTime for users with active sessions', async () => {
    // First authenticate test user
    await frisby.post(`${REST_URL}/user/login`, {
      headers: jsonHeader,
      body: {
        email: TEST_USERS.jim.email,
        password: TEST_USERS.jim.password
      }
    }).promise()

    // Then check authentication details
    const response = await frisby.get(`${REST_URL}/user/authentication-details`, { headers: authHeader })
      .expect('status', 200)
      .promise()

    const testUser = response.json.data.find((user: any) => user.email === TEST_USERS.jim.email)

    expect(testUser).not.toBe(null)
    expect(testUser.lastLoginTime).toEqual(expect.any(Number))
  })
})
