# E-COMMERCE APPLICATION BUILD PLAN

# Target: OLYMPUS 2.0 (vito project)

# Date: January 15, 2026

## PHASE 1: DATA LAYER (store.ts)

- [ ] 1.1 Create src/lib/store.ts with mock data
  - products array (id, name, price, stock, image, category)
  - orders array (id, customer, total, status, date, items)
  - customers array (id, name, email, orders, totalSpent)
  - daily_revenue array (14+ days of revenue data)
- [ ] 1.2 Create types for all entities
- [ ] 1.3 Export functions to access/update data

## PHASE 2: API ROUTES

- [ ] 2.1 Products API
  - GET /api/products
  - POST /api/products
  - GET /api/products/[id]
  - PUT /api/products/[id]
  - DELETE /api/products/[id]
- [ ] 2.2 Orders API
  - GET /api/orders
  - POST /api/orders
  - GET /api/orders/[id]
  - PUT /api/orders/[id]
- [ ] 2.3 Customers API
  - GET /api/customers
  - GET /api/customers/[id]
- [ ] 2.4 Newsletter API
  - POST /api/newsletter
  - Check RESEND_API_KEY, show demo message if missing

## PHASE 3: UI COMPONENTS

- [ ] 3.1 DataTable component (reusable)
- [ ] 3.2 Modal component
- [ ] 3.3 ConfirmationModal component
- [ ] 3.4 StatusBadge component
- [ ] 3.5 AnimatedCounter component
- [ ] 3.6 Toast component (for notifications)

## PHASE 4: DASHBOARD PAGE

- [ ] 4.1 Replace existing dashboard with e-commerce stats
- [ ] 4.2 Animated counter stats (revenue, orders, customers)
- [ ] 4.3 Revenue chart (14+ data points from store.ts)
- [ ] 4.4 Top products chart
- [ ] 4.5 Quick actions grid

## PHASE 5: PRODUCTS PAGE

- [ ] 5.1 Create /products page
- [ ] 5.2 DataTable with products listing
- [ ] 5.3 Add Product button → opens modal form
- [ ] 5.4 Edit button → populates form with existing data
- [ ] 5.5 Delete button → confirmation modal → DELETE /api/products/[id]
- [ ] 5.6 All buttons MUST have real onClick handlers

## PHASE 6: ORDERS PAGE

- [ ] 6.1 Create /orders page
- [ ] 6.2 DataTable with orders
- [ ] 6.3 Status badges (pending, processing, shipped, delivered, cancelled)
- [ ] 6.4 View Order button → /orders/[id] page

## PHASE 7: CUSTOMERS PAGE

- [ ] 7.1 Create /customers page
- [ ] 7.2 DataTable with customer info

## PHASE 8: SETTINGS PAGE

- [ ] 8.1 Create settings page with dark mode toggle
- [ ] 8.2 Toggle must persist to localStorage
- [ ] 8.3 Toggle MUST actually change appearance

## PHASE 9: NEWSLETTER

- [ ] 9.1 Add newsletter section to footer/sidebar
- [ ] 9.2 Email input + Subscribe button
- [ ] 9.3 Check RESEND_API_KEY
- [ ] 9.4 If no API key: Show "Demo mode - Would send email to {email}" (blue/info toast)
- [ ] 9.5 If API key: Actually send email
- [ ] 9.6 FORBIDDEN: "Thanks for subscribing!" or "Check your inbox"

## PHASE 10: QUALITY ASSURANCE

- [ ] 10.1 Verify all buttons have real onClick handlers
- [ ] 10.2 Verify all API routes exist and work
- [ ] 10.3 Verify delete operations actually remove data
- [ ] 10.4 Verify spacing (gap-2, p-4, space-y-4)
- [ ] 10.5 Run npm run type-check
- [ ] 10.6 Run npm run lint

## SPACING RULES

- Button groups: gap-2 minimum
- Card padding: p-4 minimum
- Form fields: space-y-4

## BUTTON RULES

- EVERY <button> MUST have onClick that DOES SOMETHING
- onClick={() => {}} is FORBIDDEN - BUILD FAILURE
- onClick must call API or change state
- Adjacent buttons MUST have gap-2 class

## START COMMAND

cd "C:\Users\SBS\Desktop\New folder (4)\vito\" && npm run dev

## SUCCESS CRITERIA

- All 10 features work
- Zero TypeScript errors
- Zero lint errors
- All buttons work
- All API routes exist
- Data persists (deletions are real)
