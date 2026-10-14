import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ZenFunctionsService } from '../../Services/ZenFunctions.Service';

@Component({
  selector: 'app-zen-functions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zen-functions.component.html',
  styleUrl: './zen-functions.component.css',
})
export class ZenFunctionsComponent {
  busySyncEmployees = signal(false);
  busyZenServer = signal(false);
  busyFetchZen = signal(false);
  busyGenTokens = signal(false);
  busyReplacePass = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  /** Form fields for `GenerateMultipleTokens` (POST ZenServer, email + password). */
  genTokenEmail = '';
  genTokenPassword = '';

  /** Form field for `ReplaceCurrent` (POST ZenServer, passKey). */
  replacePassKey = '';

  constructor(private zen: ZenFunctionsService) {}

  anyBusy(): boolean {
    return (
      this.busySyncEmployees() ||
      this.busyZenServer() ||
      this.busyFetchZen() ||
      this.busyGenTokens() ||
      this.busyReplacePass()
    );
  }

  private clearFeedback(): void {
    this.message.set(null);
    this.error.set(null);
  }

  runSyncEmployeesToSystem(): void {
    if (this.anyBusy()) return;
    this.clearFeedback();
    this.busySyncEmployees.set(true);
    this.zen
      .syncEmployeesToCurrentSystem()
      .pipe(finalize(() => this.busySyncEmployees.set(false)))
      .subscribe({
        next: () =>
          this.message.set('Employees were fetched into the current system successfully.'),
        error: () => this.error.set('Sync employees failed. Check the main API and network.'),
      });
  }

  runUpdateZenServer(): void {
    if (this.anyBusy()) return;
    this.clearFeedback();
    this.busyZenServer.set(true);
    this.zen
      .updateZenServer()
      .pipe(finalize(() => this.busyZenServer.set(false)))
      .subscribe({
        next: () =>
          this.message.set('Zen server job finished — employee branches table should be updated.'),
        error: () => this.error.set('Zen server update failed. Check the Zen API and network.'),
      });
  }

  runFetchFromZen(): void {
    if (this.anyBusy()) return;
    this.clearFeedback();
    this.busyFetchZen.set(true);
    this.zen
      .fetchFromZenEndpoints()
      .pipe(finalize(() => this.busyFetchZen.set(false)))
      .subscribe({
        next: () =>
          this.message.set('Data was pulled from the main Zen endpoints successfully.'),
        error: () => this.error.set('Zen endpoint fetch failed. Check zenUrl and network.'),
      });
  }

  runGenerateMultipleTokens(): void {
    if (this.anyBusy()) return;
    const email = this.genTokenEmail.trim();
    const password = this.genTokenPassword;
    if (!email) {
      this.error.set('Enter an email for generate multiple tokens.');
      return;
    }
    if (!password) {
      this.error.set('Enter a password for generate multiple tokens.');
      return;
    }
    this.clearFeedback();
    this.busyGenTokens.set(true);
    this.zen
      .GenerateMultipleTokens(email, password)
      .pipe(finalize(() => this.busyGenTokens.set(false)))
      .subscribe({
        next: () =>
          this.message.set('Generate multiple tokens request completed successfully.'),
        error: () => this.error.set('Generate multiple tokens failed. Check credentials and the Zen server.'),
      });
  }

  runReplaceCurrent(): void {
    if (this.anyBusy()) return;
    const passKey = this.replacePassKey;
    if (!passKey) {
      this.error.set('Enter a pass key for replace current.');
      return;
    }
    this.clearFeedback();
    this.busyReplacePass.set(true);
    this.zen
      .ReplaceCurrent(passKey)
      .pipe(finalize(() => this.busyReplacePass.set(false)))
      .subscribe({
        next: () => this.message.set('Replace current request completed successfully.'),
        error: () => this.error.set('Replace current failed. Check the pass key and Zen server.'),
      });
  }
}
