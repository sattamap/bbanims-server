const fs = require("fs");
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
