import { test, expect } from '@playwright/test'

async function dismissOnboarding(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sts-onboarding-done', 'true')
  })
}

test.describe('Spot the Song UI', () => {
  test.beforeEach(async ({ page }) => {
    await dismissOnboarding(page)
  })
  test('home screen snapshot', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Spot the Song' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: true })
  })

  test('how to play screen snapshot', async ({ page }) => {
    await page.goto('/how-to-play')
    await expect(page.getByRole('heading', { name: 'How to Play' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/how-to-play.png', fullPage: true })
  })

  test('local game play screen snapshot', async ({ page }) => {
    await page.goto('/local/setup')
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add Player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add Player' }).click()
    await page.getByRole('button', { name: /demo albums/i }).click()
    await page.getByRole('button', { name: /start game/i }).click()

    await expect(page).toHaveURL(/\/local\/play/)
    await page.getByRole('button', { name: 'Enable Audio' }).click()
    await expect(page.getByRole('button', { name: 'Confirm placement' })).toBeVisible()

    await page.screenshot({ path: 'e2e/screenshots/local-play.png', fullPage: true })
  })

  test('confirm placement advances to challenge phase', async ({ page }) => {
    await page.goto('/local/setup')
    await page.getByPlaceholder('Player name').fill('Alice')
    await page.getByRole('button', { name: 'Add Player' }).click()
    await page.getByPlaceholder('Player name').fill('Bob')
    await page.getByRole('button', { name: 'Add Player' }).click()
    await page.getByRole('button', { name: /demo albums/i }).click()
    await page.getByRole('button', { name: /start game/i }).click()

    await page.getByRole('button', { name: 'Enable Audio' }).click()

    const slot = page.locator('.timeline-insert-slot--interactive').first()
    await slot.click()

    const confirm = page.locator('.placement-confirm-btn, .phase-action-bar__btn').first()
    await expect(confirm).toBeEnabled()
    await confirm.click()

    await expect(page.getByRole('button', { name: 'Reveal year' })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/challenge-phase.png', fullPage: true })
  })
})
