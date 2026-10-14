// models/external-system.model.ts
export interface ExternalSystem {
    id: string;
    numericId?: number | null;
    name: string;
    url?: string;
    loginURL?: string;
    getUsersURL?: string;
    adminUserName?: string;
    adminPassword?: string;
    isAnglarSystem: boolean;
  }
  
  export interface SystemAccount {
    id: string;
    externalSystemId: string;
    externalSystemName: string;
    userName: string;
    status?: string;
    isActive: boolean;
  }
  
  export interface ExternalLoginRequest {
    username: string;
    password: string;
  }
  
  export interface ExternalUserDTO {
    username: string;
    employeeNumber: number;
    isDisabled: boolean;
  }
  
  export interface ExternalUserRequest {
    username: string;
    employeeId: string;
    externalSystemId: string;
    employeeNumber: number;
    isDisabled: boolean;
  }
  
  export interface ExternalUserFromExcel {
    externalSystemId: string;
    excel: File;
  }
  
  export interface ExternalSystemRequest {
    name: string;
    url?: string;
    loginURL?: string;

    usersURL?: string;
    adminUserName?: string;
    adminPassword?: string;
    isAnglarSystem?: boolean;
  }
  
  export interface SystemFromExcelRequest {
    externalSystemId: string;
    excel: File;
  }