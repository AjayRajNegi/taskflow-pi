import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { healthHandler } from "./health";

const mockResponse = () => {
	const jsonMock = vi.fn();

	return {
		json: jsonMock,
	} as unknown as Response;
};

describe("Health Handler", () => {
	it("should return 200 OK with correct JSON format", async () => {
		const req = {} as Request;
		const res = mockResponse();

		await healthHandler(req, res);

		expect(res.json).toHaveBeenCalledWith({
			status: "ok",
			timestamp: expect.any(String),
			version: "1.0.0",
		});

		// Verify timestamp is a valid ISO string
		const timestampArg = (res.json as ReturnType<typeof vi.fn>).mock
			.calls[0][0];

		expect(new Date(timestampArg.timestamp)).toBeInstanceOf(Date);
		expect(!isNaN(new Date(timestampArg.timestamp).getTime())).toBe(true);
	});
});
