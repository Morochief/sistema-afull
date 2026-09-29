// @vitest-environment node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server.ts';
import { prisma } from '../lib/prisma.ts';
import { generateToken } from '../../server-auth.ts';
import {
  calcularDuracionHoras,
  validarProrrateoTotal,
  distribuirValor,
  calcularCostoPorDimension,
} from '../lib/insumosCosteo.ts';

describe('Prorrateo & Costeo de Insumos', () => {
  let adminCookie: string;
  let csrfToken: string;
  let sessionCookie: string;
  let testClienteAId: string;
  let testClienteBId: string;
  let testProyectoAId: string;
  let testProyectoBId: string;
  let testFacturaId: string;

  beforeAll(async () => {
    // Generate valid admin JWT token
    const token = generateToken({
      usuario: 'admin',
      nombre: 'Administrador',
      rol: 'Admin',
    });
    adminCookie = `jwt=${token}`;

    // Request CSRF token
    const csrfRes = await request(app).get('/api/csrf-token');
    csrfToken = csrfRes.body.data.csrfToken;
    const rawCookies = (csrfRes.headers['set-cookie'] || []) as string[];
    const sessionCookieMatch = rawCookies.find((c: string) => c.startsWith('sessionId='));
    sessionCookie = sessionCookieMatch ? sessionCookieMatch.split(';')[0] : '';

    // Create test clients & projects
    testClienteAId = `cli_test_a_${Date.now()}`;
    testClienteBId = `cli_test_b_${Date.now()}`;

    await prisma.cliente.createMany({
      data: [
        { id: testClienteAId, nombre: 'Cliente Test A', codigo: 'CTA' },
        { id: testClienteBId, nombre: 'Cliente Test B', codigo: 'CTB' },
      ],
    });

    testProyectoAId = `pro_test_a_${Date.now()}`;
    testProyectoBId = `pro_test_b_${Date.now()}`;

    await prisma.proyecto.createMany({
      data: [
        { id: testProyectoAId, clienteId: testClienteAId, nombre: 'Proyecto Alpha', fechaInicio: new Date() },
        { id: testProyectoBId, clienteId: testClienteBId, nombre: 'Proyecto Beta', fechaInicio: new Date() },
      ],
    });

    // Create test factura compra
    testFacturaId = `fac_test_${Date.now()}`;
    await prisma.facturaCompra.create({
      data: {
        id: testFacturaId,
        facturaNumero: 'FAC-9999',
        proveedor: 'Proveedor Ferretería SA',
        descripcion: 'Planchas de Policarbonato 4mm',
        cantidadComprada: 10,
        cantidadUsada: 0,
        unidad: 'plancha',
        precioUnitario: 150000,
        total: 1500000,
      },
    });
  });

  afterAll(async () => {
    // Cleanup cascade
    try {
      await prisma.registro.deleteMany({
        where: {
          clienteId: { in: [testClienteAId, testClienteBId] },
        },
      });
      await prisma.proyecto.deleteMany({
        where: {
          id: { in: [testProyectoAId, testProyectoBId] },
        },
      });
      await prisma.cliente.deleteMany({
        where: {
          id: { in: [testClienteAId, testClienteBId] },
        },
      });
      await prisma.facturaCompra.deleteMany({
        where: {
          id: testFacturaId,
        },
      });
    } catch (cleanupErr) {
      console.warn('Cleanup error in prorrateo tests:', cleanupErr);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. UNIT CALCULATIONS
  // ══════════════════════════════════════════════════════════════════════════
  describe('Cálculos de los 5 Modos de Insumo y Horarios', () => {
    it('debe calcular correctamente la duración entre horarios normales', () => {
      const res = calcularDuracionHoras('08:00', '12:30');
      expect(res.valido).toBe(true);
      expect(res.minutos).toBe(270);
      expect(res.duracionTexto).toBe('04:30');
      expect(res.horasDecimal).toBe(4.5);
    });

    it('debe calcular correctamente la duración en cruce de medianoche', () => {
      const res = calcularDuracionHoras('22:00', '02:00');
      expect(res.valido).toBe(true);
      expect(res.minutos).toBe(240);
      expect(res.duracionTexto).toBe('04:00');
      expect(res.horasDecimal).toBe(4);
    });

    it('debe validar que los porcentajes sumen exactamente 100%', () => {
      expect(validarProrrateoTotal([{ porcentaje: 50 }, { porcentaje: 50 }])).toBe(true);
      expect(validarProrrateoTotal([{ porcentaje: 70 }, { porcentaje: 30 }])).toBe(true);
      expect(validarProrrateoTotal([{ porcentaje: 60 }, { porcentaje: 35 }])).toBe(false);
    });

    it('debe distribuir valores sin perder decimales en la última cuota', () => {
      const partes = distribuirValor(100, [33.33, 33.33, 33.34]);
      const suma = partes.reduce((a, b) => a + b, 0);
      expect(Math.round(suma)).toBe(100);
    });

    it('debe calcular insumo por dimensión con y sin merma de bobina', () => {
      // 122 cm x 252 cm = 30,744 cm² = 3.0744 m² sin desperdicio a 50.000 Gs/m² = 153.720 Gs
      const sinMerma = calcularCostoPorDimension({
        anchoCm: 122,
        altoCm: 252,
        precioPorM2: 50000,
        calcularDesperdicio: false,
      });
      expect(sinMerma.subtotalGs).toBe(153720);

      // Con bobina 127 cm: usa ancho 127 cm x 252 cm = 32,004 cm² = 3.2004 m² a 50.000 = 160.020 Gs
      const conBobina = calcularCostoPorDimension({
        anchoCm: 122,
        altoCm: 252,
        precioPorM2: 50000,
        calcularDesperdicio: true,
        anchoBobinaCm: 127,
      });
      expect(conBobina.subtotalGs).toBe(160020);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ENDPOINT /api/registros/prorrateo
  // ══════════════════════════════════════════════════════════════════════════
  describe('Endpoint POST /api/registros/prorrateo', () => {
    it('debe rechazar prorrateo si los porcentajes no suman 100%', async () => {
      const res = await request(app)
        .post('/api/registros/prorrateo')
        .set('Cookie', [adminCookie, sessionCookie])
        .set('x-csrf-token', csrfToken)
        .send({
          distribucion: [
            { clienteId: testClienteAId, proyectoId: testProyectoAId, porcentaje: 60 },
            { clienteId: testClienteBId, proyectoId: testProyectoBId, porcentaje: 30 },
          ],
          registroBase: {
            fecha: '2026-09-28',
            concepto: 'MO',
            descripcion: 'Instalación general',
            cantidad: 120,
            precioUnitario: 350,
            total: 42000,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PERCENTAGE');
    });

    it('debe registrar y dividir exitosamente Mano de Obra entre 2 clientes (60% / 40%)', async () => {
      const res = await request(app)
        .post('/api/registros/prorrateo')
        .set('Cookie', [adminCookie, sessionCookie])
        .set('x-csrf-token', csrfToken)
        .send({
          distribucion: [
            { clienteId: testClienteAId, proyectoId: testProyectoAId, porcentaje: 60 },
            { clienteId: testClienteBId, proyectoId: testProyectoBId, porcentaje: 40 },
          ],
          registroBase: {
            fecha: '2026-09-28',
            concepto: 'MO',
            descripcion: 'Corte y ensamble en taller',
            hsInicio: '08:00',
            hsFin: '12:00',
            hsTotal: 4,
            cantidad: 240, // 240 minutos
            precioUnitario: 350,
            total: 84000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);

      const [regA, regB] = res.body.data;
      expect(regA.clienteId).toBe(testClienteAId);
      expect(regA.cantidad).toBe(144); // 60% de 240 min = 144
      expect(regA.descripcion).toContain('[Prorrateo 60%]');

      expect(regB.clienteId).toBe(testClienteBId);
      expect(regB.cantidad).toBe(96); // 40% de 240 min = 96
      expect(regB.descripcion).toContain('[Prorrateo 40%]');

      // Verificar que ambos registros comparten el mismo prorrateoGrupoId en la base de datos
      const dbRows = await prisma.registro.findMany({
        where: { id: { in: [regA.id, regB.id] } },
      });
      expect(dbRows[0].prorrateoGrupoId).toBeTruthy();
      expect(dbRows[0].prorrateoGrupoId).toBe(dbRows[1].prorrateoGrupoId);
    }, 20000);

    it('debe registrar y consumir insumo fraccionado desde Factura de Compra', async () => {
      const res = await request(app)
        .post('/api/registros/prorrateo')
        .set('Cookie', [adminCookie, sessionCookie])
        .set('x-csrf-token', csrfToken)
        .send({
          distribucion: [
            { clienteId: testClienteAId, proyectoId: testProyectoAId, porcentaje: 50 },
            { clienteId: testClienteBId, proyectoId: testProyectoBId, porcentaje: 50 },
          ],
          registroBase: {
            fecha: '2026-09-28',
            concepto: 'Insumo',
            descripcion: 'Policarbonato 4mm',
            cantidad: 2, // 2 planchas en total
            precioUnitario: 150000,
            total: 300000,
            modoInsumo: 'FACTURA',
            facturaCompraId: testFacturaId,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verificar que en FacturaCompra se incrementó cantidadUsada
      const facturaActualizada = await prisma.facturaCompra.findUnique({
        where: { id: testFacturaId },
      });
      expect(Number(facturaActualizada?.cantidadUsada)).toBe(2);
    }, 20000);
  });
});
