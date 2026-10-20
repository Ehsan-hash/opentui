import type { KeyEvent, Renderable } from "@opentui/core"
import type { Keymap } from "../../index.js"

const BASE_LAYOUT_FALLBACK_RESOURCE = Symbol("keymap:base-layout-fallback")

function getBaseLayoutKeyName(typedName: string, baseCode: number | undefined): string | undefined {
  if (!/^[^\x00-\x7f]$/u.test(typedName) || baseCode === undefined || baseCode < 32 || baseCode === 127) {
    return undefined
  }

  try {
    const name = String.fromCodePoint(baseCode)

    if (name.length === 1 && name >= "A" && name <= "Z") {
      return name.toLowerCase()
    }

    return name
  } catch {
    return undefined
  }
}

/**
 * Falls back to the event's base layout code for non-Latin key events so
 * bindings can keep matching shortcuts across keyboard layouts.
 */
export function registerBaseLayoutFallback(keymap: Keymap<Renderable, KeyEvent>): () => void {
  return keymap.acquireResource(BASE_LAYOUT_FALLBACK_RESOURCE, () => {
    return keymap.appendEventMatchResolver((event, ctx) => {
      const name = getBaseLayoutKeyName(event.name, event.baseCode)
      if (!name) {
        return undefined
      }

      return [
        ctx.resolveKey({
          name,
          ctrl: event.ctrl,
          shift: event.shift,
          meta: event.meta,
          super: event.super ?? false,
          hyper: event.hyper || undefined,
        }),
      ]
    })
  })
}
