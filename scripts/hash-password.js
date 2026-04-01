import { hashPassword } from '../src/lib/security.js'

const values = ['Demo123!', 'Family3481!', 'Family5520!']
for (const value of values) {
  console.log(`${value}: ${hashPassword(value)}`)
}
