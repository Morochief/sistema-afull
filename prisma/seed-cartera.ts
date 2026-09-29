/**
 * Seed de la Cartera de Clientes (módulo separado del Cliente operativo).
 *
 * Carga los clientes, marcas y contactos provistos por el cliente de aFull
 * (planilla de contactos comerciales). Normalizaciones aplicadas:
 *  - Correos "N/A", "NO APLICA" o vacíos → null
 *  - Marcas "N/A" omitidas del catálogo
 *  - Cliente con 2 RUC (ACSA S.R.L.) → un solo registro con el RUC más usado
 *  - Contactos duplicados por nombre+cliente → un solo contacto (primer correo)
 *
 * Ejecutar (inyectando DATABASE_URL/DIRECT_URL, Prisma CLI lee .env):
 *   npx tsx prisma/seed-cartera.ts
 */

import { prisma } from '../src/lib/prisma.ts';

function rid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

function normalizeEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const email = raw.trim().replace(/,$/, '');
  if (!email || /^(N\/A|NO APLICA|NO\s+APLICA|n\/a|N\/A,)/i.test(email)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

interface ContactSeed {
  nombre: string;
  cargo?: string;
  email?: string;
  telefono?: string;
}

interface MarcaSeed {
  nombre: string;
}

interface ClienteSeed {
  nombre: string;
  ruc: string;
  marcas: string[];
  contactos: ContactSeed[];
}

const clientes: ClienteSeed[] = [
  {
    nombre: 'Servicios Rapidos del Paraguay',
    ruc: '80014066-4',
    marcas: ['McDonalds'],
    contactos: [
      { nombre: 'Lorena Sosa', email: 'lsosa@mcd.com.py' },
      { nombre: 'Giannina Chamorro', email: 'gchamorro@mcd.com.py' },
      { nombre: 'Cristian Cruz', email: 'cruz@mcd.com.py' },
    ],
  },
  {
    nombre: 'ACSA S.R.L.',
    ruc: '80085244-3',
    marcas: ['Juan Valdez', 'La Cabrera', 'Tonaditas'],
    contactos: [
      { nombre: 'Milagros De Alzáa', email: 'malzaa@grupo-acsa.com.py' },
      { nombre: 'Lourdes Miltos', email: 'ljmiltos@grupo-acsa.com.py' },
      { nombre: 'Laura Roura', email: 'lroura@grupo-acsa.com.py' },
    ],
  },
  {
    nombre: 'Gloria S.A.C.E.I.',
    ruc: '80002010-3',
    marcas: ['Gloria SACEI', 'Tang/Clight', 'Milka', 'Mimosa', 'Kelwa', 'Capitan Cuac', 'Apti', 'Marilan'],
    contactos: [
      { nombre: 'Miguel Seux', email: 'mseux@gloria.com.py' },
      { nombre: 'Alejandra Almiron', email: 'aalmiron@gloria.com.py' },
      { nombre: 'Alejandra Diaz', email: 'adiaz@gloria.com.py' },
      { nombre: 'Yeruti Acuña', email: 'yerutia@gloria.com.py' },
    ],
  },
  {
    nombre: 'Distribuidora Gloria S.A.',
    ruc: '80010138-3',
    marcas: ['Oreo', 'Cerealitas', 'Terrabusi', 'Miller', 'Excellent'],
    contactos: [
      { nombre: 'Tamara Masi', email: 'tamara.masi@distrigloria.com.py' },
      { nombre: 'Amira Bittar', email: 'amira.bittar@distrigloria.com.py' },
      { nombre: 'Astrid Cieplik', email: 'Astrid.cieplik@distrigloria.com.py' },
      { nombre: 'Aniuska Segovia', email: 'aniuska.segovia@distrigloria.com.py' },
      { nombre: 'Nicolas Caballero', email: 'nicolas.caballero@distrigloria.com.py' },
      { nombre: 'Sebastian Escobar', email: 'sebastian.escobar@distrigloria.com.py' },
      { nombre: 'Jiuliana Agüero', email: 'jiuliana.aguero@distrigloria.com.py' },
    ],
  },
  {
    nombre: 'Frutos de los Andes S.R.L',
    ruc: '80032502-8',
    marcas: ['Frutos'],
    contactos: [
      { nombre: 'Renato Arellano', email: 'renatomkt@frutosdelosandes.com.py' },
      { nombre: 'Eugenia', email: 'eugenia@frutosdelosandes.com.py' },
    ],
  },
  {
    nombre: 'Arcorpar S.A.',
    ruc: '80002660-8',
    marcas: ['Facturación', 'Arcor Genérico', 'Bob', 'Topline', 'Mogul', 'Tortuguita', 'Saladix', 'Cofler'],
    contactos: [
      { nombre: 'Facturación', email: 'ugfepar@arcor.com' },
      { nombre: 'Leonardo Alfonso', email: 'lalfonso@arcor.com' },
      { nombre: 'Jorge Ubaldi', email: 'jubaldi@arcor.com' },
      { nombre: 'Claudia Van Humbeck', email: 'cvanhumbec@arcor.com' },
      { nombre: 'Igor Ayala', email: 'exiayala@arcor.com' },
      { nombre: 'Adriana Santacruz', email: 'asantacruz@arcor.com' },
      { nombre: 'Sebastian Rodriguez', cargo: 'Supervisor', email: 'N/A, Supervisor' },
      { nombre: 'Miguel Espinola', email: 'mespinola@arcor.com' },
    ],
  },
  {
    nombre: 'Profarco S.A.',
    ruc: '80002348-0',
    marcas: ['Pedigree', 'Whiskas', 'Betanin', 'Kelloggs', 'Broterra', 'Parmalat', 'Fini', 'Halls', 'Trident', 'Bauducco', 'Facturación'],
    contactos: [
      { nombre: 'Cristina Lopez', email: 'clopez@profarco.com.py' },
      { nombre: 'Maria Grau', email: 'mgrau@profarco.com.py' },
      { nombre: 'Deisy Sanchez', email: 'dsanchez@profarco.com.py' },
      { nombre: 'Gabriel Ovelar', email: 'govelar@profarco.com.py' },
      { nombre: 'Sophia Sarubbi', email: 'ssarubbi@profarco.com.py' },
      { nombre: 'Omar Duarte', email: 'oduarte@profarco.com.py' },
      { nombre: 'Facturación', email: 'factura@profarco.com.py' },
    ],
  },
  {
    nombre: 'La Offi S.A.',
    ruc: '80100201-0',
    marcas: ['Mondelez'],
    contactos: [
      { nombre: 'Ma. Laura Rodrguez', email: 'marialaura.rodriguez@mdlz.com' },
    ],
  },
  {
    nombre: 'Gustavo Cristaldo',
    ruc: '2426481-4',
    marcas: ['Parmalat'],
    contactos: [
      { nombre: 'Gustavo Cristaldo', cargo: 'No se le factura', email: 'N/A' },
    ],
  },
  {
    nombre: 'Aconcagua SA',
    ruc: '80026598-0',
    marcas: ['Head and Shoulders', 'Secret', 'Always', 'Pringles'],
    contactos: [
      { nombre: 'Nahir Navarro', email: 'brand.manager@aconcagua.com.py' },
    ],
  },
  {
    nombre: 'Grupo Santa Rosa S.R.L.',
    ruc: '80005181-5',
    marcas: ['Paletto', 'Quattro D'],
    contactos: [
      { nombre: 'Mirian Cáceres', email: 'trademkt.gsr@gmail.com' },
    ],
  },
  {
    nombre: 'Industrial Delights S.A.E.',
    ruc: '80061506-9',
    marcas: ['Mazzei', 'Dino', 'Cranchis', 'Aventura', 'Puff'],
    contactos: [
      { nombre: 'Gianina Lopez', email: 'analistatrade@indel.com.py' },
    ],
  },
  {
    nombre: 'MG Importadora S.R.L.',
    ruc: '80013360-9',
    marcas: ['Hipopó', 'Dom Bosco', 'Dajuda', 'Si Diet', 'Gota Limpa', 'De la Huerta'],
    contactos: [
      { nombre: 'Lilian Sanchez', email: 'mktbrand1@mgimportadora.com.py' },
      { nombre: 'Karen Araujo', email: 'mktbrand2@mgimportadora.com.py' },
    ],
  },
  {
    nombre: 'Cremasun S.A.',
    ruc: '80028994-3',
    marcas: ['Haggen Dazs', 'Havanna', 'Cabrales'],
    contactos: [
      { nombre: 'Paula Gavilan', email: 'compras@cremasun.com.py' },
    ],
  },
  {
    nombre: 'Gafi S.A.',
    ruc: '80102239-8',
    marcas: ['Ueno', 'Hydrate'],
    contactos: [
      { nombre: 'Carlos Cabral', email: 'NO APLICA' },
      { nombre: 'Manuel Figueredo', email: 'NO APLICA' },
    ],
  },
  {
    nombre: 'Perfecta S.A.',
    ruc: '80015005-8',
    marcas: ['BMW'],
    contactos: [
      { nombre: 'Violeta Lansac', email: 'violeta.lansac@perfecta.com.py' },
    ],
  },
  {
    nombre: 'UPISA',
    ruc: '80021003-4',
    marcas: ['UPISA'],
    contactos: [
      { nombre: 'Adriana Barbosa', email: 'adriana.barbosa@upisa.com.py' },
    ],
  },
];

async function main() {
  let clientesCreados = 0;
  let contactosCreados = 0;
  let marcasCreadas = 0;
  let omitidos = 0;

  for (const c of clientes) {
    // Upsert por RUC (no duplicar si el seed ya corrió)
    let cliente = await prisma.carteraCliente.findUnique({ where: { ruc: c.ruc } });
    if (!cliente) {
      cliente = await prisma.carteraCliente.create({
        data: { id: rid('carcli'), nombre: c.nombre, ruc: c.ruc },
      });
      clientesCreados++;
    } else {
      omitidos++;
    }

    for (const nombreMarca of c.marcas) {
      const existe = await prisma.carteraMarca.findFirst({
        where: { clienteId: cliente.id, nombre: { equals: nombreMarca, mode: 'insensitive' } },
      });
      if (!existe) {
        await prisma.carteraMarca.create({
          data: { id: rid('carmar'), clienteId: cliente.id, nombre: nombreMarca },
        });
        marcasCreadas++;
      }
    }

    for (const contacto of c.contactos) {
      const email = normalizeEmail(contacto.email);
      const existe = await prisma.carteraContacto.findFirst({
        where: { clienteId: cliente.id, nombre: { equals: contacto.nombre, mode: 'insensitive' } },
      });
      if (existe) continue;
      await prisma.carteraContacto.create({
        data: {
          id: rid('carcon'),
          clienteId: cliente.id,
          nombre: contacto.nombre,
          cargo: contacto.cargo || null,
          email,
        },
      });
      contactosCreados++;
    }
  }

  console.log(`[SEED CARTERA] Clientes creados: ${clientesCreados} (omitidos: ${omitidos}) | Contactos: ${contactosCreados} | Marcas: ${marcasCreadas}`);
}

main()
  .catch((e) => {
    console.error('[SEED CARTERA] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
