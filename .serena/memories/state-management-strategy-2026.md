# State Management Strategy - ProSell SaaS 2026

## Estrategia Híbrida: Zustand + SWR

**Fecha**: 2026-02-17
**Contexto**: Arquitectura óptima para Next.js 16 + React 19 en 2026

---

## 🎯 Principio Fundamental

> "No tienes que elegir uno y borrar el otro. La arquitectura más sólida para Next.js en 2026 es repartir las tareas."

---

## 📦 Zustand (Client-Side State)

### Usar Zustand para:

#### 1. Autenticación
- **Tokens**: access_token, refresh_token
- **Datos básicos del usuario**: ID, email, nombre, rol
- **Estado de auth**: isAuthenticated, isLoading

**Por qué:**
- No cambia cada segundo
- Persistencia en localStorage
- No necesita revalidación periódica

#### 2. Preferencias de UI
- **Modo oscuro/claro**: theme
- **Sidebar**: estado abierto/cerrado
- **Layout**: preferencias de visualización

**Por qué:**
- Es state puramente del cliente
- No viene del servidor
- Cambia por interacción directa del usuario

#### 3. Formularios Complejos
- **Estado temporal**: mientras el usuario escribe
- **Steppers**: paso actual del formulario
- **Validation state**: errores, touched fields

**Por qué:**
- Estado efímero (no se persiste)
- Alta frecuencia de updates
- No necesita cache ni revalidación

---

## 🌐 SWR (Server State)

### Usar SWR para:

#### 1. Todo lo que venga de Base de Datos
- **Posts/Artículos**: listados, detalles
- **Productos**: catálogo, precios, stock
- **Configuraciones del equipo**: settings por tenant
- **Notificaciones**: alerts, messages
- **Analytics**: métricas, estadísticas

**Por qué:**
- Viene del servidor (API)
- Puede quedar obsoleto (stale)
- Necesita revalidación periódica
- Se comparte entre componentes

#### 2. Datos que cambian frecuentemente
- **Real-time data**: precios, stock, notificaciones nuevas
- **Datos multi-usuario**: lo que un usuario modifica afecta a otros
- **Listados con filtros**: búsqueda, paginación

**Por qué:**
- SWR maneja cache + revalidation automáticamente
- Deduplicación de requests (mismo key = 1 request)
- Background refetch

---

## 🔄 Patrón de Combinación

### Ejemplo: Dashboard de Usuario

```typescript
// ✅ CORRECTO - Zustand para auth + SWR para datos
function Dashboard() {
  // Zustand - Auth state (cliente)
  const { user, isAuthenticated } = useAuthStore();

  // SWR - Server data (viene de BD)
  const { data: posts } = useSWR('/api/posts', fetcher);
  const { data: notifications } = useSWR('/api/notifications', fetcher);

  if (!isAuthenticated) return <Login />;

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <PostsList posts={posts} />
      <Notifications notifications={notifications} />
    </div>
  );
}
```

### Ejemplo: Formulario de Producto

```typescript
// ✅ CORRECTO - Zustand para form state + SWR para datos existentes
function ProductForm({ productId }: { productId: string }) {
  // SWR - Datos del producto (servidor)
  const { data: product } = useSWR(`/api/products/${productId}`, fetcher);

  // Zustand - Estado temporal del formulario (cliente)
  const { formData, setFieldValue, errors } = useFormStore();

  // SWR mutation - Para guardar
  const { trigger, isMutating } = useSWRMutation(
    `/api/products/${productId}`,
    updateProduct
  );

  const handleSubmit = () => {
    trigger(formData); // SWR mutation
  };

  return <Form fields={formData} onChange={setFieldValue} />;
}
```

---

## ⚠️ Errores Comunes a EVITAR

### ❌ NO usar Zustand para server state

```typescript
// ❌ MAL - Productos en Zustand
const useProductStore = create((set) => ({
  products: [],
  fetchProducts: async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    set({ products: data }); // Sin cache, sin revalidation
  },
}));

// ✅ BIEN - Productos con SWR
function ProductsList() {
  const { data: products } = useSWR('/api/products', fetcher);
  // Cache automática, revalidation, deduplicación
}
```

### ❌ NO usar SWR para UI preferences

```typescript
// ❌ MAL - Theme en SWR (innecesario)
const { data: theme } = useSWR('theme', fetcher);

// ✅ BIEN - Theme en Zustand
const { theme, setTheme } = useThemeStore();
```

---

## 📊 Resumen de Decisión

| ¿Dónde guardar el dato? | Pregunta clave | Solución |
|------------------------|----------------|----------|
| **¿Viene del servidor?** | Sí → ¿Puede quedar obsoleto? | SWR |
| **¿Es solo del cliente?** | Sí → ¿Persiste entre sesiones? | Zustand + persist |
| **¿Es efímero/temporal?** | Sí → ¿Alta frecuencia de updates? | Zustand sin persist |
| **¿Se comparte entre componentes?** | Sí → ¿Es auth/UI preference? | Zustand |
| **¿Se comparte entre componentes?** | Sí → ¿Viene de BD? | SWR |

---

## 🚀 Beneficios de Esta Arquitectura

1. **Separación de responsabilidades**: Cada herramienta hace lo que mejor sabe hacer
2. **Performance**: SWR cachea server state, Zustand no bloquea el render
3. **Mantenibilidad**: Código predecible, fácil de razonar
4. **Escalabilidad**: Fácil agregar nuevos features sin refactorizar

---

## 📚 Referencias

- [SWR Documentation](https://swr.vercel.app)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)
- [State Management Strategy](https://kentcdodds.com/blog/application-state-management-with-react)

---

**Última actualización**: 2026-02-17
**Autor**: rpadron
