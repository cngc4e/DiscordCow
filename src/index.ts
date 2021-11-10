import discord from "discord.js"
import type { FullClient } from "./app.js"

import "dotenv/config"

for (const key of ["BOT_TOKEN", "BOT_PREFIX"]) {
  if (!process.env[key] || /^{{.+}}$/.test(process.env[key] as string)) {
    throw new Error(`You need to add "${key}" value in your .env file.`)
  }
}

const FLAGS = discord.Intents.FLAGS;

const client = new discord.Client({
  intents: [
    FLAGS.GUILDS, FLAGS.GUILD_MESSAGES,
		FLAGS.GUILD_MEMBERS, FLAGS.GUILD_WEBHOOKS,
		FLAGS.GUILD_MESSAGE_REACTIONS, FLAGS.GUILD_EMOJIS_AND_STICKERS
  ]
})

;(async () => {
  const app = await import("./app.js")

  if (process.env.REDIS_URL) {
    // Initialise non-blockingly
    // Users are expected to do a sanity check against isReady() before usage
    app.redis.initRedis(process.env.REDIS_URL)
  }

  try {
    await app.tableHandler.load(client as FullClient)
    await app.commandHandler.load(client as FullClient)
    await app.listenerHandler.load(client as FullClient)

    await client.login(process.env.BOT_TOKEN)

    if (!app.isFullClient(client)) {
      app.error("The Discord client is not full.", "index")
      client.destroy()
      process.exit(1)
    }
  } catch (error: any) {
    app.error(error, "index", true)
    process.exit(1)
  }
})()
