import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { ArticleService } from '../../Services/article.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { FilesService } from '../../Services/Files.service';
import { AuthService } from '../../Services/auth.service';
import { ArticleBlockDto, ArticleBlockType, ArticleResponse, CreateArticleBlockRequest } from '../../Interfaces/Article';

type PendingDraftKind =
  | 'text'
  | 'link'
  | 'videoPath'
  | 'videoName'
  | 'pdfPath'
  | 'imageUpload'
  | 'videoUpload'
  | 'pdfUpload';

interface PendingBlockDraft {
  kind: PendingDraftKind;
  type: ArticleBlockType;
  insertIndex: number;
  content: string;
  file: File | null;
  error: string;
  info: string;
}

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './article-detail.component.html',
  styleUrls: ['./article-detail.component.css'],
})
export class ArticleDetailComponent implements OnInit, OnDestroy {
  article: ArticleResponse | null = null;
  isLoading = true;
  notFound = false;
  systemName = '';
  currentUserId = '';
  updateMode = false;
  isMutating = false;
  pendingDraft: PendingBlockDraft | null = null;
  isDraggingDraft = false;
  pdfCollapsedByBlockId: Record<string, boolean> = {};
  pdfLoadingByBlockId: Record<string, boolean> = {};
  private pdfEmbedResourceByBlockId: Record<string, SafeResourceUrl | null | undefined> = {};
  private pendingPdfByBlockId: Record<string, boolean> = {};
  private pdfObjectUrlByBlockId: Record<string, string> = {};
  
  readonly BlockType = ArticleBlockType;

  constructor(
    private route: ActivatedRoute,
    private articleService: ArticleService,
    private systemService: ITSystemService,
    private filesService: FilesService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getUserId() ?? '';
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) this.loadArticle(id);
    });
  }

  ngOnDestroy() {
    this.releaseAllPdfObjectUrls();
  }

  loadArticle(id: string) {
    this.isLoading = true;
    this.notFound = false;
    this.article = null;
    this.articleService.getArticleById(id).subscribe({
      next: (res) => {
        this.article = { ...res, blocks: [...res.blocks].sort((a, b) => a.order - b.order) };
        this.resetPdfUiState();
        this.primePdfEmbeds();
        this.pendingDraft = null;
        this.isLoading = false;
        if (!this.canUpdateArticle()) this.updateMode = false;
        this.loadSystemName(res.systemId);
      },
      error: () => {
        this.isLoading = false;
        this.notFound = true;
      },
    });
  }

  canUpdateArticle(): boolean {
    if (!this.article || !this.currentUserId) return false;

    return this.article.authorId === this.currentUserId;
  }

  toggleUpdateMode() {
    if (!this.canUpdateArticle()) return;
    this.updateMode = !this.updateMode;
    if (!this.updateMode) this.pendingDraft = null;
  }

  removeBlock(blockId: string) {
    if (!this.article || !this.updateMode || this.isMutating) return;
    this.isMutating = true;
    this.articleService.removeBlock(blockId).subscribe({
      next: () => {
        this.reloadCurrentArticle();
      },
      error: () => {
        this.isMutating = false;
      },
    });
  }

  addTextBlock() {
    this.startAddDraft('text');
  }

  addLinkBlock() {
    this.startAddDraft('link');
  }

  addVideoPathBlock() {
    this.startAddDraft('videoPath');
  }

  addVideoNameBlock() {
    this.startAddDraft('videoName');
  }

  addPdfPathBlock() {
    this.startAddDraft('pdfPath');
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.pendingDraft || this.pendingDraft.kind !== 'imageUpload') {
      this.startAddDraft('imageUpload');
    }
    if (this.pendingDraft) {
      this.pendingDraft.file = file;
      this.pendingDraft.error = '';
    }
    (event.target as HTMLInputElement).value = '';
  }

  onVideoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.pendingDraft || this.pendingDraft.kind !== 'videoUpload') {
      this.startAddDraft('videoUpload');
    }
    if (this.pendingDraft) {
      this.pendingDraft.file = file;
      this.pendingDraft.error = '';
    }
    (event.target as HTMLInputElement).value = '';
  }

  onPdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.pendingDraft || this.pendingDraft.kind !== 'pdfUpload') {
      this.startAddDraft('pdfUpload');
    }
    if (this.pendingDraft) {
      this.pendingDraft.file = file;
      this.pendingDraft.error = '';
    }
    (event.target as HTMLInputElement).value = '';
  }

  private addBlockRequest(payload: CreateArticleBlockRequest) {
    if (!this.article || !this.updateMode || this.isMutating) return;
    this.isMutating = true;
    this.articleService.addBlock(this.article.id, payload).subscribe({
      next: () => {
        this.reloadCurrentArticle();
      },
      error: () => {
        this.isMutating = false;
      },
    });
  }

  startAddDraft(kind: PendingDraftKind) {
    this.pendingDraft = {
      kind,
      type: this.getTypeForDraftKind(kind),
      insertIndex: this.article?.blocks?.length ?? 0,
      content: '',
      file: null,
      error: '',
      info: '',
    };
    this.pendingDraft.info = this.getDraftInsertPreview();
  }

  cancelAddDraft() {
    this.pendingDraft = null;
  }

  confirmAddDraft() {
    if (!this.pendingDraft || !this.article || this.isMutating) return;
    const resolvedOrder = this.resolveOrderForInsertIndex(this.pendingDraft.insertIndex);
    if (resolvedOrder === null) {
      this.pendingDraft.error = 'Cannot place this block at that position with current orders. Try another position.';
      return;
    }

    const payload: CreateArticleBlockRequest = {
      type: this.pendingDraft.type,
      order: resolvedOrder,
    };

    if (this.requiresFile(this.pendingDraft.kind)) {
      if (!this.pendingDraft.file) {
        this.pendingDraft.error = 'Please choose a file before confirming.';
        return;
      }
      payload.file = this.pendingDraft.file;
    } else {
      const content = this.pendingDraft.content.trim();
      if (!content) {
        this.pendingDraft.error = 'Content is required.';
        return;
      }
      payload.content = content;
    }

    this.pendingDraft.error = '';
    this.pendingDraft.info = '';
    this.addBlockRequest(payload);
  }

  getDraftTypeLabel(kind: PendingDraftKind): string {
    switch (kind) {
      case 'text': return 'Text';
      case 'link': return 'Link';
      case 'videoPath': return 'Video Path';
      case 'videoName': return 'Video Name';
      case 'pdfPath': return 'PDF Path';
      case 'imageUpload': return 'Image Upload';
      case 'videoUpload': return 'Video Upload';
      case 'pdfUpload': return 'PDF Upload';
      default: return 'Block';
    }
  }

  getDraftInsertPreview(): string {
    if (!this.pendingDraft) return '';
    const order = this.resolveOrderForInsertIndex(this.pendingDraft.insertIndex);
    if (order === null) {
      return 'No valid order in this position';
    }
    return `Auto order: ${order}`;
  }

  setDraftInsertIndex(index: number) {
    if (!this.pendingDraft) return;
    const max = this.article?.blocks?.length ?? 0;
    this.pendingDraft.insertIndex = Math.max(0, Math.min(index, max));
    this.pendingDraft.error = '';
    this.pendingDraft.info = this.getDraftInsertPreview();
  }

  onDraftDragStart() {
    this.isDraggingDraft = true;
  }

  onDraftDragEnd() {
    this.isDraggingDraft = false;
  }

  onDraftSlotDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDraftSlotDrop(event: DragEvent, index: number) {
    event.preventDefault();
    this.isDraggingDraft = false;
    this.setDraftInsertIndex(index);
  }

  onDraftFileDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDraftFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      this.startAddDraft('imageUpload');
    } else if (file.type.startsWith('video/')) {
      this.startAddDraft('videoUpload');
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      this.startAddDraft('pdfUpload');
    } else {
      if (this.pendingDraft) {
        this.pendingDraft.error = 'Unsupported file type for block upload.';
      }
      return;
    }

    if (this.pendingDraft) {
      this.pendingDraft.file = file;
      this.pendingDraft.error = '';
      this.pendingDraft.info = this.getDraftInsertPreview();
    }
  }

  private requiresFile(kind: PendingDraftKind): boolean {
    return kind === 'imageUpload' || kind === 'videoUpload' || kind === 'pdfUpload';
  }

  private resolveOrderForInsertIndex(insertIndex: number): number | null {
    const blocks = [...(this.article?.blocks ?? [])].sort((a, b) => Number(a.order) - Number(b.order));
    const used = new Set(blocks.map((b) => Number(b.order)).filter((n) => Number.isFinite(n)));
    const safeIndex = Math.max(0, Math.min(insertIndex, blocks.length));
    const prevOrder = safeIndex > 0 ? Number(blocks[safeIndex - 1].order) : null;
    const nextOrder = safeIndex < blocks.length ? Number(blocks[safeIndex].order) : null;

    if (prevOrder !== null && nextOrder !== null) {
      for (let n = prevOrder + 1; n < nextOrder; n++) {
        if (n >= 0 && !used.has(n)) return n;
      }
      return null;
    }

    if (prevOrder !== null) {
      let n = Math.max(0, prevOrder + 1);
      while (used.has(n)) n++;
      return n;
    }

    if (nextOrder !== null) {
      for (let n = 0; n < nextOrder; n++) {
        if (!used.has(n)) return n;
      }
      return null;
    }

    return 0;
  }

  private getTypeForDraftKind(kind: PendingDraftKind): ArticleBlockType {
    switch (kind) {
      case 'text': return ArticleBlockType.Text;
      case 'link': return ArticleBlockType.Link;
      case 'videoPath': return ArticleBlockType.VideoLink;
      case 'videoName': return ArticleBlockType.VideoName;
      case 'pdfPath': return ArticleBlockType.PDF;
      case 'imageUpload': return ArticleBlockType.Image;
      case 'videoUpload': return ArticleBlockType.Video;
      case 'pdfUpload': return ArticleBlockType.PDF;
      default: return ArticleBlockType.Text;
    }
  }

  private reloadCurrentArticle() {
    const id = this.article?.id;
    if (!id) return;
    this.articleService.getArticleById(id).subscribe({
      next: (res) => {
        this.article = { ...res, blocks: [...res.blocks].sort((a, b) => a.order - b.order) };
        this.resetPdfUiState();
        this.primePdfEmbeds();
        this.pendingDraft = null;
        this.isMutating = false;
      },
      error: () => {
        this.isMutating = false;
      },
    });
  }

  loadSystemName(systemId: string) {
    this.systemService.getAllSystems().subscribe({
      next: (systems) => {
        this.systemName = systems.find((s) => s.id === systemId)?.name ?? '';
      },
    });
  }

  resolveImageUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return this.filesService.getFileUrl(path);
  }

  resolveVideoUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return this.filesService.getFileUrl(path);
  }

  resolveVideoNameUrl(name: string): string {
    return this.articleService.getVideoUrl(name);
  }

  resolvePdfUrl(path: string): string {
    const trimmed = (path ?? '').trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^file:\/\//i.test(trimmed)) return encodeURI(trimmed);
    if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
      return encodeURI(`file:///${trimmed.replace(/\\/g, '/')}`);
    }
    if (/^\\\\/.test(trimmed)) {
      const uncPath = trimmed.replace(/^\\\\+/, '').replace(/\\/g, '/');
      return encodeURI(`file://${uncPath}`);
    }
    return this.filesService.getFileUrl(trimmed);
  }

  getPdfEmbedResource(block: ArticleBlockDto): SafeResourceUrl | null {
    const id = block.id;
    const existing = this.pdfEmbedResourceByBlockId[id];
    if (existing !== undefined) return existing;
    this.loadPdfBlobForBlock(block);
    return null;
  }

  togglePdfCollapsed(blockId: string) {
    this.pdfCollapsedByBlockId[blockId] = !this.pdfCollapsedByBlockId[blockId];
  }

  isPdfCollapsed(blockId: string): boolean {
    return !!this.pdfCollapsedByBlockId[blockId];
  }

  private primePdfEmbeds() {
    const blocks = this.article?.blocks ?? [];
    blocks.forEach((block) => {
      if (this.isPdfBlock(block.type)) {
        this.loadPdfBlobForBlock(block);
      }
    });
  }

  private loadPdfBlobForBlock(block: ArticleBlockDto) {
    const id = block.id;
    if (!id || this.pendingPdfByBlockId[id]) return;
    const src = this.resolvePdfUrl(block.content).trim();
    if (!src) {
      this.pdfEmbedResourceByBlockId[id] = null;
      return;
    }

    this.pendingPdfByBlockId[id] = true;
    this.pdfLoadingByBlockId[id] = true;
    this.http.get(src, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const normalized = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(normalized);
        this.releasePdfObjectUrl(id);
        this.pdfObjectUrlByBlockId[id] = objectUrl;
        this.pdfEmbedResourceByBlockId[id] = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
        this.pendingPdfByBlockId[id] = false;
        this.pdfLoadingByBlockId[id] = false;
      },
      error: () => {
        // Fallback to direct URL in case blob fetch is blocked.
        this.pdfEmbedResourceByBlockId[id] = this.sanitizer.bypassSecurityTrustResourceUrl(src);
        this.pendingPdfByBlockId[id] = false;
        this.pdfLoadingByBlockId[id] = false;
      },
    });
  }

  private resetPdfUiState() {
    this.releaseAllPdfObjectUrls();
    this.pdfCollapsedByBlockId = {};
    this.pdfLoadingByBlockId = {};
    this.pdfEmbedResourceByBlockId = {};
    this.pendingPdfByBlockId = {};
    this.pdfObjectUrlByBlockId = {};
  }

  private releasePdfObjectUrl(blockId: string) {
    const url = this.pdfObjectUrlByBlockId[blockId];
    if (!url) return;
    URL.revokeObjectURL(url);
    delete this.pdfObjectUrlByBlockId[blockId];
  }

  private releaseAllPdfObjectUrls() {
    Object.keys(this.pdfObjectUrlByBlockId).forEach((blockId) => this.releasePdfObjectUrl(blockId));
  }

  isTextBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.Text, ['Text']);
  }

  isImageBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.Image, ['Image']);
  }

  isListBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.List, ['List']);
  }

  isLinkBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.Link, ['Link']);
  }

  isVideoUploadBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.Video, ['Video', 'VideoFile']);
  }

  isVideoPathBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.VideoLink, ['VideoLink', 'VideoURL', 'VideoUrl']);
  }

  isVideoNameBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.VideoName, ['VideoName']);
  }

  isPdfBlock(type: unknown): boolean {
    return this.matchesType(type, ArticleBlockType.PDF, ['PDF', 'Pdf']);
  }

  private matchesType(type: unknown, numericEnum: ArticleBlockType, names: string[]): boolean {
    if (type === numericEnum) return true;
    const normalized = String(type ?? '').trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === String(numericEnum)) return true;
    return names.some((n) => normalized === n.toLowerCase());
  }

  getLinkDomain(url: string): string {
    try { return new URL(url).hostname; } catch { return url; }
  }
}
