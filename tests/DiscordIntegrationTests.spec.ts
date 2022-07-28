import { test, expect, Page, BrowserContext } from '@playwright/test';

let context: BrowserContext
let page: Page;

const expectedWebhook = "testwebhook";

test.describe('discord-integration unit tests', () => {

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext({
            recordVideo: { dir: './playwright-report' }
        });

        page = await context.newPage();
        // reset the foundryData directory back to its base form, with only a single world with PF2E system running.

        page.on('console', msg => {
            if (msg.type() === 'error')
                console.log(`Error text: "${msg.text()}"`);
        });

        await Promise.all([
            page.goto('http://localhost:30000'),
            page.waitForLoadState('load')
        ]);
        // In theory these first two should be unnecessary, but are added as a precaution.
        if (page.url() === 'http://localhost:30000/auth') {
            await page.locator('#key').fill('atropos');
            await page.locator('input[name="adminKey"]').press('Enter');
        }
        if (page.url() === 'http://localhost:30000/setup') {
            await page.locator('text=Launch World').click();
        }
    })
    test.beforeEach(async ({ }) => {
        await Promise.all([
            page.goto('http://localhost:30000'),
            page.waitForLoadState('load')
        ]);

        await page.locator('select[name="userid"]').focus();
        await page.locator('select[name="userid"]').selectOption('iF8XB8q033MxJkU3');

        await Promise.all([
            page.locator('button:has-text("Join Game Session")').click({ force: true }),
            //page.waitForNavigation({ url: 'http://localhost:30000/game' }),
            // TODO: Find a more graceful way to cast window to a type
            page.waitForFunction(() => (window as any).game?.ready)
        ]);

    });

    test('should register settings on init', async ({ }) => {
        // Click the settings icon in the sidemenu
        await page.locator('a:nth-child(11) > .fas').click();

        // Go to the "Configure settings" menu
        await page.locator('text=Configure Settings').click();

        // Go to the "Module Settings" menu
        await page.locator('text=Module Settings').click();

        // make sure the Discord Webhook field is filled out with the expected value.
        await expect(page.locator('input[name="discord-integration\\.discordWebhook"]')).toHaveValue(expectedWebhook);
    });
    test('should add inputFields below Player Color group', async ({ page }) => {
        // case for player is GM
        // case for play is not GM
    });
    test('should update user flags when closing user config', async ({ page }) => {

        // case where the user was not found
        // case where the discord-id-config element was not found
        // case where the discord-id-config input has no value
        // case where the discord-id-config input is invalid
        // TODO: What kinds of text inputs are invalid?
        // case for when player is GM
        // case for player is not GM
    });
    test('should handle new chat messages', async ({ page }) => {
        // case where there are no users
        // case where there is a user but no tags in the message
        // case where there is a user with a tag in the message not for any users
        // case where there is a user with a tag in the message for a user
        // case where there is a user with two tags in the message: one for a user
        // case where there is a user with two tags in the message: both for users
        // case where there is a @Discord tag in the message
    });
    test('should handle sending a discord message', async ({ page }) => {
        // case where the message sends correctly
        // case where the message throws an error
    });
    test('sendDiscordMessage()', async ({ page }) => {
        // case where there are no users
        // case where the current user can't be found
        // case where there are no tags in the message
        // case where there is a message with no tags
        // case where there is a message with a tag for a user
        // case where there is a message with multiple tags; one for a user
        // case where there is a message with multiple tags; both for users
        // case where there is a @Discord tag in the message
        // case where the current user has no discordId
        // case where the current user has a discordId that doesn't link to a discord user
        // case where the current user has a discordId that doesn't link to a discord user in the server
        // case where there is no discordWebhook in the settings
        // case where there is an invalid discordWebhook in the settings
        // case where the string does not stringify into JSON
        // case where the message sends correctly       
    });
});

test.describe('discord-integration end-to-end tests', () => {
    test('should edit the discordWebhook setting', async ({ page }) => {
        // Change the setting
    });
    test('should edit a users discordId', async ({ page }) => {
        // TODO
    });
    test('should not forward a message without tags', async ({ page }) => {
        // TODO
    });
    test('should not forward a message with invalid tag', async ({ page }) => {
        // TODO
    });
    test('should forward a message with @Discord Tag', async ({ page }) => {
        // TODO
    });
    test('should forward a message with valid tag for user', async ({ page }) => {
        // TODO
    });
});

test.afterAll(async ({ page, context }) => {
    page.close();
    context.close();
});