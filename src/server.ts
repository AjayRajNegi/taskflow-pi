import express from "express";
import router from "./app/routes";

// import { healthRouter } from "./app/routes";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middleware
app.use(express.json());

// Test route
// app.use("/", (req, res) => {
// 	res.json({ test: "Hello" });
// });
app.use("/", router);

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: "Not Found" });
});

// Start server
app.listen(PORT, () => {
	console.log(`Running on port ${PORT}`);
});

export default app;
