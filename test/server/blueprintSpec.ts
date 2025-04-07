import chai = require('chai')
import config from 'config'
import type { Product as ProductConfig } from 'lib/config.types'

import path from 'path'
import { promisify } from 'util'
import sinonChai = require('sinon-chai')
import fs from 'fs'
import ExifParser from 'exif-parser'
const expect = chai.expect
chai.use(sinonChai)

const utils = require('../../lib/utils')
const { pipeline } = require('stream')
const fetch = require('node-fetch')

type ExifData = {
  image: Record<string, unknown>
}

async function parseExifData(imagePath: string): Promise<ExifData> {
  return new Promise((resolve, reject) => {
    try {
      const buffer = fs.readFileSync(imagePath)
      const parser = ExifParser.create(buffer)
      const result = parser.parse()
      resolve({ image: result.tags }) // Match your ExifData type
    } catch (error) {
      reject(error)
    }
  })
}

describe('blueprint', () => {
  const products = config.get<ProductConfig[]>('products')
  const basePathToImage = 'assets/public/images/products/'

  describe('checkExifData', () => {
    it('should contain properties from exifForBlueprintChallenge', async () => {
      for (const product of products) {
        if (product.fileForRetrieveBlueprintChallenge && product.image) {
          let finalPathToImage: string

          try {
            if (utils.isUrl(product.image)) {
              finalPathToImage = path.resolve(
                'frontend/dist/frontend',
                basePathToImage,
                path.basename(product.image)
              )
              const streamPipeline = promisify(pipeline)
              const response = await fetch(product.image)
              if (!response.ok) {
                throw new Error(`Could not download image from ${product.image}`)
              }
              await streamPipeline(response.body, fs.createWriteStream(finalPathToImage))
            } else {
              finalPathToImage = path.resolve('frontend/src', basePathToImage, product.image)
            }

            if (product.exifForBlueprintChallenge?.length) {
              const exifData = await parseExifData(finalPathToImage)
              const properties = Object.values(exifData.image)
              for (const property of product.exifForBlueprintChallenge) {
                expect(properties).to.include(property)
              }
            }
          } catch (error) {
            // Log a detailed error per product
            console.error(`Error processing product "${product.image}":`, error)
            expect.fail(`Failed to validate EXIF data for ${product.image}: ${error}`)
          }
        }
      }
    })
  })
})
