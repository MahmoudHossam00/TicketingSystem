import { EntityResponse } from "./general";

export interface FixedQuestionResponse extends EntityResponse {
  fixedCompetencyId: string;
  gradesTextId: string;
  description: string;
}
export interface FixedCompetencyResponse extends EntityResponse {
  name: string;
  questions: FixedQuestionResponse[];
}
export interface CreateFixedCompetencyRequest {
  name: string;
}
export interface CreateFixedQuestionRequest {
  fixedCompetencyId: string; // Guid
  description: string;
  gradesTextId: string;

}
