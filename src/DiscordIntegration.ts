
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
// hook into when the user config is saved