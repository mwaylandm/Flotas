
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@flotas.com' },
    update: {},
    create: {
      email: 'admin@flotas.com',
      name: 'Admin User',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // Create Operator
  const operator = await prisma.user.upsert({
    where: { email: 'operador@flotas.com' },
    update: {},
    create: {
      email: 'operador@flotas.com',
      name: 'Juan Perez',
      username: 'juan',
      password: hashedPassword,
      role: 'OPERADOR',
    },
  });

  // Create Truck
  const truck = await prisma.truck.upsert({
    where: { placa: 'JPPR-79' },
    update: {},
    create: {
      placa: 'JPPR-79',
      capacidad: 10000,
      estado: 'DISPONIBLE',
      currentLat: -30.196761,
      currentLng: -71.427226,
    },
  });
  
  // Assign Truck to Operator
  await prisma.user.update({
    where: { id: operator.id },
    data: { currentTruckId: truck.id },
  });

  console.log({ admin, operator, truck });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
