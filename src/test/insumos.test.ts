// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cargarInsumosDesdeExcel } from '../server/routes/insumos.routes.ts';

describe('Servicio de Insumos desde insumos.xlsx', () => {
  it('carga correctamente los 261 registros de insumos.xlsx', () => {
    const { insumos, categorias } = cargarInsumosDesdeExcel();

    expect(insumos.length).toBeGreaterThanOrEqual(250);
    expect(categorias.length).toBeGreaterThan(5);
    expect(categorias).toContain('Impresiones');
    expect(categorias).toContain('Laser');
    expect(categorias).toContain('Carpinteria');
  });

  it('empareja correctamente las tarifas de impresión y desperdicio (ej. Serimax y Altatec)', () => {
    const { insumos } = cargarInsumosDesdeExcel();

    // Buscar Serimax
    const serimaxImp = insumos.find(i => /lona.*impresi.*serimax/i.test(i.nombre));
    expect(serimaxImp).toBeDefined();
    expect(serimaxImp?.costo).toBe(63000);
    // Debe haber emparejado la tarifa de desperdicio de Serimax (15.500)
    expect(serimaxImp?.costoDesperdicio).toBe(15500);

    // Buscar Altatec
    const altatecImp = insumos.find(i => /lona.*impresi.*altatec/i.test(i.nombre));
    expect(altatecImp).toBeDefined();
    expect(altatecImp?.costo).toBe(85000);
    expect(altatecImp?.costoDesperdicio).toBe(38000);
  });

  it('clasifica lonas e impresiones con banderas booleanas', () => {
    const { insumos } = cargarInsumosDesdeExcel();

    const lonas = insumos.filter(i => i.esLona);
    expect(lonas.length).toBeGreaterThanOrEqual(5);

    for (const lona of lonas) {
      expect(lona.nombre.toLowerCase()).toContain('lona');
    }
  });

  it('siembra e interactúa correctamente con la base de datos PostgreSQL (Prisma)', async () => {
    const { seedInsumosIfEmpty, formatInsumoDb } = await import('../server/routes/insumos.routes.ts');
    const { prisma } = await import('../lib/prisma.ts');

    await seedInsumosIfEmpty();

    const count = await prisma.insumo.count();
    expect(count).toBeGreaterThanOrEqual(250);

    // Consultar una muestra
    const muestra = await prisma.insumo.findFirst({
      where: { nombre: { contains: 'Serimax', mode: 'insensitive' } }
    });
    expect(muestra).toBeDefined();
    expect(muestra?.nombre).toContain('Serimax');

    // Verificar formateo
    const formateado = formatInsumoDb(muestra);
    expect(typeof formateado.costo).toBe('number');
    expect(formateado.activo).toBe(true);
  }, 20000);
});

describe('Insumos API CRUD (Supertest)', () => {
  let adminCookie: string;
  let csrfToken: string;
  let sessionCookie: string;
  let createdInsumoId: string;

  beforeAll(async () => {
    const { generateToken } = await import('../../server-auth.ts');
    const token = generateToken({
      usuario: 'admin',
      nombre: 'Administrador',
      rol: 'Admin'
    });
    adminCookie = `jwt=${token}`;

    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const csrfRes = await request(app).get('/api/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    const rawCookies = (csrfRes.headers['set-cookie'] || []) as string[];
    const sessionCookieMatch = rawCookies.find((c: string) => c.startsWith('sessionId='));
    sessionCookie = sessionCookieMatch ? sessionCookieMatch.split(';')[0] : '';
  });

  it('GET /api/insumos - obtiene insumos desde PostgreSQL', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .get('/api/insumos')
      .set('Cookie', [adminCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.origen).toBe('POSTGRESQL');
    expect(res.body.data.insumos.length).toBeGreaterThanOrEqual(250);
  }, 20000);

  it('POST /api/insumos - rechaza creación sin token CSRF (403)', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .post('/api/insumos')
      .set('Cookie', [adminCookie])
      .send({
        nombre: 'Material Test CSRF',
        categoria: 'Impresiones',
        costo: 50000,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('POST /api/insumos - crea nuevo insumo con CSRF (201)', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .post('/api/insumos')
      .set('Cookie', [adminCookie, sessionCookie])
      .set('x-csrf-token', csrfToken)
      .send({
        nombre: 'Lona Blackout 500g Test',
        categoria: 'Impresiones',
        proveedor: 'Proveedor Test S.A.',
        unidad: 'm2',
        costo: 75000,
        costoDesperdicio: 25000,
        esLona: true,
        esImpresion: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nombre).toBe('Lona Blackout 500g Test');
    expect(res.body.data.costo).toBe(75000);
    createdInsumoId = res.body.data.id;
  });

  it('PUT /api/insumos/:id - actualiza precio y datos del insumo (200)', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .put(`/api/insumos/${createdInsumoId}`)
      .set('Cookie', [adminCookie, sessionCookie])
      .set('x-csrf-token', csrfToken)
      .send({
        costo: 82000,
        costoDesperdicio: 28000,
        proveedor: 'Proveedor Actualizado',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.costo).toBe(82000);
    expect(res.body.data.proveedor).toBe('Proveedor Actualizado');
  });

  it('DELETE /api/insumos/:id - desactiva el insumo (toggle soft delete)', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .delete(`/api/insumos/${createdInsumoId}`)
      .set('Cookie', [adminCookie, sessionCookie])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activo).toBe(false);
  });

  it('DELETE /api/insumos/:id?hard=true - elimina permanentemente el insumo de prueba', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .delete(`/api/insumos/${createdInsumoId}?hard=true`)
      .set('Cookie', [adminCookie, sessionCookie])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(true);
  });
});

describe('Protección de Precios para Operarios (Eduardo vs Admin)', () => {
  let operarioCookie: string;
  let adminCookie: string;
  let csrfToken: string;
  let sessionCookie: string;
  let testClientId: string;
  let testProjectId: string;
  let createdRegistroId: string;

  beforeAll(async () => {
    const { generateToken } = await import('../../server-auth.ts');
    const tokenOperario = generateToken({
      usuario: 'eduardo',
      nombre: 'Eduardo Méndez',
      rol: 'Operario'
    });
    operarioCookie = `jwt=${tokenOperario}`;

    const tokenAdmin = generateToken({
      usuario: 'admin',
      nombre: 'Administrador',
      rol: 'Admin'
    });
    adminCookie = `jwt=${tokenAdmin}`;

    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const csrfRes = await request(app).get('/api/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    const rawCookies = (csrfRes.headers['set-cookie'] || []) as string[];
    const sessionCookieMatch = rawCookies.find((c: string) => c.startsWith('sessionId='));
    sessionCookie = sessionCookieMatch ? sessionCookieMatch.split(';')[0] : '';

    const { prisma } = await import('../lib/prisma.ts');
    let cli = await prisma.cliente.findFirst();
    if (!cli) {
      cli = await prisma.cliente.create({
        data: { id: 'cli_ins_test', codigo: 'CLI_INS_TEST', nombre: 'Cliente Test Insumos' }
      });
    }
    testClientId = cli.id;

    let proj = await prisma.proyecto.findFirst({ where: { clienteId: testClientId } });
    if (!proj) {
      proj = await prisma.proyecto.create({
        data: { id: 'pro_ins_test', nombre: 'Proyecto Test Insumos', clienteId: testClientId, fechaInicio: new Date() }
      });
    }
    testProjectId = proj.id;
  });

  it('esUsuarioOperario identifica correctamente roles de operario', async () => {
    const { esUsuarioOperario } = await import('../server/routes/insumos.routes.ts');

    expect(esUsuarioOperario({ rol: 'Operario' })).toBe(true);
    expect(esUsuarioOperario({ rol: 'OPERADOR' })).toBe(true);
    expect(esUsuarioOperario({ rol: 'Operador_Taller' })).toBe(true);
    expect(esUsuarioOperario({ rol: 'Admin' })).toBe(false);
    expect(esUsuarioOperario({ rol: 'ADMIN' })).toBe(false);
    expect(esUsuarioOperario({ rol: 'Visor' })).toBe(false);
    expect(esUsuarioOperario(null)).toBe(false);
    expect(esUsuarioOperario(undefined)).toBe(false);
  });

  it('formatInsumoDb enmascara costos cuando isOperario es true', async () => {
    const { formatInsumoDb } = await import('../server/routes/insumos.routes.ts');

    const fakeItem = {
      id: 'ins_1',
      nombre: 'Lona x m (impresión) Serimax',
      costo: 63000,
      costoDesperdicio: 15500,
      unidad: 'm',
      categoria: 'Impresiones',
      proveedor: 'Serimax',
      esLona: true,
      esImpresion: true,
      activo: true
    };

    // Para Admin (isOperario = false): debe conservar los precios
    const adminView = formatInsumoDb(fakeItem, false);
    expect(adminView.costo).toBe(63000);
    expect(adminView.costoDesperdicio).toBe(15500);

    // Para Operario (isOperario = true): debe enmascarar costos a 0 y undefined
    const operarioView = formatInsumoDb(fakeItem, true);
    expect(operarioView.costo).toBe(0);
    expect(operarioView.costoDesperdicio).toBeUndefined();
    expect(operarioView.nombre).toBe('Lona x m (impresión) Serimax');
    expect(operarioView.unidadMedida).toBe('m');
  });

  it('GET /api/insumos con sesión de Operario enmascara todos los costos (costo=0)', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .get('/api/insumos')
      .set('Cookie', [operarioCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const insumos: any[] = res.body.data.insumos;
    expect(insumos.length).toBeGreaterThan(0);

    // Verificar que NINGÚN insumo tenga costo > 0 ni costoDesperdicio definido
    for (const ins of insumos) {
      expect(ins.costo).toBe(0);
      expect(ins.costoDesperdicio).toBeUndefined();
    }
  }, 20000);

  it('GET /api/insumos/lonas con sesión de Operario enmascara costos', async () => {
    const { app } = await import('../../server.ts');
    const request = (await import('supertest')).default;

    const res = await request(app)
      .get('/api/insumos/lonas')
      .set('Cookie', [operarioCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const lonas: any[] = res.body.data;
    expect(lonas.length).toBeGreaterThan(0);

    for (const lona of lonas) {
      expect(lona.costo).toBe(0);
      expect(lona.costoDesperdicio).toBeUndefined();
    }
  }, 20000);

  it('POST /api/registros resuelve automáticamente el costo en DB cuando el Operario envía precio=0', async () => {
    const { app } = await import('../../server.ts');
    const { prisma } = await import('../lib/prisma.ts');
    const request = (await import('supertest')).default;

    // Eduardo envía un corte de 2 m² de Lona Serimax con precio 0 (porque no ve precios)
    const res = await request(app)
      .post('/api/registros')
      .set('Cookie', [operarioCookie, sessionCookie])
      .set('x-csrf-token', csrfToken)
      .send({
        clienteId: testClientId,
        proyectoId: testProjectId,
        concepto: 'Insumo',
        descripcion: 'Lona x m (impresión) Serimax — Impresión Neta (2.000 m²)',
        cantidad: 2,
        precioUnitario: 0,
        total: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // La respuesta devuelta a Eduardo no expone precios confidenciales
    expect(res.body.data.precioUnitario).toBe(0);
    expect(res.body.data.total).toBe(0);
    createdRegistroId = res.body.data.id;

    // En la base de datos PostgreSQL, el registro tiene el impacto financiero exacto (tarifa 63.000)
    const dbRegistro = await prisma.registro.findUnique({
      where: { id: createdRegistroId }
    });
    expect(dbRegistro).toBeDefined();
    expect(Number(dbRegistro?.precioUnitario)).toBe(63000);
    expect(Number(dbRegistro?.total)).toBe(126000); // 2 * 63.000 = 126.000 Gs.
  }, 20000);

  it('POST /api/registros resuelve tarifa de desperdicio cuando la línea indica merma/desperdicio', async () => {
    const { app } = await import('../../server.ts');
    const { prisma } = await import('../lib/prisma.ts');
    const request = (await import('supertest')).default;

    // Eduardo envía una merma de 1 m² de Lona Serimax
    const res = await request(app)
      .post('/api/registros')
      .set('Cookie', [operarioCookie, sessionCookie])
      .set('x-csrf-token', csrfToken)
      .send({
        clienteId: testClientId,
        proyectoId: testProjectId,
        concepto: 'Insumo',
        descripcion: 'Lona x m (impresión) Serimax — Merma/Desperdicio (1.000 m²)',
        cantidad: 1,
        precioUnitario: 0,
        total: 0,
      });

    expect(res.status).toBe(201);
    const mermaRegistroId = res.body.data.id;

    // En DB debe haber tomado la tarifa de desperdicio de Serimax (15.500)
    const dbRegistro = await prisma.registro.findUnique({
      where: { id: mermaRegistroId }
    });
    expect(dbRegistro).toBeDefined();
    expect(Number(dbRegistro?.precioUnitario)).toBe(15500);
    expect(Number(dbRegistro?.total)).toBe(15500);

    // Limpieza
    await prisma.registro.delete({ where: { id: mermaRegistroId } });
  }, 20000);

  afterAll(async () => {
    const { prisma } = await import('../lib/prisma.ts');
    if (createdRegistroId) {
      await prisma.registro.deleteMany({ where: { id: createdRegistroId } });
    }
  });
});
