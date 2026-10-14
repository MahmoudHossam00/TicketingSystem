import { PaginatedResponse } from './general';
import { KPIViewDto } from './ticket';

export enum SortDirection {
  Asc = 0,
  Desc = 1
}

export enum OldTaskSortBy {
  CreatedAt = 0,
  Date = 1,
  OriginalSubject = 2,
  Company = 3,
  IssueStatus = 4,
  Type = 5
}

/** Match backend: archived row source — project vs ticket. */
export enum OldTaskType {
  Project = 0,
  Ticket = 1,
}

export interface OldTaskResponse {
  id: string;

  companyId: string;
  companyName?: string | null;

  issueTypeId: string;
  issueTypeName?: string | null;

  relatedSubModuleId: string;
  relatedSubModuleName?: string | null;

  issueCreatorId: string;
  issueCreatorName?: string | null;

  issueSolverId: string;
  issueSolverName?: string | null;

  issueStatusId: string;
  issueStatusName?: string | null;

  type: OldTaskType;

  originalSubject: string;
  originalDescription: string;

  userId: string;
  date: string;
  createdAt: string;
  /** Free-text "what was accomplished" from import / archive. */
  accomplished?: string | null;
  /** Linked KPI snapshot (camelCase JSON). */
  kpi?: KPIViewDto | null;
  /** Some APIs serialize with PascalCase; UI resolves either. */
  KPI?: KPIViewDto | null;
  kPI?: KPIViewDto | null;

}

export interface FilterOldTaskRequest {
  pagenum?: number;

  from?: string | null; // yyyy-MM-dd
  to?: string | null;   // yyyy-MM-dd

  companyId?: string | null;
  issueTypeId?: string | null;
  relatedSubModuleId?: string | null;
  issueCreatorId?: string | null;
  issueStatusId?: string | null;

  type?: OldTaskType | null;
  search?: string | null;

  sortBy?: OldTaskSortBy;
  sortDirection?: SortDirection;
}

export interface ExcelImportResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: string[];
}

export type OldTaskPaginatedResponse = PaginatedResponse<OldTaskResponse>;