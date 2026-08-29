const pptr = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
pptr.use(StealthPlugin());
const path = require("path");
const fs = require("fs");
const { chalk: _chalkFN, credentials } = require("../utils");

module.exports = async () => {
  const chalk = await _chalkFN();

  const args = [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--no-sandbox",
    "--disable-setuid-sandbox",
  ];

  if (credentials.FAKE_WEBCAM_VIDEO_PATH) {
    args.push(
      `--use-file-for-fake-video-capture=${path.resolve(
        credentials.FAKE_WEBCAM_VIDEO_PATH
      )}`
    );
  }

  const edgePath =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const chromePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  let executablePath = undefined;
  if (fs.existsSync(chromePath)) executablePath = chromePath;
  else if (fs.existsSync(edgePath)) executablePath = edgePath;

  const browser = await pptr.launch({
    args,
    executablePath,
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  if (credentials.LATITUDE && credentials.LONGITUDE) {
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(new URL(credentials.WEBSITE_URL).origin, [
      "geolocation",
      "camera",
      "microphone",
    ]);
    await page.setGeolocation({
      latitude: Number(credentials.LATITUDE),
      longitude: Number(credentials.LONGITUDE),
    });
  }

  if (
    credentials.FAKE_WEBCAM_IMAGE_PATH &&
    fs.existsSync(credentials.FAKE_WEBCAM_IMAGE_PATH)
  ) {
    const imageBuffer = fs.readFileSync(credentials.FAKE_WEBCAM_IMAGE_PATH);
    const ext =
      path
        .extname(credentials.FAKE_WEBCAM_IMAGE_PATH)
        .toLowerCase()
        .replace(".", "") || "jpeg";
    const base64Image = `data:image/${
      ext === "jpg" ? "jpeg" : ext
    };base64,${imageBuffer.toString("base64")}`;

    await page.evaluateOnNewDocument((base64Data) => {
      const originalGetUserMedia = navigator.mediaDevices
        ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        : null;
      if (!navigator.mediaDevices) navigator.mediaDevices = {};

      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints && constraints.video) {
          return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Data;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width || 640;
              canvas.height = img.height || 480;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              setInterval(() => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }, 1000 / 30);

              const stream = canvas.captureStream(30);
              resolve(stream);
            };
          });
        }
        return originalGetUserMedia
          ? originalGetUserMedia(constraints)
          : Promise.reject(new Error("getUserMedia not supported"));
      };
    }, base64Image);
  } else {
    // Rely on puppeteer-extra-plugin-stealth
  }

  chalk.infoFN(`Membuka website => ${credentials.WEBSITE_URL}`);
  await page.goto(credentials.WEBSITE_URL, {
    timeout: 0,
  });
  chalk.infoFN(`Website berhasil dibuka`);

  return { chalk, browser, page };
};
