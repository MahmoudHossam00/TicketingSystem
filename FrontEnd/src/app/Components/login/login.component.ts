import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, of, takeUntil, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LoginToAccountRequest, UserRole } from '../../Interfaces/auth';
import { AuthService } from '../../Services/auth.service';
// import { UserRole } from '../../Interfaces/auth';
// import { AuthService } from '../../Services/auth.service';
// import { TranslatePipe } from '../../Pipes/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
loginForm!: FormGroup;
  forgetPassword!: FormGroup;
  resetPassword!: FormGroup;
  errorMessage: string | null = null;
  isLoging = false;
  isLoading = false;
  selectedRole: UserRole | null = null;
  roleOptions = Object.values(UserRole);
  emailFromQuery: string | null = null;
  tokenFromQuery: string | null = null;
  frontendBase = 'http://localhost:4200';
  currentForm: 'login' | 'forgotPassword' | 'resetPassword' = 'login';
  passwordStrength: number = 0;
  passwordStrengthText: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private _ToastrService: ToastrService,
    private route: ActivatedRoute
  ) {
    this.initForms();
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      Usernameoremail: ['', [Validators.required]],
      loginPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Check if user has a valid token before subscribing to isLoggedIn$
    const token = this.authService.getTokenFromCookie();
    
    // Only redirect if there's a valid token AND the observable confirms login
    if (token) {
      this.authService.isLoggedIn$.pipe(
        takeUntil(this.destroy$)
      ).subscribe((isLoggedIn) => {
        this.isLoging = isLoggedIn;
        // Double-check token exists before redirecting to prevent loops
        const currentToken = this.authService.getTokenFromCookie();
        if (isLoggedIn && currentToken) {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/countries']);
          }
        }
      });
    } else {
      // If no token, just set isLoging to false and don't subscribe to redirect
      this.isLoging = false;
    }

    console.log('Role:', this.authService.getRole());

    this.processQueryParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      this.emailFromQuery = params['email'] ? decodeURIComponent(params['email']) : null;
      this.tokenFromQuery = params['token'] ? decodeURIComponent(params['token']) : null;

      if (this.emailFromQuery && this.tokenFromQuery) {
        this.currentForm = 'resetPassword';
        this.resetPassword.patchValue({
          email: this.emailFromQuery,
          token: this.tokenFromQuery
        });
        console.log('Reset password form initialized with email:', this.emailFromQuery);
      } else {
        this.currentForm = 'login';
      }

      if (params['error']) {
        this.errorMessage = decodeURIComponent(params['error']);
        this._ToastrService.error(this.errorMessage, 'External Login Failed');
        this.currentForm = 'login';
      }

      if (params['pleaseLogin'] !== undefined) {
        this.currentForm = 'login';
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const credentials : LoginToAccountRequest 
    =
    {
      userNameOrEmail: this.loginForm.value.Usernameoremail,
      password: this.loginForm.value.loginPassword
    }
    // this.loginForm.value;
  
    this.authService.login(credentials)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.handleError(error, 'Login failed');
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.handleSuccessfulLogin({token: response.accessToken, refreshToken: response.refreshToken});
        }
      });
  }
  private getCookieName(base: string): string {
    // ex: app1.company.com -> app1_company_com
    const siteKey = window.location.hostname.replace(/\./g, '_');
    return `${siteKey}_${base}`;
  }
  private handleSuccessfulLogin(response: { token: string, refreshToken: string }): void {
    const cookieName = this.getCookieName('ITDepartmentuser_Token');
    document.cookie = `${cookieName}=${response.token}; path=/;  samesite=Lax`;


    localStorage.setItem(this.getCookieName('ITDepartmentuser_RefreshToken'), response.refreshToken);

    console.log(response.token,'response.token');
    this.authService.setLoginState(response.token);
    console.log(this.authService.getUserId(),'this.authService.getUserId()');
    this._ToastrService.success('Login successful! Redirecting...', 'Welcome Back');
    this.authService.startAllChats();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    setTimeout(() => {
      if(this.authService.mustChangePassword()){
        this.router.navigate(['/changepassword']);
        return;
      }
      if (returnUrl) {
        console.log('Navigating to return URL:', returnUrl);
        // Try to decode the URL if it's encoded
        const decodedUrl = decodeURIComponent(returnUrl);
        console.log('Decoded URL:', decodedUrl);
        
        // Try to extract the path and parameters
        try {
          const urlParts = decodedUrl.split('/');
          console.log('URL parts:', urlParts);
          
          
            this.router.navigateByUrl(decodedUrl);
          
        } catch (error) {
          console.error('Error parsing URL:', error);
          this.router.navigateByUrl(decodedUrl);
        }
             } else {
         console.log('No return URL, navigating to default route');
         // Store a flag that we're going to countries as default
         sessionStorage.setItem('returnUrl', '/');
         this.router.navigate(['/']);
       }
    }, 300);
  }

  public goToRegister(): void {
    this.router.navigate(['/create-employee-account']);
  }

 

  passwordMatchValidator(form: FormGroup): PasswordMatchErrors | null {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmNewPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  
  showLogin(): void {
    this.currentForm = 'login';
    this.loginForm.reset();
    this.errorMessage = null;
  }

  


  private handleError(error: HttpErrorResponse, defaultMessage: string): void {
    console.error('API Error:', error);

    if (error.error?.message) {
      this.errorMessage = String(error.error.message);
    } else if (error.error?.errors) {
      // Extract the first error message if available
      const firstError = Object.values(error.error.errors)[0];
      this.errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
    } else {
      this.errorMessage = defaultMessage;
    }

    this._ToastrService.error(this.errorMessage || 'An error occurred. Please try again later.', 'Error', { timeOut: 7000 });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}


interface PasswordMatchErrors extends ValidationErrors{
  mismatch: boolean;
}