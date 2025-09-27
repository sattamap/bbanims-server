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


const puppeteer = require("puppeteer");

const generateNotificationPDF = async (notifications) => {
  // Inline HTML template
  let html = `
  <!DOCTYPE html>
  <html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <title>Notification Report</title>
    <style>
      @page {
        margin: 40px 30px; /* Ensures proper margin between pages */
      }

      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        padding: 0; /* Use @page margin instead of body padding */
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
    <h1>Notification Report</h1>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Message</th>
          <th>Type</th>
          <th>Date</th>
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
          <td>${i + 1}</td>
          <td>${n.message}</td>
          <td>${n.type}</td>
          <td>${new Date(n.timestamp).toLocaleString("bn-BD")}</td>
        </tr>`
    )
    .join("");

  // Inject rows into template
  html = html.replace(
    '<tbody id="table-body"></tbody>',
    `<tbody id="table-body">${tableRows}</tbody>`
  );

  // Puppeteer launch (serverless safe)
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    landscape: true,
  });

  await browser.close();
  return pdfBuffer;
};

module.exports = generateNotificationPDF;
