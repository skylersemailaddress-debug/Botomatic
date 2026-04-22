import express from "express";
import { ExecuteRequest, ExecuteResponse } from "./types";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;

  if (!body.projectId || !body.packetId) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const result: ExecuteResponse = {
    success: true,
    summary: `Executed packet ${body.packetId}`,
    changedFiles: [
      {
        path: "README.md",
        body: `# ${body.projectId}\n\nPacket ${body.packetId} executed.`
      }
    ],
    logs: ["execution complete"],
  };

  return res.json(result);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Claude runner listening on ${PORT}`);
});
