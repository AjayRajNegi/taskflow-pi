// Mock bun module for Node.js testing environment
const mockServe = (options) => {
	// Return a mock server object
	return {
		stop: () => {},
	};
};

module.exports = {
	// Mock the bun module
	bun: {
		serve: mockServe,
	},
};
