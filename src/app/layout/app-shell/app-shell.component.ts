import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthPermissions } from '../../core/models/auth.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AuthService } from '../../core/services/auth.service';
import { UiIconComponent, UiIconName } from '../../shared/ui/icon/ui-icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: UiIconName;
  permission: keyof AuthPermissions;
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UiIconComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);

  readonly academicYear = inject(AcademicYearService);
  readonly auth = inject(AuthService);

  readonly isMobileSidebarOpen = signal(false);
  readonly isDirectoriesOpen = signal(false);
  readonly currentUrl = signal(this.router.url);

  private readonly allNavItems: NavItem[] = [
    { label: 'Відвідування', route: '/attendance', icon: 'check', permission: 'attendance' },
    { label: 'Звіти', route: '/reports', icon: 'chart', permission: 'reports' },
    { label: 'Налаштування', route: '/settings', icon: 'settings', permission: 'settings' },
    { label: 'Адміністрування', route: '/admin', icon: 'users', permission: 'settings' },
  ];

  private readonly allDirectoryItems: NavItem[] = [
    { label: 'Класи', route: '/classes', icon: 'database', permission: 'directories' },
  ];

  readonly navItems = computed(() => this.visibleItems(this.allNavItems));
  readonly directoryItems = computed(() => this.visibleItems(this.allDirectoryItems));
  readonly shouldShowDirectories = computed(() => this.directoryItems().length > 0);
  readonly isDirectoriesActive = computed(() =>
    this.directoryItems().some((item) => this.currentUrl().startsWith(item.route)),
  );

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl.set(event.urlAfterRedirects);

      if (this.isDirectoriesActive()) {
        this.isDirectoriesOpen.set(true);
      }

      this.closeMobileSidebar();
    });
  }

  toggleDirectories(): void {
    this.isDirectoriesOpen.update((value) => !value);
  }

  openMobileSidebar(): void {
    this.isMobileSidebarOpen.set(true);
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this.auth.clearSession();
        void this.router.navigateByUrl('/login');
      },
    });
  }

  private visibleItems(items: NavItem[]): NavItem[] {
    const permissions = this.auth.permissions();

    if (!permissions) {
      return [];
    }

    return items.filter((item) => permissions[item.permission]);
  }
}
