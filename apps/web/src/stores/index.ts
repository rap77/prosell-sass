export { useAuthStore } from "./authStore";
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthError,
} from "./authStore";

export { useFeatureFlagStore, DEFAULT_FLAGS } from "./featureFlagStore";
export type { FeatureFlagState } from "./featureFlagStore";

export { useOrganizationStore } from "./organizationStore";
export { useTeamStore } from "./teamStore";
export { useWalletStore } from "./walletStore";

// Re-export types from orgApi
export type {
  Organization,
  OrganizationStatus,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "@/lib/api/orgApi";

export type {
  OrganizationListParams,
  OrganizationError,
} from "./organizationStore";

// Re-export types from teamApi
export type {
  Team,
  TeamMember,
  TeamMemberRole,
  CreateTeamRequest,
  UpdateTeamRequest,
  AddTeamMemberRequest,
} from "@/lib/api/teamApi";

export type { TeamListParams, TeamError } from "./teamStore";

// Re-export types from walletApi
export type {
  Wallet,
  WalletTransaction,
  TransactionType,
  CreditWalletRequest,
  DebitWalletRequest,
} from "@/lib/api/walletApi";

export type { WalletTransactionsParams, WalletError } from "./walletStore";
