import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { ArticleService } from '../../Services/article.service';
import { ITSystemService } from '../../Services/ITsystem.servic';
import { AuthService } from '../../Services/auth.service';
import { FilesService } from '../../Services/Files.service';
import { ArticleSummaryResponse } from '../../Interfaces/Article';
import { System } from '../../Interfaces/system';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './articles-page.component.html',
  styleUrls: ['./articles-page.component.css'],
})
export class ArticlesPageComponent implements OnInit {
  articles: ArticleSummaryResponse[] = [];
  systems: System[] = [];
  isAnySystemAgent = false;
  isLoading = true;

  constructor(
    private articleService: ArticleService,
    private systemService: ITSystemService,
    private authService: AuthService,
    private filesService: FilesService,
    private router: Router,
  ) {}

  ngOnInit() {
    const uid = this.authService.getUserId() ?? '';
    this.loadSystems();
    this.loadArticles();
    this.checkAgentStatus(uid);
  }

  loadSystems() {
    this.systemService.getAllSystems().subscribe({ next: (r) => (this.systems = r) });
  }

  loadArticles() {
    this.isLoading = true;
    this.articleService
      .getArticles({ pagenumber: 1 })
      .subscribe({
        next: (r) => { this.articles = r.data; this.isLoading = false; },
        error: () => (this.isLoading = false),
      });
  }

  checkAgentStatus(uid: string) {
    this.articleService.getSystemAgents().subscribe({
      next: (agents: any) => {
        if (Array.isArray(agents)) {
          this.isAnySystemAgent = agents.some(
            (a) => a?.id === uid || a?.userId === uid || a?.Id === uid,
          );
        }
      },
      error: () => (this.isAnySystemAgent = false),
    });
  }

  getSystemName(id: string): string {
    return this.systems.find((s) => s.id === id)?.name ?? '';
  }

  newArticle() {
    this.router.navigate(['/articles/create']);
  }
}
