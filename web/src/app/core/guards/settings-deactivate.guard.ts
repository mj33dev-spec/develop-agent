import { CanDeactivateFn } from '@angular/router';
import { SettingsComponent } from '../../pages/settings/settings.component';

export const settingsDeactivateGuard: CanDeactivateFn<SettingsComponent> = (component) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};
