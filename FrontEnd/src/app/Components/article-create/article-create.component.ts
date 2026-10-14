import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ArticleService } from '../../Services/article.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { AuthService } from '../../Services/auth.service';
import {
  ArticleBlockType,
  CreateArticleBlockRequest,
  CreateArticleRequest,
} from '../../Interfaces/Article';
import { System } from '../../Interfaces/system';

export type BlockRenderType =
  | 'text' | 'h1' | 'h2' | 'list' | 'quote' | 'code' | 'divider' | 'img' | 'video' | 'link' | 'videoLink' | 'videoName' | 'pdf' | 'pdfLink';

export interface ListItem {
  content: string;
  textFont?: string;
  textSize?: string;
}

export interface EditorBlock {
  renderType: BlockRenderType;
  content?: string;
  file?: File;
  previewUrl?: string;
  caption?: string;
  /** Visual width as % of content column (20–100). Default 100. */
  imgWidth?: number;
  /** Resolved pixel dimensions after canvas resize — set just before publish. */
  resolvedW?: number;
  resolvedH?: number;
  /** Optional display name shown instead of the raw URL for link blocks. */
  linkViewName?: string;
  /** Block-level default font (text/heading/quote/code blocks). */
  textFont?: string;
  textSize?: string;
  /** Items for 'list' render type — maps to ArticleBlockType.List with listItems[]. */
  listItems?: ListItem[];
  /** UI-only flag to collapse PDF preview without removing the block. */
  pdfCollapsed?: boolean;
  /** Cached source string used to avoid re-creating trusted PDF URL every CD cycle. */
  pdfSourceCache?: string;
  /** Cached trusted PDF URL used by <object> embed. */
  pdfSafeResourceCache?: SafeResourceUrl | null;
}

const FONTS = [
  { label: 'Default',         value: '' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Courier New',     value: '"Courier New", monospace' },
  { label: 'Trebuchet MS',    value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Calibri',         value: 'Calibri, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' }
];

const FONT_SIZES = ['10px','11px','12px','13px','14px','16px','18px','20px','24px','28px','32px','36px','42px'];

@Component({
  selector: 'app-article-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-create.component.html',
  styleUrls: ['./article-create.component.css'],
})
export class ArticleCreateComponent implements OnInit, AfterViewChecked {
  @ViewChildren('editableBlock') editableBlocks!: QueryList<ElementRef>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('videoInput') videoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pdfInput') pdfInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('contentArea') contentAreaRef!: ElementRef<HTMLElement>;

  agentSystems: System[] = [];
  selectedSystemId = '';
  isPublishing = false;
  toastMessage = '';
  private toastTimer: any;
  private needsContentReset = false;

  /** Drop indicator index for dragged images */
  dropTargetIndex: number | null = null;
  /** Drop indicator index for internal block reordering. */
  blockDropTargetIndex: number | null = null;
  /** Source index of block currently being dragged via handle. */
  draggingBlockIndex: number | null = null;

  /** Which image block is currently "selected" (shows resize handles) */
  selectedMediaIndex: number | null = null;

  /** Resize drag state */
  private resizingIdx: number | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 100;

  /** Font toolbar */
  readonly fonts = FONTS;
  readonly fontSizes = FONT_SIZES;
  private savedRange: Range | null = null;

  /** Block index currently focused (text/h1/h2/quote/code blocks). */
  focusedBlockIndex: number | null = null;
  /** List block + item index currently focused. */
  focusedListItem: { block: number; item: number } | null = null;

  /** Editor-wide defaults applied to every new block the user creates. */
  // defaultFont = '';
  defaultSize = '';

  articleModel = {
    title: '',
    systemId: '',
    blocks: [] as EditorBlock[],
  };

  currentUserId = '';
  currentUserName = '';

  constructor(
    private articleService: ArticleService,
    private systemService: ITSystemService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getUserId() ?? '';
    this.currentUserName = this.authService.getUserName() ?? '';
    this.articleModel.blocks.push(this.makeTextBlock());
    this.loadAgentSystems();
  }

  private initialFocusDone = false;

  ngAfterViewChecked() {
    if (this.needsContentReset) {
      this.needsContentReset = false;
      this.resetBlockContents();
    }
    if (!this.initialFocusDone && this.editableBlocks.length > 0) {
      this.initialFocusDone = true;
      this.editableBlocks.first?.nativeElement.focus();
    }
  }

  // ─── SYSTEMS ──────────────────────────────────────────────────────────────

  loadAgentSystems() {
    this.systemService.getAllSystems().subscribe({
      next: (systems) => {
        if (!systems.length) return;
        forkJoin(
          systems.map((s) =>
            this.systemService.getSystemAgents(s.id).pipe(
              map((agents) => ({ system: s, isAgent: agents.some((a) => a.id === this.currentUserId) })),
              catchError(() => of({ system: s, isAgent: false })),
            ),
          ),
        ).subscribe((results) => {
          this.agentSystems = results.filter((r) => r.isAgent).map((r) => r.system);
          if (this.agentSystems.length === 1) {
            this.selectedSystemId = this.agentSystems[0].id;
            this.articleModel.systemId = this.selectedSystemId;
          }
        });
      },
    });
  }

  onSystemChange(id: string) {
    this.selectedSystemId = id;
    this.articleModel.systemId = id;
  }

  getSelectedSystemName(): string {
    return this.agentSystems.find((s) => s.id === this.selectedSystemId)?.name ?? '';
  }

  goBack() { this.router.navigate(['/articles']); }

  // ─── BLOCK HELPERS ────────────────────────────────────────────────────────

  isEditableBlock(type: BlockRenderType): boolean {
    return ['text', 'h1', 'h2', 'quote', 'code'].includes(type);
  }

  getBlockClass(type: BlockRenderType): string {
    const map: Partial<Record<BlockRenderType, string>> = {
      h1: 'block-h1', h2: 'block-h2', quote: 'block-quote', code: 'block-code',
    };
    return map[type] ? `block-editable ${map[type]}` : 'block-editable';
  }

  getPlaceholder(type: BlockRenderType): string {
    const map: Partial<Record<BlockRenderType, string>> = {
      text: 'Type something…  (/List  /VideoPath  /VideoName)',
      h1: 'Heading 1', h2: 'Heading 2',
      quote: 'Quote…', code: '// code…',
    };
    return map[type] ?? '';
  }

  getEditableIndex(blockIdx: number): number {
    let n = 0;
    for (let i = 0; i < blockIdx; i++) {
      if (this.isEditableBlock(this.articleModel.blocks[i].renderType)) n++;
    }
    return n;
  }

  resetBlockContents() {
    const els = this.editableBlocks.toArray();
    let idx = 0;
    for (const b of this.articleModel.blocks) {
      if (this.isEditableBlock(b.renderType)) {
        const el = els[idx];
        if (el) el.nativeElement.innerHTML = b.content ?? '';
        idx++;
      }
    }
  }

  trackBlock(_: number, b: EditorBlock): EditorBlock { return b; }

  // ─── BLOCK OPERATIONS ─────────────────────────────────────────────────────

  addBlock(type: BlockRenderType) {
    if (type === 'list') {
      const newBlock: EditorBlock = { renderType: 'list', textFont: this.defaultFont || undefined, textSize: this.defaultSize || undefined, listItems: [] };
      newBlock.listItems = [this.makeListItem(newBlock)];
      this.articleModel.blocks.push(newBlock);
      const newIdx = this.articleModel.blocks.length - 1;
      setTimeout(() => this.focusListItemEl(newIdx, 0), 60);
      return;
    }
    this.articleModel.blocks.push({
      renderType: type, content: '',
      textFont: this.defaultFont || undefined,
      textSize: this.defaultSize || undefined,
    });
    setTimeout(() => {
      const els = this.editableBlocks.toArray();
      if (els.length) els[els.length - 1].nativeElement.focus();
    }, 60);
  }

  private makeTextBlock(): EditorBlock {
    return {
      renderType: 'text', content: '',
      textFont: this.defaultFont || undefined,
      textSize: this.defaultSize || undefined,
    };
  }

  // ─── LIST BLOCK HELPERS ───────────────────────────────────────────────────

  private focusListItemEl(blockIdx: number, itemIdx: number) {
    const el = this.contentAreaRef?.nativeElement?.querySelector(
      `[data-block="${blockIdx}"][data-item="${itemIdx}"]`,
    ) as HTMLElement | null;
    el?.focus();
  }

  private makeListItem(block?: EditorBlock): ListItem {
    // New items inherit the block's current font/size (which already came from defaults)
    return {
      content: '',
      textFont: block?.textFont || this.defaultFont || undefined,
      textSize: block?.textSize || this.defaultSize || undefined,
    };
  }

  addListItem(blockIdx: number, afterIdx: number) {
    const block = this.articleModel.blocks[blockIdx];
    block.listItems = block.listItems ?? [];
    block.listItems.splice(afterIdx + 1, 0, this.makeListItem(block));
    setTimeout(() => this.focusListItemEl(blockIdx, afterIdx + 1), 60);
  }

  removeListItem(blockIdx: number, itemIdx: number) {
    const block = this.articleModel.blocks[blockIdx];
    if (!block.listItems) return;
    if (block.listItems.length <= 1) {
      // Last item — convert whole block to a text block
      this.articleModel.blocks.splice(blockIdx, 1, this.makeTextBlock());
      setTimeout(() => {
        this.editableBlocks.toArray()[this.getEditableIndex(blockIdx)]?.nativeElement.focus();
      }, 60);
    } else {
      block.listItems.splice(itemIdx, 1);
      setTimeout(() => this.focusListItemEl(blockIdx, Math.max(0, itemIdx - 1)), 60);
    }
  }

  onListItemKeyDown(event: KeyboardEvent, blockIdx: number, itemIdx: number) {
    const el = event.target as HTMLElement;
    const isEmpty = !el.textContent?.trim() && (!el.innerHTML || el.innerHTML === '<br>');

    if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      if (delta === -1 && !this.canMoveBlockUp(blockIdx)) return;
      if (delta === 1 && !this.canMoveBlockDown(blockIdx)) return;
      event.preventDefault();
      this.moveBlockBy(blockIdx, delta);
      const newIdx = blockIdx + delta;
      setTimeout(() => this.focusListItemEl(newIdx, itemIdx), 0);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.addListItem(blockIdx, itemIdx);
    }

    if (event.key === 'Backspace' && isEmpty) {
      event.preventDefault();
      this.removeListItem(blockIdx, itemIdx);
    }
  }

  onListItemInput(event: Event, item: ListItem) {
    item.content = (event.target as HTMLElement).innerHTML;
  }

  onListItemFocus(blockIdx: number, itemIdx: number) {
    this.focusedListItem = { block: blockIdx, item: itemIdx };
    this.focusedBlockIndex = null;
  }

  deleteBlock(i: number) {
    this.articleModel.blocks.splice(i, 1);
    if (this.selectedMediaIndex === i) this.selectedMediaIndex = null;
    else if (this.selectedMediaIndex !== null && this.selectedMediaIndex > i) this.selectedMediaIndex--;
  }

  canMoveBlockUp(i: number): boolean {
    return i > 0;
  }

  canMoveBlockDown(i: number): boolean {
    return i < this.articleModel.blocks.length - 1;
  }

  moveBlockBy(i: number, delta: number) {
    const to = i + delta;
    if (to < 0 || to >= this.articleModel.blocks.length || to === i) return;
    this.relocateBlock(i, to);
  }

  private remapIndexAfterMove(index: number | null, from: number, to: number): number | null {
    if (index === null) return null;
    if (index === from) return to;
    if (from < to) {
      if (index > from && index <= to) return index - 1;
      return index;
    }
    if (index >= to && index < from) return index + 1;
    return index;
  }

  private relocateBlock(from: number, to: number) {
    if (from === to) return;
    const blocks = this.articleModel.blocks;
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);

    this.selectedMediaIndex = this.remapIndexAfterMove(this.selectedMediaIndex, from, to);
    this.focusedBlockIndex = this.remapIndexAfterMove(this.focusedBlockIndex, from, to);
    if (this.focusedListItem) {
      const nextBlock = this.remapIndexAfterMove(this.focusedListItem.block, from, to);
      if (nextBlock === null) this.focusedListItem = null;
      else this.focusedListItem = { ...this.focusedListItem, block: nextBlock };
    }
  }

  onBlockDragStart(event: DragEvent, fromIdx: number) {
    this.draggingBlockIndex = fromIdx;
    this.blockDropTargetIndex = fromIdx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `block:${fromIdx}`);
    }
  }

  /** Drag image/video blocks by the media (not only the grip). Cancels for resize, caption, controls, etc. */
  onMediaBlockDragStart(event: DragEvent, i: number) {
    const t = event.target as HTMLElement;
    if (
      t.closest(
        'button, input, textarea, select, .img-caption, .img-resize-se, .media-size-row, .img-continue-btn, .link-continue-btn, .no-block-drag',
      )
    ) {
      event.preventDefault();
      return;
    }
    this.onBlockDragStart(event, i);
  }

  onBlockDragEnd() {
    this.draggingBlockIndex = null;
    this.blockDropTargetIndex = null;
  }

  onBlockDragOverWrap(event: DragEvent, blockIdx: number) {
    if (this.draggingBlockIndex === null) return;
    event.preventDefault();
    const wrap = event.currentTarget as HTMLElement | null;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    this.blockDropTargetIndex = event.clientY < rect.top + rect.height / 2 ? blockIdx : blockIdx + 1;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onBlockDropWrap(event: DragEvent, blockIdx: number) {
    if (this.draggingBlockIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    const wrap = event.currentTarget as HTMLElement | null;
    const rect = wrap?.getBoundingClientRect();
    const targetIdx =
      rect && event.clientY >= rect.top + rect.height / 2
        ? blockIdx + 1
        : blockIdx;
    this.reorderDraggedBlock(targetIdx);
  }

  onBlockDragOverZone(event: DragEvent, targetIdx: number) {
    if (this.draggingBlockIndex === null) return;
    event.preventDefault();
    this.blockDropTargetIndex = targetIdx;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onBlockDropZone(event: DragEvent, targetIdx: number) {
    if (this.draggingBlockIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.reorderDraggedBlock(targetIdx);
  }

  private reorderDraggedBlock(dropIndex: number) {
    const fromIdx = this.draggingBlockIndex;
    if (fromIdx === null) return;
    const maxDrop = this.articleModel.blocks.length;
    const normalizedDrop = Math.max(0, Math.min(dropIndex, maxDrop));
    const toIdx = fromIdx < normalizedDrop ? normalizedDrop - 1 : normalizedDrop;

    if (toIdx !== fromIdx) {
      this.relocateBlock(fromIdx, toIdx);
      this.showToast('Block moved');
    }
    this.draggingBlockIndex = null;
    this.blockDropTargetIndex = null;
  }

  /** After clicking a non-editable block (img/link), focus the next text block or insert one. */
  focusNextOrAdd(i: number, stopEvent?: MouseEvent) {
    stopEvent?.stopPropagation();
    const blocks = this.articleModel.blocks;
    const nextIdx = i + 1;
    if (nextIdx < blocks.length && this.isEditableBlock(blocks[nextIdx].renderType)) {
      setTimeout(() => {
        this.editableBlocks.toArray()[this.getEditableIndex(nextIdx)]?.nativeElement.focus();
      }, 30);
    } else {
      blocks.splice(nextIdx, 0, this.makeTextBlock());
      setTimeout(() => {
        this.editableBlocks.toArray()[this.getEditableIndex(nextIdx)]?.nativeElement.focus();
      }, 60);
    }
  }

  /** Click on empty space in content area → focus last editable block */
  onContentAreaClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.block-wrap') && !target.closest('.add-bar')) {
      const els = this.editableBlocks.toArray();
      if (els.length) els[els.length - 1].nativeElement.focus();
    }
  }

  // ─── ENSURE TEXT BLOCK FOLLOWS IMAGE/LINK ─────────────────────────────────

  private ensureTextAfter(idx: number) {
    const blocks = this.articleModel.blocks;
    const nextIdx = idx + 1;
    if (nextIdx >= blocks.length || !this.isEditableBlock(blocks[nextIdx].renderType)) {
      blocks.splice(nextIdx, 0, this.makeTextBlock());
    }
  }

  // ─── IMAGE RESIZE ─────────────────────────────────────────────────────────

  selectMedia(i: number, event: MouseEvent) {
    this.selectedMediaIndex = i;
    event.stopPropagation();
  }

  startResize(event: MouseEvent, i: number) {
    event.preventDefault();
    event.stopPropagation();
    this.resizingIdx = i;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.articleModel.blocks[i].imgWidth ?? 100;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(event: MouseEvent) {
    if (this.resizingIdx === null) return;
    const block = this.articleModel.blocks[this.resizingIdx];
    const area = this.contentAreaRef?.nativeElement;
    const containerW = area ? area.offsetWidth : 700;
    const dx = event.clientX - this.resizeStartX;
    block.imgWidth = Math.round(
      Math.max(20, Math.min(100, this.resizeStartWidth + (dx / containerW) * 100))
    );
  }

  @HostListener('document:mouseup')
  onDocMouseUp() { this.resizingIdx = null; }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    const t = event.target as HTMLElement;
    if (!t.closest('.img-block') && !t.closest('.video-block')) this.selectedMediaIndex = null;
  }

  // ─── FONT / FORMATTING TOOLBAR ────────────────────────────────────────────

  /** Save text selection before a toolbar control takes focus. */
  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0).cloneRange();
  }

  private restoreSelection() {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(this.savedRange); }
  }

  applyFont(family: string) {
    if (!family) return;
    this.restoreSelection();
    document.execCommand('fontName', false, family);
    if (this.focusedBlockIndex !== null) {
      this.articleModel.blocks[this.focusedBlockIndex].textFont = family;
    }
    if (this.focusedListItem !== null) {
      const { block, item } = this.focusedListItem;
      const li = this.articleModel.blocks[block]?.listItems?.[item];
      if (li) li.textFont = family;
    }
  }

  applyFontSize(size: string) {
    if (!size) return;
    this.restoreSelection();
    document.execCommand('fontSize', false, '7');
    document.querySelectorAll('[size="7"]').forEach((el) => {
      const span = document.createElement('span');
      span.style.fontSize = size;
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode?.replaceChild(span, el);
    });
    if (this.focusedBlockIndex !== null) {
      this.articleModel.blocks[this.focusedBlockIndex].textSize = size;
    }
    if (this.focusedListItem !== null) {
      const { block, item } = this.focusedListItem;
      const li = this.articleModel.blocks[block]?.listItems?.[item];
      if (li) li.textSize = size;
    }
  }

  format(cmd: string) {
    this.restoreSelection();
    document.execCommand(cmd);
  }

  // ─── KEYBOARD: Markdown shortcuts + smart Enter / Backspace ───────────────

  onBlockKeyDown(event: KeyboardEvent, i: number) {
    const block = this.articleModel.blocks[i];
    const el = event.target as HTMLElement;
    const txt = el.textContent?.trim() ?? '';
    const slashCmd = txt.toLowerCase();

    if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      if (delta === -1 && !this.canMoveBlockUp(i)) return;
      if (delta === 1 && !this.canMoveBlockDown(i)) return;
      event.preventDefault();
      this.moveBlockBy(i, delta);
      const newIdx = i + delta;
      setTimeout(() => {
        this.editableBlocks.toArray()[this.getEditableIndex(newIdx)]?.nativeElement?.focus();
      }, 0);
      return;
    }

    if ((event.key === ' ' || event.key === 'Enter') && block.renderType === 'text') {
      if (slashCmd === '/list') {
        event.preventDefault();
        this.articleModel.blocks.splice(i, 1, { renderType: 'list', listItems: [{ content: '' }] });
        setTimeout(() => this.focusListItemEl(i, 0), 60);
        return;
      }
      if (slashCmd === '/videopath') {
        event.preventDefault();
        block.content = '';
        el.innerHTML = '';
        void this.promptVideoLinkPath();
        return;
      }
      if (slashCmd === '/videoname') {
        event.preventDefault();
        block.content = '';
        el.innerHTML = '';
        this.promptVideoName();
        return;
      }
      if (slashCmd === '/pdf') {
        event.preventDefault();
        block.content = '';
        el.innerHTML = '';
        this.promptPdfPath();
        return;
      }
    }

    if (event.key === ' ' && this.isEditableBlock(block.renderType)) {
      // '-' and '*' create a list block (not just a single bullet line)
      if ((txt === '-' || txt === '*') && block.renderType === 'text') {
        event.preventDefault();
        this.articleModel.blocks.splice(i, 1, { renderType: 'list', listItems: [{ content: '' }] });
        setTimeout(() => this.focusListItemEl(i, 0), 60);
        return;
      }
      const shortcuts: Record<string, BlockRenderType> = {
        '>': 'quote',
      };
      const next = shortcuts[txt];
      if (next) {
        event.preventDefault();
        block.renderType = next; block.content = ''; el.innerHTML = ''; return;
      }
      if (txt === '---') {
        event.preventDefault();
        this.articleModel.blocks.splice(i, 1, { renderType: 'divider' });
        this.articleModel.blocks.splice(i + 1, 0, this.makeTextBlock());
        setTimeout(() => {
          this.editableBlocks.toArray()[this.getEditableIndex(i + 1)]?.nativeElement.focus();
        }, 60);
        return;
      }
    }

    if (event.key === '`' && txt === '``' && this.isEditableBlock(block.renderType)) {
      event.preventDefault();
      block.renderType = 'code'; block.content = ''; el.innerHTML = ''; return;
    }

    if (event.key === 'Enter' && !event.shiftKey && block.renderType !== 'code') {
      event.preventDefault();
      this.articleModel.blocks.splice(i + 1, 0, this.makeTextBlock());
      setTimeout(() => {
        this.editableBlocks.toArray()[this.getEditableIndex(i + 1)]?.nativeElement.focus();
      }, 60);
      return;
    }

    if (event.key === 'Backspace') {
      const isEmpty = !el.innerHTML || el.innerHTML === '<br>';
      if (isEmpty) {
        if (block.renderType !== 'text' && this.isEditableBlock(block.renderType)) {
          event.preventDefault();
          block.renderType = 'text'; block.content = ''; el.innerHTML = ''; return;
        }
        if (i > 0) {
          event.preventDefault();
          this.deleteBlock(i);
          setTimeout(() => {
            const els = this.editableBlocks.toArray();
            if (els.length) {
              const prev = Math.max(0, this.getEditableIndex(i) - 1);
              els[Math.min(prev, els.length - 1)]?.nativeElement.focus();
            }
          }, 60);
        }
      }
    }
  }

  // ─── DRAG-AND-DROP IMAGES ─────────────────────────────────────────────────

  onDragOver(event: DragEvent) {
    const hasFiles = event.dataTransfer?.types.includes('Files') ||
                     event.dataTransfer?.types.includes('application/x-moz-file');
    if (!hasFiles) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';

    const area = this.contentAreaRef?.nativeElement;
    if (!area) return;

    const wraps = Array.from(area.querySelectorAll('.block-wrap')) as HTMLElement[];
    const y = event.clientY;
    let idx = wraps.length;
    for (let j = 0; j < wraps.length; j++) {
      const r = wraps[j].getBoundingClientRect();
      if (y < r.top + r.height / 2) { idx = j; break; }
    }
    this.dropTargetIndex = idx;
  }

  onDragLeave(event: DragEvent) {
    const area = this.contentAreaRef?.nativeElement;
    if (!area || !area.contains(event.relatedTarget as Node | null)) {
      this.dropTargetIndex = null;
    }
  }

  async onDrop(event: DragEvent) {
    if (this.draggingBlockIndex !== null) {
      event.preventDefault();
      this.dropTargetIndex = null;
      return;
    }
    event.preventDefault();
    const idx = this.dropTargetIndex ?? this.articleModel.blocks.length;
    this.dropTargetIndex = null;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      let offset = 0;
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          this.insertImageAt(file, idx + offset);
          offset++;
        } else if (file.type.startsWith('video/')) {
          const added = await this.insertVideoAt(file, idx + offset);
          if (added) offset++;
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const added = this.insertPdfAt(file, idx + offset);
          if (added) offset++;
        }
      }
      return;
    }

    const url = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain');
    if (url && this.isUrl(url)) {
      this.articleModel.blocks.splice(idx, 0, {
        renderType: 'img', previewUrl: url, content: url, caption: '', imgWidth: 100,
      });
    }
  }

  insertImageAt(file: File, idx: number) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      this.articleModel.blocks.splice(idx, 0, {
        renderType: 'img', file,
        previewUrl: ev.target?.result as string,
        caption: '', imgWidth: 100,
      });
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  // ─── PASTE ────────────────────────────────────────────────────────────────

  onPaste(event: ClipboardEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('article-title-inp') || target.classList.contains('img-caption')) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) { this.insertImageAt(file, this.articleModel.blocks.length); this.showToast('Image pasted'); }
        return;
      }
    }

    const plain = event.clipboardData!.getData('text/plain').trim();
    if (this.isUrl(plain)) {
      event.preventDefault();
      this.articleModel.blocks.push({ renderType: 'link', content: plain });
      this.showToast('Link added');
      return;
    }

    const html = event.clipboardData!.getData('text/html');
    if (html) {
      if (/<(h[1-6]|ul|ol|blockquote|pre|hr)/i.test(html)) {
        event.preventDefault();
        this.parseHtmlIntoBlocks(html);
        return;
      }
      if (html.includes('<img')) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const imgs = doc.querySelectorAll('img');
        if (imgs.length) {
          event.preventDefault();
          const startIdx = this.articleModel.blocks.length;
          imgs.forEach((img) =>
            this.articleModel.blocks.push({
              renderType: 'img', previewUrl: img.src, content: img.src, caption: '', imgWidth: 100,
            }),
          );
          this.showToast('Image pasted');
          return;
        }
      }
    }
  }

  parseHtmlIntoBlocks(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks: EditorBlock[] = [];

    const walk = (parent: Element) => {
      for (const node of Array.from(parent.children)) {
        const tag = node.tagName.toLowerCase();
        const inner = (node as HTMLElement).innerHTML?.trim() ?? '';
        const text = node.textContent?.trim() ?? '';
        if (!text && !node.querySelector('img')) continue;
        switch (tag) {
          case 'h1': blocks.push({ renderType: 'h1', content: inner }); break;
          case 'h2': case 'h3': blocks.push({ renderType: 'h2', content: inner }); break;
          case 'h4': case 'h5': case 'h6': blocks.push({ renderType: 'h2', content: text }); break;
          case 'blockquote': blocks.push({ renderType: 'quote', content: inner }); break;
          case 'pre': blocks.push({ renderType: 'code', content: text }); break;
          case 'ul': case 'ol': {
            const liItems: ListItem[] = [];
            node.querySelectorAll('li').forEach((li) => {
              if (li.textContent?.trim()) liItems.push({ content: li.innerHTML.trim() });
            });
            if (liItems.length) blocks.push({ renderType: 'list', listItems: liItems });
            break;
          }
          case 'hr': blocks.push({ renderType: 'divider' }); break;
          case 'img':
            blocks.push({ renderType: 'img', previewUrl: (node as HTMLImageElement).src, content: (node as HTMLImageElement).src, caption: '', imgWidth: 100 });
            break;
          case 'p': {
            const imgs = Array.from(node.querySelectorAll('img'));
            if (imgs.length) imgs.forEach((img) =>
              blocks.push({ renderType: 'img', previewUrl: (img as HTMLImageElement).src, content: (img as HTMLImageElement).src, caption: '', imgWidth: 100 })
            );
            else if (text) blocks.push({ renderType: 'text', content: inner });
            break;
          }
          default: walk(node);
        }
      }
    };

    walk(doc.body);
    if (blocks.length) {
      this.articleModel.blocks.push(...blocks);
      const last = blocks[blocks.length - 1];
      if (!this.isEditableBlock(last.renderType)) {
        this.articleModel.blocks.push(this.makeTextBlock());
      }
      this.needsContentReset = true;
      this.showToast(blocks.length > 2 ? `Pasted ${blocks.length} blocks` : 'Content pasted');
    }
  }

  // ─── FILE PICK ────────────────────────────────────────────────────────────

  triggerImagePick() { this.fileInputRef.nativeElement.click(); }
  triggerVideoPick() { this.videoInputRef.nativeElement.click(); }
  triggerPdfPick() { this.pdfInputRef.nativeElement.click(); }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.insertImageAt(file, this.articleModel.blocks.length);
      this.showToast('Image added');
      (event.target as HTMLInputElement).value = '';
    }
  }

  async onVideoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const added = await this.insertVideoAt(file, this.articleModel.blocks.length);
      if (added) this.showToast('Video added');
      (event.target as HTMLInputElement).value = '';
    }
  }

  onPdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const added = this.insertPdfAt(file, this.articleModel.blocks.length);
      if (added) this.showToast('PDF added');
      (event.target as HTMLInputElement).value = '';
    }
  }

  async insertVideoAt(file: File, idx: number): Promise<boolean> {
    const validationError = await this.validateVideoFile(file);
    if (validationError) {
      this.showToast(validationError);
      return false;
    }
    const previewUrl = URL.createObjectURL(file);
    this.articleModel.blocks.splice(idx, 0, {
      renderType: 'video',
      file,
      previewUrl,
      imgWidth: 100,
    });
    this.cdr.detectChanges();
    return true;
  }

  insertPdfAt(file: File, idx: number): boolean {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.showToast('Invalid PDF file type.');
      return false;
    }
    const previewUrl = URL.createObjectURL(file);
    this.articleModel.blocks.splice(idx, 0, {
      renderType: 'pdf',
      file,
      previewUrl,
      content: file.name,
    });
    this.cdr.detectChanges();
    return true;
  }

  promptLink() {
    const url = prompt('Paste a URL:');
    if (url?.trim()) {
      this.articleModel.blocks.push({ renderType: 'link', content: url.trim() });
      this.showToast('Link added');
    }
  }

  async promptVideoLinkPath() {
    const path = prompt('Paste video path:');
    if (path?.trim()) {
      const normalizedPath = path.trim();
      const validationError = await this.validateVideoPath(normalizedPath);
      if (validationError) {
        this.showToast(validationError);
        return;
      }
      this.articleModel.blocks.push({ renderType: 'videoLink', content: normalizedPath, imgWidth: 100 });
      this.showToast('Video path added');
    }
  }

  promptVideoName() {
    const videoName = prompt('Type video name:');
    if (videoName?.trim()) {
      this.articleModel.blocks.push({ renderType: 'videoName', content: videoName.trim(), imgWidth: 100 });
      this.showToast('Video name added');
    }
  }

  promptPdfPath() {
    const pdfPath = prompt('Paste PDF path/url:');
    if (pdfPath?.trim()) {
      this.articleModel.blocks.push({ renderType: 'pdfLink', content: pdfPath.trim() });
      this.showToast('PDF path added');
    }
  }

  setMediaWidth(index: number, value: number | string) {
    const block = this.articleModel.blocks[index];
    if (!block || (block.renderType !== 'img' && block.renderType !== 'video' && block.renderType !== 'videoLink' && block.renderType !== 'videoName')) {
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    block.imgWidth = Math.max(20, Math.min(100, Math.round(n)));
  }

  async validateVideoLinkBlock(index: number) {
    const block = this.articleModel.blocks[index];
    if (!block || block.renderType !== 'videoLink') return;
    const path = block.content?.trim() ?? '';
    block.content = path;
    if (!path) return;
    const validationError = await this.validateVideoPath(path);
    if (validationError) this.showToast(validationError);
  }

  validateVideoNameBlock(index: number) {
    const block = this.articleModel.blocks[index];
    if (!block || block.renderType !== 'videoName') return;
    const name = block.content?.trim() ?? '';
    block.content = name;
    if (!name) this.showToast('Video name is required.');
  }

  // ─── PER-BLOCK FONT / SIZE ────────────────────────────────────────────────

  setBlockFont(blockIdx: number, family: string) {
    const block = this.articleModel.blocks[blockIdx];
    block.textFont = family || undefined;
    this.stripInlineStyle(blockIdx, 'font-family', 'font');
    if (block.renderType === 'list' && block.listItems) {
      block.listItems.forEach(item => item.textFont = family || undefined);
    }
    this.cdr.detectChanges();
  }

  setBlockSize(blockIdx: number, size: string) {
    const block = this.articleModel.blocks[blockIdx];
    block.textSize = size || undefined;
    this.stripInlineStyle(blockIdx, 'font-size');
    if (block.renderType === 'list' && block.listItems) {
      block.listItems.forEach(item => item.textSize = size || undefined);
    }
    this.cdr.detectChanges();
  }

  /** Remove a CSS property from every inline-styled child inside the editable block,
   *  then sync the cleaned HTML back to the model so it persists. */
  private stripInlineStyle(blockIdx: number, cssProp: string, fontAttr?: string) {
    const el = this.editableBlocks.toArray()[this.getEditableIndex(blockIdx)]?.nativeElement as HTMLElement | undefined;
    if (!el) return;

    // Strip from any element that has an inline style containing this property
    el.querySelectorAll<HTMLElement>('[style]').forEach(child => {
      child.style.removeProperty(cssProp);
      if (!child.getAttribute('style')?.trim()) child.removeAttribute('style');
    });

    // Also clean up legacy <font face="…"> / <font size="…"> attributes from execCommand
    if (fontAttr) {
      el.querySelectorAll<HTMLElement>(`font[${fontAttr}]`).forEach(font => {
        font.removeAttribute(fontAttr!);
        if (!font.attributes.length) {
          // Unwrap the <font> tag entirely if it has no remaining attributes
          const parent = font.parentNode;
          if (parent) {
            while (font.firstChild) parent.insertBefore(font.firstChild, font);
            parent.removeChild(font);
          }
        }
      });
    }

    // Sync cleaned DOM back to the model
    this.articleModel.blocks[blockIdx].content = el.innerHTML;
  }

  getLinkDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return url; }
  }

  isUrl(s: string): boolean {
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

  private async validateVideoFile(file: File): Promise<string | null> {
    if (!file.type?.startsWith('video/')) {
      return 'Invalid video file type.';
    }
    const objectUrl = URL.createObjectURL(file);
    const ok = await this.canLoadVideoMetadata(objectUrl);
    URL.revokeObjectURL(objectUrl);
    return ok ? null : 'Invalid or corrupted video file.';
  }

  private async validateVideoPath(path: string): Promise<string | null> {
    if (!path?.trim()) return 'Video path is required.';
    const normalizedSrc = this.normalizeVideoSource(path);
    const ok = await this.canLoadVideoMetadata(normalizedSrc);
    // Local file/network paths often fail preflight metadata checks due browser security
    // while still being intentionally used in local intranet setups.
    if (!ok && this.isLocalVideoPath(path)) return null;
    return ok ? null : 'Video path is not valid or not reachable.';
  }

  resolveVideoPathSource(path: string): string {
    return this.normalizeVideoSource(path);
  }

  resolveVideoNameSource(name: string): string {
    return this.articleService.getVideoUrl(name);
  }

  resolvePdfSource(path: string): string {
    if (!path?.trim()) return '';
    return this.normalizeVideoSource(path);
  }

  getPdfEmbedFromBlock(block: EditorBlock): SafeResourceUrl | null {
    const src = (block.previewUrl || this.resolvePdfSource(block.content || '')).trim();
    if (!src) return null;
    if (block.pdfSourceCache === src) {
      return block.pdfSafeResourceCache ?? null;
    }
    block.pdfSourceCache = src;
    block.pdfSafeResourceCache = this.sanitizer.bypassSecurityTrustResourceUrl(src);
    return block.pdfSafeResourceCache;
  }

  private isLocalVideoPath(path: string): boolean {
    const p = path.trim();
    return /^file:\/\//i.test(p) || /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\/.test(p);
  }

  private normalizeVideoSource(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (/^file:\/\//i.test(trimmed)) return encodeURI(trimmed);
    if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
      return encodeURI(`file:///${trimmed.replace(/\\/g, '/')}`);
    }
    if (/^\\\\/.test(trimmed)) {
      const uncPath = trimmed.replace(/^\\\\+/, '').replace(/\\/g, '/');
      return encodeURI(`file://${uncPath}`);
    }
    return trimmed;
  }

  private canLoadVideoMetadata(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      let settled = false;
      const done = (result: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        video.removeAttribute('src');
        video.load();
        resolve(result);
      };
      const timeoutId = window.setTimeout(() => done(false), 7000);
      video.preload = 'metadata';
      video.onloadedmetadata = () => done(true);
      video.onerror = () => done(false);
      video.src = src;
    });
  }

  // ─── CANVAS RESIZE ────────────────────────────────────────────────────────

  /**
   * Resize an image File to `pct`% of its natural dimensions using a canvas.
   * Returns the original file unchanged when pct >= 100 or the input has no file.
   */
  /**
   * Resize a File so its pixel width matches the editor display width for `pct`%.
   * Returns the (possibly resized) File plus the final pixel dimensions.
   */
  private resizeImageFile(
    file: File,
    pct: number,
  ): Promise<{ file: File; w: number; h: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const colW = this.contentAreaRef?.nativeElement?.offsetWidth ?? 720;
        const targetW = pct >= 100
          ? img.naturalWidth
          : Math.max(1, Math.round(colW * pct / 100));

        // Never upscale — keep original if already small enough
        if (targetW >= img.naturalWidth) {
          URL.revokeObjectURL(objectUrl);
          resolve({ file, w: img.naturalWidth, h: img.naturalHeight });
          return;
        }

        const targetH = Math.max(1, Math.round(img.naturalHeight * (targetW / img.naturalWidth)));
        const canvas = document.createElement('canvas');
        canvas.width  = targetW;
        canvas.height = targetH;
        canvas.getContext('2d')!.drawImage(img, 0, 0, targetW, targetH);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob(
          (blob) => resolve(
            blob
              ? { file: new File([blob], file.name, { type: file.type }), w: targetW, h: targetH }
              : { file, w: img.naturalWidth, h: img.naturalHeight },
          ),
          file.type,
          0.92,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve({ file, w: 0, h: 0 }); };
      img.src = objectUrl;
    });
  }

  private resolveVideoDimensions(
    file: File,
    pct: number,
  ): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const colW = this.contentAreaRef?.nativeElement?.offsetWidth ?? 720;
        const naturalW = video.videoWidth || colW;
        const naturalH = video.videoHeight || Math.round(colW * 9 / 16);
        const targetW = pct >= 100 ? naturalW : Math.max(1, Math.round(colW * pct / 100));
        const finalW = Math.min(targetW, naturalW);
        const finalH = Math.max(1, Math.round(naturalH * (finalW / naturalW)));
        URL.revokeObjectURL(objectUrl);
        resolve({ w: finalW, h: finalH });
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ w: 0, h: 0 });
      };
      video.src = objectUrl;
    });
  }

  private resolveVideoPathDimensions(
    path: string,
    pct: number,
  ): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
      if (!path?.trim()) {
        resolve({ w: 0, h: 0 });
        return;
      }
      const video = document.createElement('video');
      const colW = this.contentAreaRef?.nativeElement?.offsetWidth ?? 720;
      const fallbackW = Math.max(1, Math.round(colW * Math.max(20, Math.min(100, pct || 100)) / 100));
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const naturalW = video.videoWidth || fallbackW;
        const naturalH = video.videoHeight || Math.round(fallbackW * 9 / 16);
        const targetW = pct >= 100 ? naturalW : Math.max(1, Math.round(colW * pct / 100));
        const finalW = Math.min(targetW, naturalW);
        const finalH = Math.max(1, Math.round(naturalH * (finalW / naturalW)));
        resolve({ w: finalW, h: finalH });
      };
      video.onerror = () => {
        resolve({ w: fallbackW, h: 0 });
      };
      video.src = this.normalizeVideoSource(path);
    });
  }

  // ─── PUBLISH ──────────────────────────────────────────────────────────────

  defaultFont = 'Inter, sans-serif';
  defaultFontSize = '16px';
  async publish() {
    if (this.isPublishing) return;
    if (!this.articleModel.title.trim()) { this.showToast('Please add a title'); return; }
    if (!this.selectedSystemId) { this.showToast('Please select a system first'); return; }

    for (const block of this.articleModel.blocks) {
      if (block.renderType === 'video' && block.file) {
        const validationError = await this.validateVideoFile(block.file);
        if (validationError) {
          this.showToast(validationError);
          return;
        }
      }
      if (block.renderType === 'videoLink' && block.content?.trim()) {
        const validationError = await this.validateVideoPath(block.content.trim());
        if (validationError) {
          this.showToast(validationError);
          return;
        }
      }
      if (block.renderType === 'videoName' && !(block.content?.trim())) {
        this.showToast('Video name is required.');
        return;
      }
    }

    this.isPublishing = true;

    // Resize image files and capture exact pixel dimensions
    const resolvedBlocks = await Promise.all(
      this.articleModel.blocks.map(async (b) => {
        if (b.renderType === 'img' && b.file) {
          const { file, w, h } = await this.resizeImageFile(b.file, b.imgWidth ?? 100);
          return { ...b, file, resolvedW: w, resolvedH: h };
        }
        if (b.renderType === 'video' && b.file) {
          const { w, h } = await this.resolveVideoDimensions(b.file, b.imgWidth ?? 100);
          return { ...b, resolvedW: w, resolvedH: h };
        }
        if (b.renderType === 'videoLink' && b.content) {
          const { w, h } = await this.resolveVideoPathDimensions(b.content, b.imgWidth ?? 100);
          return { ...b, resolvedW: w, resolvedH: h };
        }
        if (b.renderType === 'videoName' && b.content) {
          const { w, h } = await this.resolveVideoPathDimensions(this.articleService.getVideoUrl(b.content), b.imgWidth ?? 100);
          return { ...b, resolvedW: w, resolvedH: h };
        }
        return b;
      }),
    );

    const blocks: CreateArticleBlockRequest[] = resolvedBlocks
      .filter((b) => b.renderType !== 'divider')
      .map((b, i): CreateArticleBlockRequest => {
        if (b.renderType === 'img') {
          return {
            type: ArticleBlockType.Image,
            file: b.file,
            imageWidth:  b.resolvedW ? b.resolvedW.toString() : undefined,
            imageHeight: b.resolvedH ? b.resolvedH.toString() : undefined,
            order: i,
          };
        }
        if (b.renderType === 'video') {
          return {
            type: ArticleBlockType.Video,
            file: b.file,
            imageWidth:  b.resolvedW ? b.resolvedW.toString() : undefined,
            imageHeight: b.resolvedH ? b.resolvedH.toString() : undefined,
            order: i,
          };
        }
        if (b.renderType === 'link') {
          return {
            type: ArticleBlockType.Link,
            content: b.content,
            linkViewName: b.linkViewName || undefined,
            order: i,
          };
        }
        if (b.renderType === 'videoLink') {
          return {
            type: ArticleBlockType.VideoLink,
            content: b.content,
            imageWidth:  b.resolvedW ? b.resolvedW.toString() : undefined,
            imageHeight: b.resolvedH ? b.resolvedH.toString() : undefined,
            order: i,
          };
        }
        if (b.renderType === 'videoName') {
          return {
            type: ArticleBlockType.VideoName,
            content: b.content,
            imageWidth:  b.resolvedW ? b.resolvedW.toString() : undefined,
            imageHeight: b.resolvedH ? b.resolvedH.toString() : undefined,
            order: i,
          };
        }
        if (b.renderType === 'pdf') {
          return {
            type: ArticleBlockType.PDF,
            file: b.file,
            content: b.content,
            order: i,
          };
        }
        if (b.renderType === 'pdfLink') {
          return {
            type: ArticleBlockType.PDF,
            content: b.content,
            order: i,
          };
        }
        if (b.renderType === 'list') {
          return {
            type: ArticleBlockType.List,
            listItems: b.listItems?.map(li => ({
              content: li.content,
              textFont: li.textFont?? this.defaultFont ,
              textSize: li.textSize ?? this.defaultFontSize ,
            })),
            order: i,
          };
        }
        // text / h1 / h2 / quote / code → Text type
        return {
          type: ArticleBlockType.Text,
          content: b.content,
          textFont: b.textFont || undefined,
          textSize: b.textSize || undefined,
          order: i,
        };
      });

    const payload: CreateArticleRequest = {
      title: this.articleModel.title,
      systemId: this.selectedSystemId,
      blocks,
    };

    this.articleService.createArticle(payload).subscribe({
      next: () => {
        this.isPublishing = false;
        this.showToast('Published! Redirecting…');
        setTimeout(() => this.router.navigate(['/articles']), 1400);
      },
      error: () => { this.isPublishing = false; this.showToast('Failed to publish'); },
    });
  }

  // ─── TOAST ────────────────────────────────────────────────────────────────

  showToast(msg: string) {
    this.toastMessage = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastMessage = ''), 2500);
  }
}
