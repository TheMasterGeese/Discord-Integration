[version-shield]: https://img.shields.io/github/v/release/TheMasterGeese/Discord-Integration
[version-url]: https://github.com/TheMasterGeese/Discord-Integration/releases/latest
[forks-shield]: https://img.shields.io/github/forks/TheMasterGeese/Discord-Integration
[forks-url]: https://github.com/TheMasterGeese/Discord-Integration/network/members
[stars-shield]: https://img.shields.io/github/stars/TheMasterGeese/Discord-Integration
[stars-url]: https://github.com/TheMasterGeese/Discord-Integration/stargazers
[issues-shield]: https://img.shields.io/github/issues/TheMasterGeese/Discord-Integration
[issues-url]: https://github.com/TheMasterGeese/Discord-Integration/issues
[license-shield]: https://img.shields.io/github/license/TheMasterGeese/Discord-Integration
[license-url]: https://github.com/TheMasterGeese/Discord-Integration/blob/master/LICENSE.md
[last-updated-shield]: https://img.shields.io/github/last-commit/TheMasterGeese/Discord-Integration

# Discord-Integration
Allows messaging from FoundryVTT to Discord through webhooks.

[![Version][version-shield]][version-url]
![Last Updated][last-updated-shield]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

### Table of Contents
- [Getting Started](#Getting-Started)
- [Usage](#Usage)
- [Changelog](#Changelog)
- [Contributing](#Contributing)
- [License](#License)
- [Contact](#Contact)

## Getting Started
First, you'll need to create a webhook for the channel you want to send messages to. <a href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks">This guide</a>  goes over the basics of webhooks and how to set one up. Copy the Webhook URL and add it to the "Discord Webhook" field in the module settings.

Next, for each of your players, add their corresponding Discord ID (Not UserName#1234, Right click them in Discord and select "Copy ID" at the bottom) to their User Configuration view. This will be an 18-digit number.

## Usage
There are two ways to forward messages to discord:

* Include @Discord in a chat message: This will forward the message minus the "@Discord" to the channel specified by the webhook.
* Include @FoundryVTTUserName to ping the user's corresponding discord account in the channel specified by the webhook. Multiple users can be pinged in the same way by tagging both of them in the same message.

## Changelog

See [CHANGELOG](CHANGELOG.md)

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md)

## License

Distributed under the MIT License. See [LICENSE](LICENSE.md) for more information.

## Contact

<b>Discord</b>: Khankar#2236

<b>Email</b>: themastergeese@gmail.com
