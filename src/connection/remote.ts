import { createClient } from "redis";
import { TypedEmitter } from "tiny-typed-emitter";
import { ByteArray, EventWaiter, logger } from "../app.js";

interface InfraConnectionEvents {
    /**
     * Message sent to this process.
     */
    messageReceived: (message: InfraConnectionMessage) => void;
    /**
     * Broadcast message received by this process.
     */
    broadcastReceived: (message: InfraConnectionBroadcast) => void;
    /**
     * Redis client error occurred.
     */
    clientError: (error: Error, desc: "sub" | "pub") => void;
}

export interface InfraConnectionMessage {
    /**
     * The process name of the sender.
     */
    sender: string;
    event: string;
    content: Buffer;
}

export interface InfraConnectionBroadcast {
    /**
     * The process name of the sender.
     */
    sender: string;
    channel: string;
    content: Buffer;
}

interface InfraConnectionSubscriptionEvents {
    /**
     * Message received from the subscription channel.
     */
    message: (content: Buffer, message: InfraConnectionBroadcast) => void;
    /**
     * Subscriber has stopped listening.
     */
    closed: () => void;
}

type InfraConnectionSubscription = TypedEmitter<InfraConnectionSubscriptionEvents>;

/**
 * Interface for inter-process communication.
 */
class InfraConnection extends TypedEmitter<InfraConnectionEvents> {
    /**
     * The main Redis SUB client.
     */
    private client!: ReturnType<typeof createClient>;
    /**
     * The Redis PUB client.
     */
    private pubClient!: ReturnType<typeof createClient>;
    /**
     * The process' cached Redis channel name.
     */
    private redisChannel: string;
    private connected: boolean;
    private subscribedBroadcasts: { [channel: string]: InfraConnectionSubscription };

    static processToRedisChannel(processName: string) {
        return ":receiver/" + processName;
    }

    static broadcastToRedisChannel(broadcastName: string) {
        return `:broadcast/${broadcastName}`;
    }

    /**
     * @param processName - The unique name of this process.
     */
    constructor(public processName: string) {
        super();
        this.redisChannel = InfraConnection.processToRedisChannel(processName);
        this.connected = false;
        this.subscribedBroadcasts = {};
    }

    private async onMessagePacketReceived(packetBuf: Buffer) {
        const packet = new ByteArray(packetBuf);
        const sender = packet.readUTF();
        const event = packet.readUTF();

        const buflen = packet.readUnsignedShort();
        const content = buflen > 0 ? packet.readBufBytes(buflen) : Buffer.from("");

        this.emit("messageReceived", { sender, event, content });
    }

    private async onBroadcastPacketReceived(channel: string, packetBuf: Buffer) {
        const packet = new ByteArray(packetBuf);
        const sender = packet.readUTF();

        const buflen = packet.readUnsignedShort();
        const content = buflen > 0 ? packet.readBufBytes(buflen) : Buffer.from("");

        return { sender, channel, content } as InfraConnectionBroadcast;
    }

    async connect(url: string) {
        this.client = createClient({
            url,
            socket: {
                // Reconnect with a fixed delay (ms)
                reconnectStrategy: () => 1400
            }
        });
        this.pubClient = this.client.duplicate() as ReturnType<typeof createClient>;

        // don't throw on error; just reconnect.
        this.client.on("error", (err) => this.emit("clientError", err, "sub"));
        this.pubClient.on("error", (err) => this.emit("clientError", err, "pub"));
        await Promise.all([this.client.connect(), this.pubClient.connect()]);

        // ensure no other clients are listening
        var numsubs = (await this.client.pubSubNumSub(this.redisChannel))[this.redisChannel];
        if (numsubs !== 0)
            throw `Attempt to listen on channel ${this.redisChannel} which already had ${numsubs} subscribers. Duplicated process... or hacked?`;

        // subscribe to the receiver channel
        this.client.subscribe(this.redisChannel,
            (message, _channel) => this.onMessagePacketReceived(Buffer.from(message, "binary")));

        this.connected = true;
    }

    /**
     * @param target - The target name of the process to send to.
     * @param event - The intent of the message.
     * @param message - The message content.
     */
    async sendMessage(target: string, event: string, message?: Buffer) {
        if (!this.connected) {
            throw `Attempt to send ${event} to ${target} without a connection`;
        }

        var packet = new ByteArray();

        packet.writeUTF(this.processName);
        packet.writeUTF(event);
        if (message) {
            packet.writeUnsignedShort(message.length);
            packet.writeBufBytes(message);
        } else {
            packet.writeUnsignedShort(0);
        }

        await this.pubClient.publish(
            InfraConnection.processToRedisChannel(target),
            packet.buffer as unknown as string
        );
    }

    /**
     * Broadcasts a message to all subscribers of a channel.
     * @param channel - The channel of the message to broadcast to.
     * @param message - The message content.
     */
    async broadcastMessage(channel: string, message?: Buffer) {
        if (!this.connected) {
            throw `Attempt to broadcast ${channel} without a connection`;
        }

        var packet = new ByteArray();

        packet.writeUTF(this.processName);
        if (message) {
            packet.writeUnsignedShort(message.length);
            packet.writeBufBytes(message);
        } else {
            packet.writeUnsignedShort(0);
        }

        await this.pubClient.publish(
            InfraConnection.broadcastToRedisChannel(channel),
            packet.buffer as unknown as string
        );
    }

    /**
     * Retrieves an emitter that subscribes to a broadcast channel.
     * @param channel - The broadcast channel to subscribe to.
     */
    async subscribeBroadcast(channel: string) {
        if (!this.connected) {
            throw `Attempt to subscribe broadcast to ${channel} without a connection`;
        }

        var subscriber = this.subscribedBroadcasts[channel];
        if (subscriber) {
            // already subscribed
            return subscriber;
        }
        subscriber = new TypedEmitter() as InfraConnectionSubscription;
        this.subscribedBroadcasts[channel] = subscriber;

        await this.client.subscribe(
            InfraConnection.broadcastToRedisChannel(channel),
            async (message, _channel) => {
                const bcst = await this.onBroadcastPacketReceived(channel, Buffer.from(message, "binary"));
                subscriber.emit("message", bcst.content, bcst);
                this.emit("broadcastReceived", bcst);
            }
        );

        return subscriber;
    }

    /**
     * Unsubscribes a channel subscribed by `subscribeBroadcast`.
     * @param channel - The broadcast channel to unsubscribe from.
     */
    async unsubscribeBroadcast(channel: string) {
        if (!this.connected) {
            throw `Attempt to unsubscribe broadcast from ${channel} without a connection`;
        }

        if (!this.subscribedBroadcasts[channel]) {
            // already unsubscribed
            return;
        }

        this.subscribedBroadcasts[channel].emit("closed");
        delete this.subscribedBroadcasts[channel];

        await this.client.unsubscribe(
            InfraConnection.broadcastToRedisChannel(channel)
        );
    }
}

type KeyType = string | number | symbol;
type ReceiverCallbackType = (content: Buffer, message: InfraConnectionMessage) => void

export type InfraConnectionMessageReceiverEvents = { [event: KeyType]: ReceiverCallbackType };
/**
 * An InfraConnection wrapper to neaten `messageReceived` callbacks using EventEmitter.
 */
export class InfraConnectionMessageReceiver extends TypedEmitter<InfraConnectionMessageReceiverEvents> {
    constructor(public conn: InfraConnection) {
        super();
        conn.on("messageReceived", (message) => {
            this.emit(message.event, message.content, message);
        });
    }
}

export const remote = new InfraConnection("discord:ChokeOnWater");
// TODO: move to in-class?
export const messageReceiver = new InfraConnectionMessageReceiver(remote);
export async function waitForMessage(
    ...args: Parameters<EventWaiter<InfraConnectionMessageReceiverEvents>["waitFor"]>
) {
    return await (new EventWaiter<InfraConnectionMessageReceiverEvents>(messageReceiver)).waitFor(...args);
}

// Log client errors
remote.on("clientError", (err, desc) => {
    logger.error(`[${desc.toUpperCase()}] A Redis client error occured: ${err}`, "InfraConn");
});
