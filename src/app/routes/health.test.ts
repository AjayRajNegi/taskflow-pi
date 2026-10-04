import { describe, expect, it, vi } from "vitest";
import { healthHandler } from "./health";

describe("Health Handler", () => {
	it("should return 200 OK with correct JSON format", () => {
		const res = {
			json: vi.fn(),
			status: vi.fn().mockReturnThis(),
		} as any;

		// Call the handler
		healthHandler(null as any, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			status: "ok",
			timestamp: expect.any(String),
			version: "1.0.0",
		});

		// Verify timestamp is valid ISO string
		const timestampArg = (res.json as any).mock.calls[0][0];
		expect(new Date(timestampArg.timestamp)).toBeInstanceOf(Date);
		expect(!isNaN(new Date(timestampArg.timestamp).getTime())).toBe(true);
	});
});
