const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking database connection...');
  try {
    const username = 'admin';
    const email = 'admin@aquaflow.com';
    const password = 'adm';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Checking for user: ${username} / ${email}`);

    // Check by username
    let user = await prisma.user.findUnique({
      where: { username: username },
    });

    if (!user) {
        // Check by email
        user = await prisma.user.findUnique({
            where: { email: email },
        });
    }

    if (user) {
      console.log(`User found (ID: ${user.id}). Updating password...`);
      await prisma.user.update({
        where: { id: user.id },
        data: { 
            password: hashedPassword,
            isActive: true,
            role: 'ADMIN'
        },
      });
      console.log('User updated successfully.');
    } else {
      console.log('User not found. Creating new admin user...');
      await prisma.user.create({
        data: {
          username: username,
          email: email,
          name: 'Administrador',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log('User created successfully.');
    }

    // Verify
    const verifyUser = await prisma.user.findUnique({ where: { username: username } });
    console.log('Verification:', verifyUser ? 'OK' : 'FAIL');

  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
