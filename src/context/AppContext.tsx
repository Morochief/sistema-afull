"use client";

import React, { createContext, useTransition } from 'react';
import { createRegistroMO, createRegistroInsumo } from '@/app/actions/registros';

export const AppContext = createContext<any>(null);

export const AppProvider = ({ 
  children,
  insumosCatalogo = [],
  colaboradoresCatalogo = [],
  proyectosCatalogo = []
}: { 
  children: React.ReactNode
  insumosCatalogo?: any[]
  colaboradoresCatalogo?: any[]
  proyectosCatalogo?: any[]
}) => {
  const [isPending, startTransition] = useTransition();

  const handleAgregarMO = (data: any) => {
    startTransition(async () => {
      const res = await createRegistroMO({
        proyectoId: data.proyectoId,
        inicio: data.inicio,
        fin: data.fin,
        description: data.description
      });
      if (res.error) {
        alert(res.error);
      } else {
        alert("Registro de horas guardado exitosamente");
      }
    });
  };

  const handleAgregarInsumo = (data: any) => {
    startTransition(async () => {
      const res = await createRegistroInsumo({
        proyectoId: data.proyectoId,
        insumoId: data.insumoId,
        cantidad: data.cantidad
      });
      if (res.error) {
        alert(res.error);
      } else {
        alert("Consumo de insumo guardado exitosamente");
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
