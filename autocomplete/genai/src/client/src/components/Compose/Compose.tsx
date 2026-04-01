/**
 * Compose — the main Smart Compose component.
 *
 * A textarea with ghost text overlay for AI suggestions.
 * - Tab: accept suggestion (append to text)
 * - Escape: dismiss suggestion
 * - Keep typing: dismiss current suggestion, trigger new one after debounce
 */

import { useRef } from 'react';
import { useCompletion } from '../../hooks/useCompletion';
import { GhostText } from './GhostText';
import { StatsPanel } from './StatsPanel';

export function Compose() {
  const { text, setText, suggestion, status, stats, accept, dismiss } =
    useCompletion({ debounceMs: 500 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      accept();
    }
    if (e.key === 'Escape' && suggestion) {
      e.preventDefault();
      dismiss();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  return (
    <div className="compose-wrapper">
      <div className="compose-container">
        <div className="compose-editor">
          <textarea
            ref={textareaRef}
            className="compose-textarea"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Start typing a sentence... (e.g., 'The quick brown fox')"
            rows={10}
            spellCheck={false}
          />
          <GhostText
            textBefore={text}
            suggestion={suggestion}
            textareaRef={textareaRef}
          />
        </div>
        <div className="compose-footer">
          {suggestion && (
            <span className="compose-hint">
              Press <kbd>Tab</kbd> to accept, <kbd>Esc</kbd> to dismiss
            </span>
          )}
          {status === 'streaming' && (
            <span className="compose-status">Generating...</span>
          )}
          {status === 'error' && (
            <span className="compose-status compose-error">
              Error — check console
            </span>
          )}
        </div>
      </div>
      <StatsPanel stats={stats} />
    </div>
  );
}
