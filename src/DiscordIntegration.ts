/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// TODO: Right now it isn't resolving types properly, thinks quite a few things are "any"
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */


let gameUsers: StoredDocument<User>[]

Hooks.once("ready", function () {
    gameUsers = game.users.contents;
});

Hooks.once("init", function () {
    // add settings option for URL of Discord Webhook
    console.log(game);
    game.settings.register("discord-integration", "discordWebhook", {
        name: game.i18n.localize("DISCORDINTEGRATION.SettingsDiscordWebhook"),
        hint: game.i18n.localize("DISCORDINTEGRATION.SettingsDiscordWebhookHint"),
        scope: "world",
        config: true,
        type: String,
        default: "",
    });
});

// add in the extra field for DiscordID
Hooks.on("renderUserConfig", async function (config: UserConfig, element: JQuery) {

    // find the user that you're opening config for
    const foundryUser: StoredDocument<User> = gameUsers.filter((user: User) => { return user.id === config.object.data._id })[0];

    // get their Discord ID if it exists
    let discordUserId: string = await foundryUser.getFlag('discord-integration', 'discordID') as string
    discordUserId = discordUserId ? discordUserId : ""

    // create the input field to configure it.
    const discordIdInput = `<input type="text" name="discord-id-config" value="${discordUserId}" data-dtype="String">`

    const discordIDSetting = `
        <div id="discord-id-setting" class="form-group discord">
            <label>${game.i18n.localize("DISCORDINTEGRATION.UserDiscordIdLabel") as string}</label>
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
        const discordIDSettingElement = element.find('#discord-id-setting');
        //discordIDSettingElement.after([$(gmNotificationSetting)]);
    }

});

// commit any changes to userConfig
Hooks.on("closeUserConfig", async function (config: UserConfig, element: JQuery) {

    // find the user that the config was open for
    const foundryUser: StoredDocument<User> = gameUsers.filter(user => { return user.id === config.object.data._id })[0];

    // get the value of the discord id field.
    // TODO investigating
    // @ts-ignore
    const discordID: string = element.find("input[name = 'discord-id-config']")[0].value;
    // @ts-ignore

    /*
    const gmNotificationElement = element.find("input[name = 'gm-notification-config']");
    let gmNotifications: boolean
    if (gmNotificationElement && gmNotificationElement[0]) {
        gmNotifications = (element.find("input[name = 'gm-notification-config']")[0] as HTMLInputElement).checked;
    }
    */
    // update the flag
    await foundryUser.update({ 'flags.discord-integration.discordID': discordID });
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
 * 
 */

// whenever someone sends a chat message, if it is marked up properly forward it to Discord.
Hooks.on("chatMessage", function (chatLog: ChatLog, message: string) {
    const discordTags: string[] = [];
    discordTags.push("@Discord");
    game.users.forEach(user => {
        discordTags.push(`@${user.name}`)
    })

    let shouldSendMessage = false;
    discordTags.forEach(tag => {
        if (message.includes(tag)) {
            shouldSendMessage = true;
        }
    })

    if (shouldSendMessage) {
        sendDiscordMessage(message).catch((reason) => {
            console.error(reason);
        });
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
export async function sendDiscordMessage(message: string) {

    // search for any @<username> strings in the message
    const userNames: string[] = gameUsers.map((user: User) => { return user.name }); // get a list of usernames
    const usersToPing: string[] = [];
    userNames.forEach((userName: string) => {
        if (message.indexOf(`@${userName}`) !== -1) {
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
                message = message.replace(`@${userName}`, `<@${currentUserDiscordID}>`)
            }
        })
        // else if Discord as a whole is being pinged, remove the "@Discord" part and then send the message.
    } else if (shouldPingDiscord) {
        message = message.split("@Discord").pop() || "";
    }

    const messageJSON = {
        "content": message
    }

    await $.ajax({
        method: 'POST',
        url: game.settings.get('discord-integration', 'discordWebhook') as string,
        contentType: "application/json",
        data: JSON.stringify(messageJSON)
    });
}