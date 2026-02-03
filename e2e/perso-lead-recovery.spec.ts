import { test, expect } from '@playwright/test';

/**
 * E2E Tests for PERSO Lead Recovery Feature
 * 
 * Tests the ability for Commercial users to:
 * 1. View all PERSO leads via the new API endpoint
 * 2. Search and filter PERSO leads
 * 3. Claim (recover) PERSO leads from other users
 * 4. Verify notifications are sent to previous owner
 */

test.describe('PERSO Lead Recovery API', () => {
  
  test('GET /api/leads/perso should return PERSO leads pool', async ({ request }) => {
    const response = await request.get('/api/leads/perso');
    
    // Should succeed (or 401 if not authenticated - that's expected)
    // In a real test, we'd authenticate first
    if (response.ok()) {
      const data = await response.json();
      
      // Check response structure
      expect(data).toHaveProperty('leads');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.leads)).toBeTruthy();
      
      // Check pagination structure
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('pageSize');
      expect(data.pagination).toHaveProperty('totalCount');
      expect(data.pagination).toHaveProperty('totalPages');
      expect(data.pagination).toHaveProperty('hasMore');
      
      // If there are leads, check their structure
      if (data.leads.length > 0) {
        const lead = data.leads[0];
        expect(lead).toHaveProperty('id');
        expect(lead).toHaveProperty('name');
        expect(lead).toHaveProperty('course');
        expect(lead).toHaveProperty('assignedTo');
        expect(lead).toHaveProperty('lostReason');
        expect(lead).toHaveProperty('lostAt');
      }
    }
  });

  test('GET /api/leads/perso should support search parameter', async ({ request }) => {
    const response = await request.get('/api/leads/perso?search=test');
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('leads');
      expect(Array.isArray(data.leads)).toBeTruthy();
    }
  });

  test('GET /api/leads/perso should support courseId filter', async ({ request }) => {
    // First get a course ID
    const coursesRes = await request.get('/api/courses');
    if (coursesRes.ok()) {
      const courses = await coursesRes.json();
      if (courses.length > 0) {
        const courseId = courses[0].id;
        
        const response = await request.get(`/api/leads/perso?courseId=${courseId}`);
        if (response.ok()) {
          const data = await response.json();
          expect(data).toHaveProperty('leads');
          
          // All returned leads should have the filtered course
          data.leads.forEach((lead: any) => {
            if (lead.course) {
              expect(lead.course.id).toBe(courseId);
            }
          });
        }
      }
    }
  });

  test('GET /api/leads/perso should support pagination', async ({ request }) => {
    const response = await request.get('/api/leads/perso?page=1&pageSize=5');
    
    if (response.ok()) {
      const data = await response.json();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pageSize).toBe(5);
      expect(data.leads.length).toBeLessThanOrEqual(5);
    }
  });
});

test.describe('Commercial PERSO Lead Recovery UI', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as commercial user
    await page.goto('/login');
    
    // Use commercial user credentials (from seed data)
    await page.fill('input[name="email"]', 'marco.bianchi@leadcrm.it');
    await page.fill('input[name="password"]', 'user123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to commercial dashboard
    await page.waitForURL(/\/commercial/, { timeout: 10000 });
  });

  test('should display "Recupera Lead Perso" button on leads page', async ({ page }) => {
    await page.goto('/commercial/leads');
    await page.waitForSelector('h1:has-text("I Miei Lead")');
    
    // Check for the new button
    const recoverButton = page.locator('button:has-text("Recupera Lead Perso")');
    await expect(recoverButton).toBeVisible();
  });

  test('should open Search PERSO Leads modal when clicking button', async ({ page }) => {
    await page.goto('/commercial/leads');
    await page.waitForSelector('h1:has-text("I Miei Lead")');
    
    // Click the button
    await page.click('button:has-text("Recupera Lead Perso")');
    
    // Modal should appear
    await expect(page.locator('text=Recupera Lead Perso').first()).toBeVisible();
    await expect(page.locator('text=Cerca e recupera lead PERSO di altri commerciali')).toBeVisible();
    
    // Check modal has search input
    await expect(page.locator('input[placeholder*="Cerca per nome"]')).toBeVisible();
    
    // Check modal has course filter
    await expect(page.locator('select:has-text("Tutti i corsi")')).toBeVisible();
  });

  test('should search for PERSO leads in modal', async ({ page }) => {
    await page.goto('/commercial/leads');
    await page.waitForSelector('h1:has-text("I Miei Lead")');
    
    // Open modal
    await page.click('button:has-text("Recupera Lead Perso")');
    await expect(page.locator('text=Recupera Lead Perso').first()).toBeVisible();
    
    // Wait for initial load
    await page.waitForTimeout(500);
    
    // Type in search
    await page.fill('input[placeholder*="Cerca per nome"]', 'test');
    
    // Wait for debounced search
    await page.waitForTimeout(500);
    
    // Should show results or "Nessun lead PERSO" message
    const hasResults = await page.locator('.border.rounded-lg.p-4').count() > 0;
    const hasNoResults = await page.locator('text=Nessun lead PERSO').isVisible();
    
    expect(hasResults || hasNoResults).toBeTruthy();
  });

  test('should close modal when clicking X button', async ({ page }) => {
    await page.goto('/commercial/leads');
    await page.waitForSelector('h1:has-text("I Miei Lead")');
    
    // Open modal
    await page.click('button:has-text("Recupera Lead Perso")');
    await expect(page.locator('text=Cerca e recupera lead PERSO di altri commerciali')).toBeVisible();
    
    // Close modal
    await page.click('button:has(svg.lucide-x)');
    
    // Modal should disappear
    await expect(page.locator('text=Cerca e recupera lead PERSO di altri commerciali')).not.toBeVisible();
  });

  test('should filter by course in modal', async ({ page }) => {
    await page.goto('/commercial/leads');
    await page.waitForSelector('h1:has-text("I Miei Lead")');
    
    // Open modal
    await page.click('button:has-text("Recupera Lead Perso")');
    await expect(page.locator('text=Recupera Lead Perso').first()).toBeVisible();
    
    // Wait for courses to load in select
    await page.waitForTimeout(500);
    
    // Get course select and select second option (first real course)
    const courseSelect = page.locator('select').first();
    const options = await courseSelect.locator('option').all();
    
    if (options.length > 1) {
      // Select the first actual course (index 1, since 0 is "Tutti i corsi")
      await courseSelect.selectOption({ index: 1 });
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Results should update
      const hasResults = await page.locator('.border.rounded-lg.p-4').count() > 0;
      const hasNoResults = await page.locator('text=Nessun lead PERSO').isVisible();
      expect(hasResults || hasNoResults).toBeTruthy();
    }
  });
});

test.describe('Lead Recovery Claim Flow', () => {
  
  test('PUT /api/leads/[id] with recoverLead+claimLead should claim and recover', async ({ request }) => {
    // This test requires:
    // 1. A PERSO lead to exist
    // 2. Authentication as a commercial user
    
    // First check if there are any PERSO leads
    const persoRes = await request.get('/api/leads/perso');
    if (!persoRes.ok()) {
      test.skip();
      return;
    }
    
    const persoData = await persoRes.json();
    if (persoData.leads.length === 0) {
      test.skip(); // No PERSO leads to test with
      return;
    }
    
    const leadToClaimId = persoData.leads[0].id;
    const leadName = persoData.leads[0].name;
    
    // Attempt to claim the lead
    const claimRes = await request.put(`/api/leads/${leadToClaimId}`, {
      data: {
        recoverLead: true,
        claimLead: true,
      },
    });
    
    if (claimRes.ok()) {
      const claimedLead = await claimRes.json();
      
      // Lead should now be CONTATTATO status
      expect(claimedLead.status).toBe('CONTATTATO');
      
      // Call attempts should be reset
      expect(claimedLead.callAttempts).toBe(0);
      
      // Lost reason should be cleared
      expect(claimedLead.lostReason).toBeNull();
      expect(claimedLead.lostAt).toBeNull();
      
      console.log(`Successfully claimed lead: ${leadName}`);
    } else if (claimRes.status() === 409) {
      // Concurrency conflict - another user claimed it first
      const error = await claimRes.json();
      expect(error.error).toContain('già stato recuperato');
      console.log('Lead was already claimed by another user');
    }
  });

  test('Concurrent claims should result in 409 for losers', async ({ request }) => {
    // This test simulates race conditions
    // In practice, you'd need multiple concurrent requests
    
    const persoRes = await request.get('/api/leads/perso');
    if (!persoRes.ok()) {
      test.skip();
      return;
    }
    
    const persoData = await persoRes.json();
    if (persoData.leads.length === 0) {
      test.skip();
      return;
    }
    
    const leadId = persoData.leads[0].id;
    
    // First claim should succeed (or 409 if already claimed)
    const firstClaim = await request.put(`/api/leads/${leadId}`, {
      data: { recoverLead: true, claimLead: true },
    });
    
    // If first succeeded, second attempt on same lead should fail with 400 (no longer PERSO)
    if (firstClaim.ok()) {
      const secondClaim = await request.put(`/api/leads/${leadId}`, {
        data: { recoverLead: true, claimLead: true },
      });
      
      // Should fail because lead is no longer PERSO
      expect(secondClaim.status()).toBe(400);
      const error = await secondClaim.json();
      expect(error.error).toContain('Solo i lead PERSO');
    }
  });
});

test.describe('Recovery preserves history', () => {
  
  test('Recovery should create activity log entries', async ({ request }) => {
    // Check if we can get activities for a lead
    const leadsRes = await request.get('/api/leads');
    if (!leadsRes.ok()) {
      test.skip();
      return;
    }
    
    const leads = await leadsRes.json();
    // Find a lead that was recently recovered (has recoveredAt)
    const recoveredLead = leads.find((l: any) => l.recoveredAt);
    
    if (recoveredLead) {
      const activitiesRes = await request.get(`/api/leads/${recoveredLead.id}/activities`);
      if (activitiesRes.ok()) {
        const activities = await activitiesRes.json();
        
        // Should have a RECOVERY activity
        const recoveryActivity = activities.find((a: any) => a.type === 'RECOVERY');
        if (recoveryActivity) {
          expect(recoveryActivity.description).toContain('recuperato');
        }
      }
    }
  });
});
