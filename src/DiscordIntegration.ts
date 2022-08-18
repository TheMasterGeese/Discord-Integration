// TODO discord-integration#34: Thrown on Hooks.on(), cause and fix unknown
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";

let gameUsers: StoredDocument<User>[]
let foundryGame: Game;

// Discord user-ids are always exactly 18 digits.
const DISCORD_ID_LENGTH = 18;

function getGame(): Game {
    return game;
}

Hooks.once("ready", function () {
    gameUsers = (game.users).contents;
});

Hooks.once("init", function () {
    foundryGame = getGame();
    // add settings option for URL of Discord Webhook
    foundryGame.settings.register("discord-integration", "discordWebhook", {
        name: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsDiscordWebhook"),
        hint: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsDiscordWebhookHint"),
        scope: "world",
        config: true,
        type: String,
        default: "",
    });
    // add settings option for pinging by on character name
    foundryGame.settings.register("discord-integration", "pingByCharacterName", {
        name: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsPingByCharacterName"),
        hint: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsPingByCharacterNameHint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean
        
    });
    // add settings option for pinging by user name
    foundryGame.settings.register("discord-integration", "pingByUserName", {
        name: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsPingByUserName"),
        hint: foundryGame.i18n.localize("DISCORDINTEGRATION.SettingsPingByUserNameHint"),
        scope: "world",
        config: true,
        default: true,
        type: Boolean
    });
});

// add in the extra field for DiscordID
Hooks.on("renderUserConfig", async function (config: UserConfig, element: JQuery) {

    // find the user that you're opening config for
    const foundryUser: StoredDocument<User> = foundryGame.users.contents.filter((user: User) => { return user.id === (config.object).data._id })[0];

    // get their Discord ID if it exists
    let discordUserId: string = await foundryUser.getFlag('discord-integration', 'discordID') as string
    discordUserId = discordUserId ? discordUserId : ""

    // create the input field to configure it.
    const discordIdInput = `<input type="text" name="discord-id-config" value="${discordUserId}" data-dtype="String">`

    const discordIDSetting = `
        <div id="discord-id-setting" class="form-group discord">
            <label>${foundryGame.i18n.localize("DISCORDINTEGRATION.UserDiscordIdLabel")}</label>
            ${discordIdInput}
        </div>`

    // Put the input fields below the "Player Color group" field.
    const playerColorGroup = element.find('.form-group').eq(2);
    playerColorGroup.after([$(discordIDSetting)]);

    if (foundryUser.isGM) {
        /*
        // get their GM Notification status if it exists, defaulting to true.
        const sendGMNotifications: boolean = await foundryUser.getFlag('discord-integration', 'sendGMNotifications') as boolean;

        
        const isChecked = sendGMNotifications ? "checked" : "";
        const gmNotificationCheckbox = `<input type="checkbox" name="gm-notification-config" ${isChecked}>`

        const gmNotificationSetting = `
            <div>
                <label>${game.i18n.localize("DISCORDINTEGRATION.GMNotificationsLabel") as string}</label>
                ${gmNotificationCheckbox}
            </div>`
        */
    }
});

// commit any changes to userConfig
Hooks.on("closeUserConfig", async function (config: UserConfig, element: JQuery) {
    // find the user that the config was open for
    const foundryUser: StoredDocument<User> = gameUsers.filter(user => { return user.id === (config.object).data._id })[0];
    const discordID: string = (element.find("input[name = 'discord-id-config']")[0] as HTMLInputElement).value;

    if (discordID.length !== DISCORD_ID_LENGTH || isNaN(parseInt(discordID))) {
        ui.notifications.error(foundryGame.i18n.localize("DISCORDINTEGRATION.InvalidIdError"))
    } else {
        await foundryUser.update({ 'flags.discord-integration.discordID': discordID });
    }
    /*
    const gmNotificationElement = element.find("input[name = 'gm-notification-config']");
    let gmNotifications: boolean
    if (gmNotificationElement && gmNotificationElement[0]) {
        gmNotifications = (element.find("input[name = 'gm-notification-config']")[0] as HTMLInputElement).checked;
    }
    */
    // update the flag
    //await foundryUser.update({ 'flags.discord-integration.sendGMNotifications': gmNotifications });
});

/**
 * To forward a message to discord, do one of two things:
 * 
 * -include "@<username>" for a user in the game, it will then look up the corresponding discordID 
 * and send a message pinging them. If you @ multiple people, it will ping all of them. Will not
 * send a message unless the username matches up with an actual user.
 * 
 * -include "@Discord", which will unconditionally forward the message (minus the @Discord) to the Discord Webhook.
 */

// whenever someone sends a chat message, if it is marked up properly forward it to Discord.
Hooks.on("chatMessage", function (_chatLog: ChatLog, message: string) {
    const discordTags: string[] = [];
    discordTags.push("@Discord");

    foundryGame.users.forEach(user => {
        discordTags.push(`@${user.name}`)
        if (user.character) {
            discordTags.push(`@${(user.character as ActorData).name}`)
        }
    })

    let shouldSendMessage = false;
    discordTags.forEach(tag => {
        if (message.includes(tag)) {
            shouldSendMessage = true;
        }
    })

    if (shouldSendMessage) {
        Hooks.callAll("sendDiscordMessage", message);
    } else {
        // TODO discord-integration#35: This exists as a way to test when a message is not sent. Figure out a way to do it without modifying the code later.
        console.log("Message not sent.")
    }
});

Hooks.on("sendDiscordMessage", function (message: string) {
    sendDiscordMessage(message).catch((reason) => {
        console.error(reason);
    });
});

/**
 * Sends a message through the discord webhook as configured in settings.
 * 
 * Messages that ping users in Discord need to have "@<gameUserName>" and the users must have their discord IDs configured.
 * 
 * @param message The message to forward to Discord
 */
async function sendDiscordMessage(message: string) {

    let sendMessage = true;

    const discordWebhook = game.settings.get('discord-integration', 'discordWebhook') as string;
    if (!discordWebhook) {
        ui.notifications.error(
            foundryGame.i18n.localize("DISCORDINTEGRATION.CouldNotSendMessage")
            + foundryGame.i18n.localize("DISCORDINTEGRATION.NoDiscordWebhookError"))
        return;
    }

    const usersToChars: Map<string, string> = new Map<string, string>();

    const usersToPing: string[] = [];

    gameUsers.forEach((user: User) => {
        if (message.indexOf(`@${user.name}`) !== -1) {
            usersToPing.push(user.name);
        }
        if (user.character) {
            usersToChars.set(user.name, ((user.character as ActorData).name));
        }
    })

    usersToChars.forEach((charName : string, userName : string, _map) => {
        // Ping if a user or their character's name is tagged
        if (message.indexOf(`@${charName}`) !== -1) {
            usersToPing.push(userName);
        } 
    })
    
    // search for @Discord in the message
    const shouldPingDiscord: boolean = (message.search(`@Discord`) !== -1);

    // if it found any @<username> values, replace the values in the message with appropriate discord pings, then send discord message.
    if (usersToPing.length !== 0) {
        usersToPing.forEach((userName: string) => {
            const currentUser: User | undefined = gameUsers.filter((user: User) => { return user.data.name === userName })[0];
            if (currentUser) {
                const currentUserDiscordID: string = currentUser.getFlag('discord-integration', 'discordID') as string;
                if (!currentUserDiscordID) {
                    ui.notifications.error(
                        foundryGame.i18n.localize("DISCORDINTEGRATION.CouldNotSendMessage")
                        + currentUser.name
                        + foundryGame.i18n.localize("DISCORDINTEGRATION.UserHasNoIdError"))
                    sendMessage = false;
                    return;
                }
                console.log(message);
                message = message.replace(`@${userName}`, `<@${currentUserDiscordID}>`);
                message = message.replace(`@${usersToChars.get(userName)}`, `<@${currentUserDiscordID}>`);
            }
        })
        // else if Discord as a whole is being pinged, remove the "@Discord" part and then send the message.
    } else if (shouldPingDiscord) {
        message = message.split("@Discord").pop() || "";
    }

    const messageJSON = {
        "content": message
    }

    let jsonMessage: string;
    try {
        jsonMessage = JSON.stringify(messageJSON);
    } catch (e) {
        ui.notifications.error(
            foundryGame.i18n.localize("DISCORDINTEGRATION.CouldNotSendMessage")
            + foundryGame.i18n.localize("DISCORDINTEGRATION.CouldNotStringifyJsonError"))
        sendMessage = false;
    }

    if (sendMessage) {
        await $.ajax({
            method: 'POST',
            url: discordWebhook,
            contentType: "application/json",
            data: jsonMessage
        });
    }
}