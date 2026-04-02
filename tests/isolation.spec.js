const { test, expect } = require('@playwright/test');

const API_BASE = 'http://localhost:3000';

test.describe('E2E Data Isolation Guarantee', () => {

  test('Tenant B absolutely cannot see Tenant A data', async ({ request }) => {
    
    // CRITICAL FIX 3: Dynamic Emails
    const suffixA = Date.now() + '-' + Math.random().toString(36).substring(7);
    const suffixB = Date.now() + 1 + '-' + Math.random().toString(36).substring(7);
    const emailA = `admin-${suffixA}@acmecorp.com`;
    const emailB = `admin-${suffixB}@globex.com`;
    
    // 1. Create Tenant A
    const resA = await request.post(`${API_BASE}/tenants/register`, {
      data: {
        tenantId: `tenant-a-${suffixA}`,
        tenantName: "ACME Corp",
        adminEmail: emailA,
        adminPassword: "password123"
      }
    });
    expect(resA.status()).toBe(201);
    const dataA = await resA.json();
    const tokenA = dataA.token;
    
    // 2. Create Tenant B
    const resB = await request.post(`${API_BASE}/tenants/register`, {
      data: {
        tenantId: `tenant-b-${suffixB}`,
        tenantName: "Globex",
        adminEmail: emailB,
        adminPassword: "password123"
      }
    });
    expect(resB.status()).toBe(201);
    const dataB = await resB.json();
    const tokenB = dataB.token;

    // 3. Tenant A creates a Secret Project
    const createProj = await request.post(`${API_BASE}/api/projects`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
      data: { name: "Secret Project Alpha", description: "World Domination" }
    });
    expect(createProj.status()).toBe(201);

    // 4. Tenant B attempts to fetch Projects
    const fetchProj = await request.get(`${API_BASE}/api/projects`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const fetchB = await fetchProj.json();

    // 5. Assert ZERO BLEED - B has 0 projects
    expect(fetchB.count).toBe(0);
    expect(fetchB.data).toEqual([]);
    
    // Safety verification: Ensure A *can* see Alpha
    const fetchA = await request.get(`${API_BASE}/api/projects`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const projectsA = await fetchA.json();
    expect(projectsA.data[0].name).toBe("Secret Project Alpha");
  });
});
