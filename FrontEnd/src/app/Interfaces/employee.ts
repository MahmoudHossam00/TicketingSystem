export interface EmployeeCache {
    id:string;
  zenId:              number;
  employeeNumber:     number;
  nameEn:             string;
  nameAr?:            string | null;
  email?:             string | null;
  manuallyAddedEmail?: string | null;
  active?:            boolean | null;

  branchId?:          number | null;

  departmentId?:      number | null;
  departmentName?:    string | null;

  positionId?:        number | null;
  positionName?:      string | null;

  businessUnitId?:    number | null;
  businessUnitName?:  string | null;

  workLocationId?:    number | null;
  workLocationName?:  string | null;

  workTypeId?:        number | null;
  workTypeName?:      string | null;

  // Dates (ISO strings from JSON)
  birthdate?:         string | null;
  hiringDate?:        string | null;
  fixingDate?:        string | null;
  terminationDate?:   string | null;

  // Personal
  gender?:            string | null;
  maritalStatus?:     string | null;
  mobileNumber?:      string | null;
  personalEmail?:     string | null;
  religion?:          string | null;
  citizen?:           boolean | null;

  // Tracking
  sourceUpdatedAt:    string;
  syncedAt:           string;

  managerId?:         string | null;
  managerName?:       string | null;
  landLineNumber?:    string | null;
}

export interface Department{
  departmentId:      number | null;
  departmentName?:    string | null;
}

export interface AddEmpProfileRequest {
  id: string;
  managerId?: string | null;
  managerEmployeeNumber?: number | null;
  email?: string | null;
  landLineNumber?: string | null;
}

export interface EmpSiteData {
  id: string;
  employeeNumber: number;
  managerId?: string;
  managerName?:string;
  email: string;
  name: string;
  landLineNumber: string;
}
