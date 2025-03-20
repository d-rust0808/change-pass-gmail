const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const readline = require("readline-sync");

// Sử dụng Stealth để tránh bị phát hiện
puppeteer.use(StealthPlugin());

// Đọc file input.txt (danh sách Gmail)
const accounts = fs
  .readFileSync("input.txt", "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => {
    const [email, password] = line.split(":");
    return { email, password };
  });

// Đọc file proxies.txt (danh sách proxy)
const proxies = fs
  .readFileSync("proxies.txt", "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => {
    const [ipPort, user, pass] = line.split(":");
    return user && pass
      ? { ipPort, auth: { username: user, password: pass } }
      : { ipPort };
  });

// Danh sách User-Agent ngẫu nhiên
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36",
];

// Hỏi mật khẩu mới
const newPassword = readline.question("Ban muon doi mat khau thanh gi? ");

async function changePassword(email, oldPassword, newPassword, proxy) {
  // Chọn User-Agent ngẫu nhiên
  const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

  // Cấu hình proxy
  const browserArgs = [`--user-agent=${randomUA}`];
  if (proxy) {
    browserArgs.push(`--proxy-server=${proxy.ipPort}`);
  }

  const browser = await puppeteer.launch({
    headless: false, // Để bạn thấy quá trình
    args: browserArgs,
  });

  const page = await browser.newPage();

  // Nếu proxy có xác thực
  if (proxy?.auth) {
    await page.authenticate(proxy.auth);
  }

  try {
    // Đi đến trang đăng nhập Google
    await page.goto("https://accounts.google.com/signin", {
      waitUntil: "networkidle2",
    });
    await page.type('input[type="email"]', email);
    await page.click("#identifierNext");
    await page.waitForTimeout(2000);

    await page.type('input[type="password"]', oldPassword);
    await page.click("#passwordNext");
    await page.waitForTimeout(5000);

    // Đi đến trang đổi mật khẩu
    await page.goto("https://myaccount.google.com/security");
    await page.waitForTimeout(2000);

    // Nhấn nút "Mật khẩu"
    await page.click('a[href*="password"]');
    await page.waitForTimeout(2000);

    // Nhập mật khẩu cũ và mới
    await page.type('input[name="password"]', oldPassword);
    await page.type('input[name="newPassword"]', newPassword);
    await page.type('input[name="confirmNewPassword"]', newPassword);
    await page.click('button[type="submit"]');

    console.log(
      `Da doi mat khau cho ${email} voi proxy ${proxy?.ipPort || "khong proxy"}`
    );
  } catch (error) {
    console.error(`Loi voi ${email}: ${error}`);
  } finally {
    await browser.close();
  }
}

// Chạy lần lượt cho từng tài khoản
(async () => {
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    // Chọn proxy theo thứ tự, nếu hết proxy thì quay lại đầu danh sách
    const proxy = proxies[i % proxies.length] || null;
    await changePassword(account.email, account.password, newPassword, proxy);
  }
  console.log("Hoan thanh!");
})();
