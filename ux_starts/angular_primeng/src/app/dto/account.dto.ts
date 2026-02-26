export interface CreateAccountDto {
  username: string;
  password: string;
  email: string;
  fullName: string;
}

export interface UpdateAccountDto {
  email?: string;
  fullName?: string;
  password?: string;
}

export interface AccountQueryDto {
  tenantId?: string;
}

export interface AddUserToTenantDto {
  userId: string;
  tenantId?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
