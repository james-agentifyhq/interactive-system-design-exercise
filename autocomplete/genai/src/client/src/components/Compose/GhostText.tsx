/**
 * GhostText — renders the AI suggestion as gray text after the typed content.
 *
 * Technique: An overlay div positioned exactly on top of the textarea.
 * The overlay mirrors the textarea's content character-for-character with
 * identical font/padding/size. The typed text is transparent (invisible,
 * just for positioning). The suggestion text is gray.
 *
 * The textarea sits on top (z-index) so it receives all user input.
 * The overlay is behind it, visible through the textarea's transparent
 * areas where the suggestion extends beyond the typed text.
 */

import { useRef, useEffect } from 'react';

interface GhostTextProps {
  textBefore: string;
  suggestion: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function GhostText({ textBefore, suggestion, textareaRef }: GhostTextProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync scroll position between textarea and overlay
  useEffect(() => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) return;

    const syncScroll = () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', syncScroll);
    syncScroll(); // Initial sync

    return () => textarea.removeEventListener('scroll', syncScroll);
  }, [textareaRef]);

  if (!suggestion) return null;

  return (
    <div
      ref={overlayRef}
      className="ghost-text-overlay"
      aria-hidden="true"
    >
      {/* Typed text — transparent, just for positioning */}
      <span className="ghost-text-existing">{textBefore}</span>
      {/* Suggestion — visible gray text */}
      <span className="ghost-text-suggestion">{suggestion}</span>
    </div>
  );
}
