import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactService } from '../../core/services/contact.service';
import { CategoryService } from '../../core/services/category.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../core/pipes/full-name.pipe';
import { InitialsPipe } from '../../core/pipes/initials.pipe';
import { CatNamePipe } from '../../core/pipes/category-name.pipe';
import { BilingualText } from '../../core/models/category.model';

interface CategoryStat {
  id: string;
  name: BilingualText;
  color: string;
  count: number;
}

/** Dashboard: global statistics, latest additions and per-category split. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, FullNamePipe, InitialsPipe, CatNamePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {
  protected readonly contactService = inject(ContactService);
  protected readonly categoryService = inject(CategoryService);

  protected readonly uncategorizedCount = computed(
    () => this.contactService.contacts().filter((contact) => contact.categoryId === null).length,
  );

  /** Per-category usage, sorted by descending count for the bar chart. */
  protected readonly categoryStats = computed<CategoryStat[]>(() =>
    this.categoryService
      .categories()
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        count: this.categoryService.usageByCategory().get(category.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count),
  );

  /** Max category size, so bar widths can be relative (percent). */
  protected readonly maxCategoryCount = computed(() =>
    this.categoryStats().reduce((max, stat) => Math.max(max, stat.count), 0),
  );
}
