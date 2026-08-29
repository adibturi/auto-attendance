const { _botBuilder, _login } = require("../src/handler");
const { discord, credentials, checkHoliday } = require("../src/utils");
const path = require("path");

(async () => {
  const isLibur = await checkHoliday();
  if (isLibur) {
    console.log(
      "[INFO] Hari ini adalah Hari Libur Nasional / Akhir Pekan! Membatalkan eksekusi bot absensi."
    );
    if (credentials.WEBHOOK_URL) discord.holidayNotification(new Date());
    return;
  }
  const bot = await _botBuilder();
  const chalk = bot.chalk;
  const page = bot.page;

  await _login(page, chalk);
  chalk.infoFN("Terkonfirmasi berhasil login ke portal!");

  chalk.infoFN("Menunggu 5 detik untuk loading dashboard...");
  await page.waitForTimeout(5000);

  chalk.infoFN("Masuk ke menu Manajemen Tenaga Kerja...");
  await page
    .evaluate(() => {
      const el = document.evaluate(
        '//*[contains(text(), "Manajemen Tenaga Kerja")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (el) el.click();
    })
    .catch(() => {});

  chalk.infoFN("Menunggu 5 detik...");
  await page.waitForTimeout(5000);

  chalk.infoFN("Masuk ke menu Kehadiran Online...");
  await page
    .evaluate(() => {
      const el = document.evaluate(
        '//*[contains(text(), "Kehadiran Online")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (el) el.click();
    })
    .catch(() => {});

  chalk.infoFN("Menunggu 10 detik untuk GPS dan Kamera...");
  await page.waitForTimeout(10000);

  chalk.infoFN("Menekan tombol PULANG (Membuka Popup)...");
  const isPulangClicked = await page
    .evaluate(() => {
      const btn = document.evaluate(
        '//button[contains(text(), "Pulang")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })
    .catch(() => false);

  if (!isPulangClicked) {
    chalk.infoFN(
      "Tombol PULANG tidak ditemukan. Sepertinya sudah absen keluar!"
    );
    if (credentials.WEBHOOK_URL)
      discord.alreadyAbsenNotification(new Date(), false);
    await bot.browser.close();
    return;
  }

  chalk.infoFN("Menekan area 'Ambil Swafoto' untuk menghidupkan kamera...");
  await page.waitForTimeout(2000); // Tunggu animasi popup
  await page.evaluate(() => {
    const btnSwafoto = document.evaluate(
      '//*[contains(., "Ambil Swafoto") and not(.//*[contains(., "Ambil Swafoto")])]',
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    if (btnSwafoto) btnSwafoto.click();
  });
  await page.waitForTimeout(2000); // Tunggu kamera merespon atau gagal

  chalk.infoFN("Menunggu dan mencari tombol 'Ambil' atau 'Pilih Gambar'...");
  const btnSuccess = await page
    .waitForFunction(
      () => {
        const ambilXpath =
          '//*[contains(., "Ambil") and not(contains(., "Ulang")) and not(contains(., "Swafoto")) and not(.//*[contains(., "Ambil") and not(contains(., "Ulang")) and not(contains(., "Swafoto"))])]';
        const btnAmbil = document.evaluate(
          ambilXpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        if (btnAmbil) return "ambil";

        const pilihXpath =
          '//*[contains(., "Pilih Gambar") and not(.//*[contains(., "Pilih Gambar")])]';
        const btnPilih = document.evaluate(
          pilihXpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        if (btnPilih) return "pilih";

        return false;
      },
      { timeout: 30000, polling: 500 }
    )
    .catch(() => false);

  if (btnSuccess) {
    const mode = await btnSuccess.jsonValue();
    if (mode === "ambil") {
      chalk.infoFN("Kamera terdeteksi! Mengklik 'Ambil'...");
      await page.evaluate(() => {
        const ambilXpath =
          '//*[contains(., "Ambil") and not(contains(., "Ulang")) and not(contains(., "Swafoto")) and not(.//*[contains(., "Ambil") and not(contains(., "Ulang")) and not(contains(., "Swafoto"))])]';
        const btn = document.evaluate(
          ambilXpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        if (btn) btn.click();
      });

      chalk.infoFN(
        "Menunggu indikator 'Ambil Ulang' (tanda foto telah berhasil dijepret)..."
      );
      await page
        .waitForFunction(
          () => {
            return (
              document.evaluate(
                '//button[contains(., "Ambil Ulang")]',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue !== null
            );
          },
          { timeout: 30000, polling: 500 }
        )
        .catch(() => false);
    } else if (mode === "pilih") {
      chalk.infoFN(
        "Kamera gagal diakses. Mode Upload aktif! Mengunggah foto dari folder assets..."
      );
      const absolutePath = path.resolve(
        process.cwd(),
        credentials.FAKE_WEBCAM_IMAGE_PATH
      );

      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        await fileInput.uploadFile(absolutePath);
        chalk.infoFN("Foto berhasil diunggah langsung ke sistem!");
      } else {
        const [fileChooser] = await Promise.all([
          page.waitForFileChooser(),
          page.evaluate(() => {
            const pilihXpath =
              '//*[contains(., "Pilih Gambar") and not(.//*[contains(., "Pilih Gambar")])]';
            const el = document.evaluate(
              pilihXpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (el) el.click();
          }),
        ]);
        await fileChooser.accept([absolutePath]);
        chalk.infoFN("Foto berhasil diunggah via popup dialog!");
      }
      await page.waitForTimeout(3000);
    }
  } else {
    chalk.infoFN("TOMBOL AMBIL ATAU PILIH GAMBAR TIDAK DITEMUKAN!");
  }

  chalk.infoFN("Menunggu 2 detik sebelum menekan PULANG...");
  await page.waitForTimeout(2000);

  chalk.infoFN("Menekan tombol PULANG (Kirim Absen) di dalam Popup...");
  await page.evaluate(() => {
    const btns = document.evaluate(
      '//button[contains(text(), "Pulang")]',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    if (btns.snapshotLength > 0)
      btns.snapshotItem(btns.snapshotLength - 1).click();
  });

  chalk.infoFN(
    "Absensi PULANG telah dikirim! Menunggu 5 detik untuk konfirmasi akhir..."
  );
  await page.waitForTimeout(5000);

  // Ambil screenshot dengan nama baru agar tidak ter-cache
  await page.screenshot({ path: "hasil_absen_terbaru.png", fullPage: true });

  if (credentials.WEBHOOK_URL) discord.successLogout(new Date());

  await bot.browser.close();
})();
