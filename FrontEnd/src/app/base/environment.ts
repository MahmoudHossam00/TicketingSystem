// export enum Environment {
//     baseUrl= "http://localhost:5045/api/",
// }



export class Environment {
    private static get config(): any {
        return (window as any).__APP_CONFIG__;
      }
  
    public static get baseUrl(): string {
        return (this.config?.apiUrl ?? '') + 'api/';
      }
    
      public static get filesUrl(): string {
        return (this.config?.apiUrl ?? '') + 'files/';
      }
      public static get videoUrl(): string {
        return this.baseUrl + 'files/video/';
      }
    public static get standaloneurl(): string {
        return this.config?.apiUrl ?? '';
      }
      public static get notificationsUrl(): string {
        return (this.config?.apiUrl ?? '') + 'notification';
      }
      public static get zenUrl(): string {
        return (this.config?.zenUrl ?? '') + 'api/';
      }
}

