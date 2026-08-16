import { createIsomorphicFn } from "@tanstack/react-start";
/** react-start/server re-exports react-start-server, which no longer carries
 * the cookie helpers; they live in the core package it is built on. */
import { getCookie } from "@tanstack/start-server-core";

const SIDEBAR_COOKIE_NAME = "sidebar_state";

export const getSidebarState = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE_NAME) !== "false")
  .client(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
    return match?.split("=")[1] !== "false";
  });
