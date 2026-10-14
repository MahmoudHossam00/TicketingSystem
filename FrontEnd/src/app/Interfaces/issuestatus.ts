import { EntityResponse } from "./general";

export interface issuestatus  {
    id:string;
    numericId?: number | null;
    name:string;
    color:string;
    isFinished:boolean;
}


export interface IssueStatusCreateRequest  {
    name:string;
    color:string;
    isFinished:boolean;
}


export interface issuestatushistory{
    date:Date;
    response:issuestatus;
}


export interface assignhistories{
    id:string;
    userId:string;
    userName:string;
    ticketId:string;
    assignDate:Date;
}