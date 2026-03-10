const sharp = require("sharp");
const path = require("path");

const svgPath = path.join(__dirname, "../public/icon.svg");

async function generate() {
  await sharp(svgPath).resize(192, 192).png().toFile(path.join(__dirname, "../public/icon-192.png"));
  console.log("✓ icon-192.png");

  await sharp(svgPath).resize(512, 512).png().toFile(path.join(__dirname, "../public/icon-512.png"));
  console.log("✓ icon-512.png");
}

generate().catch(console.error);
