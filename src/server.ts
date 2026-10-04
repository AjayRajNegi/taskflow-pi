import express from "express";
import { healthRouter } from "./app/routes";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Register routes
app.use("/", healthRouter);

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: "Not Found" });
});

export default app;

if (process.env.NODE_ENV !== "test") {
	app.listen(PORT, () => {
		console.log(`Starting server on port ${PORT}`);
	});
}
