import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MigrationService } from '../../../core/services/migration.service';
import { AgentPage } from './agent-page';

describe('AgentPage', () => {
  let fixture: ComponentFixture<AgentPage>;
  let page: AgentPage;
  let textarea: HTMLTextAreaElement;

  beforeEach(async () => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    fixture = TestBed.createComponent(AgentPage);
    page = fixture.componentInstance;
    await await_fixture();
    textarea = fixture.nativeElement.querySelector('#agent-prompt-input');
  });

  /** Runs change detection asynchronously (zoneless host). */
  async function await_fixture(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function type(value: string, shiftKey: boolean, key = 'Enter'): Promise<void> {
    const inputEvent = new Event('input');
    textarea.value = value;
    textarea.dispatchEvent(inputEvent);
    const keydown = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true });
    textarea.dispatchEvent(keydown);
    await await_fixture();
  }

  it('renders the not-available-yet notice as the page title', () => {
    const notice = fixture.nativeElement.querySelector('.agent-notice') as HTMLElement;
    expect(notice.textContent).toContain('not available yet');
    expect(notice.textContent).toContain('echo');
  });

  it('renders a "Current Prompt" label above the prompt textarea', () => {
    const label = fixture.nativeElement.querySelector('.agent-prompt-label') as HTMLElement;
    expect(label.textContent).toContain('Current Prompt');
    expect(label.getAttribute('for')).toBe('agent-prompt-input');
  });

  it('invites users to drive the workspace with the Mistral Vibe agent', () => {
    const invite = fixture.nativeElement.querySelector('.agent-notice-invite') as HTMLElement;
    expect(invite).not.toBeNull();
    expect(invite.textContent).toContain('Mistral Vibe');
  });

  it('starts with an empty transcript message and an empty prompt', () => {
    expect(fixture.nativeElement.querySelector('.agent-empty')).not.toBeNull();
    expect(page['entries']()).toHaveLength(0);
    expect(page['draft']()).toBe('');
  });

  it('echoes an instruction on Enter and readies a fresh prompt', async () => {
    await type('  run the ERM diagnostic  ', false);
    const texts = page['entries']().map((entry) => entry.text);
    expect(texts).toEqual(['run the ERM diagnostic']);
    expect(page['draft']()).toBe('');
    const transcript = fixture.nativeElement.querySelector('.agent-transcript') as HTMLElement;
    expect(transcript.textContent).toContain('run the ERM diagnostic');
  });

  it('ignores Enter on an empty (or blank) prompt', async () => {
    await type('   ', false);
    expect(page['entries']()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.agent-empty')).not.toBeNull();
  });

  it('does not submit on Shift+Enter (new line instead)', async () => {
    await type('line one', true);
    expect(page['entries']()).toHaveLength(0);
    expect(page['draft']()).toBe('line one');
  });

  it('folds a multi-line echo to its first line with an unfold toggle', async () => {
    await type('first line\nsecond line\nthird line', false);
    const entry = fixture.debugElement.query(By.css('.agent-entry'));
    expect(entry).not.toBeNull();
    expect(entry.classes['expanded'] ?? false).toBe(false);
    expect(entry.query(By.css('.agent-entry-text')).classes['folded']).toBe(true);

    const toggle = entry.query(By.css('.agent-toggle'));
    expect(toggle.attributes['aria-expanded']).toBe('false');

    toggle.nativeElement.click();
    await await_fixture();
    const toggled = fixture.debugElement.query(By.css('.agent-entry'));
    expect(toggled.classes['expanded']).toBe(true);
    expect(toggled.query(By.css('.agent-entry-text')).classes['folded'] ?? false).toBe(false);
    expect(toggled.query(By.css('.agent-toggle')).attributes['aria-expanded']).toBe('true');

    // Refold: the toggle flips the entry back.
    toggled.query(By.css('.agent-toggle')).nativeElement.click();
    await await_fixture();
    expect(
      fixture.debugElement.query(By.css('.agent-entry')).classes['expanded'] ?? false,
    ).toBe(false);
  });

  it('applies the folded (ellipsis) style to every fresh entry', async () => {
    await type('plain one-liner without overflow', false);
    await type('another instruction that is fairly long and should still fold nicely', false);
    const folded = fixture.debugElement.queryAll(By.css('.agent-entry-text.folded'));
    expect(folded).toHaveLength(2);
  });

  it('submits from the send button as well as the Enter key', async () => {
    textarea.value = 'sent via the button';
    textarea.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('.agent-send').click();
    await await_fixture();
    expect(page['entries']()).toHaveLength(1);
    expect(page['draft']()).toBe('');
  });

  it('simulates a thinking phase then a stub response quoting the instruction', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await type('run the ERM diagnostic', false);

      // While the (stub) round-trip is pending, a thinking indicator shows.
      const thinking = fixture.nativeElement.querySelector('.agent-thinking') as HTMLElement;
      expect(thinking).not.toBeNull();
      expect(thinking.textContent).toContain('Thinking');
      expect(fixture.nativeElement.querySelector('.agent-response-text')).toBeNull();

      // After the simulated delay the response lands: a bar-free prefix,
      // then a quoted part (action line + echoed prompt).
      vi.advanceTimersByTime(900);
      fixture.detectChanges();
      const response = fixture.nativeElement.querySelector('.agent-response-text') as HTMLElement;
      expect(response).not.toBeNull();
      expect(response.textContent).toContain('run the ERM diagnostic');
      const prefix = fixture.nativeElement.querySelector('.agent-response-prefix') as HTMLElement;
      expect(prefix.textContent).toContain('Simulated response (stub)');
      const action = fixture.nativeElement.querySelector('.agent-response-action') as HTMLElement;
      expect(action.textContent).toContain('The agent would process this instruction');
      // The quoted part is kept on its own line-block with the accent bar.
      expect(fixture.nativeElement.querySelector('.agent-response-quote')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.agent-thinking')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
