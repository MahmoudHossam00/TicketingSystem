import { Component, effect, Input, OnChanges, OnInit, signal, SimpleChanges } from '@angular/core';
import { Module } from '../../Interfaces/system';
import { SubModule } from '../../Interfaces/submodule';
import { SubModuleService } from '../../Services/submodule.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-related-module',
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
  templateUrl: './related-module.component.html',
  styleUrl: './related-module.component.css'
})
export class RelatedModuleComponent implements OnInit {

  @Input() module = signal<Module | null>(null);
  /** When false, submodule create/update/delete is hidden (e.g. read-only master data). Default true. */
  @Input() canMutate = true;

  constructor(private subModuleService: SubModuleService, private router: Router) {
    effect(() => {
      const m = this.module();
      if (!m?.id) return;

      this.loadSubModules();
    });
  }
  subModules=signal<SubModule[]>([]);
  ngOnInit(): void {
    this.loadSubModules();
  }
  openSubModuleQuestions(subModuleId: string): void {
    this.router.navigate(['/submodule-questions', subModuleId]);
  }
  loadSubModules(): void {
    this.subModuleService.getbyModuleId(this.module()?.id ?? '').subscribe((data) => {
      this.subModules.set(data);
    });
  }
  onchangeModule(): void {
    this.loadSubModules();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['module'] && this.module()) {
      this.onchangeModule();
    }
  }
  addSubModuleText:string='';
  openAddSubModule(): void {
    this.addSubModuleText='';
    this.isAddSubModuleOpen.set(true);
  }
  isAddSubModuleOpen=signal<boolean>(false);
  addSubModule(): void {
    const name = this.addSubModuleText.trim();
    const moduleId = this.module()?.id;
  
    if (!name) return;
    if (!moduleId) return; // ✅ أهم سطر
  
    this.subModuleService.create({ name, moduleId }).subscribe(() => {
      this.loadSubModules();
      this.isAddSubModuleOpen.set(false);
      this.addSubModuleText = '';
    });
  }
  updateSubModuleText:string='';
  updatingSubModuleId=signal<string>('');
  openUpdateSubModule(submodule: SubModule): void {
    this.updateSubModuleText = submodule.name;
    this.updatingSubModuleId.set(submodule.id);
  }
  isUpdateSubModuleOpen=signal<boolean>(false);
  updateSubModule(id: string): void {
    const name = this.updateSubModuleText.trim();
    if (!name) return; // اختياري: امنع الإرسال الفاضي
  
    this.subModuleService
      .update(id, { name, moduleId: this.module()?.id ?? '' })
      .subscribe(() => {
        this.updatingSubModuleId.set(''); // اقفل edit mode
        this.updateSubModuleText = '';
        this.loadSubModules();
      });
  }

  cancelUpdate(): void {
    this.updatingSubModuleId.set('');
    this.updateSubModuleText = '';
  }
  deleteSubModule(id: string): void {
    this.subModuleService.delete(id).subscribe((data) => {
      this.loadSubModules();
    });
  }

  numericIdDisplay(entity: { numericId?: number | null }): string | number {
    const n = entity.numericId;
    if (n != null) return n;
    return '—';
  }
}
