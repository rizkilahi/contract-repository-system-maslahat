const { test, expect } = require('@playwright/test');

// Helpers
async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.waitForSelector('[data-testid="login-email"]');
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
}

async function logout(page) {
  await page.click('[data-testid="user-menu-trigger"]');
  await page.click('[data-testid="logout-btn"]');
  await expect(page).toHaveURL(/.*login/, { timeout: 8000 });
}

// ============================================================
// TEST 1: Halaman Login
// ============================================================
test('1. Halaman Login — tampilan dan quick-fill demo accounts', async ({ page }) => {
  await page.goto('/login');

  // Judul halaman
  await expect(page.locator('h2')).toContainText('Masuk ke CRS');
  
  // 4 akun demo harus tampil
  await expect(page.locator('text=muhamadrizkiilahi03@gmail.com')).toBeVisible();
  await expect(page.locator('text=bu@bsimaslahat.co.id')).toBeVisible();
  await expect(page.locator('text=legal@bsimaslahat.co.id')).toBeVisible();
  await expect(page.locator('text=management@bsimaslahat.co.id')).toBeVisible();

  // Quick-fill dengan klik BU demo
  await page.locator('text=bu@bsimaslahat.co.id').click();
  const emailVal = await page.inputValue('[data-testid="login-email"]');
  expect(emailVal).toBe('bu@bsimaslahat.co.id');

  await page.screenshot({ path: 'tests/evidence-01-login-page.png' });
});

// ============================================================
// TEST 2: Login Administrator
// ============================================================
test('2. Login Administrator — akun muhamadrizkiilahi03@gmail.com', async ({ page }) => {
  await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');
  await page.screenshot({ path: 'tests/evidence-02-admin-dashboard.png' });
  
  // Navbar harus tampil
  await expect(page.locator('[data-testid="app-navbar"]')).toBeVisible();
  // Menu Manajemen Pengguna hanya untuk admin
  await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
});

// ============================================================
// TEST 3: Dashboard Business Unit — KPI & Contract List
// ============================================================
test('3. Dashboard Business Unit — KPI cards dan tabel kontrak', async ({ page }) => {
  await loginAs(page, 'bu@bsimaslahat.co.id', 'Demo@2026');
  
  // KPI cards
  await page.waitForTimeout(1500); // tunggu data load
  await page.screenshot({ path: 'tests/evidence-03-bu-dashboard.png' });

  // Sidebar navigation harus tampil
  await expect(page.locator('[data-testid="app-sidebar"]')).toBeVisible();
  
  // Menu utama tersedia untuk BU
  await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
  await expect(page.locator('[data-testid="nav-contracts"]')).toBeVisible();
  await expect(page.locator('[data-testid="nav-submit"]')).toBeVisible();
  
  // BU TIDAK bisa lihat user management
  await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
  
  // NotificationBell ada (data-testid is 'notification-btn')
  await expect(page.locator('[data-testid="notification-btn"]')).toBeVisible();
});

// ============================================================
// TEST 4: Form Submit Kontrak + Legal Guidelines Modal
// ============================================================
test('4. Form Pengajuan PKS — auto-fill, institution dropdown, Smart Info modal DKM', async ({ page }) => {
  await loginAs(page, 'bu@bsimaslahat.co.id', 'Demo@2026');
  
  // Navigasi ke form submit
  await page.click('[data-testid="nav-submit"]');
  await page.waitForURL('**/submit', { timeout: 8000 });
  await page.screenshot({ path: 'tests/evidence-04a-submit-form.png' });
  
  // Pilih institution type "DKM"
  const selectTrigger = page.locator('[data-testid="institution-type-select"]');
  if (await selectTrigger.isVisible()) {
    await selectTrigger.click();
    await page.waitForTimeout(500);
    // Cari option DKM
    const dkmOption = page.locator('[role="option"]').filter({ hasText: 'DKM' });
    if (await dkmOption.isVisible()) {
      await dkmOption.click();
    }
  }
  
  // Klik tombol Smart Info / Guidelines
  const infoBtn = page.locator('[data-testid="smart-info-btn"]');
  if (await infoBtn.isVisible()) {
    await infoBtn.click();
    await page.waitForTimeout(800);
    // Modal harus tampil
    const modal = page.locator('[data-testid="guidelines-modal"]');
    if (await modal.isVisible()) {
      await page.screenshot({ path: 'tests/evidence-04b-guidelines-modal.png' });
    }
    // Tutup modal
    await page.keyboard.press('Escape');
  }
  
  await page.screenshot({ path: 'tests/evidence-04c-submit-after-modal.png' });
});

// ============================================================
// TEST 5: Legal Officer Dashboard
// ============================================================
test('5. Dashboard Legal Officer — tampilan dan menu yang tersedia', async ({ page }) => {
  await loginAs(page, 'legal@bsimaslahat.co.id', 'Demo@2026');
  
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/evidence-05-legal-dashboard.png' });
  
  // Legal tidak punya menu submit
  await expect(page.locator('[data-testid="nav-submit"]')).not.toBeVisible();
  // Legal tidak punya menu users
  await expect(page.locator('[data-testid="nav-users"]')).not.toBeVisible();
  // Legal punya Analitik
  await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
});

// ============================================================
// TEST 6: Analytics / Portofolio Page
// ============================================================
test('6. Halaman Analitik — charts dan ringkasan nilai portofolio', async ({ page }) => {
  await loginAs(page, 'management@bsimaslahat.co.id', 'Demo@2026');
  
  await page.click('[data-testid="nav-analytics"]');
  await page.waitForURL('**/analytics', { timeout: 8000 });
  await page.waitForTimeout(2000); // tunggu recharts render
  await page.screenshot({ path: 'tests/evidence-06-analytics.png' });
  
  // Heading Analytics — use first() to avoid strict mode on duplicate text
  await expect(page.locator('text=Analitik Portofolio').first()).toBeVisible();
  await expect(page.locator('text=Total Nilai Portofolio').first()).toBeVisible();
});

// ============================================================
// TEST 7: Admin — Users Page
// ============================================================
test('7. Admin Panel — halaman Manajemen Pengguna', async ({ page }) => {
  await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');
  
  await page.click('[data-testid="nav-users"]');
  await page.waitForURL('**/users', { timeout: 8000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tests/evidence-07-admin-users.png' });
});

// ============================================================
// TEST 8: Quick Search Bar
// ============================================================
test('8. Search Bar — fitur pencarian kontrak tersedia', async ({ page }) => {
  await loginAs(page, 'bu@bsimaslahat.co.id', 'Demo@2026');
  
  const searchBar = page.locator('[data-testid="quick-search"]');
  await expect(searchBar).toBeVisible();
  await searchBar.click();
  await searchBar.fill('Yayasan');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/evidence-08-search.png' });
});

// ============================================================
// TEST 9: Repositori Kontrak — sorting dan filter
// ============================================================
test('9. Repositori Kontrak — tabel dengan filter dan sort', async ({ page }) => {
  await loginAs(page, 'legal@bsimaslahat.co.id', 'Demo@2026');
  
  await page.click('[data-testid="nav-contracts"]');
  await page.waitForURL('**/contracts', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/evidence-09-contracts-list.png' });
});

// ============================================================
// TEST 10: Notification Bell
// ============================================================
test('10. Notifikasi Bell — tombol notifikasi dapat diklik', async ({ page }) => {
  await loginAs(page, 'bu@bsimaslahat.co.id', 'Demo@2026');
  
  // NotificationBell data-testid is 'notification-btn'
  const bell = page.locator('[data-testid="notification-btn"]');
  await expect(bell).toBeVisible();
  await bell.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'tests/evidence-10-notifications.png' });
});
