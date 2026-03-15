---
plan: "07"
phase: 1
wave: 4
depends_on: ["06"]
autonomous: false
files_modified:
  - apps/web/src/components/publisher/PublishModal.tsx
  - apps/web/src/components/publisher/PublishForm.tsx
  - apps/web/src/components/publisher/HeroShotSelector.tsx
  - apps/web/src/components/publisher/PublicationStatus.tsx
  - apps/web/src/lib/api/publisherApi.ts
  - apps/web/src/stores/publisherStore.ts
  - apps/web/src/app/dashboard/catalog/page.tsx
requirements: [PUBLISH-01, PUBLISH-04, PUBLISH-05, PUBLISH-06, PUBLISH-07, PUBLISH-09, PUBLISH-10]
estimated_tasks: 3

must_haves:
  truths:
    - "Vendedor clicks 'Publicar' button on catalog row → modal opens without losing list position"
    - "Modal pre-fills title (year/make/model), description, price, ZIP from vehicle data"
    - "Hero Shot selector: click on image moves it to index 0 with 'PORTADA' badge"
    - "Facebook Page dropdown shows connected pages for the vendedor"
    - "Frontend validates: price > 0, at least one image, page selected (Zod) before API call"
    - "After submit, modal closes, row shows 'Pending/Publishing' badge"
    - "Vendedor sees 'Actualizar' button on published vehicles (not 'Publicar')"
    - "Update modal shows price diff (current FB price vs new ProSell price)"
    - "'Eliminar/Finalizar' button inside update modal triggers delete flow"
    - "Category B error shows red badge + 'Facebook solicita validación de seguridad' message"
    - "'Ya validé mi cuenta de Facebook' checkbox available for Category B recovery"
  artifacts:
    - path: "apps/web/src/components/publisher/PublishModal.tsx"
      provides: "Radix Dialog modal with Publish and Update modes"
    - path: "apps/web/src/components/publisher/PublishForm.tsx"
      provides: "RHF+Zod form with all modal fields"
    - path: "apps/web/src/components/publisher/HeroShotSelector.tsx"
      provides: "Image grid with click-to-hero functionality and PORTADA badge"
    - path: "apps/web/src/components/publisher/PublicationStatus.tsx"
      provides: "Status badge component for catalog row"
  key_links:
    - from: "apps/web/src/app/dashboard/catalog/page.tsx"
      to: "apps/web/src/components/publisher/PublishModal.tsx"
      via: "modal rendered at page level (portal), not inside row component"
      pattern: "PublishModal"
    - from: "apps/web/src/components/publisher/PublishForm.tsx"
      to: "apps/web/src/lib/api/publisherApi.ts"
      via: "useMutation calling publishVehicle() on submit"
      pattern: "publishVehicle"
---

<objective>
Build the frontend publishing flow: publish modal, hero shot selector, status badges, and catalog integration.

Purpose: The backend is complete — this plan wires the UI that vendedores use daily. The UX decisions (modal overlay preserving list position, simple click for hero shot, category B blocking UI) were locked in CONTEXT.md.
Output: PublishModal, PublishForm, HeroShotSelector, PublicationStatus badge, publisherApi client, catalog page integration.
</objective>

<execution_context>
@/home/rpadron/.claude/get-shit-done/workflows/execute-plan.md
@/home/rpadron/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-hybrid-publisher/01-CONTEXT.md
@.planning/phases/01-hybrid-publisher/01-RESEARCH.md
@apps/web/src/app/dashboard/catalog/page.tsx
@apps/web/src/components/ui
@apps/web/src/lib/api

<interfaces>
From backend API (Plan 06):
```
POST   /api/v1/publisher/{product_id}/publish   → 202 PublicationResponse
PATCH  /api/v1/publisher/{publication_id}       → 200 PublicationResponse
DELETE /api/v1/publisher/{publication_id}       → 200 PublicationResponse
POST   /api/v1/publisher/{publication_id}/unlock → 200 PublicationResponse
```

PublicationResponse shape:
```typescript
interface PublicationResponse {
  id: string;
  product_id: string;
  status: "pending" | "publishing" | "published" | "failed" | "expired" | "sold";
  strategy_used?: string;
  fb_listing_id?: string;
  error_message?: string;
  error_category?: "transient" | "blocking";
  blocked_until_confirmed: boolean;
}
```

From CONTEXT.md (locked):
- Hero Shot: click to move to index 0 with "PORTADA" badge — simple click, NOT drag & drop
- Modal rendered at page level (not row level) — prevents re-render from closing modal
- "Preparar Publicación" → modal → review + edit → Submit → modal closes → row shows Pending
- If listing exists: button shows "Actualizar", modal shows price diff
- "Eliminar/Finalizar" is a secondary button inside the "Actualizar" modal
- Category B: red badge + "Facebook solicita validación de seguridad. Abrí tu cuenta..."
- Category B recovery: checkbox "Ya validé mi cuenta de Facebook" → calls unlock endpoint
</interfaces>
</context>

<tasks>

<task id="07-01" name="Task 1: Publisher API client and Zustand store">
  <objective>Create publisherApi.ts (typed API calls) and publisherStore.ts (modal open state + admin engine toggle).</objective>
  <files>
    <create>apps/web/src/lib/api/publisherApi.ts</create>
    <create>apps/web/src/stores/publisherStore.ts</create>
  </files>
  <implementation>
Read existing API client files in `apps/web/src/lib/api/` to understand the fetch/axios pattern used. Follow the same convention (base URL, auth headers, error handling).

**publisherApi.ts**:
```typescript
// lib/api/publisherApi.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PublishVehicleRequest {
  product_id: string;
  tenant_id: string;
  facebook_page_id: string;
  title: string;
  description?: string;
  price_cents: number;
  zip_code: string;
  image_urls: string[];
  hero_shot_index: number;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price_cents?: number;
}

export interface PublicationResponse {
  id: string;
  product_id: string;
  status: "pending" | "publishing" | "published" | "failed" | "expired" | "sold";
  strategy_used?: string;
  fb_listing_id?: string;
  error_message?: string;
  error_category?: "transient" | "blocking";
  blocked_until_confirmed: boolean;
}

export async function publishVehicle(
  productId: string,
  data: PublishVehicleRequest,
): Promise<PublicationResponse> {
  const res = await fetch(`${API_BASE}/api/v1/publisher/${productId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",  // send httpOnly cookie auth
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateListing(
  publicationId: string,
  data: UpdateListingRequest,
): Promise<PublicationResponse> { /* PATCH /publisher/{id} */ }

export async function deleteListing(publicationId: string): Promise<PublicationResponse> {
  /* DELETE /publisher/{id} */
}

export async function unlockCategoryB(publicationId: string): Promise<PublicationResponse> {
  /* POST /publisher/{id}/unlock */
}
```

**publisherStore.ts** (Zustand 5):
```typescript
// stores/publisherStore.ts
"use client";
import { create } from "zustand";

interface PublisherState {
  // Modal state
  selectedVehicleId: string | null;
  modalMode: "publish" | "update" | null;
  openModal: (vehicleId: string, mode: "publish" | "update") => void;
  closeModal: () => void;

  // Admin engine toggle (no redeploy required)
  engineOverride: "playwright" | "graph_api" | "auto" | null;
  setEngineOverride: (engine: "playwright" | "graph_api" | "auto" | null) => void;
}

export const usePublisherStore = create<PublisherState>((set) => ({
  selectedVehicleId: null,
  modalMode: null,
  openModal: (vehicleId, mode) => set({ selectedVehicleId: vehicleId, modalMode: mode }),
  closeModal: () => set({ selectedVehicleId: null, modalMode: null }),
  engineOverride: null,
  setEngineOverride: (engine) => set({ engineOverride: engine }),
}));
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/web && pnpm typecheck 2>&1 | grep -E "error TS" | head -10</automated>
  </verify>
</task>

<task id="07-02" name="Task 2: HeroShotSelector and PublicationStatus badge">
  <objective>Build HeroShotSelector (image grid with click-to-hero) and PublicationStatus (catalog row badge).</objective>
  <files>
    <create>apps/web/src/components/publisher/HeroShotSelector.tsx</create>
    <create>apps/web/src/components/publisher/PublicationStatus.tsx</create>
  </files>
  <implementation>
Read existing component structure under `apps/web/src/components/` to understand the naming and styling conventions (Tailwind 4, cn() utility, etc.).

**HeroShotSelector.tsx** (per CONTEXT.md: click = hero, simple click not drag):
```typescript
"use client";
import { cn } from "@/lib/utils";

interface HeroShotSelectorProps {
  images: string[];
  heroIndex: number;
  onHeroChange: (index: number) => void;
}

export function HeroShotSelector({ images, heroIndex, onHeroChange }: HeroShotSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {images.map((url, index) => (
        <button
          key={url}
          type="button"
          onClick={() => onHeroChange(index)}
          className={cn(
            "relative aspect-square rounded-lg overflow-hidden border-2",
            index === heroIndex
              ? "border-blue-500 ring-2 ring-blue-300"
              : "border-transparent hover:border-gray-300",
          )}
        >
          <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
          {index === heroIndex && (
            <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
              PORTADA
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

**PublicationStatus.tsx** — badge component for catalog row:
```typescript
import { cn } from "@/lib/utils";

type PublicationStatusType =
  | "pending"
  | "publishing"
  | "published"
  | "failed"
  | "expired"
  | "sold"
  | null;

interface PublicationStatusProps {
  status: PublicationStatusType;
  errorCategory?: "transient" | "blocking" | null;
  blockedUntilConfirmed?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
  publishing: { label: "Publicando...", className: "bg-blue-100 text-blue-800 animate-pulse" },
  published: { label: "Publicado", className: "bg-green-100 text-green-800" },
  failed: { label: "Error", className: "bg-red-100 text-red-800" },
  expired: { label: "Expirado", className: "bg-gray-100 text-gray-600" },
  sold: { label: "Vendido", className: "bg-purple-100 text-purple-800" },
} as const;

export function PublicationStatus({ status, errorCategory, blockedUntilConfirmed }: PublicationStatusProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  const isBlocked = status === "failed" && errorCategory === "blocking";

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.className)}>
      {isBlocked ? "Atención Requerida" : config.label}
    </span>
  );
}
```
  </implementation>
  <verify>
    <automated>cd /home/rpadron/proy/prosell-sass/apps/web && pnpm typecheck 2>&1 | grep -c "error TS" | head -1</automated>
  </verify>
</task>

<task id="07-03" name="Task 3: PublishModal + PublishForm + catalog integration">
  <objective>Build PublishModal (Radix Dialog, dual publish/update mode), PublishForm (RHF+Zod), and integrate into catalog page with publish/update buttons per row.</objective>
  <files>
    <create>apps/web/src/components/publisher/PublishModal.tsx</create>
    <create>apps/web/src/components/publisher/PublishForm.tsx</create>
    <modify>apps/web/src/app/dashboard/catalog/page.tsx</modify>
  </files>
  <implementation>
Read the existing `catalog/page.tsx` to understand the current data structure and how products are listed.

**PublishForm.tsx** — RHF + Zod form (inside modal):

Zod schema (per CONTEXT.md locked validation):
```typescript
const publishSchema = z.object({
  title: z.string().min(5, "Título mínimo 5 caracteres").max(500),
  description: z.string().min(10, "Descripción mínima 10 caracteres").max(5000).optional(),
  price_cents: z.number().int().positive("Precio debe ser mayor a 0"),
  facebook_page_id: z.string().uuid("Seleccioná una página de Facebook"),
  hero_shot_index: z.number().int().min(0),
  zip_code: z.string().min(5).max(10),
});
```

Form includes: title input, description textarea, price input (in USD, converted to cents on submit), Facebook Page dropdown, HeroShotSelector, ZIP code input.

**PublishModal.tsx** — Radix Dialog at page level (per CONTEXT.md pitfall warning):

```typescript
"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publishVehicle, updateListing, deleteListing, unlockCategoryB } from "@/lib/api/publisherApi";
import { PublishForm } from "./PublishForm";

interface PublishModalProps {
  vehicleId: string | null;
  mode: "publish" | "update" | null;
  vehicleData?: {
    title: string;
    description?: string;
    price_cents: number;
    zip_code: string;
    image_urls: string[];
    tenant_id: string;
  };
  currentPublication?: PublicationResponse | null;
  onClose: () => void;
}

export function PublishModal({ vehicleId, mode, vehicleData, currentPublication, onClose }: PublishModalProps) {
  const queryClient = useQueryClient();
  const isOpen = mode !== null && vehicleId !== null;

  const publishMutation = useMutation({
    mutationFn: (data: PublishVehicleRequest) => publishVehicle(vehicleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(currentPublication!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl p-6 z-50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {mode === "publish" ? "Preparar Publicación" : "Actualizar Publicación"}
          </Dialog.Title>

          {/* Category B error — blocking recovery UI */}
          {currentPublication?.blocked_until_confirmed && (
            <CategoryBErrorBanner
              publicationId={currentPublication.id}
              onUnlocked={() => queryClient.invalidateQueries({ queryKey: ["catalog"] })}
            />
          )}

          <PublishForm
            mode={mode!}
            vehicleData={vehicleData}
            currentPublication={currentPublication}
            onSubmit={(data) => publishMutation.mutate(data)}
            onDelete={mode === "update" ? () => deleteMutation.mutate() : undefined}
            isSubmitting={publishMutation.isPending}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CategoryBErrorBanner({ publicationId, onUnlocked }: { publicationId: string; onUnlocked: () => void }) {
  const [checked, setChecked] = useState(false);
  const unlockMutation = useMutation({
    mutationFn: () => unlockCategoryB(publicationId),
    onSuccess: onUnlocked,
  });

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <p className="text-red-800 text-sm font-medium">
        Facebook solicita validación de seguridad. Abrí tu cuenta en un navegador para resolver el desafío.
      </p>
      <label className="flex items-center gap-2 mt-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span className="text-sm text-red-700">Ya validé mi cuenta de Facebook</span>
      </label>
      <button
        disabled={!checked || unlockMutation.isPending}
        onClick={() => unlockMutation.mutate()}
        className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded disabled:opacity-50"
      >
        Desbloquear y Reintentar
      </button>
    </div>
  );
}
```

**catalog/page.tsx** — Add modal at page level (not row level):

```typescript
// At page level, not inside row:
const { selectedVehicleId, modalMode, openModal, closeModal } = usePublisherStore();

// In the JSX:
<PublishModal
  vehicleId={selectedVehicleId}
  mode={modalMode}
  vehicleData={selectedVehicle}
  currentPublication={selectedVehiclePublication}
  onClose={closeModal}
/>

// Per row, add a button:
<button onClick={() => openModal(vehicle.id, hasPublication ? "update" : "publish")}>
  {hasPublication ? "Actualizar" : "Preparar Publicación"}
</button>
<PublicationStatus status={vehicle.publication?.status} errorCategory={vehicle.publication?.error_category} />
```
  </implementation>
  <verify>
    <manual>
1. Start `cd apps/web && pnpm dev`
2. Log in as vendedor
3. Navigate to dashboard catalog
4. Click "Preparar Publicación" on a vehicle row — modal should open without losing list scroll position
5. Verify modal pre-fills title, description, price, ZIP from vehicle data
6. Click on an image to set as hero shot — "PORTADA" badge appears on selected image
7. Fill remaining required fields, click Submit
8. Modal should close; row should show "Pendiente" badge
9. If vehicle already has active publication: button shows "Actualizar", modal shows price diff
10. Inside update modal: "Eliminar/Finalizar" button visible as secondary action
    </manual>
  </verify>
</task>

</tasks>

<verification>
Checkpoint: human verification of the complete publishing flow.
</verification>

<success_criteria>
- [ ] Modal opens from catalog row without page navigation (overlay)
- [ ] Modal pre-fills all fields from vehicle data
- [ ] Click-to-hero works: image moves to index 0, PORTADA badge visible
- [ ] Zod validation blocks submit when price=0, no page selected, or no images
- [ ] After submit: modal closes, row shows "Pendiente" badge
- [ ] Published vehicles show "Actualizar" button (not "Publicar")
- [ ] Update modal shows current FB price vs ProSell price
- [ ] Eliminar/Finalizar button visible inside update modal
- [ ] Category B error shows Spanish message and confirmation checkbox
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
</success_criteria>

<output>
After completion, create `.planning/phases/01-hybrid-publisher/01-07-SUMMARY.md`
</output>
