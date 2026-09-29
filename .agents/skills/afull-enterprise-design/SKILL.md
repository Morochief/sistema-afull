---
name: afull-enterprise-design
description: "Estándares oficiales de diseño UX/UI para el Sistema aFull. Define la paleta de colores Negro y Naranja (#090a0f, #111318, #ea580c), radios estrictos de 4px a 6px (rounded-md / rounded), eliminación absoluta de tonos azules en controles y comboboxes, y reglas de microinteracciones enterprise."
---

# Sistema aFull — Enterprise Industrial Design System

Esta skill establece la guía definitiva de diseño visual y de experiencia de usuario para todas las pantallas, componentes, modales y formularios del **Sistema aFull**.

---

## 1. Filosofía de Diseño: Industrial Enterprise

El sistema abandona cualquier rasgo lúdico o infantil ("estilo juguete", esquinas sobredimensionadas rounded-3xl / rounded-2xl, sombras infladas o orbes brillantes de colores pastel).
Se adopta una estética **industrial, técnica y minimalista**, inspirada en consolas de control industrial y software enterprise de alto rendimiento (Linear, Vercel Dashboard, Datadog).

---

## 2. Paleta Oficial: Estricto Negro y Naranja (Zero Blue Policy)

### A. Superficies y Fondos
- **Fondo de Aplicación (body)**: `#090a0f` (Negro técnico profundo).
- **Paneles y Tarjetas (.glass-panel, .panel-base)**: `#111318` con borde `rgba(255, 255, 255, 0.08)`.
- **Inputs y Selects (.glass-input, .glass-select, select)**: `#0b0c10` con borde `rgba(255, 255, 255, 0.10)`.
- **Sub-tarjetas y contenedores internos**: `rgba(255, 255, 255, 0.03)` o `#171717`.

### B. Acento de Marca: Naranja Industrial
- **Color Principal**: `#ea580c` (orange-600 en Tailwind).
- **Acento / Hover**: `#f97316` (orange-500) y `#fb923c` (orange-400).
- **Fondos tenues**: `bg-orange-500/10` con borde `border-orange-500/20`.
- **Anillos de Enfoque (Focus Rings)**: `#ea580c` (`focus:border-orange-500`, `box-shadow: 0 0 0 1px #ea580c`).

### C. Regla Estricta: PROHIBIDO EL AZUL (Zero Blue Policy)
- **Comboboxes / Selects**:
  - En Windows y navegadores basados en Chromium, los `<select>` nativos suelen renderizar selecciones y estados activos en azul (`#0078d4`).
  - **REGLA**: Todo `<select>` debe heredar la clase `.glass-select` o la regla global en `index.css`:
    ```css
    :root { color-scheme: dark; accent-color: #ea580c; }
    select option:checked, select option:hover {
      background-color: #ea580c !important;
      color: #ffffff !important;
    }
    ```
  - **NUNCA** usar clases como `bg-blue-500`, `text-blue-400`, `border-blue-500`, `focus:border-blue-400` ni colores `#3b82f6` en componentes, insignias, botones ni gráficos. Reemplazar siempre por naranja (`#ea580c`) o gris neutro (`#71717a`).

---

## 3. Radios de Borde (Border Radius): Máximo 4px - 6px

| Elemento | Clase Tailwind | Medida en Píxeles | Justificación |
| :--- | :--- | :--- | :--- |
| **Paneles y Tarjetas** | `rounded-md` | 6px (`0.375rem`) | Aspecto pulido, técnico y robusto. |
| **Inputs y Selects** | `rounded-md` | 6px (`0.375rem`) | Alineación perfecta con paneles. |
| **Botones Principales** | `rounded-md` | 6px (`0.375rem`) | Clickeabilidad precisa sin efecto burbuja. |
| **Badges / Insignias** | `rounded-sm` o `rounded-md` | 2px - 6px | Identificación compacta de datos. |
| **Modales y Popups** | `rounded-md` | 6px (`0.375rem`) | Consistencia estructural con toda la ventana. |

---

## 4. Tipografía y Datos Tabulares

- **Fuente Sans**: Inter, sans-serif (`--font-sans`).
- **Fuente Mono**: JetBrains Mono, monospace (`--font-mono`). Se utiliza rigurosamente para:
  - Cifras monetarias (`Gs. 150.000`).
  - Unidades métricas y dimensiones (`135 × 247 cm`, `3.335 m²`).
  - Kilometrajes, horas, cronómetros y tags de auditoría.
- **Jerarquía de Encabezados**:
  - `text-xs` o `text-[11px]` en mayúsculas (`uppercase tracking-wider text-slate-400`) para etiquetas y metadatos.
  - `text-white font-bold` para valores clave y nombres de proyectos.
