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

  interface NavCategory {
    category: string;
    items: {
      id: AdminSubTab;
      label: string;
      icon: React.ReactNode;
      badge?: number;
    }[];
  }

  const navCategories: NavCategory[] = [
    {
      category: 'Taller & Producción',
      items: [
        { id: 'insumos', label: 'Catálogo Insumos & Taller', icon: <Layers className="w-4 h-4" /> },
      ]
    },
    {
      category: 'Entidades & Cartera',
      items: [
        { id: 'clientes', label: 'Clientes', icon: <Building2 className="w-4 h-4" />, badge: data.clientes.length },
        { id: 'sucursales', label: 'Sucursales / Locales', icon: <Store className="w-4 h-4" /> },
        { id: 'proyectos', label: 'Proyectos', icon: <FolderGit2 className="w-4 h-4" />, badge: data.proyectos.length },
        { id: 'cartera', label: 'Cartera CRM', icon: <Contact className="w-4 h-4" /> },
      ]
    },
    {
      category: 'Personal & RR.HH.',
      items: [
        { id: 'colaboradores', label: 'Colaboradores', icon: <Users className="w-4 h-4" />, badge: data.colaboradores.length },
        { id: 'permisos', label: 'Permisos (RR.HH.)', icon: <Shield className="w-4 h-4" /> },
      ]
    },
    {
      category: 'Flota & Asistencia',
      items: [
        { id: 'vehiculos', label: 'Control de Vehículos', icon: <Car className="w-4 h-4" />, badge: (data.registrosVehiculo || []).length },
        { id: 'marcaciones', label: 'Timeline Marcaciones', icon: <Clock className="w-4 h-4" /> },
        { id: 'grupos-marcacion', label: 'Grupos de Marcación', icon: <UsersRound className="w-4 h-4" /> },
      ]
    },
    {
      category: 'Sistema & Contingencia',
      items: [
        { id: 'registro', label: 'Carga Manual Directa', icon: <PenTool className="w-4 h-4" /> },
        { id: 'auditlog', label: 'Auditoría de Accesos', icon: <FileText className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <div id="admin_control_view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
      
      {/* Sidebar navigation tabs for admin view - Categorized Enterprise */}
      <div className="lg:col-span-3 space-y-5">
        {navCategories.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
            <h4 className="text-[11px] font-bold tracking-wider uppercase text-slate-500 font-mono px-3">
              {group.category}
            </h4>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = activeSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSubTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-orange-500/15 text-orange-300 font-semibold border border-orange-500/30 shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-orange-400' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono ${
                        isActive 
                          ? 'bg-orange-500/30 text-orange-200' 
                          : 'bg-white/10 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Form/Administration Body */}
      <div className="lg:col-span-9">
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
