import { Component, OnInit, signal } from '@angular/core';
import { ticketService } from '../../Services/ticket.service';
import { IssuePriority, ticket, TicketFilterRequest } from '../../Interfaces/ticket';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IssueStatusService } from '../../Services/issueStatus.service';
import { issuestatus } from '../../Interfaces/issuestatus';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { Module, System } from '../../Interfaces/system';
import { SubModuleService } from '../../Services/submodule.service';
import { SubModule } from '../../Interfaces/submodule';
import { forkJoin } from 'rxjs';

type TabKey = 'all' | 'mine' | 'myOpened' | 'nonAssigned';

@Component({
  selector: 'app-all-tickets',
  imports: [CommonModule, FormsModule],
  templateUrl: './all-tickets.component.html',
  styleUrl: './all-tickets.component.css'
})
export class AllTicketsComponent implements OnInit {

  tickets: ticket[] = [];
  issueStatuses: issuestatus[] = [];
  systems: System[] = [];
  isLoading = false;

  activeTab = signal<TabKey>('all');
  filterSystemId = signal<string>('');
  filterStatusId = signal<string>('');
  filterFromDate = signal<string>('');
  filterToDate = signal<string>('');

  issuePriorities = IssuePriority;

  readonly TABS: { key: TabKey; label: string }[] = [
    { key: 'all',         label: 'All Tickets' },
    { key: 'mine',        label: 'My Tickets' },
    { key: 'myOpened',    label: 'My Opened' },
    { key: 'nonAssigned', label: 'Not Assigned' },
  ];

  constructor(
    private ticketService: ticketService,
    private router: Router,
    private issueStatusService: IssueStatusService,
    private systemService: ITSystemService,
    private submoduleService: SubModuleService,
    // private moduleservice:ITSystemService
  ) {}

submodules: SubModule[] = [];
modules: Module[] = [];

// ITSystems: System[] = [];



  ngOnInit(): void {
    this.issueStatusService.getAllIssueStatuses().subscribe(s => this.issueStatuses = s);
    this.systemService.getAllSystems().subscribe(s => this.systems = s);
    this.loadTickets();
    this.loadSystems();
  }
  

  loadSystems(): void {
    // 1. Load all submodules first
    this.submoduleService.getAll().subscribe(submodules => {
      this.submodules = submodules;
    });
  
    // 2. Load systems
    this.systemService.getAllSystems().subscribe(systems => {
      this.systems = systems;
  
      // For each system, get its modules
      const moduleObservables = systems.map(system =>
        this.systemService.getSystemModules(system.id)
      );
  
      // Wait for all module requests to complete
      forkJoin(moduleObservables).subscribe(modulesArray => {
        // Flatten array of arrays into a single array
        this.modules = modulesArray.flat();
      });
    });
  }





  setTab(tab: TabKey): void {
    this.activeTab.set(tab);
    this.loadTickets();
  }

  applyFilters(): void {
    this.loadTickets();
  }

  clearFilters(): void {
    this.filterSystemId.set('');
    this.filterStatusId.set('');
    this.filterFromDate.set('');
    this.filterToDate.set('');
    this.loadTickets();
  }

  getticketsystem(subModuleId: string): string {
    let ModuleId=this.submodules.find(s => s.id === subModuleId)?.moduleId ?? '';
    let SystemId=this.modules.find(m => m.id === ModuleId)?.systemId ?? '';
    return this.systems.find(s => s.id === SystemId)?.name ?? '—';
  }
  loadTickets(): void {
    this.isLoading = true;
    const tab = this.activeTab();

    const filter: TicketFilterRequest = {
      SystemId:                this.filterSystemId()  || undefined,
      IssueStatusId:           this.filterStatusId()  || undefined,
      OnlyMyTickets:           tab === 'mine'        || undefined,
      GetMyOpenedTicketsOnly:  tab === 'myOpened'    || undefined,
      OnlyNonAssignedTickets:  tab === 'nonAssigned' || undefined,
      from: this.filterFromDate() ? new Date(`${this.filterFromDate()}T00:00:00`) : undefined,
      to: this.filterToDate() ? new Date(`${this.filterToDate()}T23:59:59`) : undefined,
    };


    this.ticketService.getFiltered(filter).subscribe({
      next: (tickets) => { this.tickets = tickets; this.isLoading = false; },
      error: ()        => { this.isLoading = false; },
    });
  }

  getStatusName(id: string): string {
    return this.issueStatuses.find(s => s.id === id)?.name ?? '—';
  }

  getStatusColor(id: string): string {
    return this.issueStatuses.find(s => s.id === id)?.color ?? '#94a3b8';
  }

  getPriorityLabel(p: number): string {
    return IssuePriority[p] ?? '—';
  }

  viewTicket(id: string): void {
    this.router.navigate(['/ticketdetails', id]);
  }

  get hasActiveFilters(): boolean {
    return !!(this.filterSystemId() || this.filterStatusId() || this.filterFromDate() || this.filterToDate());
  }
}
