import { Component, signal } from '@angular/core';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { company, Module, System } from '../../Interfaces/system';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserResponseDTO, UsersDictionary } from '../../Interfaces/auth';
import { AuthService } from '../../Services/auth.service';
import { RelatedModuleComponent } from '../related-module/related-module.component';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { issuestatus } from '../../Interfaces/issuestatus';
import { issueType } from '../../Interfaces/system';
import { IssuetypeService } from '../../Services/Issuetype.service';
import { CompanyService } from '../../Services/Company.service';
import { ExternalSystemService } from '../../Services/externalsystem.service';
import { ExternalSystem, ExternalSystemRequest } from '../../Interfaces/externalsystems';
import { fixedKPIService } from '../../Services/KPIMasterData.service';
import { fixedKPI } from '../../Interfaces/system';
import { Environment } from '../../base/environment';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

const MASTERDATA_STATE_KEY = 'masterdata_state';

interface MasterdataState {
  tab: 'systems' | 'systemdetails' | 'positions' | 'employees' | 'issuestatuses' | 'issuestypes' | 'companies' | 'externalsystems' | 'fixedkpis';
  currentSystemId: string | null;
}

@Component({
  selector: 'app-masterdata',
  imports: [CommonModule,FormsModule,ReactiveFormsModule,RelatedModuleComponent],
  templateUrl: './masterdata.component.html',
  styleUrl: './masterdata.component.css'
})
export class MasterdataComponent {

  /**
   * Display column for human-readable numeric id; “—” when the API has not set it.
   * The adjacent “Id” column always shows the guid.
   */
  numericIdDisplay(entity: { numericId?: number | null }): string | number {
    const n = entity.numericId;
    if (n != null) return n;
    return '—';
  }

  /** True if the user may create, update, or delete master data (MASTER or MASTERDATAADMIN). */
  canMutateMasterData(): boolean {
    return this.userService.canMutateMasterData();
  }

  tab=signal<'systems' | 'systemdetails' | 'positions' | 'employees' | 'issuestatuses' | 'issuestypes' | 'companies' | 'externalsystems' | 'fixedkpis'>('systems');
  constructor(private systemService:  ITSystemService
    ,private userService: AuthService
    ,private issueStatusService: IssueStatusService
    ,private issueTypeService: IssuetypeService
    ,private companyService: CompanyService
    ,private externalSystemService: ExternalSystemService
    ,private kpiService: fixedKPIService
    ,private router: Router
  ) {
  
  }

  // ── Fixed KPIs ─────────────────────────────────────────────
  fixedKPIs              = signal<fixedKPI[]>([]);
  showCreateKPI          = signal(false);
  updatingKPIId          = signal<string | null>(null);
  createKPIText          = '';
  updateKPIText          = '';

  switchToFixedKPIs(): void {
    this.tab.set('fixedkpis');
    this.loadFixedKPIs();
    this.saveState();
  }

  loadFixedKPIs(): void {
    this.kpiService.getAllfixedKPIs().subscribe(data => this.fixedKPIs.set(data));
  }

  createFixedKPI(): void {
    if (!this.createKPIText.trim()) return;
    this.kpiService.createfixedKPI({ name: this.createKPIText.trim() }).subscribe(data => {
      this.fixedKPIs.set([...this.fixedKPIs(), data]);
      this.showCreateKPI.set(false);
      this.createKPIText = '';
    });
  }

  openUpdateKPI(kpi: fixedKPI): void {
    this.updatingKPIId.set(kpi.id);
    this.updateKPIText = kpi.name;
  }

  updateFixedKPI(id: string): void {
    this.kpiService.updatefixedKPI(id, { name: this.updateKPIText }).subscribe(() => {
      this.updatingKPIId.set(null);
      this.loadFixedKPIs();
    });
  }

  deleteFixedKPI(id: string): void {
    this.kpiService.deleteSystem(id).subscribe(() => {
      this.fixedKPIs.set(this.fixedKPIs().filter(k => k.id !== id));
    });
  }

  // ── External Systems ───────────────────────────────────────
  externalSystems = signal<ExternalSystem[]>([]);
  showCreateExtSystem = signal(false);
  updatingExtSystemId = signal<string | null>(null);
  isLoadingUsersInProgress = signal(false);
  importSystemId: string | null = null;

  createExtForm: ExternalSystemRequest = { name: '', url: '', loginURL: '', usersURL: '', adminUserName: '', adminPassword: '', isAnglarSystem: false };
  updateExtForm: ExternalSystemRequest = { name: '', url: '', loginURL: '', usersURL: '', adminUserName: '', adminPassword: '', isAnglarSystem: false };

  switchToExternalSystems(): void {
    this.tab.set('externalsystems');
    this.loadExternalSystems();
    this.saveState();
  }

  loadExternalSystems(): void {
    this.externalSystemService.getAllExternalSystems().subscribe(data => {
      this.externalSystems.set(data);
    });
  }

  openCreateExtSystem(): void {
    this.createExtForm = { name: '', url: '', loginURL: '', usersURL: '', adminUserName: '', adminPassword: '', isAnglarSystem: false };
    this.showCreateExtSystem.set(true);
  }

  submitCreateExtSystem(): void {
    if (!this.createExtForm.name.trim()) return;
    this.externalSystemService.createExternalSystem(this.createExtForm).subscribe(data => {
      this.externalSystems.set([...this.externalSystems(), data]);
      this.showCreateExtSystem.set(false);
      this.loadExternalSystems();
    });
  }

  openUpdateExtSystem(sys: ExternalSystem): void {
    this.updatingExtSystemId.set(sys.id);
    this.updateExtForm = {
      name: sys.name,
      url: sys.url ?? '',
      loginURL: sys.loginURL ?? '',
      usersURL: sys.getUsersURL    ,
      adminUserName: sys.adminUserName ?? '',
      adminPassword: sys.adminPassword ?? '',
      isAnglarSystem: sys.isAnglarSystem,
    };
  }

  submitUpdateExtSystem(id: string): void {
    this.externalSystemService.updateExternalSystem(id, this.updateExtForm).subscribe(() => {
      this.updatingExtSystemId.set(null);
      this.loadExternalSystems();
    });
  }

  deleteExtSystem(id: string): void {
    this.externalSystemService.deleteExternalSystem(id).subscribe(() => {
      this.externalSystems.set(this.externalSystems().filter(s => s.id !== id));
    });
  }

  downloadTemplate(): void {
    this.externalSystemService.downloadExcelTemplate().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'external-users-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  loadAllSystemsUsers(): void {
    this.isLoadingUsersInProgress.set(true);
    this.externalSystemService.loadSystemsUsers().subscribe({
      next: () => this.isLoadingUsersInProgress.set(false),
      error: () => this.isLoadingUsersInProgress.set(false),
    });
  }

  onImportExcel(event: Event, systemId: string): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.externalSystemService.importExternalUsersFromExcel({ externalSystemId: systemId, excel: file }).subscribe({
      next: () => { (event.target as HTMLInputElement).value = ''; },
      error: () => { (event.target as HTMLInputElement).value = ''; },
    });
  }

  //#region State persistence (cache/history)
  private saveState(): void {
    try {
      const state: MasterdataState = {
        tab: this.tab(),
        currentSystemId: this.currentsystemid(),
      };
      localStorage.setItem(MASTERDATA_STATE_KEY, JSON.stringify(state));
    } catch {
      // ignore localStorage errors (private mode, quota, etc.)
    }
  }

  showcreateissuestatus = signal<boolean>(false);

createissuestatustext = '';
createissuestatuscolor = '#3b82f6';
createissuestatusisFinished:boolean=false;
updatingIssueStatusId = signal<string | null>(null);

updateissuestatustext = '';
updateissuestatuscolor = '#3b82f6';
updateissuestatusisFinished:boolean=false;

createissuestatus(): void {

  this.issueStatusService.createIssueStatus({
    name: this.createissuestatustext,
    color: this.createissuestatuscolor,
    isFinished:this.createissuestatusisFinished,
  }).subscribe(data => {

    this.issuestatuses.set([...this.issuestatuses(), data]);

    this.showcreateissuestatus.set(false);
    this.createissuestatustext = '';
    this.createissuestatuscolor = '#3b82f6';
    this.createissuestatusisFinished=false;
  });

}
openUpdateIssueStatus(status: issuestatus): void {

  this.updatingIssueStatusId.set(status.id);

  this.updateissuestatustext = status.name;
  this.updateissuestatuscolor = status.color;
  this.updateissuestatusisFinished =status.isFinished;
}
updateIssueStatus(id: string): void {

  this.issueStatusService.updateissuestatus(id, {
    name: this.updateissuestatustext,
    color: this.updateissuestatuscolor,
    isFinished:this.updateissuestatusisFinished

  }).subscribe(() => {

    this.updatingIssueStatusId.set(null);

    this.loadIssuestatuses();

  });

}
// ── Companies ──────────────────────────────────────────────
companies = signal<company[]>([]);
showcreatecompany = signal<boolean>(false);
createcompanytext = '';
updatingCompanyId = signal<string | null>(null);
updatecompanytext = '';

LoadCompanies(): void {
  this.companyService.getAllcompanys().subscribe(data => {
    this.companies.set(data);
  });
}
switchToCompanies(): void {
  this.tab.set('companies');
  this.LoadCompanies();
  this.saveState();
}
createCompany(): void {
  if (!this.createcompanytext.trim()) return;
  this.companyService.createcompany({ name: this.createcompanytext.trim() }).subscribe(data => {
    this.companies.set([...this.companies(), data]);
    this.showcreatecompany.set(false);
    this.createcompanytext = '';
  });
}
openUpdateCompany(c: company): void {
  this.updatingCompanyId.set(c.id);
  this.updatecompanytext = c.name;
}
updateCompany(id: string): void {
  this.companyService.updatecompany(id, { name: this.updatecompanytext }).subscribe(() => {
    this.updatingCompanyId.set(null);
    this.LoadCompanies();
  });
}
deleteCompany(id: string): void {
  this.companyService.deleteSystem(id).subscribe(() => {
    this.companies.set(this.companies().filter(c => c.id !== id));
  });
}

// ── Issue Types ────────────────────────────────────────────
issueTypes = signal<issueType[]>([]);
showcreateissuetype = signal<boolean>(false);
createissuetypetext = '';
updatingIssueTypeId = signal<string | null>(null);
updateissuetypetext = '';

LoadIssueTypes(): void {
  this.issueTypeService.getAllIssueTypes().subscribe(data => {
    this.issueTypes.set(data);
  });
}
switchToIssuestypes(): void {
  this.tab.set('issuestypes');
  this.LoadIssueTypes();
  this.saveState();
}
createIssueTypeEntry(): void {
  if (!this.createissuetypetext.trim()) return;
  this.issueTypeService.createIssueType({ name: this.createissuetypetext.trim() }).subscribe(data => {
    this.issueTypes.set([...this.issueTypes(), data]);
    this.showcreateissuetype.set(false);
    this.createissuetypetext = '';
  });
}
openUpdateIssueType(it: issueType): void {
  this.updatingIssueTypeId.set(it.id);
  this.updateissuetypetext = it.issueTypeName;
}
updateIssueTypeEntry(id: string): void {
  this.issueTypeService.updateIssueType(id, { name: this.updateissuetypetext }).subscribe(() => {
    this.updatingIssueTypeId.set(null);
    this.LoadIssueTypes();
  });
}
deleteIssueTypeEntry(id: string): void {
  this.issueTypeService.deleteSystem(id).subscribe(() => {
    this.issueTypes.set(this.issueTypes().filter(it => it.id !== id));
  });
}
deleteIssueStatus(id: string): void {

  this.issueStatusService.deleteissuestatus(id).subscribe(() => {

    this.issuestatuses.set(
      this.issuestatuses().filter(s => s.id !== id)
    );

  });

}
  switchToIssuestatuses(): void {
    this.tab.set('issuestatuses');
    this.loadIssuestatuses();
    this.saveState();
  }
  issuestatuses=signal<issuestatus[]>([]);
  loadIssuestatuses(): void {
    this.issueStatusService.getAllIssueStatuses().subscribe(data => {
      this.issuestatuses.set(data);
    });
  }
  private restoreState(): void {
    try {
      const raw = localStorage.getItem(MASTERDATA_STATE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as MasterdataState;
      if (state.tab === 'systemdetails' && state.currentSystemId) {
        const exists = this.systems().some(s => s.id === state.currentSystemId);
        if (exists) {
          this.tab.set('systemdetails');
          this.getsystemDetails(state.currentSystemId);
          return;
        }
      }
      if (state.tab) {
        this.tab.set(state.tab);
      }
    } catch {
      // ignore parse or localStorage errors
    }
  }
  //#endregion

  //#region Systems
  updatingid=signal<string | null>(null);
  systems=signal<System[]>([]);
  ngOnInit(): void {
    this.tab.set('systems');
    this.loadSystems();
    this.loadIssuestatuses();
    this.loadExternalSystems();
  }
  loadSystems(): void {
    this.systemService.getAllSystems().subscribe(data => {
      this.systems.set(data);
      this.restoreState();
    });
  }

  getpicurl(picture:string): string {
    return `${Environment.baseUrl}Files/${picture}`;
  }
  switchToSystems(): void {
    this.tab.set('systems');
    this.currentsystemid.set(null);
    this.currentsystem.set(null);
    this.saveState();
  }
  updatesystemtext='';
openupdatesystem(id: string): void {
  this.updatingid.set(id);
  this.updatesystemtext=this.systems()?.find(system => system.id === id)?.name || '';
}
  updateSystem(id: string): void {
    this.systemService.updateSystem(id, {name: this.updatesystemtext}).subscribe(data => {
      this.updatingid.set(null);
      this.updatesystemtext='';
      this.loadSystems();
    });
  }

  EmployeeProfile(employeeId: string): void {
    this.router.navigate(['/employees', employeeId]);
  }
  deletesystem(id: string): void {
    this.systemService.deleteSystem(id).subscribe(data => {
      this.systems.set(this.systems().filter(system => system.id !== id));
    });
  }
  showcreatesystem=signal<boolean>(false);
  createsystemtext='';
  createsystem()
  {
    this.systemService.createSystem({name: this.createsystemtext}).subscribe(data => {
      this.systems.set([...this.systems(), data]);
      this.showcreatesystem.set(false);
      this.createsystemtext='';
    });
  }
  //#endregion

  //#region Details
  currentsystemid=signal<string | null>(null);
  currentsystem=signal<System | null>(null);
  agents=signal<UserResponseDTO[]>([]);
  modules=signal<Module[]>([]);
  agentSupervisorByAgentId = signal<Record<string, string | null>>({});
  selectedSupervisorByAgentId = signal<Record<string, string | null>>({});
  addAgentSupervisorId = signal<string | null>(null);
  getsystemDetails(id: string): void {
    this.currentsystemid.set(id);
    this.currentsystem.set(this.systems()?.find(system => system.id === id) || null);
    this.loadagents(id);
    this.loadmodules(id);
    this.tab.set('systemdetails');
    this.saveState();
  }
  loadmodules(id: string): void {
    this.systemService.getSystemModules(id).subscribe(data => {
      this.modules.set(data);
    });
  }

  loadagents(id: string): void {
    this.systemService.getSystemAgents(id).subscribe(data => {
      this.agents.set(data);
      this.loadAgentSupervisors(id, data);
      const supervisors = data.map((agent) => ({ id: agent.id, name: agent.userName || agent.email || agent.id }));
      if (!this.addAgentSupervisorId() && supervisors.length) {
        this.addAgentSupervisorId.set(supervisors[0].id);
      }
    });
  }

  private loadAgentSupervisors(systemId: string, agents: UserResponseDTO[]): void {
    if (!systemId || !agents.length) {
      this.agentSupervisorByAgentId.set({});
      this.selectedSupervisorByAgentId.set({});
      return;
    }

    const requests = agents.map((agent) =>
      this.systemService.getagentsupervisor(systemId, agent.id).pipe(
        map((supervisorId) => ({
          agentId: agent.id,
          supervisorId: supervisorId.id ?? null,
        })),
        catchError(() => of({ agentId: agent.id, supervisorId: null })),
      )
    );

    forkJoin(requests).subscribe((rows) => {
      const mapByAgent: Record<string, string | null> = {};
      for (const row of rows) {
        mapByAgent[row.agentId] = row.supervisorId;
      }
      this.agentSupervisorByAgentId.set(mapByAgent);
      this.selectedSupervisorByAgentId.set({ ...mapByAgent });
    });
  }

  availableUsers = signal<{ id: string; name: string }[]>([]);

  users=signal<UsersDictionary>({});
  getallusers(): void {
    this.userService.getAllUsers().subscribe(data => {
      const agentIds = new Set(this.agents().map(a => a.id)); // assuming UserResponseDTO has id

      const list = Object.entries(data)
        .filter(([id]) => !agentIds.has(id))
        .map(([id, name]) => ({ id, name }));
  
      this.availableUsers.set(list);
  
      // اختياري: اختار أول عنصر تلقائيًا
      this.addagentuser.set(list[0]?.id ?? null);
      

    });
  }
  addAgent(userId: string | undefined = undefined): void {
    const systemId = this.currentsystemid();
    const agentId = userId ?? this.addagentuser() ?? undefined;
    const supervisorId = this.addAgentSupervisorId();
    if (!systemId || !agentId) return;

    this.systemService.addAgent(systemId, agentId).subscribe({
      next: () => {
        if (supervisorId) {
          this.systemService.addagentsupervisor(this.currentsystemid()!,agentId, supervisorId).subscribe({
            next: () => this.loadagents(systemId),
            error: () => this.loadagents(systemId),
          });
        } else {
          this.loadagents(systemId);
        }
        this.AddingAgent.set(false);
        this.addagentuser.set(null);
      },
      error: () => {
        // keep form open on failure so the user can retry
      },
    });
  }
  removeAgent(userId: string): void {
    this.systemService.removeAgent(this.currentsystemid()!, userId).subscribe(data => {
      this.loadagents(this.currentsystemid()!);
    });
  }


  ShowSubModules(module: Module){
    this.selectedModule.set(module);
  }
  selectedModule=signal<Module | null>(null);
  clearselectedmodule(): void {
    this.selectedModule.set(null);
  }
  getsystems(agent: UserResponseDTO): string[] {
    return Object.keys(agent.systems);
  }
  startaddingagent(): void {
    this.AddingAgent.set(true);
    this.addAgentSupervisorId.set(this.agents()[0]?.id ?? null);
    this.getallusers();
  }
  AddingAgent=signal<boolean>(false);
  addagentuser=signal<string | null>(null);

  supervisorSelection(agentId: string): string | null {
    return this.selectedSupervisorByAgentId()[agentId] ?? this.agentSupervisorByAgentId()[agentId] ?? null;
  }

  setSupervisorSelection(agentId: string, supervisorId: string | null): void {
    this.selectedSupervisorByAgentId.set({
      ...this.selectedSupervisorByAgentId(),
      [agentId]: supervisorId,
    });
  }

  updateAgentSupervisor(agentId: string): void {
    const supervisorId = this.supervisorSelection(agentId);
    if (!supervisorId) return;
    const systemagentid=this.agents().find(agent => agent.id === agentId)?.id;
    this.systemService.addagentsupervisor(this.currentsystemid()!,agentId, supervisorId).subscribe({
      next: () => {
        this.agentSupervisorByAgentId.set({
          ...this.agentSupervisorByAgentId(),
          [agentId]: supervisorId,
        });
      },
    });
  }

  supervisorDisplayName(supervisorId: string | null): string {
    if (!supervisorId) return '—';
    const supervisor = this.agents().find((agent) => agent.id === supervisorId);
    if (!supervisor) return supervisorId;
    return supervisor.userName || supervisor.email || supervisor.id;
  }


  addmoduletext =signal<string>('');
  addModule(userId: string | undefined=undefined): void {
    if(!userId){
      userId=this.addmoduletext()!;
    }
    this.systemService.addModule(this.currentsystemid()!, {name:userId}).subscribe(data => {
      this.loadmodules(this.currentsystemid()!);
    });
  }
  removeModule(userId: string): void {
    this.systemService.removeModule(this.currentsystemid()!, userId).subscribe(data => {
      this.loadmodules(this.currentsystemid()!);
    });
  }
  startaddingModule(): void {
    this.AddingModule.set(true);
    this.addmoduletext.set('');
    // this.getallusers();
  }
  AddingModule=signal<boolean>(false);
  //#endregion
}
