
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data import...');

  const dumpPath = path.join(__dirname, '..', 'data_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('Data dump file not found!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

  // Clean up existing data (optional, but good for clean import)
  console.log('Cleaning up existing data...');
  await prisma.truckLocationLog.deleteMany({});
  await prisma.serviceOrderLog.deleteMany({});
  await prisma.serviceOrder.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.truck.deleteMany({});
  await prisma.user.deleteMany({});

  // Import Users
  console.log(`Importing ${data.users.length} Users...`);
  for (const user of data.users) {
    await prisma.user.create({
      data: {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      }
    });
  }

  // Import Trucks
  console.log(`Importing ${data.trucks.length} Trucks...`);
  for (const truck of data.trucks) {
    await prisma.truck.create({
      data: {
        ...truck,
        lastLocationUpdate: truck.lastLocationUpdate ? new Date(truck.lastLocationUpdate) : null,
        createdAt: new Date(truck.createdAt),
        updatedAt: new Date(truck.updatedAt),
      }
    });
  }

  // Import Clients
  console.log(`Importing ${data.clients.length} Clients...`);
  for (const client of data.clients) {
    await prisma.client.create({
      data: {
        ...client,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt),
      }
    });
  }

  // Import ServiceOrders
  console.log(`Importing ${data.serviceOrders.length} ServiceOrders...`);
  for (const order of data.serviceOrders) {
    await prisma.serviceOrder.create({
      data: {
        ...order,
        fechaProgramada: new Date(order.fechaProgramada),
        fechaCompletada: order.fechaCompletada ? new Date(order.fechaCompletada) : null,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      }
    });
  }

  // Import ServiceOrderLogs
  console.log(`Importing ${data.serviceOrderLogs.length} ServiceOrderLogs...`);
  for (const log of data.serviceOrderLogs) {
    await prisma.serviceOrderLog.create({
      data: {
        ...log,
        timestamp: new Date(log.timestamp),
      }
    });
  }

  // Import TruckLocationLogs
  if (data.truckLocationLogs && data.truckLocationLogs.length > 0) {
    console.log(`Importing ${data.truckLocationLogs.length} TruckLocationLogs...`);
    // Batch insert for logs might be better if there are many
    const batchSize = 100;
    for (let i = 0; i < data.truckLocationLogs.length; i += batchSize) {
        const batch = data.truckLocationLogs.slice(i, i + batchSize);
        await prisma.truckLocationLog.createMany({
            data: batch.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp)
            }))
        });
    }
  }

  console.log('Data import completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
