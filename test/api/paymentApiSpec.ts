/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import frisby = require('frisby')

const API_URL = 'http://localhost:3000/api'
const REST_URL = 'http://localhost:3000/rest'

// ==================== 🔐 SECURE TEST CONSTANTS ====================
const TEST_USER = {
  email: 'test-user@juice-sh.op',
  password: 'mock-password-123'
}

const TEST_CARD = {
  valid: {
    fullName: 'Test User',
    cardNum: 4111111111111111, // Test Visa card number
    expMonth: 12,
    expYear: new Date().getFullYear() + 5
  },
  invalid: {
    cardNum: 12345678876543210,
    expMonth: 13,
    expYear: new Date().getFullYear() - 1
  }
}

const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string }
let cardId: number

beforeAll(() => {
  return frisby.post(REST_URL + '/user/login', {
    headers: jsonHeader,
    body: {
      email: TEST_USER.email,
      password: TEST_USER.password
    }
  })
    .expect('status', 200)
    .then(({ json }) => {
      authHeader = { 
        Authorization: 'Bearer ' + json.authentication.token, 
        'content-type': 'application/json' 
      }
    })
})

describe('/api/Cards', () => {
  it('GET all cards is forbidden via public API', () => {
    return frisby.get(API_URL + '/Cards')
      .expect('status', 401)
  })

  it('GET all cards', () => {
    return frisby.get(API_URL + '/Cards', { headers: authHeader })
      .expect('status', 200)
  })

  it('POST new card is forbidden via public API', () => {
    return frisby.post(API_URL + '/Cards', {
      body: TEST_CARD.valid
    })
      .expect('status', 401)
  })

  it('POST new card with all valid fields', () => {
    return frisby.post(API_URL + '/Cards', {
      headers: authHeader,
      body: TEST_CARD.valid
    })
      .expect('status', 201)
  })

  it('POST new card with invalid card number', () => {
    return frisby.post(API_URL + '/Cards', {
      headers: authHeader,
      body: {
        ...TEST_CARD.valid,
        cardNum: TEST_CARD.invalid.cardNum
      }
    })
      .expect('status', 400)
  })

  it('POST new card with invalid expMonth', () => {
    return frisby.post(API_URL + '/Cards', {
      headers: authHeader,
      body: {
        ...TEST_CARD.valid,
        expMonth: TEST_CARD.invalid.expMonth
      }
    })
      .expect('status', 400)
  })

  it('POST new card with invalid expYear', () => {
    return frisby.post(API_URL + '/Cards', {
      headers: authHeader,
      body: {
        ...TEST_CARD.valid,
        expYear: TEST_CARD.invalid.expYear
      }
    })
      .expect('status', 400)
  })
})

describe('/api/Cards/:id', () => {
  beforeAll(() => {
    return frisby.post(API_URL + '/Cards', {
      headers: authHeader,
      body: TEST_CARD.valid
    })
      .expect('status', 201)
      .then(({ json }) => {
        cardId = json.data.id
      })
  })

  it('GET card by id is forbidden via public API', () => {
    return frisby.get(API_URL + '/Cards/' + cardId)
      .expect('status', 401)
  })

  it('PUT update card is forbidden via public API', () => {
    return frisby.put(API_URL + '/Cards/' + cardId, {
      quantity: 2
    }, { json: true })
      .expect('status', 401)
  })

  it('DELETE card by id is forbidden via public API', () => {
    return frisby.del(API_URL + '/Cards/' + cardId)
      .expect('status', 401)
  })

  it('GET card by id', () => {
    return frisby.get(API_URL + '/Cards/' + cardId, { headers: authHeader })
      .expect('status', 200)
  })

  it('PUT update card by id is forbidden via authorized API call', () => {
    return frisby.put(API_URL + '/Cards/' + cardId, {
      headers: authHeader,
      body: {
        fullName: 'Updated Name'
      }
    }, { json: true })
      .expect('status', 401)
  })

  it('DELETE card by id', () => {
    return frisby.del(API_URL + '/Cards/' + cardId, { headers: authHeader })
      .expect('status', 200)
  })
})
