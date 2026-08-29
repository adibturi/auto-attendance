const https = require("https");

module.exports = function checkHoliday() {
  return new Promise((resolve) => {
    // Ambil waktu saat ini dalam zona waktu Jakarta (WIB)
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();

    // 1. Cek Akhir Pekan (Sabtu = 6, Minggu = 0)
    // KODE DI BAWAH DIMATIKAN SEMENTARA AGAR ANDA BISA MENGETESNYA DI HARI SABTU INI:
    /*
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    if (isWeekend) {
      return resolve(true);
    }
    */

    // 2. Cek Libur Nasional via API Harilibur
    const url = `https://api-harilibur.vercel.app/api?month=${month}&year=${year}`;

    https
      .get(url, { headers: { "User-Agent": "Node.js" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const holidays = JSON.parse(data);
            const isHoliday = holidays.some((h) => {
              const hDate = new Date(h.holiday_date);
              // Cek jika tanggalnya sama dan statusnya libur nasional
              return hDate.getDate() === date && h.is_national_holiday;
            });
            resolve(isHoliday);
          } catch (e) {
            // Jika API gagal diparsing atau down, anggap hari kerja agar bot tetap jalan
            resolve(false);
          }
        });
      })
      .on("error", () => {
        // Jika koneksi gagal, anggap hari kerja
        resolve(false);
      });
  });
};
