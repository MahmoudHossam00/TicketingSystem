import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PaginationPageItem = number | 'ellipsis';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  /** Total records matching the current filter (used to compute page count). */
  @Input({ required: true }) set totalCount(v: number) {
    this._totalCount.set(Math.max(0, v ?? 0));
  }
  get totalCount(): number {
    return this._totalCount();
  }
  private _totalCount = signal(0);

  @Input() set pageSize(v: number) {
    this._pageSize.set(Math.max(1, v ?? 10));
  }
  get pageSize(): number {
    return this._pageSize();
  }
  private _pageSize = signal(10);

  /** 1-based current page */
  @Input() set currentPage(v: number) {
    this._currentPage.set(Math.max(1, v ?? 1));
  }
  get currentPage(): number {
    return this._currentPage();
  }
  private _currentPage = signal(1);

  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();

  readonly totalPages = computed(() => {
    const n = this._totalCount();
    const size = this._pageSize();
    if (n <= 0) return 0;
    return Math.max(1, Math.ceil(n / size));
  });

  readonly pageItems = computed((): PaginationPageItem[] => {
    const tp = this.totalPages();
    const cp = Math.min(Math.max(1, this._currentPage()), tp || 1);
    if (tp <= 0) return [];
    if (tp <= 9) {
      return Array.from({ length: tp }, (_, i) => i + 1);
    }
    const set = new Set<number>();
    set.add(1);
    set.add(tp);
    for (let i = cp - 2; i <= cp + 2; i++) {
      if (i >= 1 && i <= tp) set.add(i);
    }
    const sorted = [...set].sort((a, b) => a - b);
    const out: PaginationPageItem[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push('ellipsis');
      out.push(p);
      prev = p;
    }
    return out;
  });

  readonly showBar = computed(() => this.totalPages() > 1);

  goFirst(): void {
    this.emitIfAllowed(1);
  }

  goPrev(): void {
    const cp = this.clampedPage();
    if (cp > 1) this.emitIfAllowed(cp - 1);
  }

  goNext(): void {
    const tp = this.totalPages();
    const cp = this.clampedPage();
    if (cp < tp) this.emitIfAllowed(cp + 1);
  }

  goLast(): void {
    const tp = this.totalPages();
    if (tp > 0) this.emitIfAllowed(tp);
  }

  goPage(p: number): void {
    const tp = this.totalPages();
    if (p >= 1 && p <= tp) this.emitIfAllowed(p);
  }

  isActive(p: number): boolean {
    return p === this.clampedPage();
  }

  /** Page number shown in the summary (clamped to valid range). */
  get displayPage(): number {
    return this.clampedPage();
  }

  firstDisabled(): boolean {
    return this.disabled || this.clampedPage() <= 1 || this.totalPages() <= 1;
  }

  prevDisabled(): boolean {
    return this.disabled || this.clampedPage() <= 1;
  }

  nextDisabled(): boolean {
    const tp = this.totalPages();
    return this.disabled || this.clampedPage() >= tp || tp <= 0;
  }

  lastDisabled(): boolean {
    const tp = this.totalPages();
    return this.disabled || this.clampedPage() >= tp || tp <= 1;
  }

  trackItem(_i: number, item: PaginationPageItem): string {
    return item === 'ellipsis' ? 'e' : String(item);
  }

  private clampedPage(): number {
    const tp = this.totalPages();
    if (tp <= 0) return 1;
    return Math.min(Math.max(1, this._currentPage()), tp);
  }

  private emitIfAllowed(page: number): void {
    if (this.disabled) return;
    const tp = this.totalPages();
    if (tp <= 0) return;
    const next = Math.min(Math.max(1, page), tp);
    if (next !== this._currentPage()) this.pageChange.emit(next);
  }
}
