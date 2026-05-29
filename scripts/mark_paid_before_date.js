const { PrismaClient } = require('@prisma/client');
try { require('dotenv').config(); } catch (_) {}

const prisma = new PrismaClient();

async function main() {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];

  const allowedActions = new Set(['pagado-before', 'comision-unpaid-from']);
  const action = allowedActions.has(arg1) ? arg1 : 'pagado-before';
  const cutoffArg = allowedActions.has(arg1) ? arg2 : arg1;
  const cutoff = cutoffArg ? new Date(cutoffArg) : new Date('2026-03-25T00:00:00.000Z');

  if (isNaN(cutoff.getTime())) {
    console.error('Fecha inválida. Use formato ISO, por ejemplo: 2026-03-25 o 2026-03-25T00:00:00Z');
    process.exit(1);
  }

  if (action === 'pagado-before') {
    const result = await prisma.serviceOrder.updateMany({
      where: {
        fechaProgramada: { lt: cutoff }
      },
      data: {
        pagado: true
      }
    });

    console.log(`Órdenes actualizadas: ${result.count} (pagado = true) con fechaProgramada < ${cutoff.toISOString()}`);
    return;
  }

  const before = await prisma.serviceOrder.count({
    where: { fechaProgramada: { gte: cutoff }, comisionPagada: true }
  });

  const result = await prisma.serviceOrder.updateMany({
    where: { fechaProgramada: { gte: cutoff } },
    data: { comisionPagada: false }
  });

  const after = await prisma.serviceOrder.count({
    where: { fechaProgramada: { gte: cutoff }, comisionPagada: true }
  });

  console.log(`Órdenes actualizadas: ${result.count} (comisionPagada = false) con fechaProgramada >= ${cutoff.toISOString()}`);
  console.log(`Comisiones pagadas en rango antes: ${before}, después: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
