/**
 * Leads API client
 * Handles lead management for vendedores and managers
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Lead status enum - 5-state lifecycle
 */
export enum LeadStatus {
  NEW = "new",
  CONTACTED = "contacted",
  QUALIFIED = "qualified",
  APPOINTMENT_SET = "appointment_set",
  LOST = "lost",
}

/**
 * Vehicle information associated with a lead
 */
export interface LeadVehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
}

/**
 * Lead entity
 */
export interface Lead {
  id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  vehicle: LeadVehicle | null;
  message: string | null;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lead list filters
 */
export interface LeadFilters {
  status?: LeadStatus;
  search?: string;
  vendedor_id?: string;
}

/**
 * Backend lead response
 */
interface BackendLeadResponse {
  id: string;
  tenant_id: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  vehicle_id: string | null;
  vendedor_id: string | null;
  message: string | null;
  source: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Backend lead list response
 */
interface BackendLeadListResponse {
  items: BackendLeadResponse[];
  total: number;
  limit: number;
  offset: number;
}

// TODO: Add hooks in subsequent subtasks (A3.5-A3.10)
