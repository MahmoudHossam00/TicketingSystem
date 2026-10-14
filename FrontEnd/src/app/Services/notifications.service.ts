import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Environment } from '../base/environment';
import { HttpClient } from '@angular/common/http';
import { NotificationResponse } from '../Interfaces/notification';
import { Alert, AlertViewer, NewsLetter, sendAlertRequest } from '../Interfaces/Alerts';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {


  constructor(private http: HttpClient) { }
  private apiUrl = `${Environment.baseUrl}Notification`;
  GetMoreNotifications(topnotificationid: string): Observable<NotificationResponse[]> {
   
    return this.http.get<NotificationResponse[]>(`${this.apiUrl}/More?topnotification=${topnotificationid}`);
  }
  MarkAsSeen(notificationid: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationid}/seen`, {  });
  }

  markallasseen(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/seen-all`, {  });
  }
  delete(notificationid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationid}`);
  }

   MyAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/MyAlerts`);
  }

  MyNewsLetters(): Observable<NewsLetter[]> {
    return this.http.get<NewsLetter[]>(`${this.apiUrl}/MyNewsLetter`);
  }
  SendAlert(alert: sendAlertRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Alerts`, alert);
  } 
 
  DeleteNewsLetter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/NewsLetters/${id}`);
  }
  DeleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/Alerts/${id}`);
  }
  tOGGLEHideAlert(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Alerts/hide/${id}`, {  });
  }
  GetAlertStatistics(alertid:string): Observable<AlertViewer[]> {
    return this.http.get<AlertViewer[]>(`${this.apiUrl}/Alerts/Statistics/${alertid}`);
  }
 
  GetAlertsWithExpired(id:string): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.apiUrl}/AlertsWithExpired`);
  }
}
