const {
  credentials: {
    USERNAME,
    PASSWORD,

    FORM_WRAPPER,
    INPUT_USERNAME,
    INPUT_PASSWORD,
    BUTTON_SUBMIT,

    SUCCESS_INDICATOR_ELEMENTS,
  },
} = require("../utils");

module.exports = async (page, chalk) => {
  chalk.infoFN("Mencari dialog login");

  chalk.infoFN("Menunggu 3 detik untuk sinkronisasi popup sesi...");
  await page.waitForTimeout(3000);

  // Handle Sesi Telah Berakhir popup
  try {
    const btnMasukKembali = await page.$x(
      '//button[contains(text(), "Masuk Kembali") or contains(text(), "OK")]'
    );
    if (btnMasukKembali.length > 0) {
      chalk.infoFN(
        "Mendeteksi popup 'Sesi Telah Berakhir', mengklik tombol..."
      );
      await btnMasukKembali[0].click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {}

  await Promise.all([
    page.waitForSelector(FORM_WRAPPER, { timeout: 60000 }),
    page.waitForSelector(INPUT_USERNAME, { timeout: 60000 }),
    page.waitForSelector(INPUT_PASSWORD, { timeout: 60000 }),
    page.waitForSelector(BUTTON_SUBMIT, { timeout: 60000 }),
  ]);
  chalk.infoFN("Dialog login ditemukan, menulis username dan password");

  await page.type(INPUT_USERNAME, USERNAME);
  await page.type(INPUT_PASSWORD, PASSWORD);
  chalk.infoFN("Username dan password selesai di ketik, menekan tombol login");

  chalk.infoFN(
    "Menunggu 6 detik untuk verifikasi keamanan Cloudflare Turnstile..."
  );
  await new Promise((r) => setTimeout(r, 6000));

  try {
    const turnstileIframe = await page.$('iframe[src*="cloudflare"]');
    if (turnstileIframe) {
      const box = await turnstileIframe.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 4, box.y + box.height / 2);
        chalk.infoFN("Mengklik kotak Turnstile secara otomatis...");
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  } catch (e) {}

  await Promise.all([
    page.click(BUTTON_SUBMIT),
    page
      .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
      .catch(() => {}),
  ]);
  chalk.infoFN(
    "Berhasil menekan tombol login, mengecek apakah berpindah halaman"
  );

  await Promise.all(
    SUCCESS_INDICATOR_ELEMENTS.map((element) => page.waitForSelector(element))
  );
  chalk.infoFN("Elemen terkonfirmasi bukan halaman login lagi");

  return new Date();
};
