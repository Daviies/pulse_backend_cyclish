const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const corsValidation = require('./config/corsValidation.js')
const asyncHandler = require('express-async-handler')
const errorHandler = require('./middleware/errorLogger.js')

const app = express();
const port = 3000;

let browser;

const getAllCookies = async (url) => {
  if (!browser) {
    browser = await puppeteer.launch({ headless: true });
  }
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });
  await page.setDefaultNavigationTimeout(0);
  await page.goto(url);
  const client = await page.target().createCDPSession();
  const cookies = await client.send('Network.getAllCookies');
  await page.close();
  return cookies;
}

app.use(cors(corsValidation));

app.use(express.json());

app.post('/singleweb', asyncHandler( async (req, res) => {
  const { singleWebsite } = req.body
  if (!singleWebsite) {
    return res.status(400).json({ message: "Please input website link" })
  }
  const singleWebsiteCookies = await getAllCookies(singleWebsite)
  res.send(singleWebsiteCookies)
}))

app.post('/manyweb', asyncHandler(async (req, res) => {

  if (!Array.isArray(req.body)) {
    return res.status(400).json({ message: "valid array needed" })
  }
  let sendSuccessFuly = [];
  const promises = req.body.map(eachTabInfo => getAllCookies(eachTabInfo.url));
  const results = await Promise.all(promises);
  for (let i = 0; i < results.length; i++) {
    let cookieandwebObj = results[i];
    cookieandwebObj["websiteDetails"] = req.body[i];
    sendSuccessFuly.push(cookieandwebObj);
  }
  // console.log("sendSuccessFuly", sendSuccessFuly)
  res.send(sendSuccessFuly);
}));

app.all('*', (req, res) => {
  res.status(404).type('txt').send('404 Not Found')
})

app.use(errorHandler)

app.listen(port, () => {
  console.log(`listening to ${port}`);
});