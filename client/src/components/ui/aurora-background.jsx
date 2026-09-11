import { cn } from "@/lib/utils";
import "./aurora-background.css";

/* Flowing aurora ribbon backdrop. Used as an absolute layer (e.g. inside
   the hero stage); children render above the lights. */
export const AuroraBackground = ({ className, children, showRadialGradient = true }) => {
  return (
    <div className={cn("aurora-scope", className)} aria-hidden={children ? undefined : true}>
      <div className="aurora-field">
        <div className="au au-a" />
        <div className="au au-b" />
        <div className="au-c" />
        {showRadialGradient && <div className="au-fade" />}
      </div>
      {children}
    </div>
  );
};
