import { test, expect, Page, ConsoleMessage, Route } from '@playwright/test';
import { Response as PwResponse } from '@playwright/test';
import { TestEnvironment } from "./TestEnvironment"
// TODO MasterGeeseLivingWorldTools#31: Localization tests?
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
/**
 * Settings Menu
 */
const SETTINGS_TAB = '#sidebar-tabs > a[data-tab="settings"] > .fas.fa-cogs';
const CLIENT_SETTINGS = '#client-settings';
const CONFIGURE_SETTINGS_BUTTON = '#settings-game > button[data-action="configure"]';
const DISCORD_WEBHOOK_INPUT = 'input[name="discord-integration\\.discordWebhook"]';
const PING_BY_CHARACTER_NAME_INPUT = 'input[name="discord-integration.pingByCharacterName"]';
const PING_BY_USER_NAME_INPUT = 'input[name="discord-integration.pingByUserName"]';
const FORWARD_ALL_MESSAGES_INPUT = ' input[name="discord-integration.forwardAllMessages"]';
const PREPEND_USER_NAME_INPUT = 'input[name="discord-integration.prependUserName"]';
const SHOW_TOGGLE_BUTTON_INPUT = 'input[name="discord-integration.tokenControlsButton"]';
const TOKEN_CONTROLS_SETTINGS_BUTTON = '#controls > ol.main-controls > li.scene-control[data-control="token"]';
const TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE = '#controls > ol.main-controls > li.scene-control.active[data-control="token"]';
const MEASURE_CONTROLS_SETTINGS_BUTTON = '#controls > ol.main-controls > li.scene-control[data-control="measure"]';
const MEASURE_CONTROLS_SETTINGS_BUTTON_ACTIVE = '#controls > ol.main-controls > li.scene-control.active[data-control="measure"]';
const ENABLE_DISABLE_FORWARDING_BUTTON = '#controls > ol.sub-controls > li[data-tool="discord-integration-toggle"]';
const ENABLE_DISABLE_FORWARDING_BUTTON_ACTIVE = '#controls > ol.sub-controls > li.active[data-tool="discord-integration-toggle"]';
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
        // TODO MasterGeeseLivingWorldTools#32: Optimize to avoid the need to log on after every single test.
        await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
        // Click the settings icon in the sidemenu
        await openModuleSettings(page);

        // make sure the Discord Webhook field is filled out with the expected value.
        await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
        // make sure the Enable Ping by Character Name and User name checkboxes are filled out.
        await expect(page.locator(PING_BY_USER_NAME_INPUT)).toBeChecked();
        await expect(page.locator(PING_BY_CHARACTER_NAME_INPUT)).toBeChecked();
        await expect(page.locator(FORWARD_ALL_MESSAGES_INPUT)).not.toBeChecked();
        await expect(page.locator(PREPEND_USER_NAME_INPUT)).not.toBeChecked();
        await expect(page.locator(SHOW_TOGGLE_BUTTON_INPUT)).not.toBeChecked();
    });

    test.describe('should update module settings', () => {
        test('when player is GM', async ({ page }) => {
            const newWebhook = '123456789123456789';
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            // Change the webhook
            await openModuleSettings(page);
            await fillModuleSettingsThenClose(newWebhook, false, false, true, true, true, page);

            // Verify the settings was changed
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(newWebhook);
            await expect(page.locator(PING_BY_USER_NAME_INPUT)).not.toBeChecked();
            await expect(page.locator(PING_BY_CHARACTER_NAME_INPUT)).not.toBeChecked();
            await expect(page.locator(FORWARD_ALL_MESSAGES_INPUT)).toBeChecked();
            await expect(page.locator(PREPEND_USER_NAME_INPUT)).toBeChecked();
            await expect(page.locator(SHOW_TOGGLE_BUTTON_INPUT)).toBeChecked();
            // Revert the value of settings to the default values.
            await fillModuleSettingsThenClose(EXPECTED_WEBHOOK, true, true, false, false, false, page);
            await openModuleSettings(page);
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveValue(EXPECTED_WEBHOOK);
            await expect(page.locator(PING_BY_USER_NAME_INPUT)).toBeChecked();
            await expect(page.locator(PING_BY_CHARACTER_NAME_INPUT)).toBeChecked();
            await expect(page.locator(FORWARD_ALL_MESSAGES_INPUT)).not.toBeChecked();
            await expect(page.locator(PREPEND_USER_NAME_INPUT)).not.toBeChecked();
            await expect(page.locator(SHOW_TOGGLE_BUTTON_INPUT)).not.toBeChecked();
        });
    });
    test.describe('should NOT update module settings', () => {
        test('when player is NOT GM', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.PLAYER, page);
            // Change the webhook
            await openModuleSettings(page);
            // Expect the field to not exist
            await expect(page.locator(DISCORD_WEBHOOK_INPUT)).toHaveCount(0);
            await expect(page.locator(PING_BY_USER_NAME_INPUT)).toHaveCount(0);
            await expect(page.locator(PING_BY_CHARACTER_NAME_INPUT)).toHaveCount(0);
            await expect(page.locator(FORWARD_ALL_MESSAGES_INPUT)).toHaveCount(0);
            await expect(page.locator(PREPEND_USER_NAME_INPUT)).toHaveCount(0);
            await expect(page.locator(SHOW_TOGGLE_BUTTON_INPUT)).toHaveCount(0);
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
    });

    test.describe('should NOT update user flags when closing user config', () => {
        test('when discord-id-config input has no value', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await testInvalidInput('', page);

        });

        test('when discord-id-config input is not a 17- or 18-digit number', async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await testInvalidInput('not an 18-digit nu', page);
            await testInvalidInput('1234567891234567', page);
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

        // TODO discord-integration#33: Add unit tests to check for the following cases:
        // case where the user was not found
        // case where the discord-id-config element was not found
    });

    test.describe('should display toggle button in Token Controls', () => {
        test.beforeEach(async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
        });
        test('when Show Token Controls is enabled', async ({ page })  => {
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, true, page);
            // Need to swap between scene control menus to get the changes in module settings to take effect.
            await Promise.all([
                page.locator(MEASURE_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(MEASURE_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await Promise.all([
                page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await Promise.all([
                page.locator(ENABLE_DISABLE_FORWARDING_BUTTON_ACTIVE).click(),
                page.waitForSelector(ENABLE_DISABLE_FORWARDING_BUTTON),
            ])
            await Promise.all([
                page.locator(ENABLE_DISABLE_FORWARDING_BUTTON).click(),
                page.waitForSelector(ENABLE_DISABLE_FORWARDING_BUTTON_ACTIVE),
            ])
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, false, page)
        });    
    });

    test.describe('should NOT display toggle button in Token Controls', () => {
        test.beforeEach(async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
        });
        test('when Show Token Controls is disabled', async ({ page })  => {
            await Promise.all([
                page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await expect(page.locator(ENABLE_DISABLE_FORWARDING_BUTTON)).toHaveCount(0);
        });  
        
        test('when Show Token Controls is enabled but user does not have GM permissions', async ({ page })  => {
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, true, page);

            await logOnAsUser(PLAYER_INDEX.PLAYER, page);
            await Promise.all([
                page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await expect(page.locator(ENABLE_DISABLE_FORWARDING_BUTTON)).toHaveCount(0);

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, false, page);
        });
    });

    test.describe('should handle new chat messages', () => {
        test.describe('from GM', () => {
            test.beforeEach(async ({ page }) => {
                await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

                // attach a listener to the sendDiscordMessage hook to signal test completion.
                await page.evaluate(() => {
                    Hooks.once("sendDiscordMessage", () => {
                        console.log("Send Discord Message Hook successfully caught.")
                    });
                });
                // Change the webhook
                await openModuleSettings(page);
                await fillModuleSettingsThenClose(EXPECTED_WEBHOOK, true, true, false, false, false, page);
            });

            test('when there is a tag in the message for a user', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster test', false, page);
            });

            test('when there is are two tags in the message: one for a user', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @NotAUser test', false, page);
            });
            
            test('when there is are two tags in the message: both for users', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @Player test', false, page);
            });
    
            test('when there is a tag in the message for a character', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@spamton test', false, page);
            });
    
            test('when there are two tags in the message: one for a character', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Notacharacter @spamton test', false, page);
            });
    
            test('when there are two tags in the message: both for characters', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Fate @spamton test', false, page);
            });
    
            test('when there are two tags in the message: one for a user, another for a character.', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @Fate test', false, page);
            });
    
            test('when there is a @Discord tag in the message', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Discord test', false, page);
            });

            test('when the toggle button is enabled and is toggled on.', async ({ page }) => {
                await openModuleSettings(page);
                await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, true, page);
                await Promise.all([
                    page.locator(MEASURE_CONTROLS_SETTINGS_BUTTON).click(),
                    page.waitForSelector(MEASURE_CONTROLS_SETTINGS_BUTTON_ACTIVE),
                ])
                await Promise.all([
                    page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                    page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
                ])
                expect(await page.isEnabled(ENABLE_DISABLE_FORWARDING_BUTTON));
                await enterChatMessageAndAwaitSend('@Gamemaster test', true, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, false, page);
            });

            test('when there are no tags in the message, but Forward All Messages is Enabled', async ({ page }) => {
                await openModuleSettings(page);
                await fillCheckboxThenClose(FORWARD_ALL_MESSAGES_INPUT, true, page);
                await enterChatMessageAndAwaitSend('test', true, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(FORWARD_ALL_MESSAGES_INPUT, false, page);
            });
        });

        test.describe('from Player', () => {
            test.beforeEach(async ({ page }) => {
                await logOnAsUser(PLAYER_INDEX.PLAYER, page);

                // attach a listener to the sendDiscordMessage hook to signal test completion.
                await page.evaluate(() => {
                    Hooks.once("sendDiscordMessage", () => {
                        console.log("Send Discord Message Hook successfully caught.")
                    });
                });
            });

            test('when there is a tag in the message for a user', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster test', false, page);
            });

            test('when there is are two tags in the message: one for a user', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @NotAUser test', false, page);
            });

            test('when there is are two tags in the message: both for users', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @Player test', false, page);
            });
    
            test('when there is a tag in the message for a character', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@spamton test', false, page);
            });
    
            test('when there are two tags in the message: one for a character', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Notacharacter @spamton test', false, page);
            });
    
            test('when there are two tags in the message: both for characters', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Fate @spamton test', false, page);
            });
    
            test('when there are two tags in the message: one for a user, another for a character.', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Gamemaster @Fate test', false, page);
            });
    
            test('when there is a @Discord tag in the message', async ({ page }) => {
                await enterChatMessageAndAwaitSend('@Discord test', false, page);
            });
    
            test('when there are no tags in the message, but Forward All Messages is Enabled', async ({ page }) => {
                await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(FORWARD_ALL_MESSAGES_INPUT, true, page);
                await logOnAsUser(PLAYER_INDEX.PLAYER, page);
                // Need to re-attach listener when we log back in as player, the original one won't still be there.
                await page.evaluate(() => {
                    Hooks.once("sendDiscordMessage", () => {
                        console.log("Send Discord Message Hook successfully caught.")
                    });
                });
                await enterChatMessageAndAwaitSend('test', true, page);
                await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(FORWARD_ALL_MESSAGES_INPUT, false, page);
            });

            test('when the toggle button is enabled and is toggled on.', async ({ page }) => {
                await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, true, page);
                await logOnAsUser(PLAYER_INDEX.PLAYER, page);
                // attach a listener to the sendDiscordMessage hook to signal test completion.
                await page.evaluate(() => {
                    Hooks.once("sendDiscordMessage", () => {
                        console.log("Send Discord Message Hook successfully caught.")
                    });
                });
                await Promise.all([
                    page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                    page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
                ])
                await enterChatMessageAndAwaitSend('@Gamemaster test', true, page);
                await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
                await openModuleSettings(page);
                await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, false, page);
            });
         });

        /**
         * Helper function to enter a chat message and await the console message indicating that the sendDiscordMessage hook was hit.
         * 
         * @param message The message to send in the chat.
         * @param page The test's page fixture.
         */
        async function enterChatMessageAndAwaitSend(message: string, forwardAllMessages: boolean, page: Page) {
            await page.locator('#sidebar-tabs > a[data-tab="chat"] > .fas.fa-comments').click();
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

    });

    test.describe('should NOT handle new chat message', () => {

        test.beforeEach(async ({ page }) => {
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
        });

        test('when the toggle button is enabled and is toggled off.', async ({ page }) => {
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, true, page);

            // Need to swap between scene control menus to get the changes in module settings to take effect.
            await Promise.all([
                page.locator(MEASURE_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(MEASURE_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await Promise.all([
                page.locator(TOKEN_CONTROLS_SETTINGS_BUTTON).click(),
                page.waitForSelector(TOKEN_CONTROLS_SETTINGS_BUTTON_ACTIVE),
            ])
            await Promise.all([
                page.locator(ENABLE_DISABLE_FORWARDING_BUTTON_ACTIVE).click(),
                page.waitForSelector(ENABLE_DISABLE_FORWARDING_BUTTON),
            ])

            await enterChatMessageAndAwaitLog('@Gamemaster test', page);

            await Promise.all([
                page.locator(ENABLE_DISABLE_FORWARDING_BUTTON).click(),
                page.waitForSelector(ENABLE_DISABLE_FORWARDING_BUTTON_ACTIVE),
            ])
            await openModuleSettings(page);
            await fillCheckboxThenClose(SHOW_TOGGLE_BUTTON_INPUT, false, page);
        });

        test('when there are no tags in the message and Forward All Messages is not enabled.', async ({ page }) => {
            await enterChatMessageAndAwaitLog('test', page);
        });

        test('when there is a tag in the message but not for a user', async ({ page }) => {
            await enterChatMessageAndAwaitLog('@NotAUser test', page);
        });

        test('when there is a tag in the message for a user but the "Ping by User Name" setting is disabled.', async ({ page }) => {
            await openModuleSettings(page);
            await fillCheckboxThenClose(PING_BY_USER_NAME_INPUT, false, page);
            await enterChatMessageAndAwaitLog('@Gamemaster test', page);
            await openModuleSettings(page);
            await fillCheckboxThenClose(PING_BY_USER_NAME_INPUT, true, page);
        });
  
        test('when there is a tag in the message for a character but the "Ping by Character Name" setting is disabled.', async ({ page }) => {
            await openModuleSettings(page);
            await fillCheckboxThenClose(PING_BY_CHARACTER_NAME_INPUT, false, page);
            await enterChatMessageAndAwaitLog('@spamton test', page);
            await openModuleSettings(page);
            await fillCheckboxThenClose(PING_BY_CHARACTER_NAME_INPUT, true, page);
        });

        /**
         * Helper function to enter a chat message and await the console message indicating that the sendDiscordMessage hook was NOT hit.
         *  
         * @param message The message to input in the chat.
         * @param page The test's page fixture.
         */
        async function enterChatMessageAndAwaitLog(message: string, page: Page) {

            await page.locator('#sidebar-tabs > a[data-tab="chat"] > .fas.fa-comments').click();
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

        // TODO discord-integration#33: Add unit tests to check for the following cases:
        // case where there are no users
    });

    test.describe('should send message to Discord', () => {
        // Change the discord webhook to an actual functional webhook.
        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(FUNCTIONAL_WEBHOOK, page);
            await page.close();
        })

        test('when message has @Discord tag', async ({ page }) => {
            await sendMessageCatchRequest(
                "Hello World",
                '@Discord Hello World',
                false,
                false,
                page);
        });

        test('when message has @Discord tag and "Add Username to Messages" is enabled', async ({ page }) => {
            await sendMessageCatchRequest(
                "Gamemaster: Hello World",
                '@Discord Hello World',
                false,
                true,
                page);
            await openModuleSettings(page);
            await fillCheckboxThenClose(PREPEND_USER_NAME_INPUT, false, page);
        });

        test('when message has user tags', async ({ page }) => {
            await sendMessageCatchRequest(
                `<@${EXPECTED_GM_DISCORD_ID}> <@${EXPECTED_PLAYER_DISCORD_ID}> Hello World`,
                '@Gamemaster @Player Hello World',
                false,
                false,
                page);
        });

        test('when message has no tags but Forward All Messages is enabled.', async ({ page }) => {
            await sendMessageCatchRequest(
                `Hello World`,
                'Hello World',
                true,
                false,
                page);
            await openModuleSettings(page);
            await fillCheckboxThenClose(FORWARD_ALL_MESSAGES_INPUT, false, page);
        });


        /**
         * Helper function to send a message in chat that will be forwarded to discord, then await a response indicating the HTTP 
         * request is configured as expected.
         * 
         * @param expectedMessage The expected body of the request
         * @param chatMessage The message to send in chat.
         * @param toggleForwardAllMessages Used when testing Forward All messages, to change this setting before sending the message.
         * @param toggleAddUserName User when testing adding the username to messages, to change this setting before sending the message.
         * @param page The test's page fixture.
         */
        async function sendMessageCatchRequest(expectedMessage: string, chatMessage: string, toggleForwardAllMessages: boolean, 
            toggleAddUserName: boolean, page: Page) {
            // Expected values
            const success = 'Message sending test passed!'
            const responseCode = 200;
            const message = { "content": expectedMessage };

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            
            await openModuleSettings(page);
            await fillModuleSettingsThenClose(FUNCTIONAL_WEBHOOK, true, true, toggleForwardAllMessages, toggleAddUserName, false, page);

            // Any requests sent to the webhook will instead be routed through here to check the request's settings.
            await page.route(webhook, async (route: Route) => {
                const request = route.request();
                expect(request.method()).toMatch('POST');
                expect(request.url()).toMatch(webhook);
                expect(await request.headerValue('content-type')).toMatch('application/json');
                expect(JSON.parse(request.postData())).toEqual(message);
                route.fulfill({
                    status: responseCode,
                    body: success
                })
            });

            await page.locator('#sidebar-tabs > a[data-tab="chat"] > .fas.fa-comments').click();
            // Send the message, and expect a response indicating the request was correctly formatted.
            await Promise.all([
                fillInput(CHAT_TEXT_AREA, chatMessage, page),
                page.waitForResponse(async (response: Response) => {
                    const responseText = await response.text();
                    return new Promise<boolean>((resolve) => {
                        resolve(response.status() === responseCode
                            && responseText === success);
                    });
                }),
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
            await page.close();
        })


    });

    test.describe('should NOT send message to Discord', () => {
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

        // TODO discord-integration#33: Figure out how to test later:   
        // a message that can't stringify into JSON?
    });

    // TODO MasterGeeseLivingWorldTools#34: How will we handle using a discord server for other contributing developers? Just have one up and running for public use?
    test.describe('should handle discord response', () => {
        // Change the discord webhook to an actual functional webhook.
        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);

            await openModuleSettings(page);
            await fillDiscordWebhookThenClose(FUNCTIONAL_WEBHOOK, page);
            await page.close();
        })

        test('when the response comes back successfully', async ({ page }) => {
            // There are actually multiple responses when sending a message: one for the message itself and one for its options; we are
            // only concerned with the former.
            const responseCode = 204;

            await logOnAsUser(PLAYER_INDEX.GAMEMASTER, page);
            // Send a message, expecting Discord to respond.
            await Promise.all([
                page.waitForResponse((response: PwResponse) => {
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
                page.waitForResponse((response: PwResponse) => {
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
            await page.close();
        })

        // TODO discord-integration#33: Figure out how to test for the following cases:
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
            // TODO discord-integration#37: Find a way to make eslint happy about this type
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
            page.waitForFunction(() => (window as any).game?.ready as boolean)
        ]);
        // Get the current webhook setting's value.
        webhook = await page.evaluate(() => { return game.settings.get('discord-integration', 'discordWebhook') }) as string;
    }

    /**
     * Opens the module settings view
     * 
     * @param page The test's page fixture.
     */
    async function openModuleSettings(page: Page) {
        await Promise.all([
            // Click the settings icon in the sidemenu
            page.locator(SETTINGS_TAB).click(),

            // Go to the "Configure settings" menu
            page.locator(CONFIGURE_SETTINGS_BUTTON).click()
        ]);
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
            page.waitForSelector(`#UserConfigPF2e-User-${uid}`)
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
        await page.waitForSelector(CLIENT_SETTINGS, { state: 'detached' })
    }

    /**
     * Toggles all the module settings then closes the module settings view. Assumes that as this function is called, you are in the
     * module settings view.
     * 
     * @param newWebhook The new webhook value.
     * @param pingByUserName True to check the ping by user name checkbox, false otherwise.
     * @param pingByCharacterName True to check the ping by character name checkbox, false otherwise.
     * @param forwardAllMessages True to forward all messages to discord, false to only forward messages with pings.
     * @param prependUserName True to add the username to the front of messages that are sent, false otherwise.
     * @param page The test's page fixture.
     */
    async function fillModuleSettingsThenClose(
        newWebhook: string,
        pingByUserName: boolean,
        pingByCharacterName: boolean,
        forwardAllMessages: boolean,
        prependUserName: boolean,
        showToggleButton: boolean,
        page: Page) {
        const userNameCheckbox = page.locator(PING_BY_USER_NAME_INPUT);
        pingByUserName ? await userNameCheckbox.check() : await userNameCheckbox.uncheck();
        const characterNameCheckbox = page.locator(PING_BY_CHARACTER_NAME_INPUT);
        pingByCharacterName ? await characterNameCheckbox.check() : await characterNameCheckbox.uncheck();
        const forwardAllMessagesCheckbox = page.locator(FORWARD_ALL_MESSAGES_INPUT);
        forwardAllMessages ? await forwardAllMessagesCheckbox.check() : await forwardAllMessagesCheckbox.uncheck();
        const prependUserNameCheckbox = page.locator(PREPEND_USER_NAME_INPUT);
        prependUserName ? await prependUserNameCheckbox.check() : await prependUserNameCheckbox.uncheck();
        const showToggleButtonCheckbox = page.locator(SHOW_TOGGLE_BUTTON_INPUT);
        showToggleButton ? await showToggleButtonCheckbox.check() : await showToggleButtonCheckbox.uncheck();
        await Promise.all([
            fillInput(DISCORD_WEBHOOK_INPUT, newWebhook, page),
            page.waitForSelector(CLIENT_SETTINGS, { state: 'detached' })
        ]);

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
        await page.locator(inputElement).press('Enter')
    }

    /**
     * Fills a checkbox with a specific value.
     * 
     * @param inputElement Selector for the checkbox element to toggle
     * @param checkOrUncheck true if checking the box, false if unchecking it.
     * @param page The test's page fixture.
     */
    async function fillCheckboxThenClose(inputElement: string, checkOrUncheck: boolean, page: Page) {
        const checkbox = page.locator(inputElement);
        await (checkOrUncheck ? checkbox.check() : checkbox.uncheck());
        await Promise.all([
            checkbox.press('Enter'),
            page.locator(inputElement).waitFor({ state: "detached" })
        ])
        

    }


    /**
     * Indicates what index each user will be in at the login screen's user selection field.
     */
    enum PLAYER_INDEX {
        GAMEMASTER = 1,
        NO_ID = 2,
        PLAYER = 3,
    }
});



