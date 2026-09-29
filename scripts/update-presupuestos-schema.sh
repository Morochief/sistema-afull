#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# update-presupuestos-schema.sh
# Sincroniza el schema de Presupuestos (costoTotal, venta1, venta2,
# categoria, horas, tarifa) con la base de datos.
# ═══════════════════════════════════════════════════════════════
set -e

cd /mnt/d/sistema-afull-googleia

echo "═════════════════════════════════════════════════════════"
echo "  Actualización de schema — Presupuestos"
echo "═════════════════════════════════════════════════════════"

# ─── 1. Detener el dev server (libera el DLL de Prisma) ───
echo ""
echo "[1/4] Deteniendo procesos node/tsx del dev server..."
PIDS=$(ps aux 2>/dev/null | grep -iE "tsx server\.ts|node.*server\.ts" | grep -v grep | awk '{print $2}')
if [ -n "$PIDS" ]; then
  echo "  → PIDs encontrados: $PIDS"
  # En WSL, los procesos corren via /init → matamos el grupo
  kill $PIDS 2>/dev/null || true
  sleep 2
  # Verificar
  REMAIN=$(ps aux 2>/dev/null | grep -iE "tsx server\.ts|node.*server\.ts" | grep -v grep | awk '{print $2}')
  if [ -n "$REMAIN" ]; then
    echo "  → Procesos aún activos, forzando kill -9..."
    kill -9 $REMAIN 2>/dev/null || true
    sleep 1
  fi
  echo "  ✓ Dev server detenido"
else
  echo "  ✓ No había dev server corriendo"
fi

# ─── 2. prisma generate ───
echo ""
echo "[2/4] Regenerando Prisma Client..."
npx prisma generate
echo "  ✓ Prisma Client generado"

# ─── 3. prisma db push ───
echo ""
echo "[3/4] Sincronizando schema con la base de datos..."
echo "  (Esto agrega: costo_total, venta_1, venta_2, categoria, horas, tarifa)"
npx prisma db push
echo "  ✓ Base de datos actualizada"

# ─── 4. Verificación ───
echo ""
echo "[4/4] Verificando tipos TypeScript..."
ERRORS=$(npx tsc --noEmit 2>&1 | grep -i "presupuesto" | head -10)
if [ -z "$ERRORS" ]; then
  echo "  ✓ Sin errores de tipo en presupuestos"
else
  echo "  ⚠ Errores encontrados:"
  echo "$ERRORS"
fi

echo ""
echo "═════════════════════════════════════════════════════════"
echo "  ✓ ACTUALIZACIÓN COMPLETA"
echo "═════════════════════════════════════════════════════════"
echo ""
echo "Ahora reiniciá el dev server con:  npm run dev"
