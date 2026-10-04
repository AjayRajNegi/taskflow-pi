import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../server";

describe("Health Endpoint Integration Test", () => {
	let server: any;
	const PORT = 3001;

	beforeAll(() => {
		server = app.listen(PORT);
	});
	afterAll(() => {
		server.stop();
	});

	it("should return 200 OK when calling /health", async () => {
		const resp = await fetch(`http://localhost:${PORT}/health`);
		expect(resp.status).toBe(200);

		const data = await resp.json();
		expect(data).toHaveProperty("status", "ok");
		expect(data).toHaveProperty("version", "1.0.0");
		expect(data).toHaveProperty("timestamp");

		// Verify timestamp is valid ISO string
		expect(new Date(data.timestamp)).toBeInstanceOf(Date);
		expect(!isNaN(new Date(data.timestamp).getTime())).toBe(true);
	});
});
