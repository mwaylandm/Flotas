
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const BASE_URL = 'http://52.91.243.25';
const CREDENTIALS_LIST = [
  { user: 'admin@aquaflow.com', pass: 'adm' },
  { user: 'admin', pass: 'adm' },
  { user: 'admin@flotas.com', pass: 'admin123' },
  { user: 'admin', pass: 'admin123' },
  { user: 'operador@flotas.com', pass: 'operador123' }
];

// Helper to handle fetch with cookies
let cookies = '';

async function login(username, password) {
  console.log(`Attempting login with ${username} / ${password}...`);
  cookies = ''; // Reset cookies
  
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  
  // Extract cookies from response
  const setCookie = csrfRes.headers.get('set-cookie');
  if (setCookie) {
    // Handle multiple cookies (basic split, might need better parsing but usually works for next-auth)
    const parts = setCookie.split(', ');
    cookies = parts.map(c => c.split(';')[0]).join('; ');
  }

  const params = new URLSearchParams();
  // Try sending as both 'email' and 'username' just in case, or just email field as configured
  // The provider expects 'email' field name but it can contain username or email
  params.append('email', username); 
  params.append('password', password);
  params.append('csrfToken', csrfToken);
  params.append('json', 'true');

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: params,
    redirect: 'manual'
  });

  // Check for success (usually 200 OK with json: true, or check url not having error)
  if (loginRes.status === 200) {
      const loginSetCookie = loginRes.headers.get('set-cookie');
      if (loginSetCookie) {
        const newCookies = loginSetCookie.split(', ').map(c => c.split(';')[0]).join('; ');
        cookies = `${cookies}; ${newCookies}`;
        console.log('Login successful!');
        return true;
      }
  }
  
  console.log(`Login failed with status ${loginRes.status}`);
  return false;
}

async function fetchData(endpoint) {
  console.log(`Fetching ${endpoint}...`);
  const res = await fetch(`${BASE_URL}/api/${endpoint}`, {
    headers: {
      'Cookie': cookies
    }
  });
  
  if (!res.ok) {
    console.error(`Failed to fetch ${endpoint}: ${res.status} ${res.statusText}`);
    return null;
  }
  
  return await res.json();
}

async function main() {
  try {
    let loggedIn = false;
    for (const cred of CREDENTIALS_LIST) {
        if (await login(cred.user, cred.pass)) {
            loggedIn = true;
            break;
        }
    }

    if (!loggedIn) {
        console.error('All login attempts failed.');
        return;
    }

    // Fetch data
    const users = await fetchData('users') || [];
    const clients = await fetchData('clients') || [];
    const trucks = await fetchData('trucks') || [];
    const orders = await fetchData('service-orders') || [];

    console.log(`Fetched: ${users.length} users, ${clients.length} clients, ${trucks.length} trucks, ${orders.length} orders.`);
    
    // Save to temp file for inspection/backup
    const dump = { users, clients, trucks, orders };
    fs.writeFileSync('remote_dump.json', JSON.stringify(dump, null, 2));

    // Seed Database
    console.log('Resetting and seeding database...');
    
    // Clean existing data (Order matters due to foreign keys)
    // We will use prisma.$transaction for safety or just sequential delete
    // Since we are "overwriting", we delete everything.
    
    // Note: We need to handle relations carefully.
    // Order: ServiceOrderLog -> ServiceOrder -> Client, Truck, User
    // TruckLocationLog -> Truck, User
    
    await prisma.serviceOrderLog.deleteMany({});
    await prisma.truckLocationLog.deleteMany({});
    await prisma.serviceOrder.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.truck.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('Database cleared.');

    const defaultPassword = await bcrypt.hash('123456', 10);
    const adminPassword = await bcrypt.hash('adm', 10);

    // 1. Users
    // Map remote user to local schema
    // Remote might have different fields, check logs if it fails
    for (const u of users) {
      let password = defaultPassword;
      // Keep admin password as 'adm' if it's the admin user we used
      if (u.email === 'admin@aquaflow.com' || u.username === 'admin') {
          password = adminPassword;
      }

      await prisma.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          username: u.username,
          password: password, 
          role: u.role,
          isActive: u.isActive ?? true,
          // currentTruckId might be missing in remote or not matching local logic yet
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt)
        }
      }).catch(e => console.error(`Error creating user ${u.email}:`, e.message));
    }
    console.log('Users imported.');

    // 2. Trucks
    for (const t of trucks) {
      await prisma.truck.create({
        data: {
          id: t.id,
          placa: t.placa,
          capacidad: t.capacidad,
          cargaActual: t.cargaActual,
          estado: t.estado,
          currentLat: t.currentLat || 0,
          currentLng: t.currentLng || 0,
          currentHeading: t.currentHeading || 0,
          currentSpeed: t.currentSpeed || 0,
          lastLocationUpdate: t.lastLocationUpdate ? new Date(t.lastLocationUpdate) : null,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        }
      }).catch(e => console.error(`Error creating truck ${t.placa}:`, e.message));
    }
    console.log('Trucks imported.');

    // 3. Clients
    for (const c of clients) {
      await prisma.client.create({
        data: {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono || "",
          direccion: c.direccion || "",
          latitud: c.latitud || 0,
          longitud: c.longitud || 0,
          tipoFosa: c.tipoFosa || "SEPTICA",
          tipoCliente: c.tipoCliente || "PERSONA_NATURAL",
          rut: c.rut,
          observaciones: c.observaciones,
          volumen: c.volumen || 0,
          precio: c.precio || 0,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }
      }).catch(e => console.error(`Error creating client ${c.nombre}:`, e.message));
    }
    console.log('Clients imported.');

    // 4. Service Orders
    for (const o of orders) {
        // Ensure relations exist
        const truckExists = trucks.find(t => t.id === o.truckId);
        const clientExists = clients.find(c => c.id === o.clientId);
        
        if (!truckExists || !clientExists) {
            console.warn(`Skipping order ${o.id} due to missing truck or client.`);
            continue;
        }

        await prisma.serviceOrder.create({
            data: {
                id: o.id,
                truckId: o.truckId,
                clientId: o.clientId,
                volumen: o.volumen,
                precio: o.precio,
                comision: o.comision,
                comisionPagada: o.comisionPagada ?? false,
                progreso: o.progreso,
                formaPago: o.formaPago || "EFECTIVO",
                pagado: o.pagado ?? false,
                referencia: o.referencia,
                fechaProgramada: new Date(o.fechaProgramada),
                fechaCompletada: o.fechaCompletada ? new Date(o.fechaCompletada) : null,
                observaciones: o.observaciones,
                
                // Snapshot fields
                telefono: o.telefono,
                direccion: o.direccion,
                latitud: o.latitud,
                longitud: o.longitud,
                tipoFosa: o.tipoFosa,
                
                createdAt: new Date(o.createdAt),
                updatedAt: new Date(o.updatedAt)
            }
        }).catch(e => console.error(`Error creating order ${o.id}:`, e.message));
    }
    console.log('Orders imported.');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
