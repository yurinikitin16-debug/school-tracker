import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { UiIconComponent, UiIconName } from '../../shared/ui/icon/ui-icon.component';
import { AcademicYearService } from '../../core/services/academic-year.service';

interface NavItem {
  label: string;
  route: string;
  icon: UiIconName;
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

  readonly isMobileSidebarOpen = signal(false);
  readonly isDirectoriesOpen = signal(false);
  readonly currentUrl = signal(this.router.url);

  readonly navItems: NavItem[] = [
    { label: 'Відвідування', route: '/attendance', icon: 'check' },
    { label: 'Звіти', route: '/reports', icon: 'chart' },
    { label: 'Налаштування', route: '/settings', icon: 'settings' },
  ];

  readonly directoryItems: NavItem[] = [
    { label: 'Розклад', route: '/schedule', icon: 'calendar' },
    { label: 'Учні', route: '/students', icon: 'users' },
    { label: 'Класи', route: '/classes', icon: 'database' },
    { label: 'Предмети', route: '/subjects', icon: 'graduation-cap' },
    { label: 'Вчителі', route: '/teachers', icon: 'users' },
  ];

  readonly isDirectoriesActive = computed(() =>
    this.directoryItems.some((item) => this.currentUrl().startsWith(item.route)),
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
}
