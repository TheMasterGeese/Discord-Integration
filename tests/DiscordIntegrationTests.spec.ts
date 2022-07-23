import { test, expect, type Page } from '@playwright/test';

// TODO: The suite needs to assume a fresh install of FoundryVTT.
// This means a new world needs to be created, with a specific user for testing.
// And the corresponding mod needs to be installed.
// Maybe just create a docker container for all this instead and connect to it?
test.beforeEach(async ({ page }) => {
  // log into the game
  //await page.goto('http://localhost:30000/join');
  //await page.locator('#join-game > section > div.left.flexcol > div:nth-child(1) > div:nth-child(2) > select').fill('Fate');
  //await page.locator('#join-game > section > div.left.flexcol > div:nth-child(1) > button').click();
  //console.log()
});

test.describe('discord-integration unit tests', () => {

    test('should register settings on init', async ({ page }) => {
        // case for when the setting registers
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