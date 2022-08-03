// TODO: Need to figure out a way to faciliate linking to discord server for this test.
import { test, expect, Page, Response, BrowserContext, ConsoleMessage, Route } from '@playwright/test';
import { TestEnvironment } from "./TestEnvironment"
// TODO: Localization tests?
import en from "../lang/en.json";
let gm_uid: string;
let player_uid: string;
let webhook: string;

const SEND_DISCORD_MESSAGE_HOOK_SUCCESS = "Send Discord Message Hook successfully caught."
const EXPECTED_WEBHOOK = TestEnvironment.DISCORD_WEBHOOK;
const EXPECTED_GM_DISCORD_ID = TestEnvironment.GM_DISCORD_ID;
const EXPECTED_PLAYER_DISCORD_ID = TestEnvironment.PLAYER_DISCORD_ID;

const CONFIGURE_SETTINGS_BUTTON = '#settings-game > button[data-action="configure"]';
const MODULE_SETTINGS_TAB = '#client-settings > section > form.flexcol > nav > a[data-tab="modules"]';
const DISCORD_WEBHOOK_INPUT = 'input[name="discord-integration\\.discordWebhook"]';

const DISCORD_ID_INPUT = '#discord-id-setting > input[name="discord-id-config"]';
const INVALID_DISCORD_ID_NOTIFICATION_EN = `#notifications > li.notification.error:has-text("${en['DISCORDINTEGRATION.InvalidIdError']}")`;
const USER_CONFIGURATION = '#context-menu > ol > li:has-text("User Configuration")';

const CHAT_TEXT_AREA = '#chat-message';

test.describe('discord-integration', () => {

    test.beforeAll(async ({ browser }) => {
        const page = await browser.newPage();
        await logOnAsUser(1, page);

        // Change the webhook
        await openModuleSettings(page);
        await fillDiscordWebhookThenClose(EXPECTED_WEBHOOK, page);
    })
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
            await openFirstUserConfiguration(uid, page)
            expect(await page.locator(DISCORD_ID_INPUT).getAttribute('value')).toMatch(expectedDiscordId);
        }
    });

    test.describe('should update user flags when closing user config', () => {
        test('when player is GM', async ({ page }) => {
            await testUpdateUserFlags(1, gm_uid, EXPECTED_GM_DISCORD_ID, page);
        });
        test('when player is NOT GM', async ({ page }) => {
            await testUpdateUserFlags(2, player_uid, EXPECTED_PLAYER_DISCORD_ID, page);
        });

        async function testUpdateUserFlags(userIndex: number, uid: string, expectedDiscordId: string, page: Page) {
            const newDiscordId = '123456789123456789';

            await logOnAsUser(userIndex, page);

            await openFirstUserConfiguration(uid, page)

            await fillDiscordIdThenClose(newDiscordId, page);
            await openFirstUserConfiguration(uid, page);

            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(newDiscordId);
            await fillDiscordIdThenClose(expectedDiscordId, page);

            await openFirstUserConfiguration(uid, page)
            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(expectedDiscordId);

        }

        // TODO: unit testing
        // case where the user was not found
        // case where the discord-id-config element was not found
    });

    test.describe('should NOT update user flags when closing user config', () => {
        test('when discord-id-config input has no value', async ({ page }) => {
            await testInvalidInput('', page);

        });
        test('when discord-id-config input is not an 18-digit number', async ({ page }) => {
            await testInvalidInput('not an 18-digit nu', page);
            await testInvalidInput('12345678912345678', page);
            await testInvalidInput('1234567891234567891', page);
        });

        async function testInvalidInput(invalidInput: string, page: Page) {
            await logOnAsUser(1, page);

            await openFirstUserConfiguration(gm_uid, page)

            await fillDiscordIdThenClose(invalidInput, page);
            await page.waitForSelector(INVALID_DISCORD_ID_NOTIFICATION_EN);

            await openFirstUserConfiguration(gm_uid, page)
            await expect(page.locator(DISCORD_ID_INPUT)).toHaveValue(EXPECTED_GM_DISCORD_ID);
        }
    });

    test.describe('should handle new chat messages', () => {

        test.beforeEach(async ({ page }) => {
            await logOnAsUser(1, page);
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

        async function enterChatMessageAndAwaitSend(message: string, page: Page) {
            await page.locator(CHAT_TEXT_AREA).focus();
            await page.locator(CHAT_TEXT_AREA).fill(message);

            await Promise.all([
                page.locator(CHAT_TEXT_AREA).press('Enter'),
                page.waitForEvent('console', (consoleMessage: ConsoleMessage) => {
                    return new Promise<boolean>((resolve) => {
                        resolve(consoleMessage.text() === SEND_DISCORD_MESSAGE_HOOK_SUCCESS)
                    });
                })
            ]);
        }
        // unit testing
        // case where there are no users
    });

    test.describe('should NOT handle new chat message', () => {
        test('when there are no tags in the message', async ({ page }) => {
            await logOnAsUser(1, page);
            await enterChatMessageAndAwaitLog('test', page);          
        });

        test('when there is a tag in the message but not for a user', async ({ page }) => {
            await logOnAsUser(1, page);
            await enterChatMessageAndAwaitLog('@NotAUser test', page);   
        });

        async function enterChatMessageAndAwaitLog(message: string, page: Page) {
            await page.locator(CHAT_TEXT_AREA).focus();
            await page.locator(CHAT_TEXT_AREA).fill(message);
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

        async function sendMessageCatchRequest(expectedMessage : string, chatMessage : string, page : Page) {
            const success = 'Message sending test passed!'
            const responseCode = 200;
            const message = {"content": expectedMessage};
            await logOnAsUser(1, page);
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
            await page.unroute(webhook);
        }
    });

    test.describe('should NOT send message to Discord', async () => {
        test.skip('when the user posting the message does not have a discordId set', async ({ page }) => {
            
        });

        test.skip('when there is no discord webhook set', async ({ page }) => {

        });

        test.skip('when the message does not stringify into JSON', async ({ page }) => {

        });

        // TODO Figure out how to test later:
        
    });
    // TODO: How will we handle using a discord server for this test? Just have one up all the time?
    test.describe('should handle discord response', async () => {
        test.skip('when the response comes back successfully', async ({ page }) => {

        });
        test.skip('when the response returns an error', async ({ page }) => {
        // when the user posting the message has a discordId that is valid but does not link to an actual discord user?
        // when the user posting the message has a discordId that is valid but does not link to an actual discord user in the server the webhook belongs to?

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
        webhook = await page.evaluate(() => { return game.settings.get('discord-integration', 'discordWebhook' ) }) as string;
    }

    async function openModuleSettings(page: Page) {

        // Click the settings icon in the sidemenu
        await page.locator('#sidebar-tabs > a[data-tab="settings"] > .fas.fa-cogs').click();

        // Go to the "Configure settings" menu
        await page.locator(CONFIGURE_SETTINGS_BUTTON).click();

        // Go to the "Module Settings" menu
        await page.locator(MODULE_SETTINGS_TAB).click();
    }

    async function openFirstUserConfiguration(uid: string, page: Page) {
        await page.locator(`#player-list > li[data-user-id="${uid}"]`).focus();
        await Promise.all([
            page.locator(`#player-list > li[data-user-id="${uid}"]`).click({
                button: 'right',
                force: true
            }),
            page.waitForSelector(USER_CONFIGURATION)
        ]);
        await Promise.all([
            page.locator(USER_CONFIGURATION).click(),
            page.waitForSelector(`#user-sheet-${uid}`)
        ]);
    }
    async function fillDiscordWebhookThenClose(newWebhook: string, page: Page) {
        await fillInput(DISCORD_WEBHOOK_INPUT, newWebhook, page);
        await page.waitForSelector(MODULE_SETTINGS_TAB, { state: 'detached' })
    }

    async function fillDiscordIdThenClose(newId: string, page: Page) {
        await fillInput(DISCORD_ID_INPUT, newId, page);
        await page.waitForSelector(DISCORD_ID_INPUT, { state: 'detached' })
    }

    async function fillInput(inputElement: string, newValue: string, page: Page) {
        await page.locator(inputElement).focus();
        await page.locator(inputElement).fill(newValue);
        await page.locator(inputElement).press('Enter');
    }

});






