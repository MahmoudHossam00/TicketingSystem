import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../base/environment';

export interface UploadedFile {
    name: string;
    url: string;
    contentType: string;
  }
  
  @Injectable({ providedIn: 'root' })
  export class FilesService {
  
    private baseUrl = `${Environment.baseUrl}files`;
  
    constructor(private http: HttpClient) {}

    /**
     * Resolve a stored file path or URL to a fully-qualified URL.
     * Pass-through for data URIs and absolute URLs; prepends the files
     * base URL for relative server paths.
     */
    getFileUrl(path: string): string {
      if (!path) return '';
      const trimmedPath = path.trim().replace(/^['"]|['"]$/g, '');
      if (
        trimmedPath.startsWith('data:') ||
        trimmedPath.startsWith('blob:') ||
        /^https?:\/\//i.test(trimmedPath)
      ) {
        return trimmedPath;
      }

      if (/^file:\/\//i.test(trimmedPath)) {
        return encodeURI(trimmedPath);
      }

      // Windows local drive path, e.g. Z:\Public Share\file.mp4
      if (/^[a-zA-Z]:[\\/]/.test(trimmedPath)) {
        const normalizedDrivePath = trimmedPath.replace(/\\+/g, '/');
        return encodeURI(`file:///${normalizedDrivePath}`);
      }

      // UNC network path, e.g. \\server\share\file.mp4
      if (/^\\\\/.test(trimmedPath)) {
        const uncPath = trimmedPath.replace(/^\\\\+/, '').replace(/\\+/g, '/');
        return encodeURI(`file://${uncPath}`);
      }

      const sep = trimmedPath.startsWith('/') ? '' : '/';
      return `${this.baseUrl}${sep}${trimmedPath}`;
    }
  
    /**
     * Upload a single file to the server.
     * The 'File' key must match your backend DTO property name.
     */
    uploadFile(file: File): Observable<UploadedFile> {
      const formData = new FormData();
      formData.append('File', file); // <-- 'File' matches your FileDto.File
  
      return this.http.post<UploadedFile>(`${this.baseUrl}/upload`, formData);
    }
  
    /**
     * Upload multiple files and return their metadata.
     */
    uploadFiles(files: File[]): Promise<UploadedFile[]> {
        return Promise.all(
          files.map(file =>
            this.uploadFile(file)
              .toPromise()
              .then(res => {
                if (!res) throw new Error('File upload returned undefined');
                return res;
              })
          )
        );
      }
  }
