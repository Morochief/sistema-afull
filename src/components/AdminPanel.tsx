/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { 
  Building2, 
  FolderGit2, 
  Users, 
  PenTool, 
  Store, 
  Contact,
  Clock,
  Car,
  FileText,
  UsersRound,
  Shield,
  Layers,
} from 'lucide-react';
import { DatabaseState, Cliente, Proyecto } from '../types.ts';
import VehiculosAdminView from './VehiculosAdminView.tsx';
import SucursalesTab from './SucursalesTab.tsx';
import CarteraClientesTab from './CarteraClientesTab.tsx';
import { useNotif } from '../context/NotifContext.tsx';
import TimelineMarcaciones from './TimelineMarcaciones.tsx';
import HojasRutaMarcacionAdmin from './HojasRutaMarcacionAdmin.tsx';
import AuditLogTab from './AuditLogTab.tsx';
import RegistroManualForm from './RegistroManualForm.tsx';
import ClientesTab from './ClientesTab.tsx';
import ProyectosTab from './ProyectosTab.tsx';
import ColaboradoresTab from './ColaboradoresTab.tsx';
import PermisosTab from './PermisosTab.tsx';
import InsumosAdmin from './InsumosAdmin.tsx';
import PanelTrabajosActivos from './PanelTrabajosActivos.tsx';

interface AdminPanelProps {
  data: DatabaseState;
  onAddRegistro: (registro: any) => Promise<boolean>;
  onAddCliente: (cliente: Cliente) => void;
  onEditCliente: (id: string, data: Partial<Cliente>) => Promise<void>;
  onDeleteCliente: (id: string) => Promise<void>;
  onAddProyecto: (proyecto: Proyecto) => Promise<void>;
  onEditProyecto: (id: string, data: Partial<Proyecto>) => Promise<void>;
  onDeleteProyecto: (id: string) => Promise<void>;
  onAddColaborador: (data: any) => Promise<void>;
  onEditColaborador: (id: string, data: any) => Promise<void>;
  onDeleteColaborador: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  initialVehicleEditId?: string | null;
  initialSubTab?: string;
}

type AdminSubTab =
  | 'trabajos-activos'
  | 'registro'
  | 'insumos'
  | 'clientes'
  | 'proyectos'
  | 'colaboradores'
  | 'permisos'
  | 'vehiculos'
  | 'marcaciones'
  | 'grupos-marcacion'
  | 'auditlog'
  | 'sucursales'
  | 'cartera';

interface NavItem {
  id: AdminSubTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  activeClass: string;
}

export default function AdminPanel({
  data,
  onAddRegistro,
  onAddCliente,
  onEditCliente,
  onDeleteCliente,
  onAddProyecto,
  onEditProyecto,
  onDeleteProyecto,
  onAddColaborador,
  onEditColaborador,
  onDeleteColaborador,
  onRefresh,
  initialVehicleEditId,
  initialSubTab
}: AdminPanelProps) {
  const { showToast } = useNotif();
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(
    (initialSubTab as AdminSubTab) || 'registro'
  );

  // --- 1. Manual Recording Form State ---
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [concepto, setConcepto] = useState<'MO' | 'Insumo' | 'Otros'>('MO');
  const [fecha, setFecha] = useState(new Date().toISOString().substring(0, 10));
  const [descripcion, setDescripcion] = useState('');
  const [selectedColaboradorId, setSelectedColaboradorId] = useState('');
  
  // Sizing quantities inside form
  const [hours, setHours] = useState('5');
  const [quantity, setQuantity] = useState('1');
  const [precioUnitario, setPrecioUnitario] = useState('350');
  
  const [isSubmitPending, setIsSubmitPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- 2. Create Client State ---
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');

  // --- 3. Create Project State ---
  const [newProjClientId, setNewProjClientId] = useState('');
  const [newProjName, setNewProjName] = useState('');

  // Handle collaborator selection tariff updates
  const handleColaboradorSelect = (id: string) => {
    setSelectedColaboradorId(id);
    const colab = data.colaboradores.find(col => col.id === id);
    if (colab) {
      setPrecioUnitario(String(colab.tarifaSugerida));
    }
  };

  // Submit manual registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedClienteId || !selectedProyectoId || !descripcion) {
      setFormError('Por favor completa todos los campos mandatorios.');
      return;
    }

    setIsSubmitPending(true);
    
    // Compute total & minutes mapping
    const finalCantidad = concepto === 'MO' ? parseFloat(hours) * 60 : parseFloat(quantity);
    const finalPrecio = parseFloat(precioUnitario) || 0;
    const computedTotal = finalCantidad * finalPrecio;

    const success = await onAddRegistro({
      clienteId: selectedClienteId,
      proyectoId: selectedProyectoId,
      concepto,
      fecha,
      descripcion,
      colaboradorId: concepto === 'MO' ? selectedColaboradorId : undefined,
      hsInicio: concepto === 'MO' ? '08:00' : undefined,
      hsFin: concepto === 'MO' ? '13:00' : undefined,
      hsTotal: concepto === 'MO' ? parseFloat(hours) : undefined,
      cantidad: finalCantidad,
      precioUnitario: finalPrecio,
      total: computedTotal
    });

    setIsSubmitPending(false);

    if (success) {
      // Clear fields
      setDescripcion('');
      setFormError(null);
      showToast('Registro guardado con éxito', 'success');
    } else {
      setFormError('Ocurrió un error al guardar el registro en la base de datos.');
    }
  };

  // Create client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    onAddCliente({
      id: `cli_${Math.random().toString(36).substring(2, 7)}`,
      nombre: newClientName,
      codigo: newClientCode || newClientName.substring(0, 4).toUpperCase(),
      fechaCreacion: new Date().toISOString().substring(0, 10)
    });
    setNewClientName('');
    setNewClientCode('');
    showToast('Cliente creado con éxito', 'success');
  };

  // Create project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjClientId) return;
    try {
      await onAddProyecto({
        id: `pro_${Math.random().toString(36).substring(2, 7)}`,
        clienteId: newProjClientId,
        nombre: newProjName,
        estado: 'En Proceso',
        fechaInicio: new Date().toISOString().substring(0, 10)
      });
      setNewProjName('');
      showToast('Proyecto creado con éxito', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al crear proyecto', 'error');
    }
  };

  interface NavDomain {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: {
      id: AdminSubTab;
      label: string;
      icon: React.ReactNode;
      badge?: number;
    }[];
  }

  const navDomains: NavDomain[] = [
    {
      id: 'operaciones',
      label: 'Operaciones & En Vivo',
      icon: <Clock className="w-4 h-4 text-emerald-400" />,
      items: [
        { id: 'trabajos-activos', label: '⚡ Control en Vivo', icon: <Users className="w-3.5 h-3.5 text-emerald-400" /> },
        { id: 'vehiculos', label: 'Flota & Vehículos', icon: <Car className="w-3.5 h-3.5" />, badge: (data.registrosVehiculo || []).length },
        { id: 'marcaciones', label: 'Timeline Asistencia', icon: <Clock className="w-3.5 h-3.5" /> },
        { id: 'grupos-marcacion', label: 'Grupos de Marcación', icon: <UsersRound className="w-3.5 h-3.5" /> },
      ]
    },
    {
      id: 'catalogos',
      label: 'Gestión & Catálogos',
      icon: <Building2 className="w-4 h-4 text-orange-400" />,
      items: [
        { id: 'clientes', label: 'Clientes', icon: <Building2 className="w-3.5 h-3.5" />, badge: data.clientes.length },
        { id: 'sucursales', label: 'Sucursales / Locales', icon: <Store className="w-3.5 h-3.5" /> },
        { id: 'proyectos', label: 'Proyectos', icon: <FolderGit2 className="w-3.5 h-3.5" />, badge: data.proyectos.length },
        { id: 'insumos', label: 'Insumos & Taller', icon: <Layers className="w-3.5 h-3.5" /> },
        { id: 'cartera', label: 'Cartera CRM', icon: <Contact className="w-3.5 h-3.5" /> },
      ]
    },
    {
      id: 'seguridad',
      label: 'Equipo & Seguridad',
      icon: <Shield className="w-4 h-4 text-indigo-400" />,
      items: [
        { id: 'colaboradores', label: 'Colaboradores', icon: <Users className="w-3.5 h-3.5" />, badge: data.colaboradores.length },
        { id: 'permisos', label: 'Permisos RR.HH.', icon: <Shield className="w-3.5 h-3.5" /> },
        { id: 'auditlog', label: 'Auditoría & Accesos', icon: <FileText className="w-3.5 h-3.5" /> },
        { id: 'registro', label: 'Carga Manual', icon: <PenTool className="w-3.5 h-3.5" /> },
      ]
    }
  ];

  // Identificar el dominio activo según el subtab seleccionado
  const currentDomain = navDomains.find(d => d.items.some(item => item.id === activeSubTab)) || navDomains[0];

  return (
    <div id="admin_control_view" className="space-y-4 relative z-10">
      
      {/* Barra de Navegación Enterprise: 3 Dominios Principales + Sub-Pills Horizontales */}
      <div className="rounded-md border border-white/10 bg-[#111318] p-3 space-y-3">
        {/* Nivel 1: Selector de Gran Dominio */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2.5">
          {navDomains.map(domain => {
            const isDomainActive = domain.id === currentDomain.id;
            return (
              <button
                key={domain.id}
                onClick={() => {
                  // Si cambiamos de dominio, activar la primera pestaña de ese dominio
                  setActiveSubTab(domain.items[0].id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  isDomainActive
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {domain.icon}
                <span>{domain.label}</span>
              </button>
            );
          })}
        </div>

        {/* Nivel 2: Sub-pills del Dominio Activo */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {currentDomain.items.map(item => {
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#ea580c] text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form/Administration Body - 100% de Ancho Util */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {activeSubTab === 'registro' && (
            <RegistroManualForm
              key="registro"
              data={data}
              onSubmit={handleRegisterSubmit}
              isSubmitPending={isSubmitPending}
              formError={formError}
              selectedClienteId={selectedClienteId}
              setSelectedClienteId={setSelectedClienteId}
              selectedProyectoId={selectedProyectoId}
              setSelectedProyectoId={setSelectedProyectoId}
              concepto={concepto}
              setConcepto={setConcepto}
              fecha={fecha}
              setFecha={setFecha}
              descripcion={descripcion}
              setDescripcion={setDescripcion}
              selectedColaboradorId={selectedColaboradorId}
              handleColaboradorSelect={handleColaboradorSelect}
              hours={hours}
              setHours={setHours}
              quantity={quantity}
              setQuantity={setQuantity}
              precioUnitario={precioUnitario}
              setPrecioUnitario={setPrecioUnitario}
            />
          )}

          {activeSubTab === 'insumos' && (
            <InsumosAdmin
              key="insumos"
              data={data}
              onAddRegistro={onAddRegistro}
              onRefresh={onRefresh}
            />
          )}

          {activeSubTab === 'clientes' && (
            <ClientesTab
              key="clientes"
              data={data}
              newClientName={newClientName}
              setNewClientName={setNewClientName}
              newClientCode={newClientCode}
              setNewClientCode={setNewClientCode}
              onCreateClient={handleCreateClient}
              onEditCliente={onEditCliente}
              onDeleteCliente={onDeleteCliente}
            />
          )}

          {activeSubTab === 'proyectos' && (
            <ProyectosTab
              key="proyectos"
              data={data}
              newProjClientId={newProjClientId}
              setNewProjClientId={setNewProjClientId}
              newProjName={newProjName}
              setNewProjName={setNewProjName}
              onCreateProject={handleCreateProject}
              onEditProyecto={onEditProyecto}
              onDeleteProyecto={onDeleteProyecto}
            />
          )}

          {activeSubTab === 'sucursales' && (
            <SucursalesTab
              key="sucursales"
              clientes={data.clientes}
            />
          )}

          {activeSubTab === 'cartera' && (
            <CarteraClientesTab
              key="cartera"
            />
          )}

          {activeSubTab === 'colaboradores' && (
            <ColaboradoresTab
              key="colaboradores"
              data={data}
              onAddColaborador={onAddColaborador}
              onEditColaborador={onEditColaborador}
              onDeleteColaborador={onDeleteColaborador}
            />
          )}

          {activeSubTab === 'permisos' && (
            <PermisosTab key="permisos" data={data} />
          )}

          {activeSubTab === 'trabajos-activos' && (
            <PanelTrabajosActivos key="trabajos-activos" />
          )}

          {activeSubTab === 'vehiculos' && (
            <VehiculosAdminView
              key="vehiculos"
              data={data}
              onRefresh={onRefresh || (async () => {})}
              initialEditId={initialVehicleEditId}
            />
          )}

          {activeSubTab === 'marcaciones' && (
            <TimelineMarcaciones key="marcaciones" />
          )}

          {activeSubTab === 'grupos-marcacion' && (
            <HojasRutaMarcacionAdmin key="grupos-marcacion" />
          )}

          {activeSubTab === 'auditlog' && (
            <AuditLogTab key="auditlog" />
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
