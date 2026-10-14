export interface CreateAccountRequest {
  userName: string;
  password: string;
  email?: string | null;
  employeeId: string;            // Guid as string in Angular
  permissions: string[];
  roles: string[];
}

export interface LoginToAccountRequest {
  userNameOrEmail: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expires: string;               // DateTime comes as ISO string
}

export interface CreateRoleRequest {
  roleName: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  roleName: string;
  roleId?: string | null;        // Identity role id is string in your backend
  permissions: string[];
}

export interface AddRoleRequest {
  userId: string;                // Guid as string
  userName?: string | null;
  roleName: string;
  roleId?: string | null;        // you typed Guid? in C#, but Identity role id is string
}

export type RolesDictionary = Record<string, string>; // { [roleId]: roleName }
export type UsersDictionary = Record<string, string>; // { [userId]: userName }
export enum UserRole {
  Admin = 0,
  User = 1,
  Manager = 2,
  Employee = 3,
}

export interface Employee{
  id:string;
  nameEn:string;
  employeeNumber:string;
  manager?:Employee;
  SubOrdinates?:Employee[];
}


export interface UserResponseDTO{

  id:string;

  employeeNumber:number;
  employeeId:string;
  employeeName:string;
  picture:string;
  isDisabled:boolean;
  systems:Record<string,string>;
  userName:string;
  email:string;
  managerName:string;

}

export interface userresponseviewDTO{
  employeeNumber:number;
  userId:string;
  userName:string;
  employeeId:string;
  employeeName:string;
  email:string;
  picture?: string | null;
}


/** GET Auth/GetUserDetails/{employeeId} — supports PascalCase or camelCase JSON */
export interface UserDetails {
  employeeNumber: number;
  userName?: string;
  UserName?: string;
  email?: string | null;
  picture?: string | null;
  isDisabled?: boolean;
  managerName?: string | null;
  systems?: Record<string, string>;
}

export interface changepasswordDto{
  oldPassword:string;
  newPassword:string;
  confirmNewPassword:string;
}