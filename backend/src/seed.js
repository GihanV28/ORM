import 'dotenv/config'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from './config/prisma.js'

async function seed() {
  const existing = await db.adminUser.findFirst({ where: { email: 'admin@adumculture.com' } })
  if (existing) {
    console.log('Admin user already exists:', existing.email)
    console.log('API Key:', existing.apiKey)
    await db.$disconnect()
    return
  }

  const passwordHash = await bcrypt.hash('Admin@1234', 12)
  const apiKey = crypto.randomBytes(24).toString('hex')

  const admin = await db.adminUser.create({
    data: {
      name: 'Admin',
      email: 'admin@adumculture.com',
      passwordHash,
      role: 'admin',
      businessName: 'Adum Culture',
      apiKey,
    }
  })

  const defaultCategories = ['Sarees', 'Blouses', 'Frocks', 'Tops', 'Accessories', 'Other']
  for (const name of defaultCategories) {
    await db.category.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log('✓ Admin user created')
  console.log('  Email:    admin@adumculture.com')
  console.log('  Password: Admin@1234')
  console.log('  API Key: ', apiKey)
  console.log('✓ Default categories created')

  await db.$disconnect()
}

seed().catch(err => { console.error(err); process.exit(1) })
