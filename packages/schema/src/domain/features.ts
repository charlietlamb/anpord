/* Prompts and the channels that resolve them are built but not announced, so
   every surface reads this rather than each deciding for itself and drifting.
   The routes and the API stay reachable: this hides the way in, it is not a
   permission. */
export const PROMPTS_ENABLED = false;
