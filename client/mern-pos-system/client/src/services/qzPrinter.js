import qz from "qz-tray";

// QZ Tray by default certificate/signature handshake maangta hai for
// signed/production use. Hum abhi "unsigned" mode use kar rahe hain -
// isliye in dono promises ko override karna zaroori hai, warna connect()
// "Failed to get certificate" error de kar turant connection band kar deta
// hai. Unsigned mode mein QZ Tray har naye session (browser refresh) par
// ek "Allow this website?" popup dikhayega - Allow kar dena hai.
qz.security.setCertificatePromise((resolve) => resolve());
qz.security.setSignaturePromise(() => (resolve) => resolve());

// QZ Tray ke bina certificate ke bhi kaam karta hai - lekin har naye session
// (browser refresh) par ek "Allow" security popup dikhega jab tak QZ Tray
// Settings > Security mein site ko permanently trust na kiya jaye (Advanced
// production setup ke liye QZ signing certificate use kar sakte hain, filhal
// zarurat nahi).

let connecting = null;

const ensureConnected = async () => {
  if (qz.websocket.isActive()) return;
  if (connecting) return connecting; // parallel calls ek hi connection attempt share karein

  connecting = qz.websocket
    .connect()
    .catch((err) => {
      connecting = null;
      throw new Error(
        "QZ Tray se connect nahi ho saka. Check karein QZ Tray system tray mein chal raha hai ya nahi.",
      );
    })
    .then(() => {
      connecting = null;
    });

  return connecting;
};

// Standard ESC/POS "kick drawer" command - RJ11 se connected cash drawer
// ko electric pulse bhejta hai jab printer ise receive karta hai.
const DRAWER_KICK_COMMAND = "\x1B\x70\x00\x19\xFA";

/**
 * Opens the cash drawer via the thermal printer's RJ11 port.
 * @param {string} [printerName] - Exact Windows printer name. Agar na diya
 *   jaye to QZ Tray ka default printer use hoga.
 */
export const openCashDrawer = async (printerName) => {
  await ensureConnected();

  const printer = printerName ? printerName : await qz.printers.getDefault();

  const config = qz.configs.create(printer);
  const data = [
    {
      type: "raw",
      format: "plain",
      data: DRAWER_KICK_COMMAND,
    },
  ];

  await qz.print(config, data);
};

export default { openCashDrawer };
