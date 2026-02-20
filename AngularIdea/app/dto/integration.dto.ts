export type IntegrationType =
  | 'github_repo'
  | 'github_project'
  | 'azure_devops_project';

export type IntegrationStatus = 'disconnected' | 'connected' | 'error';

/**
 * Integration instance (per-tenant). A tenant can have multiple integrations of the same type.
 * This aligns with shared-docs/INTEGRATIONS.md and shared-docs/API_DOCUMENTATION.md.
 */
export interface IntegrationDto {
  name: string;
  type: IntegrationType;

  /** Optional human description */
  description?: string;

  /** Optional status used by UI */
  status?: IntegrationStatus;

  /** Optional project links (if we support explicit project ↔ integration linking) */
  projectIds?: string[];

  /** Provider-specific configuration (stored as JSON) */
  config?: Record<string, any>;

  /** Reference to stored credentials (server-side); keep as a string token/id */
  credentialsRef?: string;

  createdAt?: string;
  updatedAt?: string;
}

