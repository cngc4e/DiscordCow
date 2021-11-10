import Discord from "discord.js"
import * as app from "../app.js"

import guilds from "../tables/guilds.native.js"

export async function prefix(guild?: Discord.Guild): Promise<string> {
  const prefix = process.env.BOT_PREFIX as string
  if (guild) {
    // Check the cache in memory first
    const slug = app.slug("cachedPrefix", guild.id)
    const cachedPrefix = app.cache.get<string>(slug)
    if (cachedPrefix) {
      return cachedPrefix
    }

    // Query in persistent storage
    const guildData = await guilds.query
      .where("id", guild.id)
      .select("prefix")
      .first()

    // Save the cache
    if (guildData?.prefix) {
      app.cache.activeSet(slug, guildData.prefix)
      return guildData.prefix
    }
  }
  return prefix
}
