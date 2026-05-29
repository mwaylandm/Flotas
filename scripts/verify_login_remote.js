const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = '123456';

  console.log(`Searching for user: ${username}`);
  
  let user = await prisma.user.findUnique({
    where: { username: username },
  });

  if (!user) {
    console.log('User not found by username. Trying email...');
    // Assuming the username might be an email
    user = await prisma.user.findUnique({
        where: { email: username }
    });
  }

  if (!user) {
    console.log('User NOT FOUND.');
    return;
  }

  console.log('User found:', {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    passwordHash: user.password ? user.password.substring(0, 15) + '...' : 'NULL'
  });

  if (!user.isActive) {
    console.log('WARNING: User is NOT ACTIVE.');
  }

  console.log(`Comparing password '${password}' with hash...`);
  const isValid = await bcrypt.compare(password, user.password);
  
  console.log(`Password valid: ${isValid}`);
  
  if (!isValid) {
      console.log("Generating new hash for '123456' and updating...");
      const newHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
          where: { id: user.id },
          data: { password: newHash }
      });
      console.log("Password updated successfully.");
      
      const checkAgain = await bcrypt.compare(password, newHash);
      console.log(`Double check new hash validity: ${checkAgain}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
