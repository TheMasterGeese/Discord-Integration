import { test, expect, Page, Response, ConsoleMessage, Route } from '@playwright/test';
import { TestEnvironment } from "./TestEnvironment"
// TODO: Localization tests?
import en from "../lang/en.json";

/**
 * the UID for the GM user
 */
let gm_uid: string;
/**
 * the UID for the Player user
 */
let player_uid: string;
/**
 * the currently registered url for the discord webhook
 */
let webhook: string;

/**
 * Element selectors
 */
 const MODULE_SETTINGS_TAB = '#client-settings > section > form.flexcol > nav > a[data-tab="modules"]';
 const CONFIGURE_SETTINGS_BUTTON = '#settings-game > button[data-action="configure"]';
 const DISCORD_WEBHOOK_INPUT = 'input[name="discord-integration\\.discordWebhook"]';
 const USER_CONFIGURATION = '#context-menu > ol > li:has-text("User Configuration")';
 const DISCORD_ID_INPUT = '#discord-id-setting > input[name="discord-id-config"]';
 const CHAT_TEXT_AREA = '#chat-message';
 const INVALID_DISCORD_ID_NOTIFICATION_EN = `#notifications > li.notification.error:has-text("${en['DISCORDINTEGRATION.InvalidIdError']}")`;
 const GM_NO_DISCORD_ID_NOTIFICATION_EN = `#notifications > li.notification.error:has-text("${en['DISCORDINTEGRATION.CouldNotSendMessage']} NoId ${en['DISCORDINTEGRATION.UserHasNoIdError']}")`;
 const NO_DISCORD_WEBHOOK_NOTIFICATION_EN = `#notifications > li.notification.error:has-text("${en['DISCORDINTEGRATION.CouldNotSendMessage']} ${en['DISCORDINTEGRATION.NoDiscordWebhookError']}")`;
 
/**
 * Expected Values
 */
const SEND_DISCORD_MESSAGE_HOOK_SUCCESS = "Send Discord Message Hook successfully caught."
const EXPECTED_WEBHOOK = "testWebhook";
const EXPECTED_GM_DISCORD_ID = TestEnvironment.GM_DISCORD_ID;
const EXPECTED_PLAYER_DISCORD_ID = TestEnvironment.PLAYER_DISCORD_ID;

/**
 * An actually functional webhook URL for tests that actually send requests to the discord server.
 */
const FUNCTIONAL_WEBHOOK = TestEnvironment.DISCORD_WEBHOOK;

test.describe('discord-integration', () => {

    test('should register settings on init', async ({ page }) => {
        // TODO: Optimize to avoid the need to log on after every single test.
        await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
        // Click the settings icon in the sidemenu
        await openModuleSettings(page);

        // make sure the Discord Webhook field is filled out with the expected value.
        await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
    });

    test.describe('should update discord webhook in settings', () => {
        test('when player is GM', async ({ page }) => {
            const newWebhook = '123456789123456789';
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            // Change the webhook
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(newWebhook, page);

            // Verify the webhook was changed
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(newWebhook);

            // Revert the value of webhook to the default value.
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
        });
    });
    test.describe('should NOT update discord webhook in settings', () => {
        test('when player is NOT GM', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.PLAYER, page);
            // Change the webhook
            await openModuleSettings(page);
            // Expect the field to not exist
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveCount(0);
        });
    });
    test.describe('should add inputFields below Player Color group', () => {
        test('when player is GM', async ({ page }) => {
            await testInputField(PLAYER_INDEX.GAMEMASTER, gm_uid, EXPECTED_GM_DISCORD_ID, page);
        });
        
        test('when player is NOT GM', async ({ page }) => {
            await testInputField(PLAYER_INDEX.PLAYER, player_uid, EXPECTED_PLAYER_DISCORD_ID, page);
        });

        /**
         * Helper function to test that a user has the expected Discord ID.
         * 
         * @param userIndex The index of the user to log on as.
         * @param uid The user's UID.
         * @param expectedDiscordId The expected value for the user's Discord Id.
         * @param page The test's page fixture.
         */
        async function testInputField(userIndex: number, uid: string, expectedDiscordId: string, page: Page) {
            await logOnAsUser(userIndex, page);
            // Open user config and verify the field for Discord ID exists and has that user's expected value.
            await openUserConfiguration(uid, page)
            expect(await page.locator(DISCORD_ID_INPUT).getAttribute('value')).toMatch(expectedDiscordId);
        }
    });

    test.describe('should update user flags when closing user config', () => {
        test('when player is GM', async ({ page }) => {
            await testUpdateUserFlags(PLAYER_INDEX.GAMEMASTER, gm_uid, EXPECTED_GM_DISCORD_ID, page);
        });

        test('when player is NOT GM', async ({ page }) => {
            await testUpdateUserFlags(PLAYER_INDEX.PLAYER, player_uid, EXPECTED_PLAYER_DISCORD_ID, page);
        });

        /**
         * Helper function to test updating a user's Discord ID updates when the User Configuration view is closed.
         * 
         * @param userIndex The index of the user to log on as.
         * @param uid The user's UID.
         * @param expectedDiscordId The expected value for the user's Discord Id.
         * @param page The test's page fixture.
         */
        async function testUpdateUserFlags(userIndex: PLAYER_INDEX, uid: string, expectedDiscordId: string, page: Page) {
            const newDiscordId = '123456789123456789';

            await logOnAsUser(userIndex, page);

            // Change the user's discord id to a new value.
            await openUserConfiguration(uid, page)
            await fillDiscordIdThenClose(newDiscordId, page);

            // Verify the ID actually changed to the new value, then change it back.
            await openUserConfiguration(uid, page);
            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(newDiscordId);
            await fillDiscordIdThenClose(expectedDiscordId, page);

            // Verify the ID changed back.
            await openUserConfiguration(uid, page)
            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(expectedDiscordId);

        }

        // TODO: Add unit tests to check for the following cases:
        // case where the user was not found
        // case where the discord-id-config element was not found
    });

    test.describe('should NOT update user flags when closing user config', () => {
        test('when discord-id-config input has no value', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await testInvalidInput('', page);

        });

        test('when discord-id-config input is not an 18-digit number', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await testInvalidInput('not an 18-digit nu', page);
            await testInvalidInput('12345678912345678', page);
            await testInvalidInput('1234567891234567891', page);
        });

        /**
         * Helper function to test for updating a user's Discord ID to a new invalid value.
         * @param invalidInput The invalid input to use
         * @param page The test's page fixture.
         */
        async function testInvalidInput(invalidInput: string, page: Page) {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            // Enter the invalid input and close, expecting the notification stating the id is invalid.
            await openUserConfiguration(gm_uid, page)
            await fillDiscordIdThenClose(invalidInput, page);
            await page.waitForSelector(INVALID_DISCORD_ID_NOTIFICATION_EN);

            // Verify the ID did NOT update its value.
            await openUserConfiguration(gm_uid, page)
            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(EXPECTED_GM_DISCORD_ID);
        }
    });

    test.describe('should handle new chat messages', () => {

        test.beforeEach(async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            // attach a listener to the sendDiscordMessage hook to signal test completion.
            await page.evaluate(async () => {
                Hooks.once("sendDiscordMessage", () => {
                    console.log("Send Discord Message Hook successfully caught.")
                });
            });
        });

        test('when there is a tag in the message for a user', async ({ page }) => {
            await enterChatMessageAndAwaitSend('@Gamemaster test', page);
        });

        test('when there is are two tags in the message: one for a user', async ({ page }) => {
            await enterChatMessageAndAwaitSend('@Gamemaster @NotAUser test', page);
        });

        test('when there is are two tags in the message: both for users', async ({ page }) => {
            await enterChatMessageAndAwaitSend('@Gamemaster @Player test', page);
        });

        test('when there is a @Discord tag in the message', async ({ page }) => {
            await enterChatMessageAndAwaitSend('@Discord test', page);
        });

        /**
         * Helper function to enter a chat message and await the console message indicating that the sendDiscordMessage hook was hit.
         * 
         * @param message The message to send in the chat.
         * @param page The test's page fixture.
         */
        async function enterChatMessageAndAwaitSend(message: string, page: Page) {

            // Fill the chat's text area with the message.
            await page.locator(CHAT_TEXT_AREA).focus();
            await page.locator(CHAT_TEXT_AREA).fill(message);

            // Send the message, expecting to hear from the listener we attached in beforeAll to indicate the message is being 
            // sent forward to discord.
            await Promise.all([
                page.locator(CHAT_TEXT_AREA).press('Enter'),
                page.waitForEvent('console', (consoleMessage: ConsoleMessage) => {
                    return new Promise<boolean>((resolve) => {
                        resolve(consoleMessage.text() === SEND_DISCORD_MESSAGE_HOOK_SUCCESS)
                    });
                })
            ]);
        }
        // TODO: Add unit tests to check for the following cases:
        // case where there are no users
    });

    test.describe('should NOT handle new chat message', () => {
        test('when there are no tags in the message', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await enterChatMessageAndAwaitLog('test', page);          
        });

        test('when there is a tag in the message but not for a user', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await enterChatMessageAndAwaitLog('@NotAUser test', page);   
        });

        /**
         * Helper function to enter a chat message and await the console message indicating that the sendDiscordMessage hook was NOT hit.
         *  
         * @param message The message to input in the chat.
         * @param page The test's page fixture.
         */
        async function enterChatMessageAndAwaitLog(message: string, page: Page) {

            // Fill the chat's text area with the message.
            await page.locator(CHAT_TEXT_AREA).focus();
            await page.locator(CHAT_TEXT_AREA).fill(message);

            // Send the message, expecting to find a console message indicating the message was not sent.
            await Promise.all([
                page.locator(CHAT_TEXT_AREA).press('Enter'),
                page.waitForEvent('console', (consoleMessage: ConsoleMessage) => {
                    return new Promise<boolean>((resolve) => {
                        if (consoleMessage.text() === 'Message not sent.') {
                            resolve(true);
                        }
                    });
                })
            ]);
        }
    });

    test.describe('should send message to Discord', () => {
        // Change the discord webhook to an actual functional webhook.
        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
    
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(FUNCTIONAL_WEBHOOK, page);
            page.close();
        })

        test('when message has @Discord tag', async ({ page }) => {
            await sendMessageCatchRequest(
                " Hello World",
                '@Discord Hello World',
                page);
        });

        test('when message has user tags', async ({ page }) => {
            await sendMessageCatchRequest(
                `<@${EXPECTED_GM_DISCORD_ID}> <@${EXPECTED_PLAYER_DISCORD_ID}> Hello World`, 
                '@Gamemaster @Player Hello World',
                
                page);
        });

        /**
         * Helper function to send a message in chat that will be forwarded to discord, then await a response indicating the HTTP 
         * request is configured as expected.
         * 
         * @param expectedMessage The expected body of the request
         * @param chatMessage The message to send in chat.
         * @param page The test's page fixture.
         */
        async function sendMessageCatchRequest(expectedMessage : string, chatMessage : string, page : Page) {
            // Expected values
            const success = 'Message sending test passed!'
            const responseCode = 200;
            const message = {"content": expectedMessage};

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            // Any requests sent to the webhook will instead be routed through here to check the request's settings.
            await page.route(webhook, async (route : Route) => {
                const request = route.request();
                expect(request.method()).toMatch('POST');
                expect(request.url()).toMatch(webhook);
                expect(await request.headerValue('content-type')).toMatch('application/json');
                expect(JSON.parse(request.postData())).toEqual(message);
                route.fulfill( {
                    status: responseCode,
                    body: success
                })
            });
            // Send the message, and expect a response indicating the request was correctly formatted.
            await Promise.all([
                fillInput(CHAT_TEXT_AREA, chatMessage, page),
                page.waitForResponse(async (response : Response) => {
                    const responseText = await response.text();
                    return new Promise<boolean>((resolve) => {
                        resolve(response.status() === responseCode
                            && responseText === success);
                    });
                })
            ]);
            // Clean up the routing
            await page.unroute(webhook);
        }

        // Change the webhook back to its original value.
        test.afterAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
    
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
            page.close();
        })
    });

    test.describe('should NOT send message to Discord', async () => {
        test('when a user pinged by the message does not have a discordId set', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            // Send a message pinging a user that has no discord ID set, expecting an error notification stating as such.
            await Promise.all([
                fillInput(CHAT_TEXT_AREA, '@NoId Hello World', page),
                page.waitForSelector(GM_NO_DISCORD_ID_NOTIFICATION_EN)
            ]);
        });

        test('when there is no discord webhook set', async ({ page }) => {
            // Clear the discord webhook setting
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose('', page);

            // Click the chat menu in the sidemenu, and send a message formatted correctly, expecting a notification stating
            // that the discord webhook was not set.
            await page.locator('#sidebar-tabs > a[data-tab="chat"] > .fas.fa-comments').click();
            await Promise.all([
                fillInput(CHAT_TEXT_AREA, '@Gamemaster Hello World', page),
                page.waitForSelector(NO_DISCORD_WEBHOOK_NOTIFICATION_EN)
            ]);

            // Change the webhook back
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
        });

        // TODO Figure out how to test later:   
            // a message that can't stringify into JSON?
    });

    // TODO: How will we handle using a discord server for other contributing developers? Just have one up and running for public use?
    test.describe('should handle discord response', async () => {
        // Change the discord webhook to an actual functional webhook.
        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
    
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(FUNCTIONAL_WEBHOOK, page);
            page.close();
        })

        test('when the response comes back successfully', async ({ page }) => {
            // There are actually multiple responses when sending a message: one for the message itself and one for its options; we are
            // only concerned with the former.
            const responseCode = 204;

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            // Send a message, expecting Discord to respond.
            await Promise.all([
                page.waitForResponse((response : Response) => {
                    return new Promise<boolean>((resolve) => {
                        resolve(response.status() === responseCode);
                    });
                }),
                fillInput(CHAT_TEXT_AREA, '@Gamemaster Hello World', page)
            ]);
        });
        test('when the response returns an error due to an invalid webhook', async ({ page }) => {
            const responseCode = 404;

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
    
            // Change the webhook to the invalid value.
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);

            // Send a message, expecting the request to fail to find the non-existent Discord server, and return an error code
            // indicating as such.
            await page.locator('#sidebar-tabs > a[data-tab="chat"] > .fas.fa-comments').click();
            await Promise.all([
                page.waitForResponse((response : Response) => {
                    return new Promise<boolean>((resolve) => {
                        resolve(response.status() === responseCode);
                    });
                }),
                fillInput(CHAT_TEXT_AREA, '@Gamemaster Hello World', page)
            ]);

            // Change the webhook back to the functional value.
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(FUNCTIONAL_WEBHOOK, page);
        });

        // Change the webhook back to its original value.
        test.afterAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
    
            // Change the webhook
            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
            page.close();
        })

        // TODO: Figure out how to test for the following cases:
            // when the user posting the message has a discordId that is valid but does not link to an actual discord user?
            // when the user posting the message has a discordId that is valid but does not link to an actual discord user in the server the webhook belongs to?
    });

    /**
     * Log on to Foundry as a specific user.
     * 
     * @param userIndex The index of the player to log in as.
     * @param page The test's page fixture.
     */
    async function logOnAsUser(userIndex: PLAYER_INDEX, page: Page) {
        // Go to the locally-deployed foundry instance
        await Promise.all([
            page.goto('http://localhost:30000'),
            page.waitForLoadState('load')
        ]);

        // Select the user to log in as
        await page.locator('select[name="userid"]').focus();
        await page.locator('select[name="userid"]').selectOption({ index: userIndex });

        // get and then set the GM and player ids.
        // Note: The indices for the selectors are 1-based, whereas the index in the selectOption call above is 0-based.
        gm_uid = await page.locator('select[name="userid"] > option:nth-child(2)').getAttribute('value');
        player_uid = await page.locator('select[name="userid"] > option:nth-child(4)').getAttribute('value');

        // Join the game
        await Promise.all([
            page.locator('button:has-text("Join Game Session")').click({ force: true }),
            // TODO: Find a more graceful way to cast window to a type
            page.waitForFunction(() => (window as any).game?.ready)
        ]);
        // Get the current webhook setting's value.
        webhook = await page.evaluate(() => { return game.settings.get('discord-integration', 'discordWebhook' ) }) as string;
    }

    /**
     * Opens the module settings view
     * 
     * @param page The test's page fixture.
     */
    async function openModuleSettings(page: Page) {
        // Click the settings icon in the sidemenu
        await page.locator('#sidebar-tabs > a[data-tab="settings"] > .fas.fa-cogs').click();

        // Go to the "Configure settings" menu
        await page.locator(CONFIGURE_SETTINGS_BUTTON).click();

        // Go to the "Module Settings" menu
        await page.locator(MODULE_SETTINGS_TAB).click();
    }

    /**
     * Opens the User Configuration view for a specific user.
     * 
     * @param uid the UID of the user to open the User Configuration view for.
     * @param page The test's page fixture.
     */
    async function openUserConfiguration(uid: string, page: Page) {

        // Open the right-click menu for a specific user in the bottom left corner.
        await page.locator(`#player-list > li[data-user-id="${uid}"]`).focus();
        await Promise.all([
            page.locator(`#player-list > li[data-user-id="${uid}"]`).click({
                button: 'right',
                force: true
            }),
            page.waitForSelector(USER_CONFIGURATION)
        ]);

        // Click the "User Configuration" option to open the corresponding view.
        await Promise.all([
            page.locator(USER_CONFIGURATION).click(),
            page.waitForSelector(`#user-sheet-${uid}`)
        ]);
    }
    /**
     * Fills the discord webhook field then closes the module settings view. Assumes that as this function is called, you are in the
     * module settings view.
     * 
     * @param newWebhook The new webhook value.
     * @param page The test's page fixture.
     */
    async function fillDiscordWebhookThenClose(newWebhook: string, page: Page) {
        await fillInput(DISCORD_WEBHOOK_INPUT, newWebhook, page);
        await page.waitForSelector(MODULE_SETTINGS_TAB, { state: 'detached' })
    }

    /**
     * Fills the discord id field then closes the user configuraton view. Assumes that as this function is called, you are in the
     * user configuration view.
     * 
     * @param newId The new discord ID value.
     * @param page The test's page fixture.
     */
    async function fillDiscordIdThenClose(newId: string, page: Page) {
        await fillInput(DISCORD_ID_INPUT, newId, page);
        await page.waitForSelector(DISCORD_ID_INPUT, { state: 'detached' })
    }

    /**
     * Fills a specific input element with a specific value.
     * 
     * @param inputElement Selector for the element to fill
     * @param newValue The new value to fill.
     * @param page The test's page fixture.
     */
    async function fillInput(inputElement: string, newValue: string, page: Page) {
        await page.locator(inputElement).focus();
        await page.locator(inputElement).fill(newValue);
        await page.locator(inputElement).press('Enter');
    }
});

/**
 * Indicates what index each user will be in at the login screen's user selection field.
 */
enum PLAYER_INDEX
{
    GAMEMASTER = 1,
    NO_ID = 2,
    PLAYER = 3,
}





