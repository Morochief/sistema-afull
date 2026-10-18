---
name: optimistic-ui-updates
description: Apply changes locally before the server confirms, then reconcile or roll back honestly when it does not. Use when latency makes a correct-but-slow interface feel broken.
---

# Optimistic UI Updates

Waiting for a round trip makes an interface feel dead. Applying the change immediately makes it feel instant, at the cost of occasionally being wrong, and the entire discipline is in how you handle being wrong.

## Method

1. **Apply optimistically only where failure is unlikely and reversible.**  
   Toggling a setting or changing a task status: yes. Charging a card or hard-deleting database records: no. The rule is whether an incorrect display would mislead the user into a consequential decision.

2. **Keep the pending state distinguishable internally.**  
   The renderer may show it as done while the model knows it is unconfirmed, which is what makes rollback possible. Keep a snapshot of previous state.

3. **Reconcile with the server's response, do not just accept it.**  
   The authoritative result may differ in ways beyond success, such as a normalized value, server-assigned timestamp or id. Reconcile gracefully.

4. **Roll back visibly and explain.**  
   A silent revert makes users believe they imagined the action; display what failed via toast notifications and offer a retry.

5. **Preserve user input on failure.**  
   Whatever the user typed (notes, observations, form fields) must survive the rollback, since retyping is the most frustrating outcome.

6. **Handle ordering of concurrent optimistic updates.**  
   Two rapid changes to the same field can resolve out of order, so the last intent must win rather than the last response.

7. **Set a timeout for the unconfirmed state.**  
   An update pending forever is a silent failure; after a bounded wait it becomes an error the user can act on.

## Boundaries in Sistema aFull

- **Allowed for Optimistic Updates:**  
  - Task state toggles (`MisTareas.tsx` - PENDIENTE -> EN_PROCESO -> PAUSADA -> COMPLETADA).  
  - Entity active/inactive toggles (colaboradores, clientes, proyectos).  
  - Checklists and non-destructive operational states.
- **Forbidden for Optimistic Updates:**  
  - Financial, cost or budget balance calculations.  
  - Permanent deletions (`?hard=true`).  
  - Batch Excel import and database migrations.
