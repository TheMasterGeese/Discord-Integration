# Discord-Integration
Allows messaging from FoundryVTT to Discord through webhooks.

## Getting Started
First, you'll need to create a webhook for the channel you want to send messages to. <a href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks">This guide</a>  goes over the basics of webhooks and how to set one up. Copy the Webhook URL and add it to the "Discord Webhook" field in the module settings.

Next, for each of your players, add their corresponding Discord ID (Not UserName#1234, Right click them in Discord and select "Copy ID" at the bottom) to their User Configuration view. This will be an 18-digit number.

## Usage
There are two ways to forward messages to discord:

* Include @Discord in a chat message: This will forward the message minus the "@Discord" to the channel specified by the webhook.
* Include @FoundryVTTUserName to ping the user's corresponding discord account in the channel specified by the webhook. Multiple users can be pinged in the same way by tagging both of them in the same message.

## License

Distributed under the MIT License. See [LICENSE](LICENSE.md) for more information.

## Patch Notes

See [CHANGELOG](CHANGELOG.md)
## Contributing

See [CONTRIBUTING](CONTRIBUTING.md)
## Contact

<b>Discord</b>: Khankar#2236

<b>Email</b>: themastergeese@gmail.com
