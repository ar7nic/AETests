import { NavBar } from './NavBar';

export { NavBar };

/**
 * Components registry. Global UI chrome (header nav, generic dialogs) is
 * injected flat — not composed into a page object — because it is not owned by
 * any single page. Adding an entry here auto-creates its fixture; the key
 * becomes the fixture name.
 */
export const components = {
  navBar: NavBar,
} as const;
