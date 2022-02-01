
Hooks.once("init", function () {
    // add settings option for URL of discord server
    game.settings.register("discord-integration", "discordServerURL", {
        name: game.i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrl"),
        hint: game.i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrlHint"),
        scope: "world",
        config: true,
        type: String,
        default: "",
    });
});

// add in the extra field for DiscordID
Hooks.on("renderUserConfig", async function (config: UserConfig, element: any, options: Object) {
    const foundryUser: StoredDocument<User> = game.users!.contents.filter(user => { if (user.id === config.object.data._id) return user; })[0];

    let discordUserId: string = await foundryUser.getFlag('discord-integration', 'discordID') as string 
    discordUserId = discordUserId ? discordUserId : ""

    let input = `<input type="text" name="discord-id-config" value="${discordUserId}" data-dtype="String">`


    const playerColourGroup = element.find('.form-group').eq(2);
    playerColourGroup.after($(`
                <div class="form-group discord">
                    <label>${game.i18n.localize("DISCORDINTEGRATION.UserDiscordIdLabel")}</label>
                    ${input}
                </div>
            `));
});

// commit any changes to userConfig
Hooks.on("closeUserConfig", async function (config : UserConfig, element : any) {

    const foundryUser: StoredDocument<User> = game.users!.contents.filter(user => { if (user.id === config.object.data._id) return user; })[0];

    let discordID : string = element.find("input[name = 'discord-id-config']")[0].value;

    foundryUser.update({'flags.discord-integration.discordID': discordID}); 
});

/**
 * To forward a message to discord, do one of two things:
 * 
 * -include "@<username>" for a user in the game, it will then look up the corresponding discordID 
 * and send a message pinging them. If you @ multiple people, it will ping all of them. Will not
 * send a message unless the username matches up with an actual user.
 * 
 * -include "@Discord", which will unconditionally forward the message (minus the @Discord) to the Discord Server.
 * 
 */
// whenever someone sends a chat message, if it is marked up properly forward it to Discord.

Hooks.on("chatMessage", function (chatLog : ChatLog, message : string, options : Object) {

    // search for any @<username> strings in the message
    const userNames : string[]  = game.users!.contents.map( (user) => { return user.name! }); // get a list of usernames
    let usersToPing : string[] = [];
    userNames.forEach((userName : string) => {
        if (message.search(`@${userName}`)) {
            usersToPing.push(userName);
        }
    })

    // search for @Discord in the message
    let shouldPingDiscord : boolean = (message.search(`@Discord`) !== -1);

    if (userNames.length !== 0) {

        userNames.forEach((userName : string) => {
            const currentUser : User | undefined = game.users?.contents.filter((user : User)=> { user.name === userName })[0];
            if (currentUser) {
                let currentUserDiscordID : string = currentUser.getFlag('discord-integration', 'discordID') as string;
                message.replace(`@${userName}`, `@${currentUserDiscordID}`)
            }
        })
        sendDiscordMessage(message);
    } else if (shouldPingDiscord) {
        // Remove @Discord from the message before sending it.
        const discordMessage : string | undefined = message.split("@Discord").pop();
        sendDiscordMessage(discordMessage ? discordMessage : "");
    }

});

// Send a discord message to the configured URL.
async function sendDiscordMessage(message : string) {
    let messageJSON = {
        "content": message
    }
    $.ajax({
        method: 'POST',
        url: game.settings.get('discord-integration', 'discordServerURL') as string,
        contentType: "application/json",
        data: JSON.stringify(messageJSON)
    });
}