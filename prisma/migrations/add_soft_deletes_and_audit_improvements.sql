-- CreateIndex
CREATE INDEX idx_clientes_deleted_at ON clientes(deleted_at);

-- CreateIndex
CREATE INDEX idx_proyectos_deleted_at ON proyectos(deleted_at);

-- CreateIndex
CREATE INDEX idx_insumos_deleted_at ON insumos(deleted_at);

-- CreateIndex
CREATE INDEX idx_colaboradores_deleted_at ON colaboradores(deleted_at);

-- AlterTable (agregar columnas deleted_at)
ALTER TABLE clientes ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE proyectos ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE insumos ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE colaboradores ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- AlterTable LogsAuditoria (mejorar schema)
ALTER TABLE logs_auditoria
  DROP COLUMN usuario,
  ADD COLUMN colaborador_id UUID NOT NULL,
  ADD COLUMN cambios JSONB,
  ADD COLUMN ip_address VARCHAR(45),
  ADD COLUMN user_agent VARCHAR(255),
  ALTER COLUMN accion TYPE VARCHAR(50);

-- CreateIndex
CREATE INDEX idx_logs_colaborador ON logs_auditoria(colaborador_id);
CREATE INDEX idx_logs_tabla ON logs_auditoria(tabla_afectada);
CREATE INDEX idx_logs_fecha ON logs_auditoria(fecha_accion);

-- AddForeignKey
ALTER TABLE logs_auditoria ADD CONSTRAINT logs_auditoria_colaborador_id_fkey
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
