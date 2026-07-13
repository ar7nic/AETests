import { RegistrationAssistant } from './RegistrationAssistant';
import { LoginAssistant } from './LoginAssistant';

export { BaseAuthAssistant } from './BaseAuthAssistant';
export { RegistrationAssistant, LoginAssistant };

/**
 * Assistants registry. Adding an entry here auto-creates its fixture
 * (see `fixtures/`). The key becomes the fixture name.
 */
export const assistants = {
  registrationAssistant: RegistrationAssistant,
  loginAssistant: LoginAssistant,
} as const;
