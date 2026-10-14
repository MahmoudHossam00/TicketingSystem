export enum ArticleBlockType {
    Text = 0,
    Image = 1,
    Link = 2,
    List = 3,
    Video = 4,
    VideoLink = 5,
    VideoName = 6,
    PDF=7
  }
  export interface ArticleBlockDto {
    id: string;
    type: ArticleBlockType;
    content: string;
    order: number;
    linkViewName?: string;
    imageHeight?: string;
    imageWidth?: string;
    textFont?: string;
    textSize?: string;
    listItems?: thetext[]
  }
  export interface thetext{
    content: string;
    textFont: string;
    textSize: string;
  }
  export interface ArticleResponse {
    id: string;
    title: string;
    systemId:string;
    authorId:string;
    authorName:string;
    blocks: ArticleBlockDto[];
  }
  export interface ArticleSummaryResponse {
    id: string;
    title: string;
  }
  export interface FilterArticleSummaryRequest {
    authorId?: string;
    systemId?: string;
    title?: string;
    pagenumber: number;
  }
  export interface CreateArticleRequest {
    title: string;
    systemId: string;
    blocks: CreateArticleBlockRequest[];
  }
  export interface CreateArticleBlockRequest {
    type: ArticleBlockType;
    content?: string;
    file?: File; // for image upload
    order?: number;
    linkViewName?: string;
    imageHeight?: string;
    imageWidth?: string;
    textFont?: string;
    textSize?: string;
    listItems?: thetext[]
  }