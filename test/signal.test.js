import { registerMethods } from "../source/habitat.js"
import { glue, snuse, use } from "../source/signal.js"
import { assertEquals, describe, it } from "./libraries/deno-test.js"

describe("Setup", () => {
	registerMethods()
})

describe("Signal", () => {
	it("gets its value", () => {
		const count = use(0)
		assertEquals(count.get(), 0)
	})

	it("sets its value", () => {
		const count = use(0)
		count.set(1)
		assertEquals(count.get(), 1)
	})
})

describe("Pull", () => {
	it("updates its value when it has to", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2, { lazy: true })
		assertEquals(doubled.get(), 0)
	})

	it("gets parents", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2, { lazy: true })
		doubled.get()
		assertEquals([...doubled._parents], [count])
	})

	it("doesn't update its value when it doesn't have to", () => {
		let clock = 0

		const count = use(0)
		const doubled = use(
			() => {
				clock++
				return count.get() * 2
			},
			{ lazy: true },
		)

		doubled.get()
		doubled.get()
		assertEquals(clock, 1)
	})

	it("recursively updates its value", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2, { lazy: true })
		const tripled = use(() => doubled.get() * 3, { lazy: true })
		assertEquals(tripled.get(), 0)
	})

	it("doesn't recursively update its value when it doesn't have to", () => {
		let doubleClock = 0
		let tripleClock = 0

		const count = use(0)
		const doubled = use(
			() => {
				doubleClock++
				return count.get() * 2
			},
			{ lazy: true },
		)
		const tripled = use(
			() => {
				tripleClock++
				return doubled.get() * 3
			},
			{ lazy: true },
		)

		doubled.get()
		doubled.get()
		assertEquals(doubleClock, 1)
		assertEquals(tripleClock, 0)

		count.set(1)
		tripled.get()
		tripled.get()
		assertEquals(doubleClock, 2)
		assertEquals(tripleClock, 1)
	})

	it("updates its value when its grandparent has changed", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2, { lazy: true })
		const tripled = use(() => doubled.get() * 3, { lazy: true })

		count.set(1)
		assertEquals(tripled.get(), 6)
		count.set(2)
		assertEquals(tripled.get(), 12)
	})

	it("updates from its ancestors", () => {
		const count = use(0)
		const paused = use(true)
		const doubled = use(() => count.get() * 2, { lazy: true })
		const tripled = use(() => (paused.value ? -1 : doubled.get() * 3), { lazy: true })

		assertEquals(doubled.get(), 0)

		assertEquals(tripled.get(), -1)
		count.set(1)
		paused.set(false)
		assertEquals(tripled.get(), 6)
	})

	it("skips over non-root parents", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2, { lazy: true })
		const quadrupled = use(() => doubled.get() * 2, { lazy: true })
		const octupled = use(() => quadrupled.get() * 2, { lazy: true })
		octupled.get()
		assertEquals([...octupled._parents], [count])
	})
})

describe("Push", () => {
	it("gets its value updated", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		count.set(1)
		assertEquals(doubled.get(), 2)
	})

	it("doesn't update its value when it doesn't have to", () => {
		let clock = 0

		const count = use(0)
		const doubled = use(() => {
			clock++
			return count.get() * 2
		})

		doubled.get()
		doubled.get()
		assertEquals(clock, 1)
	})

	it("recursively updates its value", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3)
		count.set(1)
		assertEquals(tripled.get(), 6)
	})

	it("unbinds when it's not used anymore", () => {
		let clock = 0
		const paused = use(false)
		const score = use(0)
		const state = use(() => {
			clock++
			if (paused.get()) return "paused"
			return score.get()
		})

		assertEquals(state.get(), 0)
		assertEquals(clock, 1)

		score.set(1)
		assertEquals(state.get(), 1)
		assertEquals(clock, 2)

		paused.set(true)
		assertEquals(state.get(), "paused")
		assertEquals(clock, 3)

		score.set(2)
		assertEquals(state.get(), "paused")
		assertEquals(clock, 3)
	})
})

describe("Sugar", () => {
	it("can be got with .value", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })
		assertEquals(count.value, 0)
		assertEquals(doubled.value, 0)
		assertEquals(tripled.value, 0)

		count.set(1)
		assertEquals(tripled.value, 6)
		assertEquals(doubled.value, 2)
		assertEquals(count.value, 1)
	})

	it("can be set with .value", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })

		count.value = 1
		assertEquals(tripled.value, 6)
		assertEquals(doubled.value, 2)
		assertEquals(count.value, 1)
	})

	it("can be got with .()", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })
		assertEquals(count(), 0)
		assertEquals(doubled(), 0)
		assertEquals(tripled(), 0)

		count.set(1)
		assertEquals(tripled(), 6)
		assertEquals(doubled(), 2)
		assertEquals(count(), 1)
	})

	it("can be set with .(value)", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })

		count(1)
		assertEquals(tripled(), 6)
		assertEquals(doubled(), 2)
		assertEquals(count(), 1)
	})

	it("can be iterated over", () => {
		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })

		const [getCount, setCount] = count
		const [getDoubled] = doubled
		const [getTripled] = tripled

		assertEquals(getCount(), 0)
		assertEquals(getDoubled(), 0)
		assertEquals(getTripled(), 0)

		setCount(1)
		assertEquals(getTripled(), 6)
		assertEquals(getDoubled(), 2)
		assertEquals(getCount(), 1)
	})
})

describe("Effect", () => {
	it("fires when it's created", () => {
		let clock = 0
		use(() => clock++)
		assertEquals(clock, 1)
	})

	it("fires when its sources change", () => {
		const history = []
		const count = use(0)
		use(() => history.push(count.get()))
		assertEquals(history, [0])
		count.set(1)
		assertEquals(history, [0, 1])
	})

	it("recursively fires when its sources change", () => {
		const doubleHistory = []
		const tripleHistory = []

		const count = use(0)
		const doubled = use(() => count.get() * 2)
		const tripled = use(() => doubled.get() * 3, { lazy: true })

		use(() => doubleHistory.push(doubled.get()))
		use(() => tripleHistory.push(tripled.get()))

		assertEquals(doubleHistory, [0])
		assertEquals(tripleHistory, [0])

		count.set(1)

		assertEquals(doubleHistory, [0, 2])
		assertEquals(tripleHistory, [0])

		tripled.get()

		assertEquals(doubleHistory, [0, 2])
		assertEquals(tripleHistory, [0, 6])
	})

	it("can be disposed", () => {
		const history = []
		const count = use(0)
		const effect = use(() => history.push(count.get()))
		assertEquals(history, [0])
		count.set(1)
		assertEquals(history, [0, 1])
		effect.dispose()
		count.set(2)
		assertEquals(history, [0, 1])
	})
})

describe("Store", () => {
	it("gets a property", () => {
		const player = use({ count: 0 })
		assertEquals(player.count, 0)
	})

	it("sets a property", () => {
		const player = use({ count: 0 })
		player.count = 1
		assertEquals(player.count, 1)
	})

	it("gets a property recursively", () => {
		const player = use({ count: 0 })
		const doubled = use(() => player.count * 2)
		assertEquals(doubled.value, 0)
		player.count = 1
		assertEquals(doubled.value, 2)
	})

	it("disposes", () => {
		const player = use({ count: 0 })
		const history = []
		use(() => history.push(player.count))
		assertEquals(history, [0])
		player.count = 1
		assertEquals(history, [0, 1])
		player.dispose()
		player.count = 2
		assertEquals(history, [0, 1])
	})

	it("works with lazy signals", () => {
		const player = use({ count: 0 })
		const doubled = use(() => player.count * 2)
		const tripled = use(() => doubled.value * 3, { lazy: true })
		assertEquals(tripled.value, 0)
		player.count = 1
		assertEquals(tripled.value, 6)
	})

	it("can be overwritten", () => {
		const player = use({ count: 0 })
		Object.assign(player, { count: 1 })
		assertEquals(player.count, 1)
	})

	it("maintain links through overrides", () => {
		const player = use({ count: 0 })
		const doubled = use(() => player.count * 2)
		player.set({ count: 1 })
		assertEquals(doubled.value, 2)
	})

	it("garbage collects unused signals", () => {
		const player = use({ count: 0 })
		assertEquals(player.count, 0)
		player.set({ score: 1 })
		assertEquals(player.score, 1)
		assertEquals(player.count, undefined)
	})

	it("can be iterated over", () => {
		const player = use({ count: 0, score: 0 })
		const [countEntry, scoreEntry] = player
		assertEquals(countEntry, ["count", 0])
		assertEquals(scoreEntry, ["score", 0])
		assertEquals(
			[...player],
			[
				["count", 0],
				["score", 0],
			],
		)

		for (const key in player) {
			assertEquals(["count", "score"].includes(key), true)
		}
	})

	it("doesn't double up updates", () => {
		let clock = 0
		const player = use({ count: 0 })
		const currentPlayer = use(() => {
			clock++
			return player.count
		})

		assertEquals(clock, 1)
		assertEquals(currentPlayer.value, 0)
		assertEquals(clock, 1)
		player.count = 1
		assertEquals(clock, 2)
	})

	it("updates its own value", () => {
		const player = use({ count: 0 })
		assertEquals(player.value, { count: 0 })
		player.count = 1
		assertEquals(player.value, { count: 1 })
		player.count = 2
		assertEquals(player.value, { count: 2 })
	})
})

describe("Glue", () => {
	it("can glue properties to an object", () => {
		const player = {
			count: use(0),
		}
		glue(player)
		const doubled = use(() => player.count * 2)
		assertEquals(player.count, 0)
		assertEquals(doubled.value, 0)
		player.count = 1
		assertEquals(player.count, 1)
		assertEquals(doubled.value, 2)
	})

	it("can glue stores to an object", () => {
		const player = {
			position: use({ x: 0, y: 0 }),
		}
		const left = use(() => player.position.x)
		glue(player)
		assertEquals(player.position.x, 0)
		assertEquals(left.value, 0)
		player.position.x = 1
		assertEquals(player.position.x, 1)
		assertEquals(left.value, 1)
	})

	it("can allow stores to be overwritten", () => {
		const player = {
			position: use({ x: 0, y: 0 }),
		}
		glue(player)
		assertEquals(player.position.x, 0)
		player.position = { x: 10, y: 10 }
		assertEquals(player.position.x, 10)
	})

	it("updates dependencies when you overwrite a store", () => {
		const player = {
			position: use({ x: 0, y: 0 }),
		}
		const left = use(() => player.position.x)
		glue(player)
		assertEquals(left.value, 0)
		player.position = { x: 10, y: 10 }
		assertEquals(left.value, 10)
	})

	it("can glue array stores to an object", () => {
		const player = {
			position: use([0, 0]),
		}
		glue(player)
		assertEquals(player.position[0], 0)
		player.position[0] = 1
		assertEquals(player.position[0], 1)
	})

	it("can allow array stores to be overwritten", () => {
		const player = {
			position: use([0, 0]),
		}
		glue(player)
		assertEquals(player.position[0], 0)
		player.position = [10, 10]
		assertEquals(player.position[0], 10)
	})

	it("updates dependencies when you overwrite an array store", () => {
		const player = {
			position: use([0, 0]),
		}
		const left = use(() => player.position[0])
		glue(player)
		assertEquals(left.value, 0)
		player.position = [10, 10]
		assertEquals(left.value, 10)
	})
})

describe("Array Store", () => {
	it("is iterable", () => {
		const position = use([0, 0])
		const [x, y] = position
		assertEquals(x, 0)
		assertEquals(y, 0)
		assertEquals(position[0], 0)
		assertEquals([...position], [0, 0])
	})

	it("has length", () => {
		const position = use([0, 0])
		assertEquals(position.length, 2)
	})

	it("has array methods", () => {
		const position = use([0, 0])
		assertEquals([...position], [0, 0])
		const head = position.slice(1, 2)
		assertEquals(head, [0])
	})

	it("has array accessors", () => {
		const position = use([0, 0])
		assertEquals(position.x, 0)
		position.x = 1
		assertEquals(position.x, 1)
	})

	it("can be set", () => {
		const position = use([0, 0])
		position[0] = 1
		assertEquals(position[0], 1)
	})

	it("can push", () => {
		const position = use([0, 0])
		const x = use(() => position[0])
		assertEquals(x.value, 0)
		position[0] = 1
		assertEquals(x.value, 1)
	})

	it("can push recursively", () => {
		const position = use([0, 0])
		const x = use(() => position[0])
		const doubled = use(() => x.value * 2)
		assertEquals(doubled.value, 0)
		position[0] = 1
		assertEquals(doubled.value, 2)
	})

	it("has signal methods", () => {
		const position = use([0, 0])
		assertEquals([...position.value], [0, 0])
	})

	it("iterates after updates", () => {
		const position = use([0, 0])
		assertEquals([...position], [0, 0])
		position[0] = 1
		assertEquals([...position], [1, 0])
	})

	it("can be disposed", () => {
		const position = use([0, 0])
		const history = []
		use(() => history.push(position[0]))
		assertEquals(history, [0])
		position[0] = 1
		assertEquals(history, [0, 1])
		position.dispose()
		position[0] = 2
		assertEquals(history, [0, 1])
		position._signal[0] = 3
		assertEquals(history, [0, 1])
	})

	it("can be set via signal", () => {
		const position = use([0, 0])
		position._signal[0] = 1
		assertEquals(position[0], 1)
	})

	it("updates its own value", () => {
		const position = use([0, 0])
		assertEquals(position.value, [0, 0])
		position[0] = 1
		assertEquals(position.value, [1, 0])
		position[0] = 2
		assertEquals(position.value, [2, 0])
	})
})

describe("Implicit", () => {
	it("becomes a string", () => {
		const name = use("Bob")
		assertEquals(name + "!", "Bob!")
		assertEquals(`${name}!`, "Bob!")
	})

	it("becomes a number", () => {
		const age = use(10)
		assertEquals(age + 1, 11)
	})
})

describe("Snuse", () => {
	it("makes a signal", () => {
		const count = use(0)
		const doubled = snuse(() => count * 2)
		assertEquals(doubled.value, 0)
		count.value = 1
		assertEquals(doubled.value, 2)
	})

	it("is lazy", () => {
		let clock = 0
		const count = use(0)
		const doubled = snuse(() => {
			clock++
			return count * 2
		})
		assertEquals(clock, 0)
		assertEquals(doubled.value, 0)
		assertEquals(clock, 1)
		count.value = 1
		assertEquals(clock, 1)
		assertEquals(doubled.value, 2)
		assertEquals(clock, 2)
	})
})
