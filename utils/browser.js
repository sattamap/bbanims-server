const isProd = process.env.NODE_ENV === "production";
const puppeteer = isProd ? require("puppeteer-core") : require("puppeteer");
const chromium = isProd ? require("@sparticuz/chromium") : null;

let browser;

// Lazy-load or reuse Chromium instance
const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      args: chromium ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium ? chromium.defaultViewport : null,
      executablePath: isProd ? await chromium.executablePath() : undefined,
      headless: chromium ? chromium.headless : true,
    });
  }
  return browser;
};

module.exports = { getBrowser };
