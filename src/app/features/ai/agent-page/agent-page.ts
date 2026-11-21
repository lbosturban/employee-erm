import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { generateId } from '../../../core/utils/id';

/**
 * One echoed instruction in the transcript. New instructions start
 * folded: only their first line is visible, with an unfold/refold
 * toggle on the right; overflowing words are hidden with an ellipsis.
 */
interface AgentEntry {
  readonly id: string;
  readonly text: string;
  expanded: boolean;
}

/**
 * Phase 3 placeholder of the AI Agent. No model is wired yet: submitting
 * the prompt simply echoes the instruction into the transcript as a chat
 * system would, then a fresh prompt is ready for the next instruction.
 * The real agent integration will replace `echo()` only.
 */
@Component({
  selector: 'app-agent-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './agent-page.html',
  styleUrl: './agent-page.css',
})
export class AgentPage {
  /** Transcript of echoed instructions, oldest first. */
  protected readonly entries = signal<AgentEntry[]>([]);

  /** Current editable prompt content (signal-bound, like the header search). */
  protected readonly draft = signal('');

  /** Submits on Enter (plain), lets Shift+Enter introduce a new line. */
  protected onPromptKeydown(event: KeyboardEvent, textarea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.echo(textarea.value);
    }
  }

  /** Button-based submit path for pointer/AT users. */
  protected send(textarea: HTMLTextAreaElement): void {
    this.echo(textarea.value);
  }

  /** Records the instruction and readies a fresh, empty prompt. */
  protected echo(raw: string): void {
    const text = raw.trim();
    if (text === '') {
      return;
    }
    this.entries.update((current) => [
      ...current,
      { id: generateId(), text, expanded: false },
    ]);
    this.draft.set('');
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Unfold/refold a previous prompt; the toggle sits inside the entry. */
  protected toggleExpanded(id: string): void {
    this.entries.update((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, expanded: !entry.expanded } : entry)),
    );
  }
}
