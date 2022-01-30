
Hooks.once("init", function () {
    (game as Game).settings.register("discord-integration", "discordServerURL", {
        name: (game as Game).i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrl"),
        hint: (game as Game).i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrlHint"),
        scope: "world",
        config: true,
        type: String,
        default: "",
    });

    /*
    (game as Game).settings.registerMenu("discord-integration", "discordUserIDsDialog", {
        name: (game as Game).i18n.localize(''),
        label: (game as Game).i18n.localize("DISCORDINTEGRATION.SettingsDiscordUserIDsDialogLabel"),
        hint: (game as Game).i18n.localize("DISCORDINTEGRATION.SettingsDiscordUserIDsDialogHint"),
        icon: "fas fa-cog",
        type: DiscordUserIDSettingsDialog,
        restricted: true
    });
    */

});

Hooks.on("renderUserConfig", function () {
    console.log("User Config Hook works.")
});