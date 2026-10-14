import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ArticleResponse, ArticleSummaryResponse, CreateArticleBlockRequest, CreateArticleRequest, FilterArticleSummaryRequest } from '../Interfaces/Article';
import { PaginatedResponse } from '../Interfaces/general';
import { Environment } from '../base/environment';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {

    private apiUrl = `${Environment.baseUrl}Article`;
  
 constructor(private http: HttpClient) {}

  getVideoUrl(name: string): string {
    const cleanName = (name ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (!cleanName) return '';
    return `${Environment.videoUrl}${encodeURIComponent(cleanName)}`;
  }

  // =========================
  // CREATE ARTICLE (FORMDATA INSIDE SERVICE)
  // =========================
  createArticle(data: CreateArticleRequest): Observable<string> {

     const formData = new FormData();

  formData.append('title', data.title);
  formData.append('systemId', data.systemId);

  data.blocks.forEach((block, index) => {

    formData.append(`blocks[${index}].type`, block.type.toString());

    if (block.content) {
      formData.append(`blocks[${index}].content`, block.content);
    }

    if (block.order !== undefined && block.order !== null) {
      formData.append(`blocks[${index}].order`, block.order.toString());
    }

    if (block.file) {
      formData.append(`blocks[${index}].file`, block.file);
    }

    if (block.linkViewName) {
      formData.append(`blocks[${index}].linkViewName`, block.linkViewName);
    }

    if (block.imageWidth) {
      formData.append(`blocks[${index}].imageWidth`, block.imageWidth);
    }

    if (block.imageHeight) {
      formData.append(`blocks[${index}].imageHeight`, block.imageHeight);
    }

    if (block.textFont) {
      formData.append(`blocks[${index}].textFont`, block.textFont);
    }

    if (block.textSize) {
      formData.append(`blocks[${index}].textSize`, block.textSize);
    }

    if (block.listItems?.length) {
      block.listItems.forEach((item, j) => {
        formData.append(`blocks[${index}].listItems[${j}].content`, item.content ?? '');
        if (item.textFont) formData.append(`blocks[${index}].listItems[${j}].textFont`, item.textFont);
        if (item.textSize) formData.append(`blocks[${index}].listItems[${j}].textSize`, item.textSize);
      });
    }
  });

  return this.http.post<string>(this.apiUrl, formData);
  }

  // =========================
  // GET ALL ARTICLES
  // =========================
  getArticles(filter: FilterArticleSummaryRequest):
    Observable<PaginatedResponse<ArticleSummaryResponse>> {

    return this.http.get<PaginatedResponse<ArticleSummaryResponse>>(
      this.apiUrl,
      { params: { ...filter as any } }
    );
  }

  // =========================
  // GET ARTICLE BY ID
  // =========================
  getArticleById(id: string): Observable<ArticleResponse> {
    return this.http.get<ArticleResponse>(`${this.apiUrl}/${id}`);
  }

  // =========================
  // ADD BLOCK (FORMDATA HANDLED HERE TOO)
  // =========================
  addBlock(articleId: string, data: CreateArticleBlockRequest): Observable<any> {

    const formData = new FormData();

    formData.append('type', data.type.toString());

    if (data.content)     formData.append('content', data.content);
    if (data.order !== undefined && data.order !== null)
      formData.append('order', data.order.toString());
    if (data.file)        formData.append('file', data.file);
    if (data.linkViewName)  formData.append('linkViewName', data.linkViewName);
    if (data.imageWidth)    formData.append('imageWidth',   data.imageWidth);
    if (data.imageHeight)   formData.append('imageHeight',  data.imageHeight);
    if (data.textFont)      formData.append('textFont',     data.textFont);
    if (data.textSize)      formData.append('textSize',     data.textSize);

    return this.http.post(`${this.apiUrl}/${articleId}/blocks`, formData);
  }

  // =========================
  // REMOVE BLOCK
  // =========================
  removeBlock(blockId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/blocks/${blockId}`);
  }

  // =========================
  // GET SYSTEM AGENTS
  // =========================
  getSystemAgents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/AllSystemAgents`);
  }
}
