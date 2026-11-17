// Custom inline SVG icons with Lucide's own 24x24 stroke geometry, exposing
// the `lucide-react` component API (size, strokeWidth, className, …).
// Only icons Lucide itself gets wrong for Zenith live here:
// - ListChecks: Lucide's has 3 lines but only 2 ticks; Zenith's has one
//   small tick per line (3 lines, 3 ticks).
// - GripDiagonal: the corner grip on habit cards (two parallel diagonal
//   lines), used for the card's Edit/Delete menu button.
import type { ReactNode, SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
};

function makeIcon(name: string, children: ReactNode) {
  function Icon({ size = 24, strokeWidth = 2, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ListChecks = makeIcon('ListChecks', (
  <>
    <path d="m3.5 17.5 1.5 1.5 3-3" />
    <path d="m3.5 11.5 1.5 1.5 3-3" />
    <path d="m3.5 5.5 1.5 1.5 3-3" />
    <path d="M13 6h8" />
    <path d="M13 12h8" />
    <path d="M13 18h8" />
  </>
));

export const GripDiagonal = makeIcon('GripDiagonal', (
  <>
    <path d="M20 4 8 16" />
    <path d="M20 12l-4 4" />
  </>
));
