import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './tubelight-navbar.css';

/* Floating tubelight pill nav. `id` must be unique per mounted instance
   (framer layoutId). Active item gets a sliding glow pill + lamp above. */
export default function TubeNav({ id = 'tube', items = [], active = '', onSelect }) {
  return (
    <div className="tube" role="navigation" aria-label="Sections">
      {items.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect && onSelect(it)}
            className={cn(on && 'on')}
            aria-current={on ? 'true' : undefined}
          >
            {on && (
              <span className="limeclip" aria-hidden>
                <motion.span
                  layoutId={`${id}-cone`}
                  className="limelight"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              </span>
            )}
            {on && (
              <motion.span
                layoutId={`${id}-bar`}
                className="limebar"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              />
            )}
            <span className="tblabel">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
