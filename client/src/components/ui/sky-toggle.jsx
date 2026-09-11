import { cn } from '@/lib/utils';
import './sky-toggle.css';

/* Playful day/night scene switch. `dark` = night (moon). Pure CSS, RTL-neutral. */
export default function SkyToggle({ dark = false, onToggle, label, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label || (dark ? 'Switch to light mode' : 'Switch to dark mode')}
      title={label || (dark ? 'Switch to light mode' : 'Switch to dark mode')}
      onClick={onToggle}
      className={cn('sky-toggle', dark && 'is-night', className)}
    >
      <span className="sk-stars" aria-hidden><i /><i /><i /><i /><i /></span>
      <span className="sk-cloud sk-c2" aria-hidden />
      <span className="sk-cloud sk-c1" aria-hidden />
      <span className="sk-knob" aria-hidden />
    </button>
  );
}
