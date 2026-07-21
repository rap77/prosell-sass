# SPRINT 0: Mobile-First Foundation

**Status**: APPROVED
**Sprint**: Sprint 0 (Roadmap v5.0)
**Priority**: 🔴 P0 CRITICAL
**Duration**: 1 week
**Investment**: $320
**Created**: 2026-07-21
**Branch**: `feat/sprint-0-mobile-first`

---

## 🎯 Objective

Make ProSell SaaS platform **100% functional on mobile devices** (iOS Safari + Android Chrome).

**Current Blocker**: Dealers **CANNOT use the app from mobile** — their primary tool for daily photo uploads and inventory management.

---

## 📊 Audit Summary

**Desktop Foundation**: ✅ Strong (TanStack Table, clean architecture, role-based auth)
**Mobile Implementation**: ❌ NOT IMPLEMENTED (desktop-first approach throughout)

### Critical Blockers (P0)

| Issue                                  | File                                               | Impact                     | Status     |
| -------------------------------------- | -------------------------------------------------- | -------------------------- | ---------- |
| Sidebar always fixed, no mobile drawer | `apps/web/src/components/layout/Sidebar.tsx`       | Overlaps content on mobile | ❌ Blocker |
| Tables no horizontal scroll            | `apps/web/src/components/datagrid/DataGrid.tsx`    | Data hidden off-screen     | ❌ Blocker |
| Upload missing camera API              | `apps/web/src/components/upload/ImageDropzone.tsx` | Can't take photos natively | ❌ Blocker |

### High Priority Gaps (P1)

| Issue                          | File                                                   | Impact                    | Status     |
| ------------------------------ | ------------------------------------------------------ | ------------------------- | ---------- |
| Forms single-page scroll       | `apps/web/src/components/forms/UnifiedProductForm.tsx` | 5000px+ scroll on mobile  | ⚠️ Poor UX |
| Touch gestures not implemented | Multiple components                                    | Desktop-only interactions | ⚠️ Poor UX |

### Medium Priority Gaps (P2)

| Issue                   | Impact                              | Status     |
| ----------------------- | ----------------------------------- | ---------- |
| PWA completely absent   | Not installable, no offline support | ⚠️ Missing |
| Button sizes below 44px | Touch accuracy issues               | ⚠️ Partial |

---

## 🛠️ Solution Design

### Architecture Principles

1. **Mobile-First CSS**: Start with mobile styles, enhance for desktop with `md:` breakpoints
2. **Progressive Enhancement**: Core features work on all devices, enhancements for modern browsers
3. **Touch-First Interactions**: Design for touch, add mouse/keyboard as enhancement
4. **Responsive Layout Patterns**: Drawer (sidebar), Cards (tables), Wizard (forms)

### Tech Stack

| Layer          | Technology               | Version | Usage                         |
| -------------- | ------------------------ | ------- | ----------------------------- |
| Responsive     | Tailwind CSS             | 4.0     | Mobile-first utilities        |
| Gestures       | Framer Motion            | 12.38.0 | Swipe, drag, animations       |
| PWA            | next-pwa                 | Latest  | Service worker, manifest      |
| Testing        | Vitest + Testing Library | Current | Component + integration tests |
| Mobile Testing | Playwright               | Current | Real device E2E tests         |

---

## 📋 Task Breakdown (TDD)

### **Task 2: Fix Admin Tables Horizontal Scroll** (P0)

**Problem**:

- DataGrid has fixed 600px height, no viewport awareness
- No `overflow-x-auto` on mobile
- All columns render regardless of screen size
- Touch-unfriendly for data interaction

**Solution**:

1. Add horizontal scroll container with touch support
2. Make first column (ID/actions) sticky on scroll
3. Add responsive column hiding (hide less critical columns on mobile)
4. Increase touch targets for row actions

**Files Affected**:

- `apps/web/src/components/datagrid/DataGrid.tsx` (main component)
- `apps/web/src/components/datagrid/DataGrid.test.tsx` (new tests)

**Tests to Write**:

```typescript
// apps/web/src/components/datagrid/DataGrid.test.tsx

describe("DataGrid Mobile Responsive", () => {
  it("should enable horizontal scroll on mobile viewport", () => {
    // Viewport: 375px (iPhone SE)
    // Assert: table container has overflow-x-auto
    // Assert: table width > viewport width
  });

  it("should make first column sticky during horizontal scroll", () => {
    // Scroll horizontally 200px
    // Assert: first column remains visible (sticky left-0)
  });

  it("should hide non-critical columns on mobile", () => {
    // Viewport: 375px
    // Assert: only ID, name, status, actions visible
    // Assert: created_at, updated_at hidden
  });

  it("should have touch-friendly row action buttons (min 44px)", () => {
    // Assert: action buttons >= 44px height
    // Assert: sufficient spacing between buttons (8px min)
  });

  it("should support swipe-to-reveal actions on touch devices", () => {
    // Swipe row left
    // Assert: action buttons revealed
    // Assert: swipe animation smooth
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Wrap table in `<div className="overflow-x-auto touch-pan-x">`
3. Add `sticky left-0 z-10` to first column
4. Add responsive column visibility: `hidden md:table-cell` for non-critical columns
5. Increase action button sizes to 44px min
6. Add Framer Motion swipe gesture for row actions
7. ✅ All tests pass

**Acceptance Criteria**:

- [ ] Tables scroll horizontally on mobile (<768px)
- [ ] First column sticky during scroll
- [ ] Non-critical columns hidden on mobile
- [ ] Row actions min 44px touch targets
- [ ] Swipe-to-reveal works on iOS Safari + Android Chrome

---

### **Task 3: Fix Sidebar Mobile Collapse** (P0)

**Problem**:

- Sidebar is `fixed left-0 top-0` on ALL screen sizes
- On mobile, sidebar overlaps content (takes 16-64px width)
- No hamburger menu trigger visible on mobile
- No drawer pattern implementation

**Solution**:

1. Hide sidebar on mobile (<768px) by default
2. Add hamburger button (top-left, 44px min) to toggle drawer
3. Implement drawer overlay pattern (Framer Motion slide animation)
4. Add bottom nav for quick actions (reference MobileNav.tsx pattern)
5. Backdrop blur/dim when drawer open

**Files Affected**:

- `apps/web/src/components/layout/Sidebar.tsx` (add mobile drawer logic)
- `apps/web/src/components/layout/MainLayout.tsx` (hamburger trigger)
- `apps/web/src/lib/stores/layoutStore.ts` (add mobile drawer state)
- `apps/web/src/components/layout/Sidebar.test.tsx` (new tests)

**Tests to Write**:

```typescript
// apps/web/src/components/layout/Sidebar.test.tsx

describe("Sidebar Mobile Drawer", () => {
  it("should hide sidebar by default on mobile viewport", () => {
    // Viewport: 375px
    // Assert: sidebar has className hidden md:block
    // Assert: sidebar not visible in DOM
  });

  it("should show hamburger menu on mobile", () => {
    // Viewport: 375px
    // Assert: hamburger button visible
    // Assert: button size >= 44px
  });

  it("should open drawer when hamburger clicked", () => {
    // Click hamburger
    // Assert: sidebar slides in from left (Framer Motion animation)
    // Assert: backdrop visible with blur
    // Assert: layoutStore.mobileDrawerOpen === true
  });

  it("should close drawer when backdrop clicked", () => {
    // Open drawer
    // Click backdrop
    // Assert: drawer slides out
    // Assert: layoutStore.mobileDrawerOpen === false
  });

  it("should close drawer when route changes", () => {
    // Open drawer
    // Navigate to different route
    // Assert: drawer auto-closes
  });

  it("should show sidebar normally on desktop", () => {
    // Viewport: 1024px
    // Assert: sidebar visible (no hamburger needed)
    // Assert: no drawer overlay
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Add `mobileDrawerOpen: boolean` to layoutStore
3. Update Sidebar: `className="hidden md:block"` for desktop default
4. Create `<SidebarDrawer>` component with Framer Motion:
   - `initial={{ x: '-100%' }}`
   - `animate={{ x: mobileDrawerOpen ? 0 : '-100%' }}`
   - Backdrop: `fixed inset-0 bg-black/50 backdrop-blur-sm`
5. Add hamburger button to MainLayout (top-left, z-50)
6. Auto-close drawer on route change (useEffect with pathname)
7. ✅ All tests pass

**Acceptance Criteria**:

- [ ] Sidebar hidden by default on mobile (<768px)
- [ ] Hamburger button visible and accessible (44px min)
- [ ] Drawer slides in/out with smooth animation
- [ ] Backdrop closes drawer on click
- [ ] Drawer auto-closes on navigation
- [ ] Sidebar shows normally on desktop (≥768px)

---

### **Task 4: Optimize Mobile Upload (Camera API)** (P0)

**Problem**:

- File input works but doesn't open native camera on mobile
- No `capture="environment"` attribute
- No client-side compression before upload
- 10MB max could exceed mobile data limits

**Solution**:

1. Add `capture="environment"` to file input for rear camera access
2. Add `capture="user"` option for front camera (user profile photos)
3. Implement client-side compression with browser-image-compression
4. Show progress indicator during compression + upload
5. Add WebP conversion client-side (smaller than JPEG)

**Files Affected**:

- `apps/web/src/components/upload/ImageDropzone.tsx` (add camera + compression)
- `apps/web/src/hooks/useImageUploadOptimized.ts` (client-side compression logic)
- `apps/web/src/components/upload/ImageDropzone.test.tsx` (new tests)
- `apps/web/package.json` (add browser-image-compression)

**Tests to Write**:

```typescript
// apps/web/src/components/upload/ImageDropzone.test.tsx

describe("ImageDropzone Mobile Camera", () => {
  it("should have capture attribute for mobile camera", () => {
    // Assert: input has accept="image/*"
    // Assert: input has capture="environment" (rear camera)
  });

  it("should compress image before upload", async () => {
    // Upload 5MB JPEG
    // Assert: compression triggered
    // Assert: compressed size < 1MB
    // Assert: quality degradation acceptable
  });

  it("should show progress during compression", async () => {
    // Upload large image
    // Assert: progress indicator visible
    // Assert: percentage updates (0% → 100%)
  });

  it("should convert JPEG to WebP client-side", async () => {
    // Upload JPEG
    // Assert: file converted to WebP
    // Assert: WebP size < original JPEG
  });

  it("should handle compression errors gracefully", async () => {
    // Simulate compression failure
    // Assert: fallback to original upload
    // Assert: error message shown
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Install `browser-image-compression` package
3. Update ImageDropzone input:
   ```tsx
   <input
     {...inputProps}
     accept="image/*"
     capture="environment" // Rear camera
   />
   ```
4. Add compression logic in `useImageUploadOptimized`:
   ```ts
   import imageCompression from "browser-image-compression";

   const options = {
     maxSizeMB: 1,
     maxWidthOrHeight: 1920,
     useWebWorker: true,
     fileType: "image/webp", // Convert to WebP
   };

   const compressedFile = await imageCompression(file, options);
   ```
5. Add progress callback to show compression percentage
6. Handle errors with fallback to original file
7. ✅ All tests pass

**Acceptance Criteria**:

- [ ] Camera opens natively on iOS Safari + Android Chrome
- [ ] Images compressed to <1MB before upload
- [ ] WebP conversion works (smaller file size)
- [ ] Progress indicator shows compression + upload status
- [ ] Compression errors handled gracefully (fallback)

---

### **Task 5: Optimize Forms for Mobile (Wizard)** (P1)

**Problem**:

- UnifiedProductForm is single-page scroll (could be 5000px+ on mobile)
- No visual grouping or progress indication
- All fields visible at once (overwhelming on small screens)

**Solution**:

1. Split form into logical steps (wizard pattern):
   - Step 1: Basic Info (category, year, make, model)
   - Step 2: Details (price, mileage, description)
   - Step 3: Images (upload multiple photos)
   - Step 4: Review (summary before submit)
2. Add progress indicator (step 1/4, 2/4, etc.)
3. Add Next/Previous navigation
4. Persist form state between steps (Zustand store)
5. Validate step before allowing Next

**Files Affected**:

- `apps/web/src/components/forms/UnifiedProductForm.tsx` (wizard logic)
- `apps/web/src/components/forms/FormWizard.tsx` (new reusable wizard component)
- `apps/web/src/lib/stores/formStore.ts` (new store for wizard state)
- `apps/web/src/components/forms/UnifiedProductForm.test.tsx` (new tests)

**Tests to Write**:

```typescript
// apps/web/src/components/forms/UnifiedProductForm.test.tsx

describe("UnifiedProductForm Wizard (Mobile)", () => {
  it("should show wizard steps on mobile viewport", () => {
    // Viewport: 375px
    // Assert: only Step 1 fields visible
    // Assert: progress indicator shows "1/4"
  });

  it("should validate step before allowing Next", async () => {
    // Leave required field empty (e.g., year)
    // Click Next
    // Assert: validation error shown
    // Assert: still on Step 1
  });

  it("should navigate to next step when valid", async () => {
    // Fill Step 1 fields
    // Click Next
    // Assert: Step 2 fields visible
    // Assert: progress indicator shows "2/4"
  });

  it("should persist form data when navigating back", async () => {
    // Fill Step 1, go to Step 2
    // Click Previous
    // Assert: Step 1 data still filled
  });

  it("should show summary in final step", async () => {
    // Complete Steps 1-3
    // Assert: Step 4 shows all filled data
    // Assert: Edit buttons for each step
  });

  it("should show single-page form on desktop", () => {
    // Viewport: 1024px
    // Assert: all fields visible (no wizard)
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Create `FormWizard` component:
   ```tsx
   type Step = { title: string; fields: JSX.Element; validate: () => boolean };
   function FormWizard({ steps, onSubmit }: Props) { ... }
   ```
3. Create `formStore.ts` with Zustand:
   ```ts
   interface FormWizardState {
     currentStep: number;
     formData: Record<string, any>;
     setStep: (step: number) => void;
     updateData: (data: Record<string, any>) => void;
   }
   ```
4. Split UnifiedProductForm into step components
5. Add responsive logic: `<768px` → wizard, `≥768px` → single page
6. Add progress indicator component
7. Add step validation before Next
8. ✅ All tests pass

**Acceptance Criteria**:

- [ ] Wizard shows on mobile (<768px)
- [ ] 4 steps with clear progress indicator
- [ ] Validation prevents invalid step navigation
- [ ] Form data persists between steps
- [ ] Summary step shows all data before submit
- [ ] Desktop shows single-page form (≥768px)

---

### **Task 6: Add Touch Gestures** (P1)

**Problem**:

- Framer Motion installed but not used anywhere
- No swipe, pull-to-refresh, or touch-specific interactions
- Desktop-only hover states break on touch devices

**Solution**:

1. Implement swipe-to-reveal actions on list items (leads, products)
2. Add pull-to-refresh on main data views (leads list, products list)
3. Add touch-friendly buttons (min 44px across all UI components)
4. Remove hover-only interactions (replace with touch alternatives)

**Files Affected**:

- `apps/web/src/components/leads/LeadCard.tsx` (swipe actions)
- `apps/web/src/components/products/ProductCard.tsx` (swipe actions)
- `apps/web/src/components/ui/button.tsx` (add 44px size variant)
- `apps/web/src/components/ui/RefreshTrigger.tsx` (new pull-to-refresh)
- `apps/web/src/components/leads/LeadsList.tsx` (integrate pull-to-refresh)

**Tests to Write**:

```typescript
// apps/web/src/components/leads/LeadCard.test.tsx

describe("LeadCard Touch Gestures", () => {
  it("should reveal actions on swipe left", async () => {
    // Simulate swipe left 100px
    // Assert: delete/edit buttons visible
    // Assert: background color changes
  });

  it("should hide actions on swipe right", async () => {
    // Swipe left (reveal), then swipe right
    // Assert: actions hidden
  });

  it("should trigger delete on swipe threshold", async () => {
    // Swipe left 200px (past threshold)
    // Assert: delete confirmation shown
  });
});

// apps/web/src/components/leads/LeadsList.test.tsx

describe("LeadsList Pull-to-Refresh", () => {
  it("should show refresh indicator on pull down", async () => {
    // Pull down 80px from top
    // Assert: refresh spinner visible
  });

  it("should trigger data refresh on release", async () => {
    // Pull down > threshold, release
    // Assert: refetch query called
    // Assert: loading state shown
  });
});

// apps/web/src/components/ui/button.test.tsx

describe("Button Touch Targets", () => {
  it("should have 44px height for touch variant", () => {
    // Render: <Button size="touch">Click</Button>
    // Assert: height >= 44px
    // Assert: width >= 44px (for icon buttons)
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Create `RefreshTrigger` component with Framer Motion:
   ```tsx
   <motion.div
     drag="y"
     dragConstraints={{ top: 0, bottom: 100 }}
     onDragEnd={(e, info) => {
       if (info.offset.y > 80) onRefresh();
     }}
   >
   ```
3. Add swipe gesture to LeadCard/ProductCard:
   ```tsx
   <motion.div
     drag="x"
     dragConstraints={{ left: -100, right: 0 }}
     onDragEnd={(e, info) => {
       if (info.offset.x < -80) revealActions();
     }}
   >
   ```
4. Add `size: "touch"` variant to button component (44px min)
5. Audit all hover-only states, replace with `:active` or onClick
6. ✅ All tests pass

**Acceptance Criteria**:

- [ ] Swipe-to-reveal works on lead/product cards
- [ ] Pull-to-refresh works on lists
- [ ] All buttons min 44px touch targets
- [ ] No hover-only interactions (touch alternatives exist)

---

### **Task 7: Setup PWA Basics** (P2)

**Problem**:

- No manifest.json
- No service worker
- Not installable on mobile home screen
- No offline support

**Solution**:

1. Install and configure next-pwa
2. Create manifest.json with app metadata
3. Generate PWA icons (192px, 512px)
4. Configure service worker for static asset caching
5. Add install prompt UI

**Files Affected**:

- `apps/web/next.config.ts` (next-pwa config)
- `apps/web/public/manifest.json` (new PWA manifest)
- `apps/web/public/icons/` (new PWA icons directory)
- `apps/web/src/app/layout.tsx` (manifest metadata)
- `apps/web/src/components/pwa/InstallPrompt.tsx` (new install UI)

**Tests to Write**:

```typescript
// apps/web/src/components/pwa/InstallPrompt.test.tsx

describe("PWA Install Prompt", () => {
  it("should show install button when installable", () => {
    // Mock beforeinstallprompt event
    // Assert: Install button visible
  });

  it("should trigger install on button click", async () => {
    // Click install button
    // Assert: prompt.prompt() called
    // Assert: user choice tracked
  });

  it("should hide prompt after install", async () => {
    // Install app
    // Assert: prompt hidden
    // Assert: localStorage records install
  });
});

// E2E test (Playwright)
describe("PWA Installability (E2E)", () => {
  it("should be installable on mobile browser", async () => {
    // Open app on mobile Chrome
    // Assert: manifest link in <head>
    // Assert: service worker registered
    // Assert: install prompt appears
  });
});
```

**Implementation Steps**:

1. ✅ Write failing tests
2. Install next-pwa: `pnpm add next-pwa`
3. Configure next.config.ts:
   ```ts
   import withPWA from "next-pwa";

   export default withPWA({
     dest: "public",
     register: true,
     skipWaiting: true,
   });
   ```
4. Create manifest.json:
   ```json
   {
     "name": "ProSell SaaS",
     "short_name": "ProSell",
     "description": "Vehicle Market Analysis Platform",
     "start_url": "/",
     "display": "standalone",
     "theme_color": "#000000",
     "background_color": "#ffffff",
     "icons": [...]
   }
   ```
5. Generate PWA icons (use logo-mark.png as base)
6. Create InstallPrompt component with beforeinstallprompt event
7. ✅ All tests pass

**Acceptance Criteria**:

- [ ] manifest.json served correctly
- [ ] Service worker registered and caching assets
- [ ] Installable on iOS Safari (Add to Home Screen)
- [ ] Installable on Android Chrome (Install prompt)
- [ ] App launches in standalone mode after install

---

## 🧪 Testing Strategy

### Unit Tests (Vitest + Testing Library)

- Component rendering at different viewport sizes (375px, 768px, 1024px)
- Touch gesture interactions
- Form validation logic
- Store state management

### Integration Tests

- Full form submission flow (wizard steps)
- Upload → compress → upload pipeline
- Sidebar drawer → navigation → auto-close
- PWA install flow

### E2E Tests (Playwright)

- Real mobile devices (iOS Safari, Android Chrome)
- Touch gestures on physical devices
- Camera API on real camera
- PWA install on home screen
- Offline functionality

### Manual Testing Checklist

- [ ] iPhone 13 Safari (iOS 16+)
- [ ] Android Pixel 6 Chrome (Android 12+)
- [ ] iPad tablet view
- [ ] Landscape orientation
- [ ] Slow 3G network (throttled)
- [ ] Offline mode (airplane)

---

## 📂 Files to Create/Modify

### New Files (8)

- `apps/web/src/components/forms/FormWizard.tsx`
- `apps/web/src/lib/stores/formStore.ts`
- `apps/web/src/components/ui/RefreshTrigger.tsx`
- `apps/web/src/components/pwa/InstallPrompt.tsx`
- `apps/web/public/manifest.json`
- `apps/web/public/icons/icon-192.png`
- `apps/web/public/icons/icon-512.png`
- `apps/web/public/icons/apple-touch-icon.png`

### Modified Files (10)

- `apps/web/src/components/datagrid/DataGrid.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/MainLayout.tsx`
- `apps/web/src/lib/stores/layoutStore.ts`
- `apps/web/src/components/upload/ImageDropzone.tsx`
- `apps/web/src/hooks/useImageUploadOptimized.ts`
- `apps/web/src/components/forms/UnifiedProductForm.tsx`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/next.config.ts`

### New Test Files (6)

- `apps/web/src/components/datagrid/DataGrid.test.tsx`
- `apps/web/src/components/layout/Sidebar.test.tsx`
- `apps/web/src/components/upload/ImageDropzone.test.tsx`
- `apps/web/src/components/forms/UnifiedProductForm.test.tsx`
- `apps/web/src/components/pwa/InstallPrompt.test.tsx`
- `tests/e2e/specs/mobile-pwa.spec.ts`

---

## ✅ Acceptance Criteria (from Roadmap)

Sprint 0 is **COMPLETE** when ALL of these pass:

- [ ] **Admin panel funcional 100% en iPhone/Android**
  - Sidebar drawer works
  - Tables scroll horizontally
  - Forms wizard complete

- [ ] **Upload foto desde móvil funciona**
  - Camera opens natively
  - Compression works (<1MB)
  - Progress indicator visible

- [ ] **Forms completables en mobile**
  - Wizard steps navigation
  - Validation per step
  - Data persists between steps

- [ ] **Touch gestures funcionan**
  - Swipe-to-reveal actions
  - Pull-to-refresh lists
  - All buttons ≥44px

- [ ] **PWA instalable**
  - Manifest served
  - Service worker active
  - Install prompt works
  - Launches standalone

---

## 🚨 Risks & Mitigations

| Risk                          | Probability | Impact | Mitigation                                       |
| ----------------------------- | ----------- | ------ | ------------------------------------------------ |
| Safari camera API bugs        | MEDIUM      | HIGH   | Test on real iOS device, fallback to file picker |
| Android fragmentation         | MEDIUM      | MEDIUM | Test on Android 12+, use feature detection       |
| Service worker caching issues | LOW         | MEDIUM | Clear cache strategy, versioned SW               |
| Touch gesture performance     | LOW         | MEDIUM | Use CSS transforms, requestAnimationFrame        |
| Form wizard state loss        | MEDIUM      | HIGH   | Persist to localStorage, clear recovery UX       |

---

## 📊 Success Metrics

### From Roadmap v5.0

**Mobile-First (Sprint 0)**:

- 📱 Mobile traffic: 10% → 60%+
- ⚡ Upload desde móvil: 0% → 80% dealers
- 📊 Bounce rate mobile: 70% → <30%

### Sprint 0 Specific KPIs

**Pre-Sprint 0** (Current):

- Mobile upload success rate: 0% (blocked)
- Mobile bounce rate: ~70%
- Mobile session duration: <30s (unusable)
- PWA installs: 0

**Post-Sprint 0** (Target):

- Mobile upload success rate: >80%
- Mobile bounce rate: <30%
- Mobile session duration: >3min
- PWA installs: 10+ in first week

---

## 🔄 Implementation Workflow

### Batches (TDD Approach)

**Batch 1 (P0 - Days 1-2)**: Critical Blockers

1. Task 4: Upload Camera API
2. Task 2: Tables Horizontal Scroll
3. Task 3: Sidebar Mobile Drawer

**Batch 2 (P1 - Days 3-4)**: High Priority 4. Task 5: Forms Wizard 5. Task 6: Touch Gestures

**Batch 3 (P2 - Days 5-6)**: Polish 6. Task 7: PWA Setup 7. Manual testing on real devices 8. Bug fixes and refinements

**Day 7**: Final E2E testing, PR creation, spec status update to `IMPLEMENTED`

---

## 📚 References

- [Roadmap v5.0 FINAL](../ROADMAP-V5-FINAL-2026-07-21.md)
- [MobileNav.tsx](../../apps/web/src/components/layout/MobileNav.tsx) — Good touch patterns reference
- [Apple Touch Targets](https://developer.apple.com/design/human-interface-guidelines/buttons#Specifications) — 44px minimum
- [Google Material Design Touch](https://m3.material.io/foundations/interaction/states/state-layers) — 48dp minimum
- [Next.js PWA Guide](https://github.com/shadowwalker/next-pwa)
- [Framer Motion Gestures](https://www.framer.com/motion/gestures/)
- [Testing Library Touch Events](https://testing-library.com/docs/user-event/convenience/#pointer)

---

## 📝 Notes

- **Good Foundation Found**: TanStack Table v8, Framer Motion installed, MobileNav pattern exists
- **No Major Refactoring Needed**: Clean architecture allows mobile patterns to be added incrementally
- **Reference Existing Patterns**: MobileNav.tsx has good touch-first patterns (48px buttons, bottom nav)
- **Test on Real Devices**: iOS Safari quirks require real device testing, emulators insufficient

---

**Next Steps**:

1. Review this spec for completeness
2. Get user approval
3. Update status to `APPROVED`
4. Start Batch 1 implementation with TDD

---

**Created**: 2026-07-21
**Last Updated**: 2026-07-21
**Branch**: `feat/sprint-0-mobile-first`
