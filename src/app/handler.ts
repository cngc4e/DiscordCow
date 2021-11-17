import path from "path"
import fs from "fs/promises"

import * as core from "./core.js"

export interface HandlerEvents {
  load: [path: string, client: core.FullClient]
  finish: [items: string[], client: core.FullClient]
}

export class Handler {
  private listeners: { [k: string]: Set<any> } = {}

  constructor(private paths: string[]) {}

  async load(client: core.FullClient) {
    const filepathList: string[] = []
    for (const fpath of this.paths) {
      const filenames = await fs.readdir(fpath)
      for (const filename of filenames) {
        const filepath = path.join(fpath, filename)
        filepathList.push(filepath)
        await this.emit("load", filepath, client)
      }
    }
    await this.emit("finish", filepathList, client)
  }

  on<EventName extends keyof HandlerEvents>(
    event: EventName,
    listener: (...args: HandlerEvents[EventName]) => unknown
  ): this {
    if (!this.listeners[event]) this.listeners[event] = new Set()
    this.listeners[event].add(listener)
    return this
  }

  once<EventName extends keyof HandlerEvents>(
    event: EventName,
    listener: (...args: HandlerEvents[EventName]) => unknown
  ): this {
    Object.defineProperty(listener, "once", {
      value: true,
    })
    this.on(event, listener)
    return this
  }

  async emit<EventName extends keyof HandlerEvents>(
    event: EventName,
    ...args: HandlerEvents[EventName]
  ): Promise<this> {
    const listeners = this.listeners[event] ?? new Set()
    for (const listener of [...listeners]) {
      await listener(...args)
      if (listener.once) listeners.delete(listener)
    }
    return this
  }
}
