import { EntityResponse } from "./general";
import { TypeOfQuestion } from "./question";

export interface SubModule extends EntityResponse {
    name:string;
    moduleId:string;
}

export interface CreateSubModuleRequest{
    name:string;
    moduleId:string;
}

export interface RelatedSubModuleAnswerResponse extends EntityResponse
{
    relatedSubModuleId:string;
    relatedSubModule:SubModule;
    moduleId:string;
    moduleName:string;
    systemId:string;
    systemName:string;
    answers:AnswerResponse[];
}
export interface AnswerResponse extends EntityResponse
{
    questionHead:string;
    isRequired:boolean;

    answeredOptions?:string[]; //answers
    questionType:TypeOfQuestion;
    dateAnswer?:Date;
    textAnswer?:string;
}