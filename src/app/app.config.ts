import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { routes } from './app.routes';
import { MigrationService } from './core/services/migration.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Run the localStorage schema check before the first domain service
    // reads storage: migrations and reseeding must happen first.
    {
      provide: APP_INITIALIZER,
      useFactory: (migration: MigrationService) => () => migration.run(),
      multi: true,
      deps: [MigrationService],
    },
    provideRouter(
      routes,
      // Binds route params and resolved data to component inputs.
      withComponentInputBinding(),
      // Restores scroll position on back navigation, tops it on forward.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
  ],
};
