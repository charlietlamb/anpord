/**
 * Vendor marks, drawn inline.
 *
 * Inline rather than fetched: these render inside badges that appear dozens of
 * times on a grid, and a request per badge would flash on every paint. Each
 * takes `currentColor`, so one mark serves both themes rather than needing a
 * light file and a dark one.
 *
 * The path data is each vendor's own, copied from the SVG they publish, and
 * every mark keeps the viewBox it was drawn on rather than being re-fitted to
 * a shared one. Redrawing a logo by hand gets a shape that is roughly right
 * and recognisably not theirs.
 *
 * Sized by the badge through `[&>svg]:size-3`, so no width or height here.
 */
interface MarkProps {
  readonly className?: string;
}

export function OpenAiMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      role="presentation"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

/** Eight bars stepping across the canvas, on the 275x287 grid Daytona draws
 * it on. */
export function DaytonaMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      role="presentation"
      viewBox="0 0 275 287"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M14.5584 193.736H114.275V227.925H14.5584V193.736Z" />
      <path d="M148.464 74.076H262.426V108.265H148.464V74.076Z" />
      <path d="M88.6338 84.6127L173.246 0L197.422 24.175L112.809 108.788L88.6338 84.6127Z" />
      <path d="M89.157 170.084L24.175 105.102L0 129.277L64.9819 194.259L89.157 170.084Z" />
      <path d="M174.629 217.911L106.133 286.407L81.9577 262.232L150.454 193.736L174.629 217.911Z" />
      <path d="M174.106 132.44L250.66 208.994L274.835 184.819L198.281 108.265L174.106 132.44Z" />
      <path d="M88.6338 48.434V131.057H54.4451L54.4451 48.434H88.6338Z" />
      <path d="M208.294 168.094V270.66H174.106V168.094H208.294Z" />
    </svg>
  );
}

/** Drawn on E2B's own 32x32 canvas, keeping the translate and scale their
 * file wraps the glyph in rather than folding it into the coordinates. */
export function E2bMark({ className }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      role="presentation"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(6 7.1) scale(0.8333)">
        <path d="M23.9941 0V5.54837H6.51751C5.98283 5.54857 5.54837 5.98279 5.54837 6.51751V6.93473C5.54837 7.46945 5.98283 7.90367 6.51751 7.90387H23.9941V13.4522H6.51751C5.98283 13.4524 5.54837 13.8867 5.54837 14.4214V14.8386C5.54852 15.3732 5.98293 15.8061 6.51751 15.8063H23.9941V21.3561H3.70965C1.66101 21.3556 2.35409e-05 19.6938 0 17.645V3.70965C0.000332757 1.66113 1.66118 0.000513457 3.70965 0H23.9941Z" />
      </g>
    </svg>
  );
}
