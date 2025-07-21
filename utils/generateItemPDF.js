const fs = require("fs");
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
