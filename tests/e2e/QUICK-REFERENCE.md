# Quick Reference - Tests E2E ProSell

## 🚀 Comandos Rápidos

```bash
# Ir al directorio de tests
cd /home/rpadron/proy/prosell-sass/tests/e2e

# Instalar dependencias (primera vez)
pnpm install
```

---

## 📋 Ejecutar por Módulo

### Módulo 1: Auth & Registro
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test oauth.spec.ts
```

### Módulo 2: Catálogo C3
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test categories.spec.ts products.spec.ts vehicles.spec.ts
```

### Módulo 3: VIN Decode
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test vehicle-form-vin.spec.ts
```

### Módulo 4: Leads
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test leads.spec.ts manager-leads.spec.ts
```

### Módulo 5: Appointments
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test appointments.spec.ts dealer-calendar.spec.ts
```

### Módulo 6: Features Avanzados
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test bulk-image-upload.spec.ts facebook-webhook.spec.ts
```

### Módulo 7: End-to-End Completo
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test a6-verification.spec.ts
```

---

## 🤖 Usar el Script Automatizado

```bash
# Ejecutar TODOS los módulos en orden
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh

# Ejecutar solo un módulo
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh auth       # Módulo 1
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh catalog    # Módulo 2
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh vin        # Módulo 3
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh leads      # Módulo 4
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh appointments # Módulo 5
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh advanced   # Módulo 6
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh e2e        # Módulo 7

# Ejecutar smoke tests solamente (~2 min)
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh smoke

# Saltar a módulo específico (ejecutar desde ahí)
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh all 3  # Empezar desde módulo 3
```

---

## 🔥 Smoke Tests (Más Rápido)

```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test --grep @smoke
```

**Tiempo**: ~2 minutos
**Coverage**: Auth, VehicleForm, Middleware, UI Components, Dashboard, API

---

## 🐛 Debugging

```bash
# Ver reporte HTML
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm report
# Abrir: playwright-report/index.html

# Ejecutar con UI (headful)
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test vehicle-form-vin.spec.ts --ui --headed

# Ver screenshots
ls -la screenshots/
ls -la screenshots-summary/

# Ver logs
cat test-results.log
cat test-output.log
```

---

## ⚡ Quick Commands (Copy-Paste)

```bash
# ========================================
# FULL FLOW (Todo en orden)
# ========================================
cd /home/rpadron/proy/prosell-sass/tests/e2e && \
pnpm test oauth.spec.ts && \
pnpm test categories.spec.ts && \
pnpm test products.spec.ts && \
pnpm test vehicle-form-vin.spec.ts && \
pnpm test leads.spec.ts && \
pnpm test appointments.spec.ts && \
pnpm test a6-verification.spec.ts

# ========================================
# SMOKE TESTS (Quick feedback)
# ========================================
cd /home/rpadron/proy/prosell-sass/tests/e2e && \
pnpm test --grep @smoke

# ========================================
# USAR SCRIPT AUTOMATIZADO
# ========================================
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh
```

---

## 📊 Matriz de Referencia

| Módulo | Script Command | Manual Command | Tiempo |
|--------|---------------|----------------|--------|
| 1. Auth | `run-modules.sh auth` | `pnpm test oauth.spec.ts` | 3-5 min |
| 2. Catálogo | `run-modules.sh catalog` | `pnpm test categories.spec.ts products.spec.ts` | 5-8 min |
| 3. VIN | `run-modules.sh vin` | `pnpm test vehicle-form-vin.spec.ts` | 4-6 min |
| 4. Leads | `run-modules.sh leads` | `pnpm test leads.spec.ts` | 5-7 min |
| 5. Appointments | `run-modules.sh appointments` | `pnpm test appointments.spec.ts` | 5-7 min |
| 6. Advanced | `run-modules.sh advanced` | `pnpm test bulk-image-upload.spec.ts` | 6-10 min |
| 7. E2E | `run-modules.sh e2e` | `pnpm test a6-verification.spec.ts` | 10-15 min |
| Smoke | `run-modules.sh smoke` | `pnpm test --grep @smoke` | ~2 min |
| ALL | `run-modules.sh` | — | 40-60 min |

---

## 🎯 Estrategia Recomendada

### Durante Desarrollo
```bash
# Ejecutar smoke tests después de cada cambio
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test --grep @smoke
```

### Para Verificar Feature
```bash
# Ejecutar solo el módulo del feature
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh vin
```

### Pre-Release
```bash
# Ejecutar todos los módulos
/home/rpadron/proy/prosell-sass/tests/e2e/run-modules.sh
```

---

## 🔧 Troubleshooting

### Servidor no corre
```bash
# Verificar API
curl http://localhost:8000/health

# Verificar Web
curl http://localhost:3999

# Iniciar API
cd /home/rpadron/proy/prosell-sass/apps/api
fastapi dev src/prosell/infrastructure/api/main.py
```

### Tests fallan por timeouts
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm test --timeout=60000  # 60s por test
```

### Dependencias faltan
```bash
cd /home/rpadron/proy/prosell-sass/tests/e2e
pnpm install
```

---

**Documentos Relacionados**:
- 📖 Guía completa: `MODULAR-TEST-GUIDE.md`
- 📋 Smoke tests: `SMOKE_TESTS.md`
- 📊 Reportes: `playwright-report/index.html`
