import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, take } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  private auth = inject(AuthService);

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  submitting = false;
  error: string | null = null;

  submit(): void {
    this.error = null;
    if (!this.oldPassword.trim() || !this.newPassword.trim()) {
      this.error = 'Please fill in all fields.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'New password and confirmation do not match.';
      return;
    }

    this.submitting = true;
    this.auth
      .ChangeMyPassword({
        oldPassword: this.oldPassword,
        newPassword: this.newPassword,
        confirmNewPassword: this.confirmPassword,
      })
      .pipe(
        take(1),
        finalize(() => {
          this.submitting = false;
        }),
      )
      .subscribe({
        next: () => {
          // JWT still has old claims until a new login — force re-auth with the new password.
          this.auth.logout();
        },
        error: (err: HttpErrorResponse) => {
          this.error =
            err.error?.message != null
              ? String(err.error.message)
              : 'Could not update password. Check your current password.';
        },
      });
  }
}
