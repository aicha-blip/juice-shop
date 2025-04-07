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

const TEST_ADDRESS = {
  valid: {
    fullName: 'Test User',
    mobileNum: '9800000000',
    zipCode: 'NX 101',
    streetAddress: 'Test Street',
    city: 'Test City',
    state: 'TS',
    country: 'Test Country'
  },
  invalid: {
    zipCode: 'NX 10111111',
    mobileNum: '10000000000'
  }
}

const jsonHeader = { 'content-type': 'application/json' }
let authHeader: { Authorization: string, 'content-type': string }
let addressId: string

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

describe('/api/Addresss', () => {
  it('GET all addresses is forbidden via public API', () => {
    return frisby.get(API_URL + '/Addresss')
      .expect('status', 401)
  })

  it('GET all addresses', () => {
    return frisby.get(API_URL + '/Addresss', { headers: authHeader })
      .expect('status', 200)
  })

  it('POST new address with all valid fields', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: TEST_ADDRESS.valid
    })
      .expect('status', 201)
  })

  it('POST new address with invalid pin code', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        ...TEST_ADDRESS.valid,
        zipCode: TEST_ADDRESS.invalid.zipCode
      }
    })
      .expect('status', 400)
  })

  it('POST new address with invalid mobile number', () => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: {
        ...TEST_ADDRESS.valid,
        mobileNum: TEST_ADDRESS.invalid.mobileNum
      }
    })
      .expect('status', 400)
  })

  it('POST new address is forbidden via public API', () => {
    return frisby.post(API_URL + '/Addresss', {
      body: TEST_ADDRESS.valid
    })
      .expect('status', 401)
  })
})

describe('/api/Addresss/:id', () => {
  beforeAll(() => {
    return frisby.post(API_URL + '/Addresss', {
      headers: authHeader,
      body: TEST_ADDRESS.valid
    })
      .expect('status', 201)
      .then(({ json }) => {
        addressId = json.data.id
      })
  })

  it('GET address by id is forbidden via public API', () => {
    return frisby.get(API_URL + '/Addresss/' + addressId)
      .expect('status', 401)
  })

  it('PUT update address is forbidden via public API', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      quantity: 2
    }, { json: true })
      .expect('status', 401)
  })

  it('DELETE address by id is forbidden via public API', () => {
    return frisby.del(API_URL + '/Addresss/' + addressId)
      .expect('status', 401)
  })

  it('GET address by id', () => {
    return frisby.get(API_URL + '/Addresss/' + addressId, { headers: authHeader })
      .expect('status', 200)
  })

  it('PUT update address by id', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        fullName: 'Updated Name'
      }
    }, { json: true })
      .expect('status', 200)
      .expect('json', 'data', { fullName: 'Updated Name' })
  })

  it('PUT update address by id with invalid mobile number is forbidden', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        mobileNum: TEST_ADDRESS.invalid.mobileNum
      }
    }, { json: true })
      .expect('status', 400)
  })

  it('PUT update address by id with invalid pin code is forbidden', () => {
    return frisby.put(API_URL + '/Addresss/' + addressId, {
      headers: authHeader,
      body: {
        zipCode: TEST_ADDRESS.invalid.zipCode
      }
    }, { json: true })
      .expect('status', 400)
  })

  it('DELETE address by id', () => {
    return frisby.del(API_URL + '/Addresss/' + addressId, { headers: authHeader })
      .expect('status', 200)
  })
})
