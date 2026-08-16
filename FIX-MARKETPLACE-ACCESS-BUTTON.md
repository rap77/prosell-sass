# Fix: Botón "Create Access" no aparece

## Cambios realizados

1. **authStore.ts**: Agregado `organization_id` al `partialize` para que se persista en localStorage
2. **MarketplaceAccessManager.tsx**: Cambiado `user?.tenant_id` → `user?.organization_id`

## Pasos para aplicar el fix

### Opción 1: Limpiar localStorage (más rápido)

1. Abrir DevTools → Application → Local Storage
2. Eliminar las keys:
   - `auth-storage`
   - `organization-storage`
3. Hacer hard refresh (Ctrl+Shift+R)
4. Hacer login de nuevo

### Opción 2: Rebuild completo (más seguro)

```bash
# 1. Detener containers
docker compose -f docker/docker-compose.yml down

# 2. Rebuild del container web
docker compose -f docker/docker-compose.yml build web

# 3. Levantar de nuevo
docker compose -f docker/docker-compose.yml up -d

# 4. En el navegador: logout + clear localStorage + login
```

## Verificación

Después de login, en la consola del navegador:

```javascript
// Debe mostrar el organization_id (UUID)
const auth = JSON.parse(localStorage.getItem("auth-storage") || "{}");
console.log("Organization ID:", auth.state?.user?.organization_id);

// Debe mostrar el array de organizaciones (después de que TanStack Query cargue)
const org = JSON.parse(localStorage.getItem("organization-storage") || "{}");
console.log("Organizations count:", org.state?.organizations?.length);
```

Si ambos valores están OK → el botón debería aparecer.

## Root cause

- Backend retorna `tenant_id` en `/api/auth/me`
- Frontend lo mapea a `organization_id` en memoria (mapApiUserToStoreUser)
- Pero NO se persistía en localStorage (faltaba en partialize)
- Al hidratar desde localStorage, `organization_id` quedaba undefined
- MarketplaceAccessManager buscaba `user?.tenant_id` (campo que no existe)
- `prosellOrg` era null → botón no renderizaba
