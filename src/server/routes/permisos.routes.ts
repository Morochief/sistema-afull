/**
 * Permisos Routes — Gestión completa de Solicitudes de Permiso (RR.HH.)
 * Flujo: empleado solicita → jefe aprueba → RR.HH. valida → PDF generado.
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.ts';
import { requireAuth, requireAdmin, mapDbRolToUi } from '../../../server-auth.ts';
import { auditLog, getClientIp } from '../../../server-audit.ts';
import { logger } from '../config/logger.ts';
import { ApiResponse } from '../../types.ts';
import { generateId } from '../shared.ts';
import { LOGO_AFULL_DATA_URI } from '../logoAfull.ts';

export const permisosRouter = Router();

const TIPOS_PERMISO = [
  'Permiso para retirarme antes de horario',
  'Licencia por nacimiento (Art. 62 "j"; Ley 5508/16)',
  'Permiso por razones de estudios',
  'Licencia por matrimonio (Ley 3384/07)',
  'Permiso para llegar fuera de mi horario',
  'Licencia por fallecimiento familiar directo',
  'Licencia por motivos de salud',
  'Licencia por defunción (Ley 3384/07)',
  'Otros',
  'Licencia por maternidad/lactancia (Art. 133 CT) Ley 5508/16',
];

// ─── GET /api/permisos — Listar permisos (todos para admin) ───
permisosRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { estado, colaboradorId } = req.query;
    const where: any = {};
    if (estado && typeof estado === 'string') where.estado = estado;
    if (colaboradorId && typeof colaboradorId === 'string') where.colaboradorId = colaboradorId;

    const permisos = await prisma.permiso.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { colaborador: { select: { id: true, nombre: true, ci: true, cargo: true, departamento: true, jefeInmediato: true, rol: true } } },
    });

    res.json({ success: true, data: permisos.map(p => ({
      id: p.id,
      colaboradorId: p.colaboradorId,
      nombreSolicitante: p.nombreSolicitante,
      cargo: p.cargo,
      ci: p.ci,
      departamento: p.departamento,
      jefeInmediato: p.jefeInmediato,
      tipoPermiso: p.tipoPermiso,
      motivo: p.motivo,
      modoTiempo: p.modoTiempo,
      horaInicio: p.horaInicio,
      horaFin: p.horaFin,
      fechaHora: p.fechaHora?.toISOString() || null,
      fechaDesde: p.fechaDesde?.toISOString() || null,
      fechaHasta: p.fechaHasta?.toISOString() || null,
      estado: p.estado,
      jefeDecision: p.jefeDecision,
      jefeComentario: p.jefeComentario,
      jefeFecha: p.jefeFecha?.toISOString() || null,
      rrhhDecision: p.rrhhDecision,
      rrhhComentario: p.rrhhComentario,
      rrhhDescontarSalario: p.rrhhDescontarSalario,
      rrhhFecha: p.rrhhFecha?.toISOString() || null,
      creadoPor: p.creadoPor,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      colaborador: p.colaborador,
    })) } as ApiResponse);
  } catch (error: any) {
    logger.error('[PERMISOS] Error listing:', error);
    res.status(500).json({ success: false, error: { code: 'LIST_ERROR', message: 'Error al listar permisos' } } as ApiResponse);
  }
});

// ─── POST /api/permisos — Crear solicitud de permiso ───
permisosRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const { colaboradorId, tipoPermiso, motivo, modoTiempo, horaInicio, horaFin, fechaHora, fechaDesde, fechaHasta } = req.body;

  if (!colaboradorId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Colaborador requerido' } } as ApiResponse);
  if (!tipoPermiso) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Tipo de permiso requerido' } } as ApiResponse);
  if (!TIPOS_PERMISO.includes(tipoPermiso)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Tipo de permiso inválido' } } as ApiResponse);

  try {
    const colaborador = await prisma.colaborador.findUnique({ where: { id: colaboradorId } });
    if (!colaborador) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Colaborador no encontrado' } } as ApiResponse);

    const permiso = await prisma.permiso.create({
      data: {
        id: generateId('perm'),
        colaboradorId,
        nombreSolicitante: colaborador.nombre,
        cargo: colaborador.cargo || colaborador.rol || null,
        ci: colaborador.ci,
        departamento: colaborador.departamento,
        jefeInmediato: colaborador.jefeInmediato,
        tipoPermiso,
        motivo: motivo?.trim() || null,
        modoTiempo: modoTiempo === 'dias' ? 'dias' : 'horas',
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        fechaHora: fechaHora ? new Date(fechaHora) : null,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : null,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : null,
        estado: 'Pendiente',
        creadoPor: req.user!.usuario,
      },
    });

    auditLog({ usuario: req.user!.usuario, accion: 'create_permiso', recurso: `/api/permisos/${permiso.id}`, resultado: 'success', ip: getClientIp(req) });
    res.status(201).json({ success: true, data: { id: permiso.id }, message: 'Solicitud de permiso creada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[PERMISOS] Error creating:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: 'Error al crear solicitud de permiso' } } as ApiResponse);
  }
});

// ─── PUT /api/permisos/:id/jefe — Decisión del jefe inmediato ───
permisosRouter.put('/:id/jefe', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, comentario } = req.body;

  if (!decision || !['Aprobado', 'Rechazado'].includes(decision)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Decisión inválida (Aprobado o Rechazado)' } } as ApiResponse);
  }

  try {
    const existing = await prisma.permiso.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Permiso no encontrado' } } as ApiResponse);
    if (existing.jefeDecision) return res.status(400).json({ success: false, error: { code: 'ALREADY_DECIDED', message: 'El jefe ya tomó decisión sobre este permiso' } } as ApiResponse);

    const newEstado = decision === 'Aprobado' ? 'AprobadoJefe' : 'Rechazado';
    const updated = await prisma.permiso.update({
      where: { id },
      data: { jefeDecision: decision, jefeComentario: comentario?.trim() || null, jefeFecha: new Date(), estado: newEstado },
    });

    auditLog({ usuario: req.user!.usuario, accion: `jefe_${decision.toLowerCase()}_permiso`, recurso: `/api/permisos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { id: updated.id, estado: updated.estado }, message: `Permiso ${decision === 'Aprobado' ? 'aprobado por jefe' : 'rechazado por jefe'}` } as ApiResponse);
  } catch (error: any) {
    logger.error('[PERMISOS] Error jefe decision:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al procesar decisión' } } as ApiResponse);
  }
});

// ─── PUT /api/permisos/:id/rrhh — Decisión de RR.HH. ───
permisosRouter.put('/:id/rrhh', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision, comentario, descontarSalario } = req.body;

  if (!decision || !['Aprobado', 'Rechazado'].includes(decision)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Decisión inválida (Aprobado o Rechazado)' } } as ApiResponse);
  }

  try {
    const existing = await prisma.permiso.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Permiso no encontrado' } } as ApiResponse);
    if (!existing.jefeDecision || existing.jefeDecision !== 'Aprobado') {
      return res.status(400).json({ success: false, error: { code: 'Jefe_PENDIENTE', message: 'El jefe inmediato debe aprobar primero' } } as ApiResponse);
    }
    if (existing.rrhhDecision) return res.status(400).json({ success: false, error: { code: 'ALREADY_DECIDED', message: 'RR.HH. ya tomó decisión sobre este permiso' } } as ApiResponse);

    const newEstado = decision === 'Aprobado' ? 'Aprobado' : 'Rechazado';
    const updated = await prisma.permiso.update({
      where: { id },
      data: {
        rrhhDecision: decision,
        rrhhComentario: comentario?.trim() || null,
        rrhhDescontarSalario: descontarSalario !== undefined ? !!descontarSalario : null,
        rrhhFecha: new Date(),
        estado: newEstado,
      },
    });

    auditLog({ usuario: req.user!.usuario, accion: `rrhh_${decision.toLowerCase()}_permiso`, recurso: `/api/permisos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, data: { id: updated.id, estado: updated.estado }, message: `Permiso ${decision === 'Aprobado' ? 'aprobado por RR.HH.' : 'rechazado por RR.HH.'}` } as ApiResponse);
  } catch (error: any) {
    logger.error('[PERMISOS] Error RRHH decision:', error);
    res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: 'Error al procesar decisión' } } as ApiResponse);
  }
});

// ─── GET /api/permisos/:id/pdf — Generar HTML imprimible del formulario ───
permisosRouter.get('/:id/pdf', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const permiso = await prisma.permiso.findUnique({ where: { id }, include: { colaborador: true } });
    if (!permiso) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Permiso no encontrado' } } as ApiResponse);

    const fechaSolicitud = new Date().toLocaleDateString('es-PY');
    const formatFecha = (d: Date | null) => d ? d.toLocaleDateString('es-PY') : '___/___/____';

    // Rejilla del documento original (SOLICITUD DE PERMISO.docx)
    const paresCheckboxes: Array<[string, string, string, string]> = [
      ['Permiso para retirarme antes de horario', '', 'Licencia por nacimiento (Art. 62, "j"; Ley 5508/16)', ''],
      ['Permiso por razones de estudios', '', 'Licencia por matrimonio (Ley 3384/07)', ''],
      ['Permiso para llegar fuera de mi horario', '', 'Licencia por fallecimiento familiar directo', ''],
      ['Licencia por motivos de salud (aclarar)', '', 'Licencia por defunción (Ley 3384/07)', ''],
      ['Otros (Aclarar):', '', 'Licencia por maternidad/lactancia (Art. 133 CT) Ley 5508/16', ''],
    ];

    const marcar = (label: string) => (permiso.tipoPermiso === label || permiso.tipoPermiso.startsWith(label.split('(')[0].trim())) ? '☑' : '☐';
    const otrosText = permiso.tipoPermiso === 'Otros' ? `<span style="border-bottom:1px solid #000;display:inline-block;min-width:150px;">${permiso.motivo || ''}</span>` : '';

    const tablaSolicitudes = paresCheckboxes.map(([izq, , der]) => `
      <tr>
        <td class="chk">${marcar(izq)}</td>
        <td>${izq}</td>
        <td class="chk">${marcar(der)}</td>
        <td>${der}${izq === 'Otros (Aclarar):' && marcar(izq) === '☑' ? ' ' + otrosText : ''}</td>
      </tr>`).join('');

    const datosSolicitante = [
      ['Fecha:', fechaSolicitud],
      ['Nombre y Apellido:', permiso.nombreSolicitante || ''],
      ['Cargo:', permiso.cargo || ''],
      ['C.I.Nro.:', permiso.ci || ''],
      ['Departamento:', permiso.departamento || ''],
      ['Jefe inmediato:', permiso.jefeInmediato || ''],
    ].map(([label, valor]) => `
      <p class="linea-dato"><span class="campo">${label}</span>
        <span style="border-bottom:1px solid #000;display:inline-block;min-width:280px;">${valor || ''}</span></p>`).join('');

    const tiempoHoras = permiso.modoTiempo === 'horas' ? `
      <p style="margin:2px 0;"><span class="campo">En caso de horas:</span>
        &nbsp;desde las <span class="sub">${permiso.horaInicio || '___:___'}</span> hs.
        &nbsp;Hasta las <span class="sub">${permiso.horaFin || '___:___'}</span> hs.,
        del día <span class="sub">${formatFecha(permiso.fechaHora)}</span>. -</p>` : '';

    const tiempoDias = permiso.modoTiempo === 'dias' ? `
      <p style="margin:2px 0;"><span class="campo">En caso de días:</span>
        &nbsp;&nbsp;&nbsp;desde el día <span class="sub">${formatFecha(permiso.fechaDesde)}</span>
        &nbsp;hasta el día <span class="sub">${formatFecha(permiso.fechaHasta)}</span>. -</p>` : '';

    const rrhhSection = (permiso.rrhhDecision || permiso.estado === 'Aprobado') ? `
      <p class="titulo-seccion">PARA USO EXCLUSIVO DE RRHH.</p>
      <table class="tabla-rrhh">
        <tr>
          <td class="chk">${permiso.rrhhDescontarSalario === true ? '☑' : '☐'}</td>
          <td><strong>SI</strong> será descontada del salario</td>
          <td class="chk">${permiso.rrhhDescontarSalario === false ? '☑' : '☐'}</td>
          <td><strong>NO</strong> será descontada del salario</td>
        </tr>
      </table>
      <p style="font-size:10px;margin:4px 0 0;">Decisión RR.HH.: <strong>${permiso.rrhhDecision || 'Pendiente'}</strong>
      ${permiso.rrhhComentario ? ` — Comentario: ${permiso.rrhhComentario}` : ''}
      ${permiso.rrhhFecha ? ` — Fecha: ${permiso.rrhhFecha.toLocaleDateString('es-PY')}` : ''}</p>` : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>SOLICITUD DE PERMISO — ${permiso.nombreSolicitante}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #000; max-width: 210mm; margin: 0 auto; padding: 14mm 16mm; font-size: 11pt; line-height: 1.35; background:#fff; }
  table { border-collapse: collapse; }
  /* Encabezado: logo | título | código/versión/hoja */
  .header-table { width: 100%; border: 1px solid #000; }
  .header-table td { border: 1px solid #000; vertical-align: middle; }
  .logo-cell { width: 24%; text-align: center; padding: 4px 6px; }
  .logo-cell img { max-height: 18mm; max-width: 100%; }
  .title-cell { width: 52%; text-align: center; font-weight: bold; font-size: 15pt; letter-spacing: 1px; padding: 4px; }
  .meta-cell { width: 24%; font-size: 10pt; font-weight: bold; padding: 4px 10px; text-align: left; }
  .meta-cell div { border-bottom: 1px solid #000; padding: 3px 0; }
  /* Títulos de sección subrayados (como el .docx) */
  .titulo-seccion { font-weight: bold; text-decoration: underline; margin: 14px 0 6px; font-size: 11.5pt; }
  .sub { border-bottom: 1px solid #000; display: inline-block; min-width: 90px; text-align: center; }
  /* Procedimiento numerado */
  ol.procedimiento { margin: 4px 0 8px 22px; padding: 0; }
  ol.procedimiento li { margin-bottom: 3px; }
  /* Datos del solicitante: cada línea label + espacio */
  .linea-dato { margin: 2px 0; }
  .campo { font-weight: normal; }
  /* Tabla de solicitudes (checkbox + texto) */
  .tabla-opciones, .tabla-rrhh { width: 100%; border: 1px solid #000; margin: 8px 0; }
  .tabla-opciones td, .tabla-rrhh td { border: 1px solid #000; padding: 5px 8px; vertical-align: middle; }
  .tabla-opciones .chk, .tabla-rrhh .chk { width: 22px; text-align: center; font-size: 13pt; }
  /* Firmas */
  .firma-linea { margin: 6px 0; font-size: 11pt; }
  .firma-caja { display: inline-block; width: 45mm; border-bottom: 1px solid #000; height: 14pt; }
  /* Leyenda */
  .leyenda { margin-top: 14px; font-size: 8pt; line-height: 1.5; }
  .leyenda strong { font-size: 8.5pt; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="logo-cell" rowspan="3"><img src="${LOGO_AFULL_DATA_URI}" alt="aFULL"></td>
      <td class="title-cell" rowspan="3">SOLICITUD DE PERMISO</td>
      <td class="meta-cell"><div>Código: 001</div></td>
    </tr>
    <tr><td class="meta-cell"><div>Versión: 00</div></td></tr>
    <tr><td class="meta-cell"><div>Hoja: 1/1</div></td></tr>
  </table>

  <p class="titulo-seccion">PROCEDIMIENTO.</p>
  <ol class="procedimiento">
    <li>Deberá presentarse dentro de las 24 horas del usufructo, caso contrario será considerada ausencia injustificada con descuento de salario.</li>
    <li>En caso de ausencia por razones de salud, se deberá adjuntar reposo o certificado médico.</li>
    <li>En casos de notificaciones judiciales para audiencias, acompañar cédula de notificación.</li>
    <li>En los casos de nacimientos, acompañar Certificado de Nacido Vivo (M.S.P. y B.S.) y Certificado de Nacimiento (Registro Civil).</li>
    <li>En todos los casos se deberá especificar los motivos de la solicitud, caso contrario será considerado como ausencia injustificada pasible de descuento del salario.</li>
    <li>La solicitud debe estar firmada por el Jefe inmediato, el solicitante y archivarse en su legajo.</li>
  </ol>

  <p class="titulo-seccion">DATOS DEL SOLICITANTE.</p>
  ${datosSolicitante}

  <p style="margin:8px 0 4px;">Quien suscribe, se dirige a ustedes con el objeto de solicitar:</p>
  <table class="tabla-opciones">
    ${tablaSolicitudes}
  </table>

  <p class="titulo-seccion">TIEMPO A SER USUFRUCTUADO.</p>
  ${tiempoHoras}
  ${tiempoDias}

  <p style="margin:10px 0;">Sin otro particular, y esperando respuesta favorable, me despido de ustedes muy atentamente,</p>

  <p class="firma-linea">Firma del solicitante (1): <span class="firma-caja"></span>
    &nbsp;&nbsp;&nbsp;Firma jefe inmediato (2): <span class="firma-caja"></span></p>
  <p class="firma-linea">RR.HH. (3): <span class="firma-caja" style="width:80mm;"></span></p>

  ${rrhhSection}

  <div class="leyenda">
    <strong>Licencias dispuestas por ley.</strong><br>
    • Maternidad (Ley 5508/16) <em>18 semanas.</em><br>
    • Lactancia (Art. 133/136 CT) <em>1,5 horas por día.</em><br>
    • Matrimonio (Ley 3384/07, Art. 62 "j" CT) <em>3 días.</em><br>
    • Nacimiento de hijos (Ley 5508/16) <em>2 semanas.</em><br>
    • Defunción de cónyuge, padres, hijos, abuelos, y/o hermanos (Ley 3384/07, Art. 62 "j" CT) <em>3 días.</em><br>
    • Obligaciones legales (audiencias, votación, etc.) Art. 62 "h". <em>Según necesidad.</em><br>
    • Preaviso (Art. 89 CT) <em>2 horas diarias o 1 día a la semana.</em>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error: any) {
    logger.error('[PERMISOS] Error generating PDF:', error);
    res.status(500).json({ success: false, error: { code: 'PDF_ERROR', message: 'Error al generar documento' } } as ApiResponse);
  }
});

// ─── DELETE /api/permisos/:id — Eliminar permiso (solo si está Pendiente) ───
permisosRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.permiso.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Permiso no encontrado' } } as ApiResponse);
    if (existing.estado !== 'Pendiente') return res.status(400).json({ success: false, error: { code: 'LOCKED', message: 'No se puede eliminar un permiso ya procesado' } } as ApiResponse);

    await prisma.permiso.delete({ where: { id } });
    auditLog({ usuario: req.user!.usuario, accion: 'delete_permiso', recurso: `/api/permisos/${id}`, resultado: 'success', ip: getClientIp(req) });
    res.json({ success: true, message: 'Solicitud de permiso eliminada' } as ApiResponse);
  } catch (error: any) {
    logger.error('[PERMISOS] Error deleting:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: 'Error al eliminar permiso' } } as ApiResponse);
  }
});
