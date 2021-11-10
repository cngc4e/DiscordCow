import * as app from "../app.js"
import { version as discordVersion } from "discord.js"

const conf = app.fetchPackageJson()

const listener: app.Listener<"ready"> = {
  event: "ready",
  description: "",
  once: true,
  async run(client) {
    app.log(`Logged in as ${client.user.tag} (${client.user.id}) in ${client.guilds.cache.size} server(s).`);
    app.log(`v${conf.version} of the bot loaded.`);
    app.log(`Node ${process.version} / Discord.js v${discordVersion}.`);

    client.user.setStatus('online');
    client.user.setActivity(`${await app.prefix()}help`, { type: 'PLAYING' });
  }
}

export default listener
