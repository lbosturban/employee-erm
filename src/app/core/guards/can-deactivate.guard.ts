import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';

/**
 * Contract implemented by pages that hold a form. The guard only
 * intercepts navigation while the form is in a dirty state.
 */
export interface Deactivatable {
  canDeactivate(): boolean;
}

/**
 * Prevents losing unsaved form data when navigating away: a confirmation
 * box asks the user before the navigation is confirmed.
 */
export const canDeactivateGuard: CanDeactivateFn<Deactivatable> = (component) => {
  if (component.canDeactivate()) {
    return true;
  }
  const i18n = inject(I18nService);
  return window.confirm(i18n.translate('form.unsaved'));
};
