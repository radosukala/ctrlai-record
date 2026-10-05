import type { ReactNode } from 'react';

type Props = {
  /** The id the title carries, for the hero index and for aria-labelledby. */
  id: string;
  title: ReactNode;
  /** One or two lines under the title, in the rail. */
  blurb?: ReactNode;
  /** Anything else for the rail, under the blurb: a legend, a count. */
  rail?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * One section of a page: the title and its notes in the left rail, the content on the right. The rail stays in
 * view while a long list scrolls. On narrow screens the rail sits above the content.
 */
export function Section({ id, title, blurb, rail, className, children }: Props) {
  return (
    <section className={className ? `sec ${className}` : 'sec'} aria-labelledby={id} id={`${id}-section`}>
      <div className="sec-rail">
        <div className="sec-rail-in">
          <h2 className="sec-title" id={id}>{title}</h2>
          {blurb ? <p className="sec-blurb">{blurb}</p> : null}
          {rail}
        </div>
      </div>
      <div className="sec-body">{children}</div>
    </section>
  );
}
