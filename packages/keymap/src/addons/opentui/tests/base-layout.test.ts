import { Buffer } from "node:buffer"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createTestRenderer, type TestRenderer } from "@opentui/core/testing"
import { registerBaseLayoutFallback } from "@opentui/keymap/addons/opentui"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { createDiagnosticHarness } from "../../../tests/diagnostic-harness.js"

let renderer: TestRenderer
const diagnostics = createDiagnosticHarness()

function getKeymap(renderer: TestRenderer) {
  return diagnostics.trackKeymap(createDefaultOpenTuiKeymap(renderer))
}

describe("base layout fallback addon", () => {
  beforeEach(async () => {
    const testSetup = await createTestRenderer({ width: 40, height: 10, kittyKeyboard: true })
    renderer = testSetup.renderer
  })

  afterEach(() => {
    renderer?.destroy()
    diagnostics.assertNoUnhandledDiagnostics()
  })

  test("matches bindings through Kitty base-layout codepoints", () => {
    const keymap = getKeymap(renderer)
    const calls: string[] = []

    registerBaseLayoutFallback(keymap)
    keymap.registerLayer({
      commands: [
        {
          name: "copy",
          run() {
            calls.push("copy")
          },
        },
      ],
    })
    keymap.registerLayer({ bindings: [{ key: "ctrl+c", cmd: "copy" }] })

    renderer.stdin.emit("data", Buffer.from("\x1b[12618::99;5u"))
    renderer.stdin.emit("data", Buffer.from("\x1b[1089::99;5u"))

    expect(calls).toEqual(["copy", "copy"])
  })

  test("does not match Latin-layout base codes when the event name is Latin", () => {
    const keymap = getKeymap(renderer)
    const calls: string[] = []

    registerBaseLayoutFallback(keymap)
    keymap.registerLayer({
      commands: [
        {
          name: "copy",
          run() {
            calls.push("copy")
          },
        },
        {
          name: "delete",
          run() {
            calls.push("delete")
          },
        },
        {
          name: "undo",
          run() {
            calls.push("undo")
          },
        },
      ],
    })
    keymap.registerLayer({
      bindings: [
        { key: "ctrl+c", cmd: "copy" },
        { key: "ctrl+d", cmd: "delete" },
        { key: "ctrl+z", cmd: "undo" },
      ],
    })

    renderer.stdin.emit("data", Buffer.from("\x1b[106::99;5u"))
    renderer.stdin.emit("data", Buffer.from("\x1b[101::100;5u"))
    renderer.stdin.emit("data", Buffer.from("\x1b[59::122;5u"))

    expect(calls).toEqual([])
  })

  test("keeps direct stroke matches ahead of base-layout fallbacks", () => {
    const keymap = getKeymap(renderer)
    const calls: string[] = []

    registerBaseLayoutFallback(keymap)
    keymap.registerLayer({
      commands: [
        {
          name: "fallback-copy",
          run() {
            calls.push("fallback")
          },
        },
        {
          name: "direct-copy",
          run() {
            calls.push("direct")
          },
        },
      ],
    })
    keymap.registerLayer({
      bindings: [
        { key: "ctrl+c", cmd: "fallback-copy" },
        { key: { name: "\u314a", ctrl: true }, cmd: "direct-copy" },
      ],
    })

    renderer.stdin.emit("data", Buffer.from("\x1b[12618::99;5u"))

    expect(calls).toEqual(["direct"])
  })

  test("keeps lower-layer direct stroke matches ahead of higher-layer base-layout fallbacks", () => {
    const keymap = getKeymap(renderer)
    const calls: string[] = []

    registerBaseLayoutFallback(keymap)
    keymap.registerLayer({
      commands: [
        {
          name: "delete-to-end",
          run() {
            calls.push("delete-to-end")
          },
        },
      ],
      bindings: [{ key: { name: "л", ctrl: true }, cmd: "delete-to-end" }],
    })
    keymap.registerLayer({
      commands: [
        {
          name: "fallback-delete-to-end",
          run() {
            calls.push("fallback-delete-to-end")
          },
        },
      ],
      bindings: [{ key: "ctrl+k", cmd: "fallback-delete-to-end" }],
    })

    renderer.stdin.emit("data", Buffer.from("\x1b[1083::107;5u"))

    expect(calls).toEqual(["delete-to-end"])
  })

  test("can be disposed to stop base-layout fallback matching", () => {
    const keymap = getKeymap(renderer)
    const calls: string[] = []

    const offFallback = registerBaseLayoutFallback(keymap)
    offFallback()

    keymap.registerLayer({
      commands: [
        {
          name: "copy",
          run() {
            calls.push("copy")
          },
        },
      ],
    })
    keymap.registerLayer({ bindings: [{ key: "ctrl+c", cmd: "copy" }] })

    renderer.stdin.emit("data", Buffer.from("\x1b[12618::99;5u"))

    expect(calls).toEqual([])
  })
})
