import fs from "fs";

fs.mkdirSync("marketplace/Luminous", { recursive: true });
fs.cpSync("dist", "marketplace/Luminous", { recursive: true });
