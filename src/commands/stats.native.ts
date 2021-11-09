import { version as discordVersion } from "discord.js"
import tims from "tims"
import * as app from "../app.js"
import * as core from "../app/core.js"

const conf = app.fetchPackageJson()

export default new app.Command({
  name: "stats",
  description: "Get information about bot",
  aliases: ["info"],
  async run(message) {
    const embed = new core.SafeMessageEmbed()
      .setColor()
      .setAuthor(
        `${message.client.user.tag}`,
        message.client.user?.displayAvatarURL({ dynamic: true })
      )
      .setTimestamp()
      .addField(
        conf.appName,
        app.code.stringify({
          lang: "yml",
          content: [
            `Uptime: ${tims.duration(app.uptime(), {
              format: "second",
              maxPartCount: 2,
            })}`,
            `Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
              2
            )}MB`,
            `Ping: ${message.client.ws.ping}ms`,
            `Node/Discord: ${process.version} / v${discordVersion}`,
            `Version: v${conf.version}`,
          ].join("\n"),
        }),
        true
      )
      .addField(
        "Cache",
        app.code.stringify({
          lang: "yml",
          content: [
            `Guilds: ${message.client.guilds.cache.size}`,
            `Users: ${message.client.users.cache.size}`,
            `Channels: ${message.client.channels.cache.size}`,
            `Roles: ${message.client.guilds.cache.reduce((acc, guild) => {
              return acc + guild.roles.cache.size
            }, 0)}`,
            `Messages: ${message.client.channels.cache.reduce(
              (acc, channel) => {
                return (
                  acc + (channel.isText() ? channel.messages.cache.size : 0)
                )
              },
              0
            )}`,
          ].join("\n"),
        }),
        true
      )
    return message.channel.send({
      embeds: [embed],
    })
  },
})
