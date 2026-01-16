import { test, expect } from '@playwright/test';

// Test the campaigns page and CRUD operations
test.describe('Campaigns Page', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    
    // Fill in marketing user credentials
    await page.fill('input[name="email"]', 'giulia.rossi@leadcrm.it');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to marketing dashboard
    await page.waitForURL(/\/marketing/);
  });

  test('should display campaigns list', async ({ page }) => {
    // Navigate to campaigns page
    await page.goto('/marketing/campaigns');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Campagne Marketing")');
    
    // Check that the campaigns table exists
    await expect(page.locator('table')).toBeVisible();
    
    // Check that summary cards are visible
    await expect(page.locator('text=Campagne Attive')).toBeVisible();
    await expect(page.locator('text=Spesa Totale')).toBeVisible();
    await expect(page.locator('text=Lead Totali')).toBeVisible();
  });

  test('should open new campaign modal', async ({ page }) => {
    await page.goto('/marketing/campaigns');
    await page.waitForSelector('h1:has-text("Campagne Marketing")');
    
    // Click "Nuova Campagna" button
    await page.click('button:has-text("Nuova Campagna")');
    
    // Modal should appear
    await expect(page.locator('text=Nuova Campagna').first()).toBeVisible();
    
    // Check form fields exist
    await expect(page.locator('input[placeholder*="Excel"]')).toBeVisible(); // Name field
    await expect(page.locator('select').first()).toBeVisible(); // Platform select
  });

  test('should create a new campaign', async ({ page }) => {
    await page.goto('/marketing/campaigns');
    await page.waitForSelector('h1:has-text("Campagne Marketing")');
    
    // Click "Nuova Campagna" button
    await page.click('button:has-text("Nuova Campagna")');
    
    // Fill the form
    await page.fill('input[placeholder*="Excel"]', 'Test Campaign E2E');
    
    // Select platform (first select is platform)
    const platformSelect = page.locator('select').first();
    await platformSelect.selectOption('INSTAGRAM');
    
    // Select course
    const courseSelect = page.locator('select').nth(1);
    await courseSelect.selectOption({ index: 1 }); // Select first available course
    
    // Fill budget
    await page.fill('input[placeholder="1000"]', '5000');
    
    // Click submit
    await page.click('button:has-text("Crea Campagna")');
    
    // Modal should close and campaign should appear in list
    await expect(page.locator('text=Test Campaign E2E')).toBeVisible({ timeout: 10000 });
  });

  test('should expand campaign to see details', async ({ page }) => {
    await page.goto('/marketing/campaigns');
    await page.waitForSelector('h1:has-text("Campagne Marketing")');
    
    // Find and click expand button on first campaign
    const expandButton = page.locator('table tbody tr').first().locator('button').first();
    await expandButton.click();
    
    // Expanded content should show
    await expect(page.locator('text=Contattati')).toBeVisible();
    await expect(page.locator('text=Iscritti')).toBeVisible();
    await expect(page.locator('text=Conversione')).toBeVisible();
  });

  test('should edit a campaign', async ({ page }) => {
    await page.goto('/marketing/campaigns');
    await page.waitForSelector('h1:has-text("Campagne Marketing")');
    
    // Find edit button on first campaign (pencil icon)
    const editButton = page.locator('table tbody tr').first().locator('button[title=""], button:has(svg)').nth(1);
    await editButton.click();
    
    // Modal should open with "Modifica Campagna" title
    await expect(page.locator('text=Modifica Campagna')).toBeVisible();
    
    // Change the name
    const nameInput = page.locator('input[placeholder*="Excel"]');
    await nameInput.fill('Campaign Updated E2E');
    
    // Save
    await page.click('button:has-text("Salva Modifiche")');
    
    // Updated campaign should appear
    await expect(page.locator('text=Campaign Updated E2E')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('API Endpoints', () => {
  test('GET /api/campaigns should return campaigns', async ({ request }) => {
    const response = await request.get('/api/campaigns');
    expect(response.ok()).toBeTruthy();
    
    const campaigns = await response.json();
    expect(Array.isArray(campaigns)).toBeTruthy();
    
    // Each campaign should have the new schema fields
    if (campaigns.length > 0) {
      const campaign = campaigns[0];
      expect(campaign).toHaveProperty('platform');
      expect(campaign).toHaveProperty('status');
      expect(campaign).toHaveProperty('budget');
      expect(campaign).toHaveProperty('totalSpent');
    }
  });

  test('GET /api/stats should return dashboard stats', async ({ request }) => {
    const response = await request.get('/api/stats');
    expect(response.ok()).toBeTruthy();
    
    const stats = await response.json();
    expect(stats).toHaveProperty('overview');
    expect(stats).toHaveProperty('financial');
    expect(stats).toHaveProperty('leadsByStatus');
    expect(stats.overview).toHaveProperty('activeCampaigns');
  });

  test('POST /api/campaigns should create a campaign', async ({ request }) => {
    // First get a course and user ID
    const coursesRes = await request.get('/api/courses');
    const courses = await coursesRes.json();
    const courseId = courses[0]?.id;

    const usersRes = await request.get('/api/users');
    const users = await usersRes.json();
    const createdById = users.find((u: any) => u.role === 'MARKETING')?.id || users[0]?.id;

    // Create campaign
    const response = await request.post('/api/campaigns', {
      data: {
        name: 'API Test Campaign',
        platform: 'TIKTOK',
        courseId,
        createdById,
        budget: 999,
        status: 'DRAFT',
      },
    });

    expect(response.ok()).toBeTruthy();
    const campaign = await response.json();
    expect(campaign.name).toBe('API Test Campaign');
    expect(campaign.platform).toBe('TIKTOK');
    expect(campaign.status).toBe('DRAFT');

    // Cleanup - delete the campaign
    await request.delete(`/api/campaigns/${campaign.id}`);
  });

  test('Campaign spend CRUD should work', async ({ request }) => {
    // Get an existing campaign
    const campaignsRes = await request.get('/api/campaigns');
    const campaigns = await campaignsRes.json();
    const campaignId = campaigns[0]?.id;

    if (!campaignId) {
      test.skip();
      return;
    }

    // Create spend record
    const createRes = await request.post(`/api/campaigns/${campaignId}/spend`, {
      data: {
        date: '2026-01-15',
        amount: 123.45,
        notes: 'E2E Test Spend',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const spend = await createRes.json();
    expect(spend).toHaveProperty('id');

    // Read spend records
    const readRes = await request.get(`/api/campaigns/${campaignId}/spend`);
    expect(readRes.ok()).toBeTruthy();
    const spendData = await readRes.json();
    expect(spendData).toHaveProperty('records');
    expect(spendData).toHaveProperty('totalSpent');

    // Delete the spend record
    const deleteRes = await request.delete(`/api/campaigns/${campaignId}/spend?spendId=${spend.id}`);
    expect(deleteRes.ok()).toBeTruthy();
  });
});
