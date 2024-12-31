import { chromium, devices, Page } from "playwright";
import { DKHPConfig, defaultConfig } from "./config";
import fs from "fs";
const INTERUPT_INTERVAL: number = 3 * 60 * 1000;
const CONFIG_FILE = "dkhp.config.json";

let config = defaultConfig;
try {
  const configStr = fs.readFileSync(CONFIG_FILE, "utf-8");
  const userConfig: DKHPConfig = JSON.parse(configStr);
  config = { ...config, ...userConfig };
} catch (e) {
  console.error(`Failed to read config file (${CONFIG_FILE}): ${e.message}`);
  process.exit(1);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerClass(page: Page, className: string): Promise<boolean> {
  const ele = page
    .getByRole("table")
    .locator("tr")
    .filter({ has: page.locator("td").getByText(className, { exact: true }) })
    .getByRole("checkbox");
  try {
    if (await ele.isDisabled({ timeout: 1000 })) return false;
  } catch (e) {
    console.log(e);
    return false;
  }
  await ele.check();
  return true;
}

async function confirmRegistration(page: Page): Promise<void> {
  await page.getByRole("button").getByText("Đăng ký").click();
  await page.waitForResponse((res) => {
    return (
      res.url() === "https://dkhpapi.uit.edu.vn/courses-waiting-processing"
    );
  });
}

async function reloadInIntervalsUntil(
  page: Page,
  interval: number,
  time: Date,
) {
  let diff = time.valueOf() - Date.now().valueOf();
  if (diff < 0) return;

  for (; diff > INTERUPT_INTERVAL; diff -= INTERUPT_INTERVAL) {
    console.log(`${diff}ms left`);
    await delay(INTERUPT_INTERVAL);
    const startTime = performance.now();
    page.reload();
    const endTime = performance.now();
    diff -= endTime - startTime;
  }

  if (diff < 0) {
    page.reload();
    return;
  }

  console.log(`sleeping for ${diff}ms`);
  await delay(diff + 100); // exact time could cause some problems
  page.reload();
}

async function getCourses(page: Page) {
  await page.waitForResponse(
    (res) => res.url() === "https://dkhpapi.uit.edu.vn/courses",
    {
      timeout: 1000,
    },
  );
  console.log("registration page loaded");
}

async function login(page: Page) {
  if (page.url() === "https://dkhp.uit.edu.vn/app") return;
  await page.goto("https://dkhp.uit.edu.vn", {
    timeout: 1000,
  });
  await page.getByLabel("Mã sinh viên").fill(config.username);
  await page.getByLabel("Mật khẩu").fill(config.password);
  await page.getByRole("button").getByText("Đăng nhập").click();
  await page.waitForLoadState("networkidle", {
    timeout: 1000,
  });
  if (page.url() !== "https://dkhp.uit.edu.vn/app") {
    throw new Error("login failed");
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(devices["iPhone 11"]);
  const page = await context.newPage();

  let i: number;
  for (let i = 0; i < config.loginTries; ++i) {
    try {
      await login(page);
      break;
    } catch (e) {
      await delay(config.retryDelay);
      console.error("Failed to login: ", e);
    }
  }
  if (i === config.loginTries) {
    console.error("Failed to login after 10 tries, exiting");
    return;
  }

  await page.goto("https://dkhp.uit.edu.vn/app/reg");
  console.log("login successful, navigated to registration page");

  await delay(1500);
  if (config.timer ?? false) {
    if (!config.startTime)
      throw new Error("configuration error: startTime is not provided");
    const beginTime = new Date(config.startTime);
    await reloadInIntervalsUntil(page, INTERUPT_INTERVAL, beginTime); // avoid cookie timeouts
  }

  while (true) {
    try {
      await getCourses(page);
      break;
    } catch (e) {
      await delay(config.retryDelay);
      page.reload();
      console.error("Failed to get courses: ", e);
      console.log("retrying");
    }
  }

  while (true) {
    try {
      try {
        let ok = false;
        for (const sub of config.classes) {
          console.log(`registering ${sub}`);
          if (await registerClass(page, sub)) {
            ok = true;
            console.log(`registered ${sub} successfully`);
          } else {
            console.log(`couldn't register ${sub}`);
          }
        }
        if (ok) {
          console.log("confirming registration");
          await confirmRegistration(page);
        }
      } catch (e) {
        console.log(e);
        console.log("failed to register, retrying");
      }
      console.log("continuing next try");
      await delay(3000);
      await page.reload();
      await page.waitForResponse(
        (res) => res.url() === "https://dkhpapi.uit.edu.vn/courses",
      );
      await delay(config.retryDelay);
    } catch (e) {
      console.error("Failed to register: ", e);
    }
  }
}

// ensure it will always running
async function mainWrapper() {
  while (true) {
    try {
      await main();
      return;
    } catch (e) {
      console.error("Failed to run main: ", e);
    }
  }
}

console.log(`Running with config: ${JSON.stringify(config, null, 2)}`);
mainWrapper();
