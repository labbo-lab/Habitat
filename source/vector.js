export const Vector = function(x, y, z) {
	if (z === undefined) {
		return [x, y]
	}
	return [x, y, z]
}

export const scaleVector = (vector, scale) => {
	return vector.map(v => v * scale)
}

export const addVector = (a, b) => {
	if (a.length === 2) {
		const [ax, ay] = a
		const [bx, by] = b
		const x = ax + bx
		const y = ay + by
		return [x, y]
	} else {
		const [ax, ay, az] = a
		const [bx, by, bz] = b
		const x = ax + bx
		const y = ay + by
		const z = az + bz
		return [x, y, z]
	}
}

export const subtractVector = (a, b) => {
	if (a.length === 2) {
		const [ax, ay] = a
		const [bx, by] = b
		const x = ax - bx
		const y = ay - by
		return [x, y]
	} else {
		const [ax, ay, az] = a
		const [bx, by, bz] = b
		const x = ax - bx
		const y = ay - by
		const z = az - bz
		return [x, y, z]
	}
}

export const crossProductVector = (a, b) => {
	if (a.length === 2) {
		const [ax, ay] = a
		const [bx, by] = b
		return ax*by - ay*bx
	} else {
		const [ax, ay, az] = a
		const [bx, by, bz] = b
		return [ay*bz - az*by, az*bx - ax*bz, ax*by - ay*bx]
	}
}

// TODO: 3D
export const distanceBetweenVectors = (a, b) => {
	const displacement = subtractVector(a, b)
	const [dx, dy] = displacement
	const distance = Math.hypot(dx, dy)
	return distance
}

// TODO: 3D
export const angleBetweenVectors = (a, b) => {
	const displacement = subtractVector(a, b)
	const [dx, dy] = displacement
	const angle = Math.atan2(dy, dx)
	return angle
}