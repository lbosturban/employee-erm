import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { I18nService } from '../../../core/services/i18n.service';
import { generateId } from '../../../core/utils/id';

/**
 * One instruction in the transcript, kept as a conversational exchange:
 * the echoed prompt is left-justified, and while the (yet-unwired)
 * agent "thinks" an indicator is shown before the simulated stub
 * response lands. New instructions start folded: only their first line
 * is visible, with an unfold/refold toggle on the right; overflowing
 * words are hidden with an ellipsis.
 */
interface AgentEntry {
  readonly id: string;
  readonly text: string;
  expanded: boolean;
  /** True between submission and the simulated response landing. */
  thinking: boolean;
  /** Simulated stub response; empty while still thinking. */
  response: string;
}

/**
 * Phase 3 placeholder of the AI Agent. No model is wired yet: submitting
 * the prompt echoes the instruction into the transcript as a chat system
 * would, then simulates a thinking→response exchange "à la Mistral Vibe"
 * before a fresh prompt is ready for the next instruction. The real
 * agent integration will replace `simulateResponse()` only.
 */
@Component({
  selector: 'app-agent-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './agent-page.html',
  styleUrl: './agent-page.css',
})
export class AgentPage {
  /** Simulated thinking delay before the stub response lands. */
  private static readonly THINKING_DELAY_MS = 900;

  private readonly i18n = inject(I18nService);

  private readonly pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Transcript of echoed instructions, oldest first. */
  protected readonly entries = signal<AgentEntry[]>([]);

  /** Current editable prompt content (signal-bound, like the header search). */
  protected readonly draft = signal('');

  /** Pending timers never outlive the component instance. */
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.pendingTimers.values()) {
        clearTimeout(timer);
      }
      this.pendingTimers.clear();
    });
  }

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

  /** Records the instruction, then simulates a stub agent response. */
  protected echo(raw: string): void {
    const text = raw.trim();
    if (text === '') {
      return;
    }
    const id = generateId();
    this.entries.update((current) => [
      ...current,
      { id, text, expanded: false, thinking: true, response: '' },
    ]);
    this.draft.set('');
    this.scheduleStubResponse(id, text);
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

  /**
   * Fakes the agent round-trip: after a short "thinking" pause the entry
   * receives a translated stub response that re-quotes the instruction.
   * The real integration will replace this stub logic entirely.
   */
  private scheduleStubResponse(id: string, instruction: string): void {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(id);
      this.entries.update((current) =>
        current.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                thinking: false,
                response: `${this.i18n.translate('ai.stubResponsePrefix')} "${instruction}"`,
              }
            : entry,
        ),
      );
    }, AgentPage.THINKING_DELAY_MS);
    this.pendingTimers.set(id, timer);
  }
}
