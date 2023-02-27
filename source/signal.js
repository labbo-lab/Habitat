const shared = {
	clock: 0,
	active: null,
}

const Signal = class extends Function {
	dynamic = false
	store = false

	_birth = shared.clock++
	_children = new Set()
	_parents = new Set()

	_current = undefined
	_previous = undefined

	_evaluate = function () {
		return this._current
	}

	constructor(value, options = {}) {
		//==== Sugar ====//
		super("value", "return this._self._func(value)")
		const self = this.bind(this)
		this._self = self
		Object.assign(self, this)
		self._func = (value) => {
			if (value === undefined) {
				return self.get()
			} else {
				self.set(value)
			}
		}
		//===============//

		Object.assign(self, {
			dynamic: false,
			lazy: false,
			store: false,
			...options,
		})

		if (self.dynamic) {
			self._evaluate = value
		} else {
			self._current = value
		}

		return self
	}

	_addParent(parent) {
		this._parents.add(parent)
	}

	set(value) {
		this._previous = this._current
		this._birth = shared.clock++
		this._current = value

		const children = [...this._children]
		for (const child of children) {
			child.update()
		}
	}

	get() {
		const { active } = shared
		if (active !== null) {
			active._addParent(this)

			if (!active.lazy) {
				this._children.add(active)
			}
		}
		return this._current
	}

	update() {
		if (this.dynamic) {
			this.set(this._current)
			return
		}

		const parents = [...this._parents]
		for (const parent of parents) {
			parent._children.delete(this)
		}

		this._parents.clear()

		const paused = shared.active
		shared.active = this
		const value = this._evaluate()
		shared.active = paused

		this.set(value)
	}

	//==== Sugar ====//
	get value() {
		return this.get()
	}

	set value(value) {
		this.set(value)
	}

	*[Symbol.iterator]() {
		yield this
		yield this
	}
	//===============//
}

const Dynamic = class extends Signal {
	_birth = -Infinity

	constructor(evaluate) {
		super(evaluate, { dynamic: true })
	}

	update() {
		const parents = [...this._parents]
		for (const parent of parents) {
			parent._children.delete(this)
		}

		this._parents.clear()

		const paused = shared.active
		shared.active = this
		const value = this._evaluate()
		shared.active = paused

		super.set(value)
	}
}

const DynamicLazy = class extends Dynamic {
	dynamic = true
	lazy = true

	constructor(evaluate) {
		super(evaluate)
	}

	_addParent(parent) {
		this._parents.add(parent)
		if (parent._parents === undefined) return
		for (const grandparent of parent._parents) {
			this._addParent(grandparent)
		}
	}

	get() {
		const parents = [...this._parents]
		if (this._birth < 0 || parents.some((parent) => parent._birth > this._birth)) {
			this.update()
		}

		return super.get()
	}

	set() {
		throw new Error("Pulls are read-only")
	}
}

const DynamicEager = class extends Dynamic {
	dynamic = true
	lazy = false

	constructor(evaluate) {
		super(evaluate)
		this.update()
	}

	set() {
		throw new Error("Pushes are read-only")
	}
}

export const useSignal = (value) => new Signal(value)
export const usePull = (evaluate) => new DynamicLazy(evaluate)
export const usePush = (evaluate) => new DynamicEager(evaluate)
export const useEffect = (callback) => new DynamicEager(callback)
