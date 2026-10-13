/**
 * Where "The day before" lives and who can find it. It is a rehearsal for the day after an AI breach: a playable film with five choices,
 * a narrator and a score.
 *
 * `DAY_BEFORE_SHOWN`: the page is served at /day-before (switched on 13 October 2026, on Rado's word "push page to production").
 * `DAY_BEFORE_PUBLIC`: it is also listed: in the sitemap, open to search engines, a band on the homepage and a line on the About page
 * (switched on the same day, on his word "link to webpage and list there"). Set to false it goes back to being live but unlisted: the page
 * stays, search engines are asked to leave it alone, and the homepage, the About page and the sitemap stop pointing at it.
 */
export const DAY_BEFORE_PATH = '/day-before';
export const DAY_BEFORE_SHOWN = true;
export const DAY_BEFORE_PUBLIC = true;
/** How long the film is, in whole minutes, for the places that name it without loading it (a test keeps this true). */
export const DAY_BEFORE_MINUTES = 14;
/** The Base entry for the Axios report that started it. */
export const DAY_BEFORE_WHY = '/base/axios-2026-10-09-ai-companies-day-after-scenarios';
