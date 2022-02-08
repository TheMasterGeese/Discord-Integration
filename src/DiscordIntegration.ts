Hooks.once("init", function () {
    // add settings option for URL of Discord Webhook
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
Hooks.on("renderUserConfig", async function (config: UserConfig, element: any, options: Object) {
    // find the user that you're opening config for
    const foundryUser: StoredDocument<User> = game.users!.contents.filter(user => { if (user.id === config.object.data._id) return user; })[0];

    // get their Discord ID if it exists
    let discordUserId: string = await foundryUser.getFlag('discord-integration', 'discordID') as string 
    discordUserId = discordUserId ? discordUserId : ""

    // create the input field to configure it.
    let input = `<input type="text" name="discord-id-config" value="${discordUserId}" data-dtype="String">`

    // Put the input field below the "Player Color group" field.
    const playerColorGroup = element.find('.form-group').eq(2);
    playerColorGroup.after($(`
                <div class="form-group discord">
                    <label>${game.i18n.localize("DISCORDINTEGRATION.UserDiscordIdLabel")}</label>
                    ${input}
                </div>
            `));
});

// commit any changes to userConfig
Hooks.on("closeUserConfig", async function (config : UserConfig, element : any) {

    // find the user that the config was open for
    const foundryUser: StoredDocument<User> = game.users!.contents.filter(user => { if (user.id === config.object.data._id) return user; })[0];

    // get the value of the discord id field.
    let discordID : string = element.find("input[name = 'discord-id-config']")[0].value;

    // update the flag
    foundryUser.update({'flags.discord-integration.discordID': discordID}); 
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
Hooks.on("chatMessage", async function (chatLog : ChatLog, message : string, options : Object) {

    // search for any @<username> strings in the message
    const userNames : string[]  = game.users!.contents.map( (user) => { return user.name! }); // get a list of usernames
    let usersToPing : string[] = [];
    userNames.forEach((userName : string) => {
        if (message.indexOf(`\@${userName}`) !== -1) {
            usersToPing.push(userName);
        }
    })

    // search for @Discord in the message
    let shouldPingDiscord : boolean = (message.search(`@Discord`) !== -1);

    // if it found any @<username> values, replace the values in the message with appropriate discord pings, then send discord message.
    if (usersToPing.length !== 0) {

        usersToPing.forEach((userName : string) => {
            const currentUser : User | undefined = game.users?.contents.filter((user : User)=> { if (user.data.name === userName) return user; })[0];
            if (currentUser) {
                let currentUserDiscordID : string = currentUser.getFlag('discord-integration', 'discordID') as string;
                message = message.replace(`@${userName}`, `<@${currentUserDiscordID}>`)
            }
        })
        await sendDiscordMessage(message);
    // else if Discord as a whole is being pinged, remove the "@Discord" part and then send the message.
    } else if (shouldPingDiscord) {
        const discordMessage : string | undefined = message.split("@Discord").pop();
        await sendDiscordMessage(discordMessage ? discordMessage : "");
    }

});


/**
 * Sends a message through the discord webhook as configured in settings.
 * 
 * Messages that ping users in Discord need to have "@<gameUserName>" and the users must have their discord IDs configured.
 * 
 * @param message The message to forward to Discord
 */
export async function sendDiscordMessage(message : string) {
    let messageJSON = {
        "content": message
    }
    $.ajax({
        method: 'POST',
        url: game.settings.get('discord-integration', 'discordWebhook') as string,
        contentType: "application/json",
        data: JSON.stringify(messageJSON)
    });
}