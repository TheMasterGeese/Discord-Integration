const fGame : Game = game as Game;

Hooks.once("init", function(){
    fGame.settings.register("discord-integration", "discordServerURL", {
      name: fGame.i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrl"),
      hint: fGame.i18n.localize("DISCORDINTEGRATION.SettingsDiscordServerUrlHint"),
      scope: "world",
      config: true,
      type: String,
      default: "",
    });
});