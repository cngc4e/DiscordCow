import { createClient } from 'redis';
import * as app from "../app.js";

const MODULE_NAME = "[RedisBroker]";

var pendingInit: true | null = true;
var subClient: ReturnType<typeof createClient>;
var pubClient: ReturnType<typeof createClient>;

export async function subscribeChannel(...args: Parameters<typeof subClient.subscribe>) {
  if (pendingInit) {
    app.error("Cannot subscribe before init!", MODULE_NAME);
    return;
  }
  return await subClient.subscribe(...args);
}

export async function unsubscribeChannel(...args: Parameters<typeof subClient.unsubscribe>) {
  if (pendingInit) {
    app.error("Cannot unsubscribe before init!", MODULE_NAME);
    return;
  }
  return await subClient.unsubscribe(...args);
}

export async function publishChannel(...args: Parameters<typeof pubClient.publish>) {
  if (pendingInit) {
    app.error("Cannot publish before init!", MODULE_NAME);
    return -1;
  }
  return await pubClient.publish(...args);
}

export function isReady() {
  return !pendingInit;
}

/**
* Creates the Redis sub/pub. Throws an error if failed.
*/
export async function initRedis(url: string) {
  var client = createClient({
    url,
    socket: {
      // Reconnect with a fixed delay (ms)
      reconnectStrategy: () => 1400
    }
  });

  subClient = client as typeof subClient;
  pubClient = subClient.duplicate();

  // Attempt to reconnect on error
  subClient.on("error", (err) => app.error("SUB client : " + err.toString(), MODULE_NAME));
  subClient.on("reconnecting", () => app.log("SUB client: reconnecting...", MODULE_NAME))
  pubClient.on("error", (err) => app.error("PUB client : " + err.toString(), MODULE_NAME));
  pubClient.on("reconnecting", () => app.log("PUB client: reconnecting...", MODULE_NAME))

  subClient.on("connect", () => app.log("SUB client : Connected successfully!", MODULE_NAME))
  pubClient.on("connect", () => app.log("PUB client : Connected successfully!", MODULE_NAME));
  app.log("Connecting to Redis server...", MODULE_NAME)

  await Promise.all([subClient.connect(), pubClient.connect()]);

  pendingInit = null;
}
