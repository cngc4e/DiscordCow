import * as app from "../app.js"
import * as core from "../app/core.js"

const conf = app.fetchPackageJson()

export default new app.Command({
  name: "ping",
  description: "View the latency of the bot and API",
  async run(message) {
    var embed = new core.SafeMessageEmbed()
      .setDescription("Pinge...")
      .addField("Socket Ping", `${message.client.ws.ping}ms`, false)
      .addField("Message Ping", "`Checking...`", false)

    var reply = await message.channel.send({
      embeds: [embed],
    })

    var ping = reply.createdTimestamp - message.createdTimestamp

    embed = new core.SafeMessageEmbed()
      .addField("Socket Ping", `${message.client.ws.ping}ms`, false)
      .addField("Response Ping", `${ping}ms`, false)

    reply.edit({ embeds: [embed] });
  },
})
