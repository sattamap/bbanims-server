/* const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const generateServicePDF = async (services) => {
  const htmlPath = path.join(__dirname, "../templates/serviceTemplates.html");
  let html = fs.readFileSync(htmlPath, "utf-8");

  const tableRows = services
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.serviceName}</td>
        <td>${s.detail}</td>
        <td>${s.start_date}</td>
        <td>${s.end_date}</td>
        <td>${s.category}</td>
        <td>${s.provider}</td>
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

/* const puppeteer = require("puppeteer");

const generateServicePDF = async (services) => {
  // Embed HTML template directly in the code
  let html = `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>বাংলা সার্ভিস রিপোর্ট</title>
    <style>
      @font-face {
        font-family: "TiroBangla";
        src: url("https://fonts.gstatic.com/s/tirobangla/v15/_Xmr-H4Yj9kaolrK_p0G1-BzS-0.woff2") format("woff2");
      }

      @page {
        margin: 40px 30px;
      }

      body {
        font-family: "TiroBangla", sans-serif;
        font-size: 12px;
        padding: 0;
      }

      h1 {
        text-align: center;
        margin: 20px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }

      th, td {
        border: 1px solid #333;
        padding: 6px;
        text-align: left;
      }

      th {
        background-color: #eee;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    </style>
  </head>
  <body>
    <h1>কাজসমূহের তালিকা</h1>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>কাজের নাম</th>
          <th>বিস্তারিত</th>
          <th>শুরুর তারিখ</th>
          <th>শেষ তারিখ</th>
          <th>খাতের নাম</th>
          <th>প্রতিষ্ঠানের নাম</th>
        </tr>
      </thead>
      <tbody id="table-body"></tbody>
    </table>
  </body>
  </html>
  `;

  // Generate table rows dynamically
  const tableRows = services
    .map(
      (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${s.serviceName}</td>
          <td>${s.detail}</td>
          <td>${s.start_date}</td>
          <td>${s.end_date}</td>
          <td>${s.category}</td>
          <td>${s.provider}</td>
        </tr>`
    )
    .join("");

  // Replace placeholder
  html = html.replace(
    '<tbody id="table-body"></tbody>',
    `<tbody id="table-body">${tableRows}</tbody>`
  );

  // Launch Puppeteer (with serverless friendly flags)
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
  });

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

module.exports = generateServicePDF;
 */

const { getBrowser } = require("./browser"); 
const fs = require("fs");
const path = require("path");

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

const generateServicePDF = async (services) => {
  // HTML template
  let html = `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>বাংলা সার্ভিস রিপোর্ট</title>
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
    <h1>কাজসমূহের তালিকা</h1>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>কাজের নাম</th>
          <th>বিস্তারিত</th>
          <th>শুরুর তারিখ</th>
          <th>শেষ তারিখ</th>
          <th>খাতের নাম</th>
          <th>প্রতিষ্ঠানের নাম</th>
        </tr>
      </thead>
      <tbody id="table-body"></tbody>
    </table>
  </body>
  </html>
  `;

  // Generate table rows
  const tableRows = services
    .map(
      (s, i) => `
        <tr>
          <td>${enToBnDigits(i + 1)}</td>
          <td>${s.serviceName}</td>
          <td>${s.detail}</td>
          <td>${s.start_date ? enToBnDigits(s.start_date) : "-"}</td>
          <td>${s.end_date ? enToBnDigits(s.end_date) : "-"}</td>
          <td>${s.category || "-"}</td>
          <td>${s.provider || "-"}</td>
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

module.exports = generateServicePDF;
