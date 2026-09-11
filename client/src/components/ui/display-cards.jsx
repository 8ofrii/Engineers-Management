import { cn } from "@/lib/utils";
import "./display-cards.css";

/* Stacked fanned cards: back cards sit grayscale under a veil, hover
   lifts and inks them. JS port (no TS). Surface uses landing tokens so
   both dark ember and cafe light themes apply; layout offsets come in
   via props (Tailwind composes skew + translate into one transform). */

function DisplayCard({ className, icon, title, description, tag }) {
  return (
    <div className={cn("dcard", className)}>
      <div className="dcard-top">
        <span className="dcard-ico">{icon}</span>
        <p className="dcard-title">{title}</p>
      </div>
      <p className="dcard-desc">{description}</p>
      <p className="dcard-tag">{tag}</p>
    </div>
  );
}

export default function DisplayCards({ cards = [] }) {
  return (
    <div className="group/dc grid [grid-template-areas:'stack'] place-items-center -translate-x-[7.5rem] max-sm:translate-x-0 max-sm:flex max-sm:flex-col max-sm:gap-3">
      {cards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
