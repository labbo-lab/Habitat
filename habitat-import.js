import { registerGlobal } from "./global.js"

export const print = console.log.bind(console)
registerGlobal({print})
const globals = {}
export const install = (globalObject) => {
	for (const key in globals) {
		const value = globals[key]
		globalObject[key] = value
	}
}

export const registerGlobal = ({key, value}) => {
	globals[key] = value
}