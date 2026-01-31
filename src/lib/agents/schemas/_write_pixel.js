const fs = require("fs");
const content = fs.readFileSync("C:/Users/SBS/Desktop/OLYMPUS/OLYMPUS/src/lib/agents/schemas/_pixel_content.txt", "utf8");
fs.writeFileSync("C:/Users/SBS/Desktop/OLYMPUS/OLYMPUS/src/lib/agents/schemas/pixel.ts", content, "utf8");
console.log("pixel.ts written:", content.length, "chars");