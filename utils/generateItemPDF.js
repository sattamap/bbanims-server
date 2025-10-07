/* const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const enToBnDigits = (input) => {
  const enDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return input
    .toString()
    .split("")
    .map((char) => {
      const index = enDigits.indexOf(char);
      return index !== -1 ? bnDigits[index] : char;
    })
    .join("");
};

const generateItemPDF = async (items) => {
  const htmlPath = path.join(__dirname, "../templates/itemTemplates.html");
  let html = fs.readFileSync(htmlPath, "utf-8");

  const tableRows = items
    .map(
      (item, index) => `
      <tr>
        <td>${enToBnDigits(index + 1)}</td>
        <td>
          <strong>${item.itemName}</strong><br/>
          মডেল: ${item.model || "-"}<br/>
          উৎপত্তি: ${item.origin || "-"}
        </td>
        <td>${enToBnDigits(item?.items_quantity?.item_store ?? 0)}</td>
        <td>${enToBnDigits(item?.items_quantity?.item_use ?? 0)}</td>
        <td>${enToBnDigits(item?.items_quantity?.item_faulty_store ?? 0)}</td>
        <td>${enToBnDigits(item?.items_quantity?.item_faulty_use ?? 0)}</td>
        <td>${enToBnDigits(item?.items_quantity?.item_transfer ?? 0)}</td>
        <td>${enToBnDigits(item.totalQuantity ?? 0)}</td>
        <td>${item.locationGood || "-"}</td>
        <td>${item.category || "-"}</td>
        <td>${item.date ? enToBnDigits(item.date) : "-"}</td>
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

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    landscape: true,
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generateItemPDF;
 */


/* const puppeteer = require("puppeteer");

const enToBnDigits = (input) => {
  const enDigits = ["0","1","2","3","4","5","6","7","8","9"];
  const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  return input.toString().split("").map(c => {
    const idx = enDigits.indexOf(c);
    return idx !== -1 ? bnDigits[idx] : c;
  }).join("");
};

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Item Report</title>
  <style>
    body { font-family: Arial; font-size: 11px; padding: 20px; }
    h1 { text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 4px; text-align: left; word-wrap: break-word; }
    th { background-color: #eee; }
    strong { font-weight: bold; }
  </style>
</head>
<body>
  <h1>পণ্যসমূহের তালিকা</h1>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>নাম, মডেল & উৎপত্তি</th>
        <th>পণ্য (স্টোর)</th>
        <th>পণ্য (ব্যবহার)</th>
        <th>পণ্য (স্টোরে নষ্ট)</th>
        <th>পণ্য (ব্যবহারে নষ্ট)</th>
        <th>পণ্য ( আন্তঃকেন্দ্রীক বদলী)</th>
        <th>মোট সংখ্যা</th>
        <th>স্থান</th>
        <th>খাত</th>
        <th>সময়</th>
      </tr>
    </thead>
    <tbody id="table-body"></tbody>
  </table>
</body>
</html>
`;

const generateItemPDF = async (items) => {
  let html = htmlTemplate;

  const tableRows = items.map((item, index) => `
    <tr>
      <td>${enToBnDigits(index + 1)}</td>
      <td>
        <strong>${item.itemName}</strong><br/>
        মডেল: ${item.model || "-"}<br/>
        উৎপত্তি: ${item.origin || "-"}
      </td>
      <td>${enToBnDigits(item?.items_quantity?.item_store ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_use ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_faulty_store ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_faulty_use ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_transfer ?? 0)}</td>
      <td>${enToBnDigits(item.totalQuantity ?? 0)}</td>
      <td>${item.locationGood || "-"}</td>
      <td>${item.category || "-"}</td>
      <td>${item.date ? enToBnDigits(item.date) : "-"}</td>
    </tr>
  `).join("");

  html = html.replace('<tbody id="table-body"></tbody>', `<tbody id="table-body">${tableRows}</tbody>`);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, landscape: true });
  await browser.close();
  return pdfBuffer;
};

module.exports = generateItemPDF;
 */

const fs = require("fs");
const path = require("path");

const isProd = process.env.NODE_ENV === "production";
const puppeteer = isProd ? require("puppeteer-core") : require("puppeteer");
const chromium = isProd ? require("@sparticuz/chromium") : null;

// Load font as base64
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

// HTML template
const getHtmlTemplate = () => `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>Item Report</title>
  <style>
    @font-face {
      font-family: "TiroBangla";
      src: url(data:font/ttf;base64,${banglaFontBase64}) format("truetype");
      font-weight: normal;
      font-style: normal;
    }
    @page {
      size: A4 landscape;
      margin: 30px 20px;
    }
    body { font-family: "TiroBangla", sans-serif; font-size: 11px; padding: 20px; }
    h1 { text-align: center; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 4px; text-align: left; word-wrap: break-word; }
    th { background-color: #eee; }
    strong { font-weight: bold; }
  </style>
</head>
<body>
  <h1>পণ্যসমূহের তালিকা</h1>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>নাম, মডেল & উৎপত্তি</th>
        <th>পণ্য (স্টোর)</th>
        <th>পণ্য (ব্যবহার)</th>
        <th>পণ্য (স্টোরে নষ্ট)</th>
        <th>পণ্য (ব্যবহারে নষ্ট)</th>
        <th>পণ্য ( আন্তঃকেন্দ্রীক বদলী)</th>
        <th>মোট সংখ্যা</th>
        <th>স্থান</th>
        <th>খাত</th>
        <th>সময়</th>
      </tr>
    </thead>
    <tbody id="table-body"></tbody>
  </table>
</body>
</html>
`;

const generateItemPDF = async (items) => {
  let html = getHtmlTemplate();

  const tableRows = items
    .map(
      (item, index) => `
    <tr>
      <td>${enToBnDigits(index + 1)}</td>
      <td>
        <strong>${item.itemName}</strong><br/>
        মডেল: ${item.model || "-"}<br/>
        উৎপত্তি: ${item.origin || "-"}
      </td>
      <td>${enToBnDigits(item?.items_quantity?.item_store ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_use ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_faulty_store ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_faulty_use ?? 0)}</td>
      <td>${enToBnDigits(item?.items_quantity?.item_transfer ?? 0)}</td>
      <td>${enToBnDigits(item.totalQuantity ?? 0)}</td>
      <td>${item.locationGood || "-"}</td>
      <td>${item.category || "-"}</td>
      <td>${item.date ? enToBnDigits(item.date) : "-"}</td>
    </tr>
  `
    )
    .join("");

  html = html.replace(
    '<tbody id="table-body"></tbody>',
    `<tbody id="table-body">${tableRows}</tbody>`
  );

  console.log("NODE_ENV:", process.env.NODE_ENV);

  // Puppeteer launch
  const browser = await puppeteer.launch({
    args: chromium ? chromium.args : [],
    defaultViewport: chromium ? chromium.defaultViewport : null,
    executablePath: isProd ? await chromium.executablePath() : undefined,
    headless: chromium ? chromium.headless : true,
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

module.exports = generateItemPDF;
