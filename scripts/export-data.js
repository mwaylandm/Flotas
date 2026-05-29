
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data export...');

  const data = {};

  // Independent models
  console.log('Exporting Users...');
  data.users = await prisma.user.findMany();
  
  console.log('Exporting Trucks...');
  data.trucks = await prisma.truck.findMany();
  
  console.log('Exporting Clients...');
  data.clients = await prisma.client.findMany();

  // Dependent models
  console.log('Exporting ServiceOrders...');
  data.serviceOrders = await prisma.serviceOrder.findMany();

  console.log('Exporting ServiceOrderLogs...');
  data.serviceOrderLogs = await prisma.serviceOrderLog.findMany();

  console.log('Exporting TruckLocationLogs...');
  // This table might be large, but for migration purposes we dump it all.
  // If it's huge, we might need chunking, but for now let's assume it fits in memory.
  data.truckLocationLogs = await prisma.truckLocationLog.findMany();

  const dumpPath = path.join(__dirname, '..', 'data_dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(data, null, 2));
  
  console.log(`Data exported successfully to ${dumpPath}`);
  
  // Print summary
  Object.keys(data).forEach(key => {
    console.log(`${key}: ${data[key].length} records`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
