export interface filterKPITaskReqeust{
    userIds?:string[];
    systemIds?:string[];
    hasKpi?:boolean;
    from?:Date;
    to?:Date;
    page?:number;
}