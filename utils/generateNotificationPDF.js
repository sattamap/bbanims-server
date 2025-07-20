const fs = require("fs");
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
