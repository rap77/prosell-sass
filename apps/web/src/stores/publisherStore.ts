/**
 * publisherStore - Zustand store for publisher modal state
 *
 * Manages:
 * - Modal open/close state (which vehicle, which mode)
 * - Admin engine override (no redeploy required)
 */

"use client";

import { create } from "zustand";

// ============================================
// TYPES
// ============================================

const MODAL_MODE = {
  PUBLISH: "publish",
  UPDATE: "update",
} as const;

export type ModalMode = (typeof MODAL_MODE)[keyof typeof MODAL_MODE];

const ENGINE_OVERRIDE = {
  PLAYWRIGHT: "playwright",
  GRAPH_API: "graph_api",
  AUTO: "auto",
} as const;

export type EngineOverride =
  (typeof ENGINE_OVERRIDE)[keyof typeof ENGINE_OVERRIDE];

interface PublisherState {
  // Modal state
  selectedVehicleId: string | null;
  modalMode: ModalMode | null;
  openModal: (vehicleId: string, mode: ModalMode) => void;
  closeModal: () => void;

  // Admin engine toggle (runtime, no redeploy required)
  engineOverride: EngineOverride | null;
  setEngineOverride: (engine: EngineOverride | null) => void;
}

// ============================================
// STORE
// ============================================

export const usePublisherStore = create<PublisherState>((set) => ({
  // Modal state
  selectedVehicleId: null,
  modalMode: null,
  openModal: (vehicleId, mode) =>
    set({ selectedVehicleId: vehicleId, modalMode: mode }),
  closeModal: () => set({ selectedVehicleId: null, modalMode: null }),

  // Admin engine toggle
  engineOverride: null,
  setEngineOverride: (engine) => set({ engineOverride: engine }),
}));
