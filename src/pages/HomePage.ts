import { BasePage } from './BasePage';
import type { Element } from '../utils';

/**
 * Landing page (`/`). Holds locators only.
 *
 * The header nav is intentionally NOT composed here: it is global site chrome,
 * not owned by the home page, so it lives in `components/NavBar` and is
 * injected flat as its own fixture.
 */
export class HomePage extends BasePage {
  protected readonly PAGE_NAME = 'Home';

  /** Carousel that is only present on the rendered home page. */
  readonly slider: Element = this.el('Home slider', this.page.locator('#slider'));
}
