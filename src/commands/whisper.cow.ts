import * as app from "../app.js"
import { ByteArray } from "../app.js";
import { remote } from "../connection/remote.js"

export default new app.Command({
  name: "whisper",
  description: "Sends a whisper",
  botOwnerOnly: true,
  positional: [
    {
      name: "recipient",
      description: "The user to whisper to.",
      required: true,
    },
  ],
  rest: {
    name: "message",
    description: "The message to send.",
    required: true,
  },
  async run(message) {
    const packet = new app.ByteArray();
    packet.writeUTF(message.args.recipient);
    packet.writeUTF(message.args.message);

    await remote.sendMessage("tfm:BT800", "request/whisper", packet.buffer);
    try {
      var [buf] = await app.waitForMessage("reply/whisper", {
        condition: (_, message) => message.sender == "tfm:BT800",
        timeout: 5000,
      });
      var whisper = new ByteArray(buf);
      await message.channel.send(`< [${whisper.readUTF()}] ${whisper.readUTF()}`);
    } catch (e) {
      await message.channel.send("Failed to send message");
    }
  },
})
