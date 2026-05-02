import http from "http";
import fs from "fs";
import path from "path";

const port = Number(process.env.PORT || 4173);
const filePath = path.join(process.cwd(), "dist", "index.html");
const html = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "<html><body><h1>Missing dist/index.html</h1></body></html>";
const server = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(html);
});
server.listen(port, "127.0.0.1", () => {
  console.log(`generated_app_server_listening:${port}`);
});
