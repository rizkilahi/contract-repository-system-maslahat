const { test, expect } = require('@playwright/test');

async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.waitForSelector('[data-testid="login-email"]');
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
}

test.describe('Modul RBAC (Role-Based Access Control)', () => {
  test('1. Sidebar RBAC menu muncul untuk Administrator', async ({ page }) => {
    await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');

    // Pastikan grup menu RBAC muncul di sidebar
    await expect(page.locator('[data-testid="sidebar-rbac-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-rbac-roles"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-rbac-matrix"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-rbac-catalog"]')).toBeVisible();
  });

  test('2. Halaman Role & Akses (/rbac/roles) menampilkan 4 kartu role', async ({ page }) => {
    await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');
    await page.click('[data-testid="nav-rbac-roles"]');

    await expect(page).toHaveURL(/.*rbac\/roles/);
    await expect(page.locator('h1')).toContainText('Role-Based Access Control');

    // 4 Role cards
    await expect(page.locator('[data-testid="role-card-admin"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-card-business_unit"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-card-legal_officer"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-card-management"]')).toBeVisible();
  });

  test('3. Halaman Perbandingan Akses (/rbac/matrix) menampilkan matriks interaktif', async ({ page }) => {
    await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');
    await page.click('[data-testid="nav-rbac-matrix"]');

    await expect(page).toHaveURL(/.*rbac\/matrix/);
    await expect(page.locator('[data-testid="rbac-matrix-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="matrix-search"]')).toBeVisible();

    // Filter kategori
    await page.click('[data-testid="matrix-cat-document"]');
    await expect(page.locator('[data-testid="rbac-matrix-table"]')).toContainText('Dokumen & File');
  });

  test('4. Halaman Katalog Akses (/rbac/catalog) menampilkan daftar permission', async ({ page }) => {
    await loginAs(page, 'muhamadrizkiilahi03@gmail.com', 'Admin@CRS2026');
    await page.click('[data-testid="nav-rbac-catalog"]');

    await expect(page).toHaveURL(/.*rbac\/catalog/);
    await expect(page.locator('[data-testid="catalog-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="catalog-item-contract-create"]')).toBeVisible();
  });

  test('5. Non-Admin (Business Unit) TIDAK dapat melihat menu RBAC dan di-redirect', async ({ page }) => {
    await loginAs(page, 'bu@bsimaslahat.co.id', 'Demo@2026');

    // Menu RBAC tidak boleh muncul untuk BU
    await expect(page.locator('[data-testid="sidebar-rbac-toggle"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-rbac-roles"]')).not.toBeVisible();

    // Direct access ke /rbac/roles harus diarahkan ke /
    await page.goto('/rbac/roles');
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
