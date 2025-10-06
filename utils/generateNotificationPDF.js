/* const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const generateServicePDF = async (notifications) => {
  const htmlPath = path.join(__dirname, "../templates/notificationTemplates.html");
  let html = fs.readFileSync(htmlPath, "utf-8");

  const tableRows = notifications
    .map(
      (n, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${n.message}</td>
        <td>${n.type}</td>
        <td>${new Date(n.timestamp).toLocaleString()}</td>
      </tr>`
    )
    .join("");

  html = html.replace(
    '<tbody id="table-body"></tbody>',
    `<tbody id="table-body">${tableRows}</tbody>`
  );

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, landscape: true, });

  await browser.close();
  return pdfBuffer;
};

module.exports = generateServicePDF;
 */



const fs = require("fs");
const path = require("path");
const { getBrowser } = require("./browser");

const isProd = process.env.NODE_ENV === "production";
const puppeteer = isProd ? require("puppeteer-core") : require("puppeteer");
const chromium = isProd ? require("@sparticuz/chromium") : null;

// Load Bangla font as base64
const fontPath = path.join(__dirname, "../fonts/TiroBangla-Regular.ttf");
const banglaFontBase64 = fs.readFileSync(fontPath).toString("base64");

// Convert English digits → Bangla digits
const enToBnDigits = (input) => {
  const enDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return input
    ?.toString()
    .split("")
    .map((c) => {
      const idx = enDigits.indexOf(c);
      return idx !== -1 ? bnDigits[idx] : c;
    })
    .join("");
};

const generateNotificationPDF = async (notifications) => {
  // Inline HTML template
  let html = `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>নোটিফিকেশন রিপোর্ট</title>
    <style>
      @font-face {
        font-family: "TiroBangla";
        src: url(data:font/ttf;base64,${banglaFontBase64}) format("truetype");
        font-weight: normal;
        font-style: normal;
      }

      @page { margin: 40px 30px; }

      body {
        font-family: "TiroBangla", sans-serif;
        font-size: 12px;
        padding: 0;
      }

      h1 { text-align: center; margin: 20px 0; }

      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }

      th, td { border: 1px solid #333; padding: 6px; text-align: left; }
      th { background-color: #eee; }

      tr { page-break-inside: avoid; page-break-after: auto; }
    </style>
  </head>
  <body>
    <h1>নোটিফিকেশন রিপোর্ট</h1>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>বার্তা</th>
          <th>ধরন</th>
          <th>তারিখ</th>
        </tr>
      </thead>
      <tbody id="table-body"></tbody>
    </table>
  </body>
  </html>
  `;

  // Build table rows dynamically
  const tableRows = notifications
    .map(
      (n, i) => `
        <tr>
          <td>${enToBnDigits(i + 1)}</td>
          <td>${n.message}</td>
          <td>${n.type}</td>
          <td>${
            n.timestamp
              ? enToBnDigits(new Date(n.timestamp).toLocaleString("bn-BD"))
              : "-"
          }</td>
        </tr>`
    )
    .join("");

  html = html.replace(
    '<tbody id="table-body"></tbody>',
    `<tbody id="table-body">${tableRows}</tbody>`
  );

  // Launch Puppeteer

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    landscape: true,
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generateNotificationPDF;
