import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login.component';
import { HomeComponent } from './pages/home/home.component';
import { AccountComponent } from './pages/account/account.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent, 
    canActivate: [authGuard],
    children: [
      { path: 'account', component: AccountComponent }
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];
