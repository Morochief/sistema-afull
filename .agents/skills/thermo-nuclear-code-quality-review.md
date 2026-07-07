# Thermo-Nuclear Code Quality Review

Review de calidad extremadamente estricta enfocada en abstracciones, archivos gigantes, y crecimiento de código espagueti.

## Principios

0. **Ser ambicioso sobre simplificación estructural.** Buscar "code judo": reorganizaciones que preservan comportamiento pero hacen la implementación dramáticamente más simple, más pequeña, más directa y elegante. Preferir la solución que haga que el código parezca inevitable en retrospectiva.

1. **No permitir que un archivo pase de <1000 líneas a >1000 líneas sin razón muy fuerte.**

2. **No permitir crecimiento espagueti.** Ser altamente sospechoso de condicionales ad-hoc, casos especiales dispersos, o branches añadidos en flujos no relacionados.

3. **Sesgo hacia limpiar el diseño**, no solo aceptar código que funciona.

4. **Preferir código directo, aburrido y mantenible** sobre código mágico o hacky.

5. **Exigir limpieza en tipos y fronteras.** Cuestionar optionalidad innecesaria, `unknown`, `any`, o código con muchos casts.

6. **Mantener la lógica en la capa canónica** y reutilizar helpers existentes.

7. **Tratar orquestación secuencial innecesaria y actualizaciones no atómicas como code smells.**

## Checklist de Revisión

- [ ] ¿Hay un movimiento "code judo" que haga esto dramáticamente más simple?
- [ ] ¿El cambio mejora o empeora la arquitectura local?
- [ ] ¿Se añadió complejidad de branching donde debería haber una abstracción mejor?
- [ ] ¿Un módulo cohesivo se volvió más acoplado, stateful, o difícil de escanear?
- [ ] ¿La lógica vive en el archivo y capa correcta?
- [ ] ¿El archivo superó un límite de tamaño saludable?
- [ ] ¿Hay condicionales repetidos que señalan un modelo o helper faltante?
- [ ] ¿La implementación es directa y legible, o depende de casos especiales?
- [ ] ¿La abstracción realmente vale su peso, o es solo un wrapper?
- [ ] ¿Se introdujeron casts, optionalidad, o formas ad-hoc que obscurecen el invariante real?
- [ ] ¿La lógica está en la capa canónica o se filtró a través de una frontera?
- [ ] ¿La orquestación es más secuencial o menos atómica de lo necesario?

## Qué Reportar

| Severidad | Tipo |
|-----------|------|
| 🔴 BLOQUEANTE | Archivo pasa de <1000 a >1000 líneas, branching espagueti nuevo, abstracción innecesaria, duplicación de helpers canónicos |
| 🟡 WARNING | Oportunidad de code-judo no aprovechada, lógica en capa incorrecta, optionalidad evitable |
| 🔵 INFO | Modularidad, legibilidad, tamaño de archivo |

## Barrera de Aprobación

No aprobar solo porque el comportamiento parece correcto. Aprobar SOLO si:
- No hay regresión estructural clara
- No hay oportunidad obvia de simplificación dramática no aprovechada
- No hay explosión injustificada de tamaño de archivo
- No hay crecimiento espagueti por branching de casos especiales
- No hay abstracción hacky o mágica
- No hay duplicación de helpers canónicos evitables
- No hay fuga de frontera de arquitectura
