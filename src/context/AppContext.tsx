"use client";

import React, { createContext, useTransition } from 'react';
import { createRegistroMO, createRegistroInsumo } from '@/app/actions/registros';
import { toast } from 'sonner';

interface Insumo {
  id: string;
  nombre: string;
  precio_unitario: any;
  activo: boolean;
}

interface Colaborador {
  id: string;
  nombre: string;
  tarifa_minuto: any;
  activo: boolean;
}

interface Proyecto {
  id: string;
  nombre: string;
  estado: string;
  cliente_id: string;
}

interface RegistroMOData {
  proyectoId: string;
  inicio: string;
  fin: string;
  description: string;
}

interface RegistroInsumoData {
  proyectoId: string;
  insumoId: string;
  cantidad: number;
}

interface AppContextType {
  isPending: boolean;
  handleAgregarMO: (data: RegistroMOData, callback?: () => void) => void;
  handleAgregarInsumo: (data: RegistroInsumoData, callback?: () => void) => void;
  INSUMOS_CATALOGO: Insumo[];
  COLABORADORES: Colaborador[];
  PROYECTOS: Proyecto[];
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ 
  children,
  insumosCatalogo = [],
  colaboradoresCatalogo = [],
  proyectosCatalogo = []
}: { 
  children: React.ReactNode
  insumosCatalogo?: Insumo[]
  colaboradoresCatalogo?: Colaborador[]
  proyectosCatalogo?: Proyecto[]
}) => {
  const [isPending, startTransition] = useTransition();

  const handleAgregarMO = (data: RegistroMOData, callback?: () => void) => {
    startTransition(async () => {
      const res = await createRegistroMO({
        proyectoId: data.proyectoId,
        inicio: data.inicio,
        fin: data.fin,
        description: data.description
      });
      if ('error' in res) {
        toast.error(`Error al registrar horas: ${res.error}`);
      } else {
        toast.success("Registro de horas guardado exitosamente");
        if (callback) callback();
      }
    });
  };

  const handleAgregarInsumo = (data: RegistroInsumoData, callback?: () => void) => {
    startTransition(async () => {
      const res = await createRegistroInsumo({
        proyectoId: data.proyectoId,
        insumoId: data.insumoId,
        cantidad: data.cantidad
      });
      if ('error' in res) {
        toast.error(`Error al registrar insumo: ${res.error}`);
      } else {
        toast.success("Consumo de insumo guardado exitosamente");
        if (callback) callback();
      }
    });
  };

  return (
    <AppContext.Provider value={{ 
      isPending,
      handleAgregarMO,
      handleAgregarInsumo,
      INSUMOS_CATALOGO: insumosCatalogo, 
      COLABORADORES: colaboradoresCatalogo,
      PROYECTOS: proyectosCatalogo
    }}>
      {children}
    </AppContext.Provider>
  );
};
