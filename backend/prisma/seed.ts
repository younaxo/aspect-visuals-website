import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const roles = [
  { discordId: '1541875062208995328', name: 'Owner' },
  { discordId: '1541784961986596874', name: 'Developer' },
  { discordId: '1541875599331561604', name: 'Technical Administrator' },
  { discordId: '1541785126856429568', name: 'Administrator' },
  { discordId: '1541785097374793799', name: 'Chief Moderator' },
  { discordId: '1541785042706235472', name: 'Moderator' },
  { discordId: '1541785160297480243', name: 'Support' },
  { discordId: '1541875642524766290', name: 'Subscriber_Plus' },
  { discordId: '1541790489399791716', name: 'Subscriber' },
  { discordId: '1541869586004058264', name: 'Default' },
]

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { discordId: role.discordId },
      update: { name: role.name },
      create: role,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
