import { Routes } from '@angular/router';
import { LoginComponent } from './Components/login/login.component';
import { AccountManagementComponent } from './Components/account-management/account-management.component';
import { AdminOrMasterGuard } from './Guards/admin-or-master.guard';
import { MasterGuard } from './Guards/master.guard';
import { AuthGuard } from './Guards/auth.guard';
import { MasterdataComponent } from './Components/masterdata/masterdata.component';
import { SubmodulequestionsComponent } from './Components/submodulequestions/submodulequestions.component';
import { OpenTicketComponent } from './Components/open-ticket/open-ticket.component';
import { AllTicketsComponent } from './Components/all-tickets/all-tickets.component';
import { TicketdetailsComponent } from './Components/ticketdetails/ticketdetails.component';
import { NotLoggedInGuard } from './Guards/NotLoggedInGuard';
import { MessangerComponent } from './Components/messanger/messanger.component';
import { EmployeesComponent } from './Components/employees/employees.component';
import { EmployeeProfileComponent } from './Components/employee-profile/employee-profile.component';
import { KpiTicketsComponent } from './Components/kpi-tickets/kpi-tickets.component';
import { ProjectsComponent } from './Components/projects/projects.component';
import { ProjectdetailsComponent } from './Components/projectdetails/projectdetails.component';
import { TaskdetailsComponent } from './Components/taskdetails/taskdetails.component';
import { AllTasksComponent } from './Components/all-tasks/all-tasks.component';
import { ChangePasswordComponent } from './Components/change-password/change-password.component';
import { changePasswordPageGuard } from './Guards/change-password-page.guard';
import { isFirstLoginGuard } from './Guards/isfirstlogin-guard';
import { NotificationsComponent } from './Components/notifications/notifications.component';
import { AdminAlertsComponent } from './Components/admin-alerts/admin-alerts.component';
import { ZenFunctionsComponent } from './Components/zen-functions/zen-functions.component';
import { ArticlesPageComponent } from './Components/Articles-page/articles-page.component';
import { ArticleCreateComponent } from './Components/article-create/article-create.component';
import { ArticleDetailComponent } from './Components/article-detail/article-detail.component';
import { KpiOldTasksComponent } from './Components/kpi-old-tasks/kpi-old-tasks.component';
import { AdminOnlyGuard } from './Guards/admin-only.guard';
// import { isFirstLoginGuard } from './Guards/isfirstlogin-guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [NotLoggedInGuard] },
    { path: 'changepassword', component: ChangePasswordComponent, canActivate: [changePasswordPageGuard] },
    { path: 'account-management', component: AccountManagementComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'master-data', component: MasterdataComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'submodule-questions/:id', component: SubmodulequestionsComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'open-ticket', component: OpenTicketComponent, canActivate: [AuthGuard,isFirstLoginGuard] },
    { path: 'all-tickets', component: AllTicketsComponent, canActivate: [AuthGuard,isFirstLoginGuard] },
    { path: 'all-tasks', component: AllTasksComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'messanger', component: MessangerComponent, canActivate: [AuthGuard,isFirstLoginGuard] },
    { path: 'notifications', component: NotificationsComponent, canActivate: [AuthGuard,isFirstLoginGuard] },
    { path: 'employees', component: EmployeesComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'employees/:id', component: EmployeeProfileComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'kpi-tickets', component: KpiTicketsComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'old-tasks', component: KpiOldTasksComponent, canActivate: [AdminOnlyGuard, isFirstLoginGuard] },
    { path: 'projects', component: ProjectsComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'projectdetails/:id', component: ProjectdetailsComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'taskdetails/:id', component: TaskdetailsComponent, canActivate: [AdminOrMasterGuard,isFirstLoginGuard] },
    { path: 'ticketdetails/:id', component: TicketdetailsComponent, canActivate: [AuthGuard,isFirstLoginGuard] },
    { path: 'admin-alerts', component: AdminAlertsComponent, canActivate: [AdminOrMasterGuard, isFirstLoginGuard] },
    { path: 'zen-functions', component: ZenFunctionsComponent, canActivate: [MasterGuard, isFirstLoginGuard] },
    { path: 'articles', component: ArticlesPageComponent, canActivate: [AuthGuard, isFirstLoginGuard] },
    { path: 'articles/create', component: ArticleCreateComponent, canActivate: [AuthGuard, isFirstLoginGuard] },
    { path: 'articles/:id', component: ArticleDetailComponent, canActivate: [AuthGuard, isFirstLoginGuard] },
    { path: '', redirectTo: '/open-ticket', pathMatch: 'full' },
];  
