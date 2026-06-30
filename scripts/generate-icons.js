const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#1E293B");
  gradient.addColorStop(1, "#334155");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;

  ctx.fillStyle = "#D4AF37";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1E293B";
  ctx.font = `bold ${size * 0.2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HR", centerX, centerY);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  console.log(`Created icon-${size}x${size}.png`);
}

const screenshotCanvas = createCanvas(1280, 720);
const sCtx = screenshotCanvas.getContext("2d");
const sGradient = sCtx.createLinearGradient(0, 0, 1280, 720);
sGradient.addColorStop(0, "#1E293B");
sGradient.addColorStop(1, "#334155");
sCtx.fillStyle = sGradient;
sCtx.fillRect(0, 0, 1280, 720);

sCtx.fillStyle = "#D4AF37";
sCtx.font = "bold 48px Arial";
sCtx.textAlign = "center";
sCtx.fillText("HR Attendance System", 640, 360);

sCtx.fillStyle = "#FFFFFF";
sCtx.font = "24px Arial";
sCtx.fillText("ระบบบันทึกเวลาเข้า-ออกงาน", 640, 420);

fs.writeFileSync(path.join(iconsDir, "screenshot.png"), screenshotCanvas.toBuffer("image/png"));
console.log("Created screenshot.png");

console.log("All icons created successfully!");
