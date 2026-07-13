import { test } from '../fixtures';
import { buildRegistrationUser } from '../helpers';

/**
 * Test Case 1: Register User
 * https://automationexercise.com/test_cases
 *
 * The spec reads as a scenario: assistant calls perform actions, asserts
 * helpers verify state. No direct page/locator usage here.
 */
test.describe('Test Case 1: Register User', () => {
  test('registers a new user then deletes the account @smoke @critical', async ({
    registrationAssistant,
    commonAsserts,
    homePage,
    navBar,
    loginPage,
    signupPage,
    accountCreatedPage,
    accountDeletedPage,
  }) => {
    const user = buildRegistrationUser();

    // 1-2. Open the home page and verify it is visible.
    await registrationAssistant.openHomePage();
    await commonAsserts.pageHasTitle('Automation Exercise');
    await commonAsserts.toBeVisible(homePage.slider);

    // 3-4. Go to Signup / Login and verify "New User Signup!".
    await registrationAssistant.goToSignupLogin();
    await commonAsserts.toBeVisible(loginPage.newUserSignupHeading);

    // 5-7. Enter name + email, submit, and verify the account info form.
    await registrationAssistant.startSignup(user);
    await commonAsserts.toBeVisible(signupPage.enterAccountInfo);

    // 8-10. Fill the form, create the account, verify "Account Created!".
    await registrationAssistant.fillAccountInformation(user);
    await commonAsserts.toBeVisible(accountCreatedPage.heading);

    // 11-12. Continue and verify "Logged in as <username>".
    await registrationAssistant.continueAfterAccountCreated();
    await commonAsserts.toContainText(navBar.loggedInAs, user.name);

    // 13-14. Delete the account and verify "Account Deleted!".
    await registrationAssistant.deleteAccount();
    await commonAsserts.toBeVisible(accountDeletedPage.heading);
    await registrationAssistant.continueAfterAccountDeleted();
  });
});
