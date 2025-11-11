import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { ApiKey } from '../db/entities/api-key.entity'
import AppDataSource from '../db/data-source'

const RANDOM_BYTES_LENGTH = 72
const HASH_ROUNDS = 12

const API_KEY_PREFIX = 'broker_api_'

export async function validate(apiKey: string): Promise<boolean> {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return false
  }

  let decoded
  try {
    decoded = Buffer.from(
      base64Decode(apiKey.replace(`^${API_KEY_PREFIX}`, '')),
    )
  } catch {
    return false
  }

  if (decoded.length < 16) {
    return false
  }

  let uuid = decoded.subarray(0, 16).toString('hex')
  uuid = `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20)}`

  const apiKeyRepository = AppDataSource.getRepository(ApiKey)
  const apiKeyEntry = await apiKeyRepository.findOne({
    where: { uuid },
  })

  if (apiKeyEntry === null) {
    return false
  }

  const randomBytes = decoded.subarray(16)
  if (!(await bcrypt.compare(randomBytes, apiKeyEntry.hash))) {
    return false
  }

  return true
}

export async function generate(note: string, expires: Date): Promise<string> {
  const uuid = crypto.randomUUID()
  const uuidBytes = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString()

  const randomBytes = crypto.randomBytes(RANDOM_BYTES_LENGTH)
  const hash = await bcrypt.hash(randomBytes, HASH_ROUNDS)

  const apiKeyRepository = AppDataSource.getRepository(ApiKey)
  const apiKeyEntity = getApiKeyEntity(uuid, hash, note, expires)
  await apiKeyRepository.save(apiKeyEntity)

  return API_KEY_PREFIX + base64Encode(uuidBytes + hash)
}

function base64Encode(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64Decode(value: string) {
  value = value.replace(/-/g, '+').replace(/_/g, '/')
  const amountToAdd = (4 - (value.length % 4)) % 4
  value = value.padEnd(value.length + amountToAdd, '=')
  return atob(value)
}

function getApiKeyEntity(
  uuid: string,
  hash: string,
  note: string,
  expires: Date,
): ApiKey {
  const apiKey = new ApiKey()
  apiKey.uuid = uuid
  apiKey.hash = hash
  apiKey.note = note
  apiKey.expires = expires
  return apiKey
}
