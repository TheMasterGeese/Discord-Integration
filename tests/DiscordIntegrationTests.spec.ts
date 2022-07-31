// TODO: Need to figure out a way to faciliate linking to discord server for this test.

import { test, expect, Page, BrowserContext } from '@playwright/test';

let gm_uid: string;
let player_uid: string;

const EXPECTED_WEBHOOK = "testwebhook";
const EXPECTED_GM_DISCORD_ID = '356634652963897345';
const EXPECTED_PLAYER_DISCORD_ID = '109464021618417664'

const CONFIGURE_SETTINGS_BUTTON ='#settings-game > button[data-action="configure"]';
const MODULE_SETTINGS_TAB = '#client-settings > section > form.flexcol > nav > a[data-tab="modules"]';
const DISCORD_WEBHOOK_INPUT = 'input[name="discord-integration\\.discordWebhook"]'

test.describe('discord-integration', () => {

    test('should register settings on init', async ({ page }) => {

        await logOnAsUser(1, page);
        // Click the settings icon in the sidemenu
        await openModuleSettings(page);

        // make sure the Discord Webhook field is filled out with the expected value.
        await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
    });
    test.describe('should update discord webhook in settings', () => {

        test('when player is GM', async ({ page }) => {
            const newWebhook = '123456789123456789';
            await logOnAsUser(1, page);

            // Change the webhook
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(newWebhook, page);

            // Verify the webhook was changed
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(newWebhook);

            // Revert the value of webhook to the default its previous value.
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
        });
    });
    test.describe('should NOT update discord webhook in settings', () => {

        test('when player is NOT GM', async ({ page }) => {
            await logOnAsUser(2, page);
            // Change the webhook
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveCount(0);
        });
    });
    test.describe('should add inputFields below Player Color group', () => {

        test('when player is GM', async ({ page }) => {
            await testInputField(1, gm_uid, EXPECTED_GM_DISCORD_ID, page);
        });
        test('when player is NOT GM', async ({ page }) => {
            await testInputField(2, player_uid, EXPECTED_PLAYER_DISCORD_ID, page);
        });

        async function testInputField(userIndex: number, uid: string, expectedDiscordId: string, page: Page) {
            await logOnAsUser(userIndex, page);
            // Click on the "Gamemaster [GM]" in the players list."

            await page.locator(`#player-list > li:nth-child(1)`).focus();
            await Promise.all([
                page.locator(`li[data-user-id="${uid}"]`).click({
                    button: 'right',
                    force: true
                }),
                page.waitForSelector('#context-menu > ol > li:has-text("User Configuration")')
            ]);
            await Promise.all([
                page.locator('#context-menu > ol > li:has-text("User Configuration")').click(),
                page.waitForSelector(`#user-sheet-${uid}`)
            ]);
            expect(await page.locator('#discord-id-setting > input[name="discord-id-config"]').getAttribute('value')).toMatch(expectedDiscordId);
        }
    });

    test.describe('should update user flags when closing user config', () => {
        test.skip('when player is GM', async ({ page }) => {

        });
        test.skip('when player is NOT GM', async ({ page }) => {

        });

        // TODO: unit testing
        // case where the user was not found
        // case where the discord-id-config element was not found
    });

    test.describe('should NOT update user flags when closing user config', () => {
        test.skip('when discord-id-config input has no value', async ({ page }) => {

        });
        test.skip('when discord-id-config input is not an 18-digit number', async ({ page }) => {

        });
    });

    test.describe('should handle new chat messages', () => {
        test.skip('when there is a  tag in the message for a user', async ({ page }) => {

        });
        test.skip('when there is are two tags in the message: one for a user', async ({ page }) => {

        });
        test.skip('when there is are two tags in the message: both for users', async ({ page }) => {

        });
        test.skip('when there is a @Discord tag in the message', async ({ page }) => {

        });

        // unit testing
        // case where there are no users
    });

    test.describe('should NOT handle new chat message', () => {
        test.skip('when there are no tags in the message', async ({ page }) => {

        });

        test.skip('when there is a tag in the message but not for a user', async ({ page }) => {

        });

    });

    test.describe('should send message to Discord', async () => {
        test.skip('when all ids and hooks have been setup', async ({ page }) => {

        });
    });

    test.describe('should NOT send message to Discord', async () => {
        test.skip('when the user posting the message does not have a discordId set', async ({ page }) => {

        });
        test.skip('when the user posting the message has a discordId that does not link to a discord user', async ({ page }) => {

        });
        test.skip('when the user posting the message has a discordId that does not link to a discord user in the server', async ({ page }) => {

        });
        test.skip('when there is no discord webhook set', async ({ page }) => {

        });
        test.skip('when the discord webhook does link to a discord server', async ({ page }) => {

        });
        test.skip('when the message does not stringify into JSON', async ({ page }) => {

        });
    });
    // TODO: How will we handle using a discord server for this test? Just have one up all the time?
    test.describe('should handle discord response', async () => {
        test.skip('when the response comes back successfully', async ({ page }) => {

        });
        test.skip('when the response returns an error', async ({ page }) => {

        });
    });

    /**
     * 
     * @param userIndex 1 for GM, 2 for Player
     */
    async function logOnAsUser(userIndex: number, page: Page) {
        await Promise.all([
            page.goto('http://localhost:30000'),
            page.waitForLoadState('load')
        ]);

        await page.locator('select[name="userid"]').focus();
        await page.locator('select[name="userid"]').selectOption({ index: userIndex });

        // get and then set the GM and user ids
        gm_uid = await page.locator('select[name="userid"] > option:nth-child(2)').getAttribute('value');
        player_uid = await page.locator('select[name="userid"] > option:nth-child(3)').getAttribute('value');

        await Promise.all([
            page.locator('button:has-text("Join Game Session")').click({ force: true }),
            // TODO: Find a more graceful way to cast window to a type
            page.waitForFunction(() => (window as any).game?.ready)
        ]);
    }

    async function openModuleSettings(page: Page) {

        // Click the settings icon in the sidemenu
        await page.locator('#sidebar-tabs > a[data-tab="settings"] > .fas.fa-cogs').click();

        // Go to the "Configure settings" menu
        await page.locator(CONFIGURE_SETTINGS_BUTTON).click();

        // Go to the "Module Settings" menu
        await page.locator(MODULE_SETTINGS_TAB).click();
    }

    async function fillDiscordWebhookThenClose(newWebhook: string, page : Page) {
        // Click input[name="discord-integration\.discordWebhook"]
        await page.locator(DISCORD_WEBHOOK_INPUT).focus();

        // Fill input[name="discord-integration\.discordWebhook"]
        await page.locator(DISCORD_WEBHOOK_INPUT).fill(newWebhook);

        // Press Enter
        await page.locator(DISCORD_WEBHOOK_INPUT).press('Enter');

        await page.waitForSelector(MODULE_SETTINGS_TAB,{ state: 'detached' })
    }
});






