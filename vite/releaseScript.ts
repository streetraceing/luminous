import fs from "fs";

fs.mkdirSync("release", { recursive: true });
fs.cpSync("dist", "release", { recursive: true });
