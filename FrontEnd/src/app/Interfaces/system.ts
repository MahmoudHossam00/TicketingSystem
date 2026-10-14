import { EntityResponse } from "./general";

export interface System extends EntityResponse {
    name:string;
}


export interface Module extends EntityResponse {
    name:string;
    systemId:string;
}
export interface company extends EntityResponse {
    name:string;
}
export interface issueType extends EntityResponse {
    issueTypeName:string;
}
export interface fixedKPI extends EntityResponse {
    name:string;
}
export interface createkpirequest{
    // description:string;
    ticketTaskId?:string; //ticket task
    taskId?:string;//project task subtask
    fixedKPIId?:string; //optional
}