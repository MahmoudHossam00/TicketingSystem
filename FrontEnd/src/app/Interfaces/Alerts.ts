export interface Alert{
    id:string;
    text:string;
    endDate:Date;
    isHidden:boolean;
}
export interface NewsLetter{
    id:string;
    text:string;
    endDate:Date;
}

export interface sendAlertRequest{
    text:string;
    endDate:Date;
    type:type;
}
export enum type{
    Alert=1,
    NewsLetter=2,
    Both=3
}

export interface AlertViewer{
    userId:string;
    userName:string;
}