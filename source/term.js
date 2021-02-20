//======//
// Term //
//======//
{
	
	const Term = {}
	
	Term.result = ({success, source, output = source, tail, term, error = "", children = []} = {}) => {
		const self = (input, args) => {			
			const result = [...children]
			result.success = success
			result.output = output
			result.source = source
			result.tail = tail === undefined? input : tail
			result.term = term
			result.error = error
			
			result.input = input
			result.args = args
			result.toString = function() { return this.output }
			return result
		}
		return self
	}
	
	Term.succeed = (properties = {}) => Term.result({...properties, success: true})
	Term.fail    = (properties = {}) => Term.result({...properties, success: false})
	
	Term.string = (string) => {
		const term = (input, args) => {
			const snippet = input.slice(0, term.string.length)
			const success = snippet === term.string
			if (!success) return Term.fail({
				term,
				error: `Expected string '${term.string}' but found: '${snippet}'`,
			})(input, args)
			return Term.succeed({
				source: term.string,
				tail: input.slice(term.string.length),
				term,
				children: [],
			})(input, args)
		}
		term.string = string
		return term
	}
	
	Term.regExp = (regExp) => {
		const term = (input, args) => {
			const finiteRegExp = new RegExp("^" + term.regExp.source + "$")
			let i = 0
			while (i <= input.length) {
				const snippet = input.slice(0, i)
				const success = finiteRegExp.test(snippet)
				if (success) return Term.succeed({
					source: snippet,
					tail: input.slice(snippet.length),
					term,
					children: [],
				})(input, args)
				i++
			}
			return Term.fail({
				term,
				error: `Expected regular expression '${term.regExp.source}' but found:\n\n${input}`,
			})(input, args)
		}
		term.regExp = regExp
		return term
	}
	
	Term.list = (terms) => {
		const self = (input, args) => {
			
			const state = {
				input,
				i: 0,
			}
			
			const results = []
			
			while (state.i < self.terms.length) {
				const term = self.terms[state.i]
				const result = term(state.input, args)
				results.push(result)
				if (!result.success) break
				else state.input = result.tail
				state.i++
			}
			
			const success = state.i >= self.terms.length
			if (!success) {
				const errorLines = []
				errorLines.push(`Expected a list of ${self.terms.length} terms:`)
				errorLines.push(...results.map((r, i) => `${i+1}.` + r.error.split("\n").map(l => `	` + l).join("\n")))
				const error = errorLines.join("\n")
				return Term.fail({
					self,
					children: results,
					error,
				})(input, args)
			}
			
			return Term.succeed({
				output: results.map(result => result.output).join(""),
				source: results.map(result => result.source).join(""),
				tail: state.input,
				term: self,
				children: results,
			})(input, args)
			
		}
		self.terms = terms
		return self
	}
	
	Term.or = (terms) => {
		const self = (input, args = {exceptions: []}) => {
			
			const state = {i: 0}
			const {exceptions} = args
			const failures = []
			
			while (state.i < self.terms.length) {
				const term = self.terms[state.i]
				const result = term(input, args)
				if (result.success) return result
				failures.push(result)
				state.i++
			}
			
			const errorLines = []
			errorLines.push(`Expected one of ${self.terms.length} choices:`)
			errorLines.push(...failures.map((r, i) => `${i+1}.` + r.error.split("\n").map(l => `	` + l).join("\n")))
			const error = errorLines.join("\n")
			
			return Term.fail({
				term: self,
				error,
			})(input, args)
		}
		self.terms = terms
		return self
	}
	
	Term.maybe = (term) => {
		const self = (input, args) => {
			const result = self.term(input, args)
			if (!result.success) {
				result.success = true
				result.source = result.source === undefined? "": result.source
				result.output = result.output === undefined? "": result.output
			}
			return result
		}
		self.term = term
		return self
	}
	
	Term.many = (term) => {
		const self = (input, args) => {
			
			const state = {
				input,
				i: 0,
			}
			
			const results = []
			
			while (true) {
				const result = self.term(state.input, args)
				results.push(result)
				if (!result.success) break
				state.input = result.tail
				state.i++
			}
			
			const success = results.length > 1
			if (!success) {
				return Term.fail({
					term: self,
					children: results,
					error: results[0].error,
				})(input, args)
			}
			
			return Term.succeed({
				output: results.map(result => result.output).join(""),
				source: results.map(result => result.source).join(""),
				tail: state.input,
				term: self,
				children: results.slice(0, -1),
			})(input, args)
		}
		self.term = term
		return self
	}
	
	Term.emit = (term, func) => {
		const self = (input, args) => {
			const result = self.term(input, args)
			if (result.success) result.output = self.func(result)
			return result
		}
		self.term = term
		self.func = func
		return self
	}
	
	Term.error = (term, func) => {
		const self = (input, args) => {
			const result = self.term(input, args)
			if (!result.success) result.error = self.func(result)
			return result
		}
		self.term = term
		self.func = func
		return self
	}
	
	Term.check = (term, func) => {
		const self = (input, args) => {
			const result = self.term(input, args)
			if (!result.success) return result
			const checkResult = self.func(result)
			if (checkResult) return result
			return Term.fail({
				term: self.term,
				children: result.children,
			})(input, args)
		}
		self.term = term
		self.func = func
		return self
	}
	
	Habitat.Term = Term
	Habitat.Term.install = (global) => {
		global.Term = Habitat.Term	
		Habitat.Term.installed = true
	}
	
}
