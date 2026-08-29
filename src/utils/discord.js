const { Webhook, MessageBuilder } = require("discord-webhook-node");
const { WEBHOOK_URL, WEBSITE_URL } = require("./credentials");

if (WEBHOOK_URL) {
  const hook = new Webhook(WEBHOOK_URL);
  hook.setUsername("ABSEN OTOMATIS");

  const successLogin = (date) => {
    const embed = new MessageBuilder()
      .setTitle("Absensi")
      .addField("Status Absensi", "Berhasil absen masuk!")
      .addField("Halaman Website", WEBSITE_URL)
      .setTimestamp(date);

    hook.send(embed);
  };

  const successLogout = (date) => {
    const embed = new MessageBuilder()
      .setTitle("Absensi")
      .addField("Status Absensi", "Berhasil absen keluar!")
      .addField("Halaman Website", WEBSITE_URL)
      .setTimestamp(date);

    hook.send(embed);
  };

  const holidayNotification = (date) => {
    const embed = new MessageBuilder()
      .setTitle("Absensi Dibatalkan")
      .addField(
        "Alasan",
        "Hari ini adalah Hari Libur Nasional atau Akhir Pekan."
      )
      .setTimestamp(date);

    hook.send(embed);
  };

  const alreadyAbsenNotification = (date, isMasuk) => {
    const embed = new MessageBuilder()
      .setTitle("Absensi")
      .addField(
        "Status Absensi",
        `Sudah melakukan absen ${isMasuk ? "masuk" : "keluar"} sebelumnya!`
      )
      .addField("Halaman Website", WEBSITE_URL)
      .setTimestamp(date);

    hook.send(embed);
  };

  module.exports = {
    successLogin,
    successLogout,
    holidayNotification,
    alreadyAbsenNotification,
  };
}
