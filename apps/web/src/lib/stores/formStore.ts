import { create } from "zustand";

interface FormWizardState {
  currentStep: number;
  formData: Record<string, unknown>;
  setStep: (step: number) => void;
  updateData: (data: Record<string, unknown>) => void;
  reset: () => void;
}

/**
 * Form wizard state store (Zustand 5)
 *
 * Persists form data across wizard steps.
 * ponytail: no localStorage persistence (add if needed)
 */
export const useFormWizardStore = create<FormWizardState>((set) => ({
  currentStep: 0,
  formData: {},
  setStep: (step) => set({ currentStep: step }),
  updateData: (data) =>
    set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => set({ currentStep: 0, formData: {} }),
}));
