-- ==============================================================================
-- SCRIPT DE MIGRACIÓN POSTGRESQL - SISTEMA AFULL
-- Descripción: Estructura inicial para el costeo de proyectos, mano de obra e insumos.
-- Convenciones: snake_case, Integridad Referencial, NUMERIC para dinero.
-- ==============================================================================

-- 1. EXTENSIONES Y CONFIGURACIÓN
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS MAESTRAS (Catálogos)

-- Tabla de Clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Proyectos
CREATE TABLE proyectos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    nombre VARCHAR(200) NOT NULL,
    estado VARCHAR(50) DEFAULT 'in_progress',
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Colaboradores
CREATE TABLE colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    tarifa_minuto NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Insumos
CREATE TABLE insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) NOT NULL,
    precio_unitario NUMERIC(15, 2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLAS TRANSACCIONALES

-- Tabla Principal de Registros (MO e Insumos)
CREATE TABLE registros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('MO', 'INSUMO')),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Campos específicos de Mano de Obra (MO)
    colaborador_id UUID REFERENCES colaboradores(id) ON DELETE RESTRICT,
    hora_inicio TIME,
    hora_fin TIME,
    minutos_calculados INTEGER, -- Se calcula mediante un trigger para manejar medianoche
    
    -- Campos específicos de Insumos
    insumo_id UUID REFERENCES insumos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) CHECK (cantidad > 0),
    
    -- Totales y auditoría
    total_calculado NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    descripcion TEXT,
    creado_por VARCHAR(100) NOT NULL, -- Usuario que hace el registro
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricción a nivel de fila para garantizar integridad lógica
    CONSTRAINT chk_mo_requiere_colaborador CHECK (
        (tipo = 'MO' AND colaborador_id IS NOT NULL AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL AND insumo_id IS NULL AND cantidad IS NULL) OR
        (tipo = 'INSUMO' AND insumo_id IS NOT NULL AND cantidad IS NOT NULL AND colaborador_id IS NULL AND hora_inicio IS NULL AND hora_fin IS NULL)
    )
);

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_registros_proyecto_id ON registros(proyecto_id);
CREATE INDEX idx_registros_fecha ON registros(fecha);
CREATE INDEX idx_proyectos_cliente_id ON proyectos(cliente_id);

-- 5. TABLA DE AUDITORÍA (LOGS)
CREATE TABLE logs_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabla_afectada VARCHAR(50) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    usuario VARCHAR(100) NOT NULL,
    fecha_accion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    detalles JSONB
);

-- 6. FUNCIONES Y TRIGGERS (Lógica de Negocio en DB)

-- Función para calcular minutos de MO (Cruce de medianoche)
CREATE OR REPLACE FUNCTION calcular_total_registro()
RETURNS TRIGGER AS $$
DECLARE
    minutos_dif INTEGER;
    tarifa NUMERIC;
    precio NUMERIC;
BEGIN
    IF NEW.tipo = 'MO' THEN
        -- Calcular diferencia en minutos
        minutos_dif := EXTRACT(EPOCH FROM (NEW.hora_fin - NEW.hora_inicio)) / 60;
        
        -- Si es negativo, significa que cruzó la medianoche (+24 horas = 1440 min)
        IF minutos_dif < 0 THEN
            minutos_dif := minutos_dif + 1440;
        END IF;
        
        -- Obtener tarifa del colaborador
        SELECT tarifa_minuto INTO tarifa FROM colaboradores WHERE id = NEW.colaborador_id;
        
        NEW.minutos_calculados := minutos_dif;
        NEW.total_calculado := minutos_dif * tarifa;
        
    ELSIF NEW.tipo = 'INSUMO' THEN
        -- Obtener precio del insumo
        SELECT precio_unitario INTO precio FROM insumos WHERE id = NEW.insumo_id;
        NEW.total_calculado := NEW.cantidad * precio;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta ANTES de insertar o actualizar un registro
CREATE TRIGGER trigger_calcular_total
BEFORE INSERT OR UPDATE ON registros
FOR EACH ROW EXECUTE FUNCTION calcular_total_registro();

-- 7. VISTAS (Views) PARA EL DASHBOARD

CREATE OR REPLACE VIEW reporte_costos_proyectos AS
SELECT 
    p.id AS proyecto_id,
    p.nombre AS nombre_proyecto,
    c.nombre AS nombre_cliente,
    p.estado,
    COALESCE(SUM(CASE WHEN r.tipo = 'MO' THEN r.total_calculado ELSE 0 END), 0) AS total_mo,
    COALESCE(SUM(CASE WHEN r.tipo = 'INSUMO' THEN r.total_calculado ELSE 0 END), 0) AS total_insumos,
    COALESCE(SUM(r.total_calculado), 0) AS costo_total
FROM 
    proyectos p
JOIN 
    clientes c ON p.cliente_id = c.id
LEFT JOIN 
    registros r ON p.id = r.proyecto_id
GROUP BY 
    p.id, p.nombre, c.nombre, p.estado;

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
