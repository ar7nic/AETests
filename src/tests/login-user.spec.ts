import { test } from '../fixtures';
import { testUser } from '../config';

/**
 * Test Case 2: Login User with correct email and password
 * https://automationexercise.com/test_cases
 *
 * Precondition: the `registeredUser` fixture creates a fresh account via the
 * API and yields its credentials. The scenario then exercises the UI login.
 */
test.describe('Test Case 2: Login User with correct email and password', () => {
  test('logs in with valid credentials then deletes the account @smoke @critical', async ({
    loginAssistant,
    commonAsserts,
    homePage,
    navBar,
    loginPage,
    accountDeletedPage,
    registeredUser,
  }) => {
    // 1-3. Open the home page and verify it is visible.
    await loginAssistant.openHomePage();
    await commonAsserts.pageHasTitle('Automation Exercise');
    await commonAsserts.toBeVisible(homePage.slider);

    // 4-5. Go to Signup / Login and verify "Login to your account".
    await loginAssistant.goToSignupLogin();
    await commonAsserts.toBeVisible(loginPage.loginToYourAccountHeading);

    // 6-7. Enter the correct credentials and submit.
    await loginAssistant.login(registeredUser);

    // 8. Verify "Logged in as <username>".
    await commonAsserts.toContainText(navBar.loggedInAs, testUser.name);

    // 9-10. Delete the account and verify "Account Deleted!".
    await loginAssistant.deleteAccount();
    await commonAsserts.toBeVisible(accountDeletedPage.heading);
  });
});
