import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

fetch('/config.json')
  .then(response => response.json())
  .then(config => {
    // Save config globally so services can access it
    (window as any).__APP_CONFIG__ = config;

    return bootstrapApplication(AppComponent, appConfig);
  })
  .catch((err) => {
    console.error('Failed to load config.json', err);
    // fallback: still bootstrap without config
    return bootstrapApplication(AppComponent, appConfig);
  });