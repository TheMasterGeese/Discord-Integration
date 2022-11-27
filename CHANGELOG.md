# Discord Integration
##  3.0.0
- Implemented support for FoundryVTT Version 10, through build 290.
- Added setting to allow players to be pinged based on their character name and/or their username.
- Added setting to allow a user's player name to be prepended to their messages that are forwarded to Discord.
- Added button in scene controls to toggle the mod on/off.
- Added setting to forward ALL messages to Discord, regardless of tags.
##  2.1.6
- Fixed module.json not linking to raw content
##  2.1.5
- Fixed incorrect links in module.json
##  2.1.4
- Can no longer submit Discord IDs that are neither empty nor an 18-digit number.
- Displays an error notification when sending a message while no Discord Webhook is set.
- Displays an error notification when sending a message that pings a user with no Discord ID set.
- Fixed listed compatible and minimum FoundryVTT versions.
##  2.1.3
- Fixed issue where all messages are being forwarded to discord, regardless of who was tagged in the message.
##  2.1.2
- Fixed issue where module wasn't fully loading - paths to js and css files were improperly generated
- Fixed incorrect download link in module.json
##  2.1.1
- Version number wasn't incremented properly
##  2.1.0
- Fixed issue with generating manifest/download urls
##  2.0.0
- Added sendDiscordMessage hook
##  1.0.0
- Discord Integration

