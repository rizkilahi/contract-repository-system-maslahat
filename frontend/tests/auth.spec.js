const { test, expect } = require('@playwright/test');

test.describe('Authentication and Dashboard', () => {
  test('User can login and see dashboard', async ({ page }) => {
    // 1. Pergi ke halaman utama (otomatis redirect ke /login atau langsung di /login)
    await page.goto('/login');

    // 2. Memastikan halaman login muncul
    await expect(page.getByRole('heading', { name: 'Contract Repository System' })).toBeVisible();

    // 3. Mengeklik akun demo Administrator untuk auto-fill
    // Akun ini harus sudah dikonfigurasi di frontend dan backend (.env)
    const adminDemoBtn = page.locator('text=muhamadrizkiilahi03@gmail.com').first();
    await expect(adminDemoBtn).toBeVisible();
    await adminDemoBtn.click();

    // 4. Klik tombol "Masuk"
    await page.getByRole('button', { name: 'Masuk' }).click();

    // 5. Tunggu hingga berhasil masuk (URL berubah ke /dashboard atau /)
    // Seringkali /dashboard atau path spesifik setelah login, 
    // kita rely pada expect.toBeVisible() di bawah ini untuk implicitly wait.
    
    // 6. Verifikasi elemen UI atau URL yang menandakan sudah login. 
    // Kita tunggu URL berubah (keluar dari halaman login) dengan timeout lebih panjang
    await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
    
    // 7. Ambil Screenshot untuk bukti
    await page.screenshot({ path: 'tests/evidence-login-success.png' });
  });
});
