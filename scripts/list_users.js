const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      password: true // Inspecting hash prefix
    }
  });
  
  console.log('--- USERS ---');
  users.forEach(u => {
    console.log(`User: ${u.username || 'No Username'} | Email: ${u.email} | Role: ${u.role} | Password Hash: ${u.password.substring(0, 10)}...`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
