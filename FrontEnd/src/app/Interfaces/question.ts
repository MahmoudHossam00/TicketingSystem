import { EntityResponse } from "./general";

export interface Question extends EntityResponse {
    questionHead:string;
    isRequired:boolean;
    subModuleId:string;
    questionType:TypeOfQuestion;
    options?:option[];

    
}

export enum TypeOfQuestion{
    Text =0,
    DateTime=1,
    MultipleChoice=2,
    SingleChoice=3
}
export interface option  extends EntityResponse {
    questionId :string       // FK column
    text:string;
    // order:number;
}
export interface CreateQuestionRequest{
    SubModuleId:string;
    isRequired:boolean;
    QuestionHead:string;
    type:TypeOfQuestion;
    options?:CreateQuestionOptionRequest[];
}
export interface CreateQuestionOptionRequest{
    questionId?:string;
    text : string;
}
export interface UpdateQuestionRequest{
    questionHead:string;
    isRequired:boolean;

}