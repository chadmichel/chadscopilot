export interface TenantDto {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTenantDto {
  name: string;
  description?: string;
  notes?: string;
}
