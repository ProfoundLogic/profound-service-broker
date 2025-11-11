import path from 'path'
import dotenv from 'dotenv'
import { generate } from '../src/utils/apiKeyUtil'
import AppDataSource from '../src/db/data-source'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  const requiredEnv = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_USER_PWD',
    'DB_NAME',
  ]
  const missingEnv = requiredEnv.filter(name => process.env[name] === undefined)
  if (missingEnv.length > 0) {
    console.error('Missing environment variables:', missingEnv)
    process.exit(1)
  }

  // Get inputs.
  const args = process.argv.slice(-2)
  if (args.length !== 2) {
    console.error('Usage: yarn gen-api-key NOTE EXPIRES')
    process.exit(1)
  }
  const note = args[0]
  const expires = new Date(args[1])

  if (expires === null) {
    console.log(`expires: "${args[1]}" is not valid`)
    return
  }

  await AppDataSource.initialize()

  const apiKey = await generate(note, expires)
  console.log(apiKey)
}

main()
