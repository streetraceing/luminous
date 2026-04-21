import fs from "fs";

fs.mkdirSync("Luminous", { recursive: true });
fs.cpSync("dist", "./", { recursive: true });
