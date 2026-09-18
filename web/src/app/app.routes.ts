import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login.component';
import { HomeComponent } from './pages/home/home.component';
import { AccountComponent } from './pages/account/account.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { authGuard } from './core/guards/auth.guard';
import { settingsDeactivateGuard } from './core/guards/settings-deactivate.guard';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent, 
    canActivate: [authGuard],
    children: [
      { path: 'account', component: AccountComponent },
      { path: 'settings', component: SettingsComponent, canDeactivate: [settingsDeactivateGuard] }
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];

