export interface EntityResponse {
  id: string;                 // Guid
  createdAt: string;          // ISO Date string
  lastUpdatedAt?: string;     // nullable
  isDeleted: boolean;
  createdBy?: string;
  lastUpdateBy?: string;
  numericId?:number;

}

export interface stringDTO{
  name:string;
}

export interface messageresponse {
  message:string;
}

export interface PaginatedResponse<T>{
  data: T[];
  filteredCount: number;
  page: number;
  pageSize: number;
  totalRecords: number;
}
export interface pageobject{
  
}