import { cn } from '@/lib/utils';
import './handwriting-text.css';

/*
 * Ref-style handwriting: the accent line under the headline, traced
 * letter by letter as an outline stroke, then inked solid.
 * Arabic splits by word (script stays joined); Latin splits by letter.
 * Replays when `replayKey` changes (language / theme switch).
 */
export default function HandwritingText({ text, arabic = false, replayKey = '', className }) {
  const units = arabic ? text.split(' ') : text.split('');
  const step = arabic ? 0.24 : 0.055;
  return (
    <span
      key={replayKey}
      className={cn('hw-write', arabic ? 'arabic' : 'latin', className)}
      role="text"
      aria-label={text}
    >
      <span aria-hidden="true">
        {units.map((u, i) => (
          <span
            key={i}
            className="hw-letter"
            style={{ '--d': `${(0.45 + i * step).toFixed(3)}s` }}
          >
            {u === ' ' ? ' ' : u}
            {arabic && i < units.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </span>
  );
}
