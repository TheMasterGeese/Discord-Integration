// TODO: Need to figure out a way to faciliate linking to discord server for this test.

import { test, expect, Page, BrowserContext } from '@playwright/test';

let gm_uid: string;
let player_uid: string;

const EXPECTED_WEBHOOK = "testwebhook";
const EXPECTED_GM_DISCORD_ID = '356634652963897345';



test.describe('discord-integration', () => {

    test('should register settings on init', async ({ page }) => {

        await logOnAsUser(1, page);
        // Click the settings icon in the sidemenu
        await page.locator('a:nth-child(11) > .fas.fa-cogs').click();

        // Go to the "Configure settings" menu
        await page.locator('text=Configure Settings').click();

        // Go to the "Module Settings" menu
        await page.locator('text=Module Settings').click();

        // make sure the Discord Webhook field is filled out with the expected value.
        await expect(page.locator('input[name="discord-integration\\.discordWebhook"]')).toHaveValue(EXPECTED_WEBHOOK);
    });
    test.describe('should add inputFields below Player Color group', () => {

        test('when player is GM', async ({ page }) => {
            await logOnAsUser(1, page);
            // Click text=Gamemaster [GM]

            await page.locator(`#player-list > li:nth-child(1)`).focus();
            await Promise.all([
                page.locator(`li[data-user-id="${gm_uid}"]`).click({
                    button: 'right',
                    force: true
                }),
                page.waitForSelector('#context-menu')
            ]);
            await Promise.all([
                page.locator('#context-menu').click(),
                page.waitForSelector(`#user-sheet-${gm_uid}`)
            ]);
            expect(await page.locator('#discord-id-setting > input[name="discord-id-config"]').getAttribute('value')).toMatch(EXPECTED_GM_DISCORD_ID);
        });
        test('when player is NOT GM', async ({ page }) => {
        });

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

    /**
     * 
     * @param userIndex 1 for GM, 2 for Player
     */
    async function logOnAsUser(userIndex: number, page : Page) {
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
            //page.waitForNavigation({ url: 'http://localhost:30000/game' }),
            // TODO: Find a more graceful way to cast window to a type
            page.waitForFunction(() => (window as any).game?.ready)
        ]);
    }
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






