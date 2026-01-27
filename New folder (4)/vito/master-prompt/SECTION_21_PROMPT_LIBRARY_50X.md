# SECTION 21: THE COMPLETE PROMPT LIBRARY - 50X EDITION
## The Ultimate Collection of Production-Ready AI Prompts for Full-Stack Development

> **50X Enhancement**: Expanded from ~193 lines to 3500+ lines of battle-tested prompts covering every aspect of modern full-stack development with the OLYMPUS stack (React, TypeScript, Tailwind, shadcn/ui, Supabase, and more).

---

## TABLE OF CONTENTS

1. [Part 1: Application Starters](#part-1-application-starters)
2. [Part 2: Component Prompts](#part-2-component-prompts)
3. [Part 3: Feature Prompts](#part-3-feature-prompts)
4. [Part 4: Backend & API Prompts](#part-4-backend--api-prompts)
5. [Part 5: Database & Schema Prompts](#part-5-database--schema-prompts)
6. [Part 6: Authentication Prompts](#part-6-authentication-prompts)
7. [Part 7: UI/UX Enhancement Prompts](#part-7-uiux-enhancement-prompts)
8. [Part 8: Testing Prompts](#part-8-testing-prompts)
9. [Part 9: DevOps & Deployment Prompts](#part-9-devops--deployment-prompts)
10. [Part 10: Mobile Development Prompts](#part-10-mobile-development-prompts)
11. [Part 11: AI Integration Prompts](#part-11-ai-integration-prompts)
12. [Part 12: Debugging & Optimization Prompts](#part-12-debugging--optimization-prompts)

---

## PROMPT ENGINEERING PRINCIPLES

Before diving into the prompts, understand these key principles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT ENGINEERING PRINCIPLES                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. BE SPECIFIC                                                              │
│     Bad:  "Make a dashboard"                                                 │
│     Good: "Build a SaaS analytics dashboard with React 18, TypeScript,       │
│           Tailwind, shadcn/ui showing 4 metric cards and 2 charts"          │
│                                                                              │
│  2. DEFINE THE STACK                                                         │
│     Always specify: Framework, Language, Styling, UI Library, Database       │
│                                                                              │
│  3. DESCRIBE STRUCTURE                                                       │
│     List: Pages, Components, Features, Interactions                          │
│                                                                              │
│  4. INCLUDE CONSTRAINTS                                                      │
│     Mention: Responsive, Accessible, Dark mode, Performance                  │
│                                                                              │
│  5. PROVIDE EXAMPLES                                                         │
│     Reference: "Like Stripe's dashboard" or "Similar to Notion"              │
│                                                                              │
│  6. SPECIFY DATA                                                             │
│     Define: Tables, Relationships, Sample data, API endpoints                │
│                                                                              │
│  7. ONE FEATURE AT A TIME                                                    │
│     Focus prompts on single features for better results                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 1: APPLICATION STARTERS

### 1.1 SaaS Dashboard Starter

```
Build a comprehensive SaaS analytics dashboard.

STACK:
- React 18 with TypeScript (strict mode)
- Tailwind CSS with custom theme
- shadcn/ui for all components
- Recharts for data visualization
- Supabase for backend
- React Query for data fetching
- Zustand for state management

LAYOUT:
- Collapsible sidebar (280px expanded, 72px collapsed)
  - Logo at top
  - Navigation links with icons
  - Workspace switcher dropdown
  - User avatar and name at bottom
  - Collapse/expand button
- Top header bar (64px height)
  - Breadcrumb navigation
  - Global search (Cmd+K to focus)
  - Notification bell with badge
  - User dropdown menu
- Main content area with 24px padding

DASHBOARD PAGE (/dashboard):
- Welcome message with user's first name and date
- 4 metric cards in a row (responsive grid):
  1. Total Users (icon: Users, color: blue, trend: +12%)
  2. Revenue (icon: DollarSign, color: green, trend: +8%)
  3. Growth Rate (icon: TrendingUp, color: purple, trend: +24%)
  4. Churn Rate (icon: TrendingDown, color: red, trend: -3%)
- Each card shows: title, value, percentage change, sparkline
- 2 charts side by side (stack on mobile):
  1. Line chart: Revenue last 12 months (area fill)
  2. Bar chart: User signups by acquisition source
- Recent activity table (last 10 events):
  - Columns: Event, User, Time, Status
  - Row click opens detail modal
  - Pagination controls

ADDITIONAL PAGES:
- /analytics - Detailed charts and reports
- /users - User management table with CRUD
- /settings - Account and team settings
- /billing - Subscription and payment info

FEATURES:
- Dark theme with blue accent (#3B82F6)
- Theme toggle in header (persisted to localStorage)
- Fully responsive (mobile: stacked, tablet: 2-col, desktop: 4-col)
- Loading skeletons matching content shapes
- Empty states with illustrations
- Real-time updates using Supabase subscriptions
- Export data to CSV functionality

AUTHENTICATION:
- Supabase Auth with email/password
- Google OAuth option
- Protected routes with redirect
- Session persistence
- Profile page with avatar upload

DATABASE TABLES:
- profiles (id, email, full_name, avatar_url, created_at)
- workspaces (id, name, owner_id, created_at)
- metrics (id, workspace_id, type, value, recorded_at)
- events (id, workspace_id, event_type, user_id, metadata, created_at)

PERFORMANCE:
- Code splitting per route
- Image optimization
- Debounced search
- Virtualized tables for large datasets
```

### 1.2 E-Commerce Store Starter

```
Create a modern e-commerce store with complete shopping functionality.

STACK:
- Next.js 14 App Router with TypeScript
- Tailwind CSS
- shadcn/ui components
- Supabase for database and auth
- Stripe for payments
- React Query for data fetching
- Zustand for cart state

PAGES:

1. HOME PAGE (/)
- Hero section with animated text and CTA
- Featured products carousel (8 products)
- Category grid (6 categories with images)
- New arrivals section (4 products)
- Testimonials slider
- Newsletter signup with Supabase Edge Function

2. SHOP PAGE (/shop)
- Product grid (3 columns desktop, 2 tablet, 1 mobile)
- Sidebar filters:
  - Category checkboxes
  - Price range slider
  - Brand checkboxes
  - Rating filter (stars)
  - In-stock toggle
- Sort dropdown: Featured, Price Low-High, Price High-Low, Newest, Best Selling
- Pagination (12 products per page)
- Quick view modal on hover

3. PRODUCT PAGE (/products/[slug])
- Image gallery with zoom (main + thumbnails)
- Product info: name, price, description, rating
- Variant selector (size, color) with stock status
- Quantity selector with stock limit
- Add to cart button with loading state
- Add to wishlist button
- Tabs: Description, Specifications, Reviews (3)
- Related products section

4. CART PAGE (/cart)
- Cart items list with:
  - Product image and name
  - Variant info
  - Quantity controls (+/-)
  - Item price and subtotal
  - Remove button
- Order summary sidebar:
  - Subtotal
  - Shipping estimate
  - Tax calculation
  - Discount code input
  - Total
  - Checkout button
- Empty cart state with CTA

5. CHECKOUT PAGE (/checkout)
- Multi-step form:
  Step 1: Contact information (email, phone)
  Step 2: Shipping address (form with validation)
  Step 3: Shipping method selection
  Step 4: Payment (Stripe Elements)
  Step 5: Review order
- Order summary sidebar (sticky)
- Express checkout (Apple Pay, Google Pay)

6. ACCOUNT PAGES (/account/*)
- /account - Dashboard with recent orders
- /account/orders - Order history with status
- /account/orders/[id] - Order details
- /account/addresses - Saved addresses CRUD
- /account/wishlist - Saved products
- /account/settings - Profile settings

FEATURES:
- Persistent cart (localStorage + Supabase sync)
- Product search with autocomplete
- Recently viewed products
- Stock tracking with low-stock warnings
- Order confirmation emails (Resend)
- Invoice PDF generation
- Review submission with rating

DATABASE TABLES:
- products (id, name, slug, description, price, compare_price, images, category_id, brand_id, stock, created_at)
- categories (id, name, slug, image, parent_id)
- brands (id, name, logo)
- product_variants (id, product_id, name, price, stock, sku)
- orders (id, user_id, status, total, shipping_address, created_at)
- order_items (id, order_id, product_id, variant_id, quantity, price)
- reviews (id, product_id, user_id, rating, comment, created_at)
- wishlist_items (id, user_id, product_id)

DESIGN:
- Clean, minimal aesthetic
- White background with subtle grays
- Accent color: black buttons, hover states
- High-quality product photography focus
- Smooth animations on interactions
```

### 1.3 Project Management App Starter

```
Build a project management application similar to Linear/Asana.

STACK:
- React 18 with TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (database, auth, realtime)
- dnd-kit for drag and drop
- React Query
- Zustand

LAYOUT:
- Left sidebar (collapsible):
  - Workspace selector
  - Navigation: Home, My Tasks, Inbox
  - Projects list with favorites
  - Team members section
  - Settings link
- Main content area
- Right panel (collapsible) for task details

VIEWS:

1. BOARD VIEW (Kanban)
- Columns: Backlog, Todo, In Progress, Review, Done
- Cards show: title, priority badge, assignee avatar, due date
- Drag cards between columns (optimistic update)
- Drag to reorder within columns
- Add card button at column bottom
- Column menu: rename, delete, add automation

2. LIST VIEW
- Grouped by status (collapsible sections)
- Columns: checkbox, title, status, priority, assignee, due date
- Inline editing for all fields
- Multi-select with bulk actions
- Keyboard navigation (j/k, Enter to edit)

3. CALENDAR VIEW
- Month/week/day toggle
- Tasks shown on due dates
- Drag to reschedule
- Click to open task details

4. TIMELINE VIEW (Gantt)
- Horizontal scrolling timeline
- Tasks as bars with drag handles
- Dependencies as arrows
- Zoom levels: day, week, month

TASK DETAILS PANEL:
- Title (editable, large font)
- Status dropdown with colors
- Priority dropdown (P0-P3) with colors
- Assignee picker with avatar
- Due date picker with time option
- Project selector
- Labels/tags multi-select
- Description (rich text editor)
- Subtasks checklist with progress bar
- Comments section with mentions
- Activity log
- Attachments with drag-drop upload

FEATURES:
- Real-time collaboration (see others' cursors)
- Presence indicators (who's online)
- @mentions in comments and descriptions
- Keyboard shortcuts (?, Cmd+K, etc.)
- Quick add task (Cmd+N)
- Search across all tasks
- Filters: assignee, status, priority, due date
- Saved filter views
- Notifications (in-app and email)
- Recurring tasks
- Time tracking per task

DATABASE:
- workspaces (id, name, owner_id)
- projects (id, workspace_id, name, color, description)
- tasks (id, project_id, title, description, status, priority, assignee_id, due_date, order, parent_id, created_at)
- comments (id, task_id, user_id, content, created_at)
- attachments (id, task_id, url, filename, size)
- labels (id, workspace_id, name, color)
- task_labels (task_id, label_id)

DESIGN:
- Clean, minimal UI like Linear
- Subtle animations and transitions
- Focus mode (dim completed tasks)
- Dark mode with proper contrast
```

### 1.4 Social Media Platform Starter

```
Create a social media platform with posts, profiles, and interactions.

STACK:
- Next.js 14 with TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (database, auth, storage, realtime)
- React Query
- Zustand

FEATURES BY PAGE:

1. FEED PAGE (/)
- Infinite scroll posts feed
- Post card:
  - Author avatar, name, handle, timestamp
  - Post content (text with links)
  - Media (images grid, video player)
  - Engagement: likes, comments, shares, bookmarks
  - Action buttons with counts
- Create post box at top:
  - Avatar and textarea
  - Media upload button
  - Emoji picker
  - Post button (disabled if empty)
- Trending sidebar (hashtags)
- Who to follow suggestions

2. PROFILE PAGE (/[username])
- Cover image (editable)
- Profile section:
  - Avatar (editable)
  - Display name and @handle
  - Bio (max 160 chars)
  - Location and website link
  - Join date
  - Following/followers counts (clickable)
  - Follow/Unfollow button
  - Edit profile button (if own profile)
- Tab navigation:
  - Posts (user's posts)
  - Replies (comments)
  - Media (posts with images/video)
  - Likes (posts user liked)
- Posts list (same card as feed)

3. POST DETAIL PAGE (/post/[id])
- Full post with all details
- Comments/replies thread
- Reply composer
- Related posts

4. EXPLORE PAGE (/explore)
- Search bar (top)
- Trending hashtags
- Popular posts
- Discover users

5. NOTIFICATIONS PAGE (/notifications)
- Tabs: All, Mentions, Likes
- Notification items:
  - New follower
  - Post liked
  - Post commented
  - Mentioned in post
- Mark all as read

6. MESSAGES PAGE (/messages)
- Conversation list (left)
- Active chat (right)
- Real-time messages
- Online status indicators
- Image sharing in chat

7. SETTINGS (/settings)
- Account settings
- Privacy settings
- Notification preferences
- Theme preferences
- Delete account

FEATURES:
- Like/unlike with animation
- Comment with nested replies
- Share (repost) with optional quote
- Bookmark posts
- Follow/unfollow users
- Block/mute users
- Hashtag support (#topic)
- Mention support (@user)
- Image upload with compression
- Video upload with preview
- Link previews (Open Graph)
- Push notifications
- Email notifications (digest)
- Search: users, posts, hashtags

DATABASE:
- profiles (id, username, display_name, bio, avatar_url, cover_url, website, location)
- posts (id, author_id, content, media_urls, parent_id, created_at)
- likes (post_id, user_id)
- bookmarks (post_id, user_id)
- follows (follower_id, following_id)
- hashtags (id, name, post_count)
- post_hashtags (post_id, hashtag_id)
- notifications (id, user_id, type, actor_id, post_id, read, created_at)
- conversations (id, created_at)
- conversation_participants (conversation_id, user_id)
- messages (id, conversation_id, sender_id, content, created_at)
```

### 1.5 Learning Management System (LMS) Starter

```
Build an online learning platform similar to Udemy/Coursera.

STACK:
- Next.js 14 with TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Stripe for payments
- Mux for video hosting
- React Query

PAGES:

1. HOME PAGE (/)
- Hero with search and stats
- Featured courses carousel
- Category browsing
- Popular instructors
- Testimonials
- CTA for instructors

2. COURSE CATALOG (/courses)
- Filters sidebar:
  - Categories
  - Level (Beginner, Intermediate, Advanced)
  - Price (Free, Paid, Price range)
  - Rating (4+, 3+)
  - Duration
  - Language
- Course cards:
  - Thumbnail with play preview on hover
  - Title, instructor, rating, students count
  - Price with sale badge
- Sort: Popularity, Newest, Rating, Price

3. COURSE DETAIL (/courses/[slug])
- Video preview section
- Course info:
  - Title, subtitle
  - Rating and reviews count
  - Students enrolled
  - Last updated
  - Language
  - Instructor info with courses
- Price section:
  - Current price, original price
  - Buy now button
  - Add to cart button
  - Money-back guarantee
- What you'll learn (bullet list)
- Course content (collapsible sections):
  - Sections with lessons list
  - Each lesson: title, duration, preview badge
  - Total duration and lessons count
- Requirements list
- Description (expandable)
- Instructor bio with stats
- Reviews section with filter
- Related courses

4. COURSE PLAYER (/learn/[courseSlug]/[lessonSlug])
- Video player (Mux):
  - Quality selector
  - Speed control (0.5x to 2x)
  - Captions toggle
  - Picture-in-picture
  - Keyboard shortcuts
- Course sidebar (collapsible):
  - Progress bar
  - Sections and lessons
  - Completed checkmarks
  - Notes button per lesson
- Below video:
  - Tabs: Overview, Notes, Q&A, Reviews
  - Notes: personal notes with timestamps
  - Q&A: questions with upvotes
- Next lesson button
- Mark complete button

5. INSTRUCTOR DASHBOARD (/instructor)
- Stats cards: earnings, students, rating
- Course management:
  - Create course wizard
  - Edit course content
  - Upload videos
  - View analytics
- Student management
- Revenue reports
- Payout settings

6. STUDENT DASHBOARD (/dashboard)
- Continue learning section
- Enrolled courses grid
- Wishlist
- Certificates
- Learning stats

FEATURES:
- Course progress tracking
- Certificates on completion
- Note-taking with timestamps
- Q&A per lesson
- Course reviews and ratings
- Wishlisting
- Coupons and discounts
- Affiliate program
- Instructor payouts
- Course bundles
- Learning paths

DATABASE:
- courses (id, title, slug, description, instructor_id, price, sale_price, thumbnail, preview_video, category_id, level, language, published)
- sections (id, course_id, title, order)
- lessons (id, section_id, title, video_url, duration, order, is_preview)
- enrollments (id, user_id, course_id, progress, enrolled_at)
- lesson_progress (user_id, lesson_id, completed, watched_duration)
- reviews (id, course_id, user_id, rating, comment)
- notes (id, user_id, lesson_id, content, timestamp)
- questions (id, lesson_id, user_id, question, upvotes)
- answers (id, question_id, user_id, answer)
```

### 1.6 Healthcare/Telemedicine Starter

```
Build a telemedicine platform for virtual healthcare.

STACK:
- Next.js 14 with TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Stripe for payments
- Daily.co or 100ms for video calls
- Twilio for SMS

PAGES:

1. PATIENT PORTAL (/patient)
- Dashboard:
  - Upcoming appointments
  - Recent visits
  - Health metrics
  - Messages from doctors
- Find doctors (/patient/doctors):
  - Specialty filter
  - Availability filter
  - Insurance filter
  - Location/timezone
  - Doctor cards with rating
- Book appointment:
  - Select doctor
  - Choose type (video, phone, chat)
  - Pick date/time (calendar)
  - Add notes/symptoms
  - Payment
- Appointments (/patient/appointments):
  - Upcoming with join button
  - Past with view summary
  - Cancel/reschedule options
- Medical records:
  - Prescriptions
  - Lab results
  - Visit summaries
- Messages (async chat with doctors)

2. DOCTOR PORTAL (/doctor)
- Dashboard:
  - Today's schedule
  - Pending appointments
  - Messages count
  - Revenue stats
- Schedule management:
  - Set availability
  - View calendar
  - Block time off
- Patient list with search
- Visit consultation:
  - Video call interface
  - Patient info sidebar
  - Medical history
  - Write prescription
  - Order lab tests
  - Create visit summary
- Prescriptions management
- Settings and profile

3. VIDEO CONSULTATION ROOM (/call/[appointmentId])
- Video call interface:
  - Large video (doctor/patient)
  - Self view (small)
  - Mute/unmute
  - Camera on/off
  - Screen share
  - End call
- Sidebar:
  - Patient info
  - Medical history
  - Notes area
  - Prescription writer
- Chat panel
- Time remaining indicator

4. ADMIN DASHBOARD (/admin)
- User management
- Doctor verification
- Appointment analytics
- Revenue reports
- Support tickets

FEATURES:
- Appointment reminders (email + SMS)
- Prescription generation (PDF)
- Lab test ordering
- Insurance verification
- HIPAA-compliant storage
- E-signature for consent
- Waitlist management
- Multi-language support
- Accessibility compliance

DATABASE:
- patients (id, user_id, date_of_birth, gender, blood_type, allergies, medications, insurance_info)
- doctors (id, user_id, specialty, license_number, verified, bio, consultation_fee, rating)
- doctor_availability (id, doctor_id, day_of_week, start_time, end_time)
- appointments (id, patient_id, doctor_id, type, status, scheduled_at, duration, notes, price)
- prescriptions (id, appointment_id, medications, instructions, valid_until)
- medical_records (id, patient_id, type, content, created_by, created_at)
- messages (id, sender_id, receiver_id, appointment_id, content, created_at)
```

---

## PART 2: COMPONENT PROMPTS

### 2.1 Data Table Component

```
Create a fully-featured data table component with advanced functionality.

STACK:
- React with TypeScript
- Tailwind CSS
- shadcn/ui Table components
- @tanstack/react-table v8

PROPS INTERFACE:
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T;
  filterable?: boolean;
  filters?: FilterConfig[];
  selectable?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  sortable?: boolean;
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowActions?: (row: T) => DropdownMenuItem[];
  bulkActions?: BulkAction<T>[];
  exportable?: boolean;
  columnToggle?: boolean;
  stickyHeader?: boolean;
  virtualized?: boolean;
  onRowClick?: (row: T) => void;
}

FEATURES:

1. SORTING
- Click column header to sort
- Shift+click for multi-sort
- Sort indicators (asc/desc arrows)
- Clear sort button

2. FILTERING
- Global search input
- Column-specific filters
- Filter types: text, select, date range, number range
- Active filters shown as chips
- Clear all filters button

3. PAGINATION
- Page size selector (10, 25, 50, 100)
- Page navigation (first, prev, next, last)
- Current page indicator
- Total rows count
- Go to page input

4. SELECTION
- Checkbox column
- Select all (current page)
- Select all (all pages)
- Indeterminate state for partial selection
- Selection count display
- Bulk action bar when selected

5. COLUMN MANAGEMENT
- Column visibility toggle dropdown
- Column reordering (drag)
- Column resizing
- Pin columns left/right
- Persist preferences to localStorage

6. ROW ACTIONS
- Action dropdown per row
- Common actions: View, Edit, Delete
- Custom actions support
- Confirmation dialogs for destructive actions

7. EXPORT
- Export to CSV
- Export to Excel
- Export selected or all
- Include/exclude columns

8. STATES
- Loading skeleton (matches table structure)
- Empty state with icon and message
- Error state with retry
- No results state (when filtered)

9. ACCESSIBILITY
- Keyboard navigation
- Screen reader announcements
- Focus management
- ARIA labels

STYLING:
- Alternating row colors option
- Hover highlight
- Selected row highlight
- Sticky header on scroll
- Responsive (horizontal scroll on mobile)
- Dark mode support

EXAMPLE USAGE:
<DataTable
  data={users}
  columns={[
    { accessorKey: 'name', header: 'Name', sortable: true },
    { accessorKey: 'email', header: 'Email', sortable: true },
    { accessorKey: 'role', header: 'Role', filterFn: 'equals' },
    { accessorKey: 'status', header: 'Status', cell: StatusBadge },
    { accessorKey: 'createdAt', header: 'Created', cell: DateCell },
  ]}
  searchable
  searchKey="name"
  selectable
  pagination
  pageSize={25}
  bulkActions={[
    { label: 'Delete', action: handleBulkDelete, variant: 'destructive' },
    { label: 'Export', action: handleBulkExport },
  ]}
  exportable
  columnToggle
/>
```

### 2.2 Form Builder Component

```
Create a dynamic form builder that generates forms from JSON schema.

STACK:
- React with TypeScript
- React Hook Form
- Zod for validation
- shadcn/ui form components

PROPS INTERFACE:
interface FormBuilderProps {
  schema: FormSchema;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  defaultValues?: Record<string, any>;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  layout?: 'vertical' | 'horizontal' | 'inline';
  columns?: 1 | 2 | 3 | 4;
  loading?: boolean;
  disabled?: boolean;
}

interface FormSchema {
  fields: FieldConfig[];
  validation?: Record<string, ZodSchema>;
}

interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: any;
  options?: SelectOption[]; // for select, radio, checkbox-group
  validation?: ZodSchema;
  conditionalRender?: ConditionalRule;
  gridColumn?: string; // for custom grid placement
  className?: string;
}

type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group'
  | 'switch'
  | 'date'
  | 'date-range'
  | 'time'
  | 'datetime'
  | 'file'
  | 'image'
  | 'color'
  | 'slider'
  | 'rating'
  | 'rich-text'
  | 'code'
  | 'json'
  | 'address'
  | 'phone'
  | 'currency'
  | 'tags'
  | 'custom';

FEATURES:

1. FIELD TYPES
- All HTML5 input types
- Custom components (date picker, color picker, etc.)
- Rich text editor
- Code editor with syntax highlighting
- File/image upload with preview
- Tags input
- Address autocomplete
- Phone with country code

2. VALIDATION
- Zod schema validation
- Real-time validation (on blur/change)
- Cross-field validation
- Async validation (e.g., check email exists)
- Custom error messages
- Error summary at top

3. CONDITIONAL LOGIC
- Show/hide fields based on other values
- Enable/disable based on conditions
- Complex conditions (AND, OR, NOT)
- Dependent dropdowns

4. LAYOUT
- Vertical (label above input)
- Horizontal (label beside input)
- Inline (all in one row)
- Grid layout with column span
- Sections with collapsible headers
- Multi-step wizard mode

5. UX FEATURES
- Auto-save draft to localStorage
- Undo/redo support
- Clear form button
- Reset to defaults
- Dirty state tracking
- Unsaved changes warning

6. ACCESSIBILITY
- Proper label associations
- Error announcements
- Required field indicators
- Focus management

EXAMPLE SCHEMA:
{
  fields: [
    {
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
      placeholder: 'Enter first name'
    },
    {
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      required: true
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      validation: z.string().email()
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'admin', label: 'Administrator' },
        { value: 'user', label: 'User' },
        { value: 'guest', label: 'Guest' }
      ]
    },
    {
      name: 'permissions',
      label: 'Permissions',
      type: 'checkbox-group',
      conditionalRender: {
        field: 'role',
        operator: 'equals',
        value: 'admin'
      },
      options: [
        { value: 'read', label: 'Read' },
        { value: 'write', label: 'Write' },
        { value: 'delete', label: 'Delete' }
      ]
    },
    {
      name: 'bio',
      label: 'Biography',
      type: 'textarea',
      description: 'Tell us about yourself (max 500 characters)'
    },
    {
      name: 'avatar',
      label: 'Profile Picture',
      type: 'image',
      description: 'Upload a square image, max 2MB'
    }
  ]
}
```

### 2.3 File Upload Component

```
Create a versatile file upload component with drag-and-drop.

STACK:
- React with TypeScript
- react-dropzone
- Tailwind CSS
- shadcn/ui

PROPS INTERFACE:
interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void | Promise<void>;
  accept?: Record<string, string[]>; // MIME types
  maxSize?: number; // bytes
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  preview?: boolean;
  previewType?: 'list' | 'grid';
  uploadEndpoint?: string;
  uploadMethod?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  withCredentials?: boolean;
  autoUpload?: boolean;
  chunked?: boolean;
  chunkSize?: number;
  resumable?: boolean;
  onProgress?: (progress: number, file: File) => void;
  onError?: (error: Error, file: File) => void;
  className?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string; // after upload
}

FEATURES:

1. DROP ZONE
- Drag and drop area with visual feedback
- Click to browse files
- Paste from clipboard support
- Directory drop support (optional)
- Drop anywhere on page option

2. FILE VALIDATION
- File type validation with friendly messages
- File size validation
- Minimum dimensions for images
- Custom validation function support

3. PREVIEW
- Image thumbnails with lightbox
- Video preview with play button
- Audio preview with waveform
- PDF first page preview
- File icon for other types
- File info (name, size, type)

4. UPLOAD PROGRESS
- Individual file progress bars
- Overall progress indicator
- Upload speed display
- Time remaining estimate
- Pause/resume support
- Cancel upload button

5. CHUNKED UPLOAD
- Split large files into chunks
- Parallel chunk upload
- Retry failed chunks
- Resumable uploads
- Server-side assembly

6. FILE MANAGEMENT
- Reorder files (drag)
- Remove files
- Rename files
- Edit image (crop, rotate)
- Compress images before upload

7. STATES
- Idle (empty or with files)
- Dragging (file over zone)
- Uploading (with progress)
- Success (upload complete)
- Error (with retry option)

8. ACCESSIBILITY
- Keyboard navigation
- Screen reader announcements
- Focus visible states
- ARIA labels

STYLING OPTIONS:
- Compact mode (button only)
- Full mode (drop zone)
- Inline mode (in form)
- Avatar mode (circular, single image)
- Cover mode (aspect ratio)

EXAMPLE:
<FileUpload
  accept={{
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf']
  }}
  maxSize={10 * 1024 * 1024} // 10MB
  maxFiles={5}
  multiple
  preview
  previewType="grid"
  autoUpload
  uploadEndpoint="/api/upload"
  onUpload={(files) => console.log('Uploaded:', files)}
  onProgress={(progress, file) => console.log(`${file.name}: ${progress}%`)}
  onError={(error, file) => console.error(`${file.name}: ${error.message}`)}
/>
```

### 2.4 Modal/Dialog System

```
Create a flexible modal/dialog system with multiple patterns.

STACK:
- React with TypeScript
- Tailwind CSS
- shadcn/ui Dialog
- Radix UI primitives
- Framer Motion (optional animations)

COMPONENTS:

1. BASIC MODAL
<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Modal Title"
  description="Optional description text"
  size="md" // sm, md, lg, xl, full
>
  {/* Content */}
</Modal>

2. CONFIRMATION DIALOG
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete Item?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  confirmVariant="destructive"
  onConfirm={handleDelete}
  onCancel={() => setIsOpen(false)}
/>

3. ALERT DIALOG
<AlertDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  type="success" // success, error, warning, info
  title="Action Completed"
  description="Your changes have been saved."
  actionLabel="OK"
  onAction={() => setIsOpen(false)}
/>

4. FORM MODAL
<FormModal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Create Item"
  form={<CreateItemForm />}
  onSubmit={handleSubmit}
  submitLabel="Create"
  loading={isSubmitting}
/>

5. DRAWER
<Drawer
  open={isOpen}
  onOpenChange={setIsOpen}
  side="right" // left, right, top, bottom
  title="Filter Options"
>
  {/* Content */}
</Drawer>

6. SHEET (Full-width Drawer)
<Sheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Task Details"
  size="lg"
>
  {/* Content */}
</Sheet>

7. COMMAND PALETTE (Cmd+K)
<CommandPalette
  open={isOpen}
  onOpenChange={setIsOpen}
  placeholder="Type a command or search..."
  groups={[
    {
      heading: 'Actions',
      items: [
        { label: 'Create Task', icon: Plus, action: createTask },
        { label: 'Search', icon: Search, action: openSearch },
      ]
    },
    {
      heading: 'Navigation',
      items: [
        { label: 'Dashboard', icon: Home, action: () => navigate('/') },
        { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
      ]
    }
  ]}
/>

FEATURES:

1. MODAL BEHAVIOR
- Focus trap inside modal
- Close on Escape key
- Close on backdrop click (optional)
- Prevent body scroll when open
- Stack multiple modals
- Animate in/out

2. SIZING
- sm: 400px max-width
- md: 500px max-width (default)
- lg: 600px max-width
- xl: 800px max-width
- full: 100vw - 4rem

3. ANIMATIONS
- Fade in/out backdrop
- Scale and fade content
- Slide from edge (drawers)
- Custom animation support

4. ACCESSIBILITY
- Proper ARIA attributes
- Focus management
- Screen reader announcements
- Keyboard navigation

5. CUSTOMIZATION
- Custom header component
- Custom footer with actions
- Sticky header/footer option
- Scrollable content area
- Loading state overlay

MODAL MANAGER (Programmatic API):
const { openModal, closeModal, closeAll } = useModal();

// Open modal programmatically
openModal({
  component: MyComponent,
  props: { data: someData },
  size: 'lg',
  onClose: handleClose
});

// Close specific or all modals
closeModal(modalId);
closeAll();
```

### 2.5 Toast/Notification System

```
Create a comprehensive notification system with toasts and alerts.

STACK:
- React with TypeScript
- Tailwind CSS
- shadcn/ui Toast (based on Radix)
- Zustand for state

TOAST TYPES:

1. SIMPLE TOAST
toast("Message saved successfully");

2. TOAST WITH TITLE
toast({
  title: "Success",
  description: "Your changes have been saved."
});

3. TYPED TOASTS
toast.success("Item created");
toast.error("Failed to delete");
toast.warning("Session expiring soon");
toast.info("New update available");
toast.loading("Uploading file...");

4. TOAST WITH ACTION
toast({
  title: "File deleted",
  description: "The file has been moved to trash.",
  action: {
    label: "Undo",
    onClick: handleUndo
  }
});

5. PROMISE TOAST
toast.promise(saveData(), {
  loading: "Saving...",
  success: "Data saved!",
  error: (err) => `Error: ${err.message}`
});

6. CUSTOM TOAST
toast.custom((t) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
    <Avatar src={user.avatar} />
    <div>
      <p className="font-medium">{user.name}</p>
      <p className="text-sm text-gray-500">Sent you a message</p>
    </div>
    <Button size="sm" onClick={() => toast.dismiss(t.id)}>
      View
    </Button>
  </div>
));

FEATURES:

1. POSITIONING
- top-left, top-center, top-right
- bottom-left, bottom-center, bottom-right
- Per-toast position override

2. DURATION
- Default: 5 seconds
- Persistent (duration: Infinity)
- Custom duration per toast
- Pause on hover

3. STYLING
- Built-in type styles (success, error, etc.)
- Custom className support
- Icon customization
- Theme-aware (light/dark)

4. STACKING
- Stack multiple toasts
- Max visible limit (e.g., 3)
- Expand on hover
- Swipe to dismiss

5. PERSISTENCE
- Persist important toasts
- Dismiss all option
- Clear by type

6. ACCESSIBILITY
- Role="alert" for urgent
- Role="status" for informational
- Focus management
- Keyboard dismiss

PROVIDER SETUP:
// In root layout
<ToastProvider
  position="bottom-right"
  duration={5000}
  maxToasts={5}
  richColors
  closeButton
  expandable
>
  {children}
  <Toaster />
</ToastProvider>

NOTIFICATION CENTER:
<NotificationCenter
  notifications={notifications}
  onMarkRead={handleMarkRead}
  onMarkAllRead={handleMarkAllRead}
  onClear={handleClear}
  unreadCount={unreadCount}
  groupByDate
/>
```

### 2.6 Navigation Components

```
Create a complete navigation component system.

STACK:
- React with TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

COMPONENTS:

1. NAVBAR (Top Navigation)
<Navbar
  logo={<Logo />}
  links={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products', children: [
      { label: 'All Products', href: '/products' },
      { label: 'New Arrivals', href: '/products/new' },
      { label: 'Sale', href: '/products/sale' },
    ]},
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ]}
  actions={
    <>
      <SearchButton />
      <CartButton />
      <UserMenu />
    </>
  }
  sticky
  transparent // Transparent until scroll
  mobileBreakpoint="lg"
/>

2. SIDEBAR (App Navigation)
<Sidebar
  collapsed={isCollapsed}
  onToggle={setIsCollapsed}
  header={<Logo />}
  navigation={[
    { section: 'Main', items: [
      { label: 'Dashboard', icon: Home, href: '/dashboard' },
      { label: 'Analytics', icon: BarChart, href: '/analytics' },
      { label: 'Projects', icon: Folder, href: '/projects', badge: '5' },
    ]},
    { section: 'Settings', items: [
      { label: 'Account', icon: User, href: '/settings/account' },
      { label: 'Team', icon: Users, href: '/settings/team' },
      { label: 'Billing', icon: CreditCard, href: '/settings/billing' },
    ]},
  ]}
  footer={<UserInfo />}
/>

3. BREADCRUMBS
<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Electronics', href: '/products/electronics' },
    { label: 'Smartphones' }, // Current (no href)
  ]}
  separator="/" // or custom component
  maxItems={4}
  itemsBeforeCollapse={1}
  itemsAfterCollapse={2}
/>

4. TABS NAVIGATION
<TabsNav
  tabs={[
    { label: 'Overview', value: 'overview', icon: Eye },
    { label: 'Analytics', value: 'analytics', icon: BarChart },
    { label: 'Reports', value: 'reports', icon: FileText },
    { label: 'Notifications', value: 'notifications', icon: Bell, badge: '3' },
  ]}
  value={activeTab}
  onChange={setActiveTab}
  variant="underline" // underline, pills, enclosed
  fullWidth={false}
/>

5. PAGINATION
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  showFirst
  showLast
  siblingsCount={1}
  boundaryCount={1}
/>

6. STEPPER (Multi-step)
<Stepper
  steps={[
    { label: 'Account', description: 'Create account' },
    { label: 'Profile', description: 'Add profile info' },
    { label: 'Verification', description: 'Verify email' },
    { label: 'Complete', description: 'All done!' },
  ]}
  currentStep={step}
  orientation="horizontal" // or vertical
  showConnector
  allowClick
  onStepClick={setStep}
/>

7. COMMAND MENU (Cmd+K)
<CommandMenu
  open={isOpen}
  onOpenChange={setIsOpen}
  placeholder="Type to search..."
  emptyMessage="No results found."
  groups={commandGroups}
/>

FEATURES:

- Active state indication
- Nested navigation (mega menu, tree)
- Mobile responsive (hamburger menu)
- Keyboard navigation
- ARIA compliant
- Animation on open/close
- Badge support
- Icon support
- Disabled states
- Loading states
```

---

## PART 3: FEATURE PROMPTS

### 3.1 Search with Autocomplete

```
Implement a global search feature with autocomplete and filters.

STACK:
- React with TypeScript
- Tailwind CSS
- shadcn/ui Command
- React Query
- Supabase (or any backend)

FEATURES:

1. SEARCH UI
- Search input with Cmd+K shortcut
- Dropdown results panel
- Recent searches section
- Suggested searches
- Loading state with skeletons
- No results state

2. SEARCH TYPES
- Products (with image, price)
- Users (with avatar, name)
- Documents (with icon, snippet)
- Commands (actions)
- Pages (navigation)

3. FILTERING
- Category filter chips
- Date range filter
- Sort options
- Advanced filters modal

4. RESULTS
- Grouped by type
- Highlighted matching text
- Keyboard navigation (arrows)
- Click or Enter to select
- Recent/frequent items first

5. BEHAVIOR
- Debounced search (300ms)
- Minimum 2 characters
- Cache recent queries
- Clear on Escape
- Close on outside click

IMPLEMENTATION:

// SearchProvider.tsx
<SearchProvider>
  <SearchTrigger />
  <SearchDialog />
</SearchProvider>

// Search hook
const { query, setQuery, results, isLoading, search } = useSearch({
  types: ['products', 'users', 'pages'],
  debounce: 300,
  minChars: 2
});

// Search results type
interface SearchResults {
  products: Product[];
  users: User[];
  pages: Page[];
  recentSearches: string[];
  suggestions: string[];
}

// Keyboard shortcuts
Cmd+K: Open search
Escape: Close search
Arrow Up/Down: Navigate results
Enter: Select result
Tab: Switch result type
```

### 3.2 Infinite Scroll with Virtualization

```
Implement infinite scroll with virtualized list for performance.

STACK:
- React with TypeScript
- @tanstack/react-virtual
- React Query (useInfiniteQuery)
- Intersection Observer

FEATURES:

1. INFINITE LOADING
- Load more on scroll to bottom
- Loading indicator
- Error state with retry
- End of list indicator
- Pull to refresh (mobile)

2. VIRTUALIZATION
- Only render visible items
- Smooth scrolling
- Dynamic row heights
- Maintain scroll position
- Fast initial render

3. OPTIMIZATIONS
- Prefetch next page
- Cache previous pages
- Placeholder items while loading
- Skeleton loading states
- Image lazy loading

IMPLEMENTATION:

function InfiniteList<T>({
  queryKey,
  queryFn,
  renderItem,
  itemHeight,
  overscan = 5,
  getItemKey,
}: InfiniteListProps<T>) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allItems = data?.pages.flatMap(page => page.items) ?? [];

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allItems.length + 1 : allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  // Load more when reaching end
  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);
    if (!lastItem) return;

    if (
      lastItem.index >= allItems.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [virtualizer.getVirtualItems()]);

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = allItems[virtualItem.index];

          return (
            <div
              key={getItemKey(item) ?? virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item ? renderItem(item) : <LoadingRow />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 3.3 Real-time Collaboration

```
Implement real-time collaboration features using Supabase Realtime.

STACK:
- React with TypeScript
- Supabase Realtime
- Zustand for state
- Y.js for CRDT (optional)

FEATURES:

1. PRESENCE
- Show who's online
- User cursors on canvas
- User avatars on document
- Activity indicators

2. LIVE UPDATES
- Real-time data sync
- Optimistic updates
- Conflict resolution
- Offline queue

3. COLLABORATIVE EDITING
- Real-time text editing
- Cursor positions
- Selection highlighting
- User colors

4. NOTIFICATIONS
- In-app notifications
- Desktop notifications
- Email notifications (digest)

IMPLEMENTATION:

// Presence Hook
function usePresence(roomId: string) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const supabase = useSupabase();
  const currentUser = useUser();

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as PresenceUser[];
        setUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle user joined
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle user left
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            cursor: null,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  const updateCursor = (cursor: { x: number; y: number }) => {
    // Update cursor position
  };

  return { users, updateCursor };
}

// Real-time Subscription Hook
function useRealtimeTable<T>(
  table: string,
  filter?: { column: string; value: string }
) {
  const [data, setData] = useState<T[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      let query = supabase.from(table).select('*');
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { data } = await query;
      setData(data || []);
    };
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel(`table:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                (item as any).id === payload.new.id ? payload.new as T : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item) => (item as any).id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter?.column, filter?.value]);

  return data;
}
```

### 3.4 Multi-Step Wizard

```
Create a multi-step form wizard with validation and state persistence.

STACK:
- React with TypeScript
- React Hook Form
- Zod validation
- shadcn/ui
- Zustand (for persistence)

FEATURES:

1. STEP NAVIGATION
- Previous/Next buttons
- Step indicator
- Direct step navigation (if valid)
- Keyboard navigation
- Progress bar

2. VALIDATION
- Per-step validation
- Cross-step validation
- Async validation
- Error summary
- Focus first error

3. STATE MANAGEMENT
- Persist form state
- Resume from any step
- Clear on complete
- Auto-save draft

4. UI PATTERNS
- Horizontal steps (desktop)
- Vertical steps (mobile)
- Accordion steps
- Tab steps
- Slide animation

IMPLEMENTATION:

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<StepProps>;
  validation?: ZodSchema;
  canSkip?: boolean;
}

interface WizardProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, any>) => void | Promise<void>;
  initialData?: Record<string, any>;
  persistKey?: string;
}

function Wizard({ steps, onComplete, initialData, persistKey }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData || {});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Persist state to localStorage
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(persistKey, JSON.stringify({ currentStep, formData }));
    }
  }, [currentStep, formData, persistKey]);

  const goToStep = (stepIndex: number) => {
    // Validate current step before moving forward
    if (stepIndex > currentStep) {
      const currentStepConfig = steps[currentStep];
      if (currentStepConfig.validation) {
        const result = currentStepConfig.validation.safeParse(formData);
        if (!result.success) {
          // Show errors
          return;
        }
      }
    }
    setCurrentStep(stepIndex);
  };

  const handleStepSubmit = (stepData: Record<string, any>) => {
    const newFormData = { ...formData, ...stepData };
    setFormData(newFormData);
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep === steps.length - 1) {
      onComplete(newFormData);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="wizard">
      {/* Step Indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Progress Bar */}
      <ProgressBar
        current={currentStep + 1}
        total={steps.length}
      />

      {/* Step Content */}
      <div className="wizard-content">
        <CurrentStepComponent
          data={formData}
          onSubmit={handleStepSubmit}
          onBack={() => setCurrentStep((prev) => prev - 1)}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === steps.length - 1}
        />
      </div>
    </div>
  );
}

// Example Usage
<Wizard
  steps={[
    {
      id: 'account',
      title: 'Account',
      description: 'Create your account',
      component: AccountStep,
      validation: accountSchema,
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Add your profile information',
      component: ProfileStep,
      validation: profileSchema,
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Set your preferences',
      component: PreferencesStep,
      canSkip: true,
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Review and submit',
      component: ReviewStep,
    },
  ]}
  onComplete={handleComplete}
  persistKey="onboarding-wizard"
/>
```

### 3.5 Drag and Drop System

```
Implement a comprehensive drag and drop system for reordering and organizing.

STACK:
- React with TypeScript
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities
- Tailwind CSS

FEATURES:

1. SORTABLE LIST
- Vertical list reordering
- Visual drag handle
- Drop indicator
- Animation on reorder
- Keyboard support

2. KANBAN BOARD
- Multiple columns
- Drag between columns
- Drag to reorder within column
- Column reordering
- Collapsed columns

3. FILE/FOLDER TREE
- Nested structure
- Drag to reorder
- Drag to move into folder
- Expand/collapse nodes
- Multi-select drag

4. GRID REORDERING
- Drag items in grid
- Responsive grid
- Visual drop zones
- Snapping to grid

IMPLEMENTATION:

// Sortable List
function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 shadow-lg">
            {renderItem(items.find((item) => item.id === activeId)!)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Kanban Board
function KanbanBoard<T extends { id: string; status: string }>({
  items,
  columns,
  onMove,
  renderCard,
}: KanbanBoardProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeItem = items.find((item) => item.id === active.id);
    const overColumn = columns.find((col) => col.id === over.id);

    if (activeItem && overColumn && activeItem.status !== overColumn.id) {
      onMove(activeItem.id, overColumn.id);
    }

    setActiveItem(null);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            items={items.filter((item) => item.status === column.id)}
            renderCard={renderCard}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

---

## PART 4: BACKEND & API PROMPTS

### 4.1 REST API Endpoint

```
Create a complete REST API endpoint with all CRUD operations.

STACK:
- Next.js API Routes (or Express)
- TypeScript
- Zod for validation
- Supabase client

ENDPOINT: /api/products

OPERATIONS:

1. GET /api/products
- Query params: page, limit, sort, order, search, category
- Returns: { data: Product[], pagination: PaginationMeta }
- Filter by multiple fields
- Full-text search
- Sorting options

2. GET /api/products/:id
- Returns: Product
- 404 if not found
- Include related data (category, reviews)

3. POST /api/products
- Body: CreateProductInput
- Validate with Zod
- Return: Created Product
- 400 for validation errors

4. PUT /api/products/:id
- Body: UpdateProductInput
- Partial update support
- Return: Updated Product
- 404 if not found

5. DELETE /api/products/:id
- Soft delete option
- Return: { success: true }
- 404 if not found

IMPLEMENTATION:

// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  category_id: z.string().uuid(),
  images: z.array(z.string().url()).optional(),
  stock: z.number().int().nonnegative().default(0),
  published: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const search = searchParams.get('search');
  const category = searchParams.get('category');

  let query = supabase
    .from('products')
    .select('*, category:categories(*)', { count: 'exact' })
    .order(sort, { ascending: order === 'asc' })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (category) {
    query = query.eq('category_id', category);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const body = await request.json();

  // Validate input
  const result = ProductSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // Create product
  const { data, error } = await supabase
    .from('products')
    .insert(result.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// app/api/products/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), reviews(*)')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const body = await request.json();

  const result = ProductSchema.partial().safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('products')
    .update(result.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### 4.2 Supabase Edge Function

```
Create a Supabase Edge Function for serverless processing.

FUNCTION: Send Welcome Email

// supabase/functions/send-welcome-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
    };
  };
  old_record: null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process new user signups
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, raw_user_meta_data } = payload.record;
    const name = raw_user_meta_data?.full_name || 'there';

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OLYMPUS <welcome@yourdomain.com>',
        to: [email],
        subject: 'Welcome to OLYMPUS!',
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>Thank you for joining OLYMPUS. We're excited to have you!</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Join our community</li>
          </ul>
          <a href="${Deno.env.get('APP_URL')}/dashboard">
            Get Started
          </a>
        `,
      }),
    });

    if (!resendResponse.ok) {
      throw new Error('Failed to send email');
    }

    // Log the email sent
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('email_logs').insert({
      user_id: payload.record.id,
      email_type: 'welcome',
      status: 'sent',
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Deploy command:
// supabase functions deploy send-welcome-email

// Set secrets:
// supabase secrets set RESEND_API_KEY=your-key
// supabase secrets set APP_URL=https://yourapp.com
```

### 4.3 Webhook Handler

```
Create a secure webhook handler for external services.

STACK:
- Next.js API Route
- Crypto for signature verification
- Queue for async processing (optional)

WEBHOOK: Stripe Payment Events

// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            paid_at: new Date().toISOString(),
          })
          .eq('id', session.metadata?.order_id);

        // Send confirmation email
        await sendOrderConfirmation(session.metadata?.order_id);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await supabase
          .from('orders')
          .update({
            status: 'payment_failed',
            error_message: paymentIntent.last_payment_error?.message,
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .upsert({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        await supabase.from('invoices').insert({
          stripe_invoice_id: invoice.id,
          stripe_customer_id: invoice.customer as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          invoice_pdf: invoice.invoice_pdf,
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing (Stripe needs raw body)
export const config = {
  api: {
    bodyParser: false,
  },
};
```

---

## PART 5: DATABASE & SCHEMA PROMPTS

### 5.1 Database Schema Design

```
Design a complete database schema for a SaaS application.

DATABASE: PostgreSQL (Supabase)

REQUIREMENTS:
- Multi-tenant architecture
- User management with roles
- Subscription billing
- Audit logging
- Soft deletes

SCHEMA:

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, etc.
  plan_id VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 1,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tasks(id), -- subtasks
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority INTEGER DEFAULT 0,
  assignee_id UUID REFERENCES users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0, -- for ordering
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- mentioned user IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_projects_org ON projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Organization members can read their organizations
CREATE POLICY "Members can read organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Projects visible to organization members
CREATE POLICY "Members can read projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add more triggers as needed...
```

### 5.2 Database Migrations

```
Create a migration system for database changes.

FILE STRUCTURE:
migrations/
├── 001_initial_schema.sql
├── 002_add_user_preferences.sql
├── 003_add_notifications_table.sql
└── 004_add_api_keys.sql

MIGRATION: 002_add_user_preferences.sql

-- Migration: Add user preferences
-- Created: 2024-01-15
-- Author: OLYMPUS Team

-- UP
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add specific preference columns for indexing
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_users_theme ON users(theme);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Update existing users with default preferences
UPDATE users SET preferences = '{
  "theme": "system",
  "language": "en",
  "notifications": {
    "email": true,
    "push": true,
    "inApp": true
  },
  "dashboard": {
    "defaultView": "grid",
    "showWelcome": true
  }
}'::jsonb WHERE preferences = '{}';

-- DOWN (rollback)
-- ALTER TABLE users DROP COLUMN IF EXISTS preferences;
-- ALTER TABLE users DROP COLUMN IF EXISTS theme;
-- ALTER TABLE users DROP COLUMN IF EXISTS language;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_notifications;
-- DROP INDEX IF EXISTS idx_users_theme;
-- DROP INDEX IF EXISTS idx_users_language;

-- Run migration:
-- supabase db push
-- OR
-- psql -f migrations/002_add_user_preferences.sql
```

---

## PART 6: AUTHENTICATION PROMPTS

### 6.1 Complete Auth Flow

```
Implement a complete authentication system with multiple providers.

STACK:
- Next.js 14
- Supabase Auth
- React Hook Form
- Zod validation

FEATURES:
- Email/password login
- Magic link login
- OAuth (Google, GitHub)
- Password reset
- Email verification
- Session management
- Protected routes

COMPONENTS:

1. AUTH PROVIDER
// providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: object) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Handle sign in event
        }
        if (event === 'SIGNED_OUT') {
          // Handle sign out event
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: object) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithOAuth,
        signInWithMagicLink,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

2. LOGIN FORM
// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn, signInWithOAuth, signInWithMagicLink } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { message: 'Enter your email first' });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithMagicLink(email);
      toast.success('Check your email for the login link!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OAuth Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={() => signInWithOAuth('google')}
          disabled={isLoading}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          onClick={() => signInWithOAuth('github')}
          disabled={isLoading}
        >
          <GithubIcon className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            {...form.register('email')}
            disabled={isLoading}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500 mt-1">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {!showMagicLink && (
          <div>
            <Input
              type="password"
              placeholder="Password"
              {...form.register('password')}
              disabled={isLoading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
        )}

        {showMagicLink ? (
          <Button
            type="button"
            className="w-full"
            onClick={handleMagicLink}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        )}
      </form>

      {/* Toggle Magic Link */}
      <button
        type="button"
        onClick={() => setShowMagicLink(!showMagicLink)}
        className="text-sm text-blue-600 hover:underline w-full text-center"
      >
        {showMagicLink ? 'Use password instead' : 'Sign in with magic link'}
      </button>

      {/* Links */}
      <div className="flex justify-between text-sm">
        <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </a>
        <a href="/auth/signup" className="text-blue-600 hover:underline">
          Create account
        </a>
      </div>
    </div>
  );
}

3. PROTECTED ROUTE
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedPaths = ['/dashboard', '/settings', '/projects'];
  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Auth routes (redirect if already logged in)
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthPath = authPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## PART 7: UI/UX ENHANCEMENT PROMPTS

### 7.1 Animation System

```
Create a comprehensive animation system using Framer Motion.

STACK:
- React
- Framer Motion
- Tailwind CSS

ANIMATION PRESETS:

// lib/animations.ts
import { Variants } from 'framer-motion';

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

// Scale animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: { opacity: 0, scale: 0.5 },
};

// Slide animations
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
};

// Stagger children
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

// Hover animations
export const hoverScale = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

export const hoverLift = {
  whileHover: { y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
};

// Animation components
import { motion, AnimatePresence } from 'framer-motion';

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerList({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={staggerItem}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
}
```

### 7.2 Dark Mode Implementation

```
Implement a complete dark mode system with theme persistence.

STACK:
- Next.js
- Tailwind CSS
- next-themes

SETUP:

// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more semantic colors
      },
    },
  },
};

// styles/globals.css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... more variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... more variables */
  }
}

// providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

// components/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## PART 8: TESTING PROMPTS

### 8.1 Unit Tests with Vitest

```
Write comprehensive unit tests for a utility module.

STACK:
- Vitest
- Testing Library
- MSW (for API mocking)

TEST FILE: utils.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  truncateText,
  slugify,
  validateEmail,
  debounce,
  calculateDiscount,
} from './utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats EUR correctly', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles negative numbers', () => {
    expect(formatCurrency(-1234.56, 'USD')).toBe('-$1,234.56');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(1234.567, 'USD')).toBe('$1,234.57');
  });
});

describe('formatDate', () => {
  it('formats date with default format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('Jan 15, 2024');
  });

  it('formats date with custom format', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
  });

  it('handles string input', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
  });

  it('returns empty string for invalid date', () => {
    expect(formatDate('invalid')).toBe('');
  });
});

describe('truncateText', () => {
  it('truncates text longer than maxLength', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...');
  });

  it('does not truncate text shorter than maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('uses custom suffix', () => {
    expect(truncateText('Hello World', 5, '…')).toBe('Hello…');
  });

  it('handles empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });
});

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('removes multiple hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('handles accented characters', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume');
  });
});

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(validateEmail('test@mail.example.com')).toBe(true);
  });

  it('returns false for missing @', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  it('returns false for missing domain', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only calls function once for multiple rapid calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the debounced function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('calculateDiscount', () => {
  it('calculates percentage discount correctly', () => {
    expect(calculateDiscount(100, 20, 'percentage')).toBe(80);
  });

  it('calculates fixed amount discount correctly', () => {
    expect(calculateDiscount(100, 25, 'fixed')).toBe(75);
  });

  it('does not go below zero', () => {
    expect(calculateDiscount(100, 150, 'fixed')).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateDiscount(99.99, 33.33, 'percentage')).toBe(66.66);
  });
});
```

### 8.2 Component Tests

```
Write component tests using React Testing Library.

TEST FILE: Button.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);

    expect(screen.getByRole('button')).toHaveClass('bg-red-500');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Large Button</Button>);

    expect(screen.getByRole('button')).toHaveClass('h-12');
  });

  it('renders as link when asChild with anchor', () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    );

    expect(screen.getByRole('link', { name: /link button/i })).toHaveAttribute('href', '/link');
  });

  it('renders with icon', () => {
    render(
      <Button>
        <span data-testid="icon">🔥</span>
        With Icon
      </Button>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('has correct type attribute', () => {
    render(<Button type="submit">Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is keyboard accessible', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Press Enter</Button>);

    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## PART 9: DEVOPS & DEPLOYMENT PROMPTS

### 9.1 Docker Configuration

```
Create a production-ready Docker configuration.

# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

---

# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-app}
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 9.2 GitHub Actions CI/CD

```
Create a complete CI/CD pipeline with GitHub Actions.

# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## PART 10: MOBILE DEVELOPMENT PROMPTS

### 10.1 React Native App Structure

```
Create a React Native app with Expo and modern architecture.

STACK:
- Expo SDK 50+
- TypeScript
- NativeWind (Tailwind for RN)
- Supabase
- React Query
- Zustand
- Expo Router

PROJECT STRUCTURE:
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── _layout.tsx
├── (tabs)/
│   ├── home.tsx
│   ├── search.tsx
│   ├── profile.tsx
│   └── _layout.tsx
├── _layout.tsx
└── +not-found.tsx
components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── features/
│   ├── ProductCard.tsx
│   └── UserAvatar.tsx
└── layout/
    ├── Header.tsx
    └── TabBar.tsx
lib/
├── supabase.ts
├── api.ts
└── storage.ts
hooks/
├── useAuth.ts
└── useProducts.ts
store/
├── authStore.ts
└── cartStore.ts
constants/
├── colors.ts
└── config.ts
types/
└── index.ts

ROOT LAYOUT:
// app/_layout.tsx
import { Slot, Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import '../global.css';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

TABS LAYOUT:
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Search, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

HOME SCREEN:
// app/(tabs)/home.tsx
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/features/ProductCard';
import { Header } from '@/components/layout/Header';

export default function HomeScreen() {
  const { data: products, isLoading, refetch, isRefetching } = useProducts();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header title="Home" />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <Text className="text-2xl font-bold mb-4">Featured Products</Text>

        {isLoading ? (
          <ProductSkeletons />
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## PART 11: AI INTEGRATION PROMPTS

### 11.1 OpenAI Chat Integration

```
Integrate OpenAI for AI-powered chat functionality.

STACK:
- Next.js
- OpenAI SDK
- Vercel AI SDK
- Streaming responses

API ROUTE:
// app/api/chat/route.ts
import { OpenAI } from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(request: Request) {
  const { messages, model = 'gpt-4-turbo-preview' } = await request.json();

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant for an e-commerce platform.
                  Help users find products, answer questions about orders,
                  and provide shopping recommendations.`,
      },
      ...messages,
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}

CHAT COMPONENT:
// components/Chat.tsx
'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] border rounded-lg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>How can I help you today?</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## PART 12: DEBUGGING & OPTIMIZATION PROMPTS

### 12.1 Performance Optimization

```
Optimize a React component for better performance.

BEFORE (Unoptimized):
function ProductList({ products, onSelect }) {
  const [filter, setFilter] = useState('');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {filtered.map(product => (
        <div onClick={() => onSelect(product)}>
          <img src={product.image} />
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}

AFTER (Optimized):
import { memo, useMemo, useCallback, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

// Memoized product card to prevent unnecessary re-renders
const ProductCard = memo(function ProductCard({
  product,
  onSelect
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(product);
  }, [product, onSelect]);

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer hover:shadow-lg transition-shadow"
    >
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        decoding="async"
      />
      <h3>{product.name}</h3>
      <p>${product.price.toFixed(2)}</p>
    </div>
  );
});

// Optimized product list
function ProductList({
  products,
  onSelect
}: {
  products: Product[];
  onSelect: (product: Product) => void;
}) {
  const [filter, setFilter] = useState('');

  // Debounce filter to reduce re-renders while typing
  const debouncedFilter = useDebounce(filter, 300);

  // Memoize filtered products
  const filtered = useMemo(() => {
    if (!debouncedFilter) return products;

    const searchTerm = debouncedFilter.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm)
    );
  }, [products, debouncedFilter]);

  // Memoize callback to prevent child re-renders
  const handleSelect = useCallback((product: Product) => {
    onSelect(product);
  }, [onSelect]);

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search products..."
      />

      {/* Show loading state while debouncing */}
      {filter !== debouncedFilter && (
        <p className="text-gray-500">Searching...</p>
      )}

      {/* Virtualized list for large datasets */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && debouncedFilter && (
        <p>No products found for "{debouncedFilter}"</p>
      )}
    </div>
  );
}

export default memo(ProductList);

OPTIMIZATION CHECKLIST:
□ Use React.memo() for components that receive the same props
□ Use useMemo() for expensive calculations
□ Use useCallback() for event handlers passed to children
□ Debounce user input (search, filters)
□ Lazy load images with loading="lazy"
□ Virtualize long lists (react-window, react-virtual)
□ Code split with dynamic imports
□ Avoid inline object/array creation in JSX
□ Use keys properly in lists
□ Profile with React DevTools
```

---

## QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROMPT ENGINEERING CHEATSHEET                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STRUCTURE YOUR PROMPTS:                                                     │
│  1. STACK - List all technologies                                           │
│  2. FEATURES - Describe what it should do                                   │
│  3. STRUCTURE - Define pages/components/layouts                             │
│  4. DATA - Specify database schema/API                                      │
│  5. DESIGN - Describe visual style                                          │
│  6. CONSTRAINTS - Mention responsive, accessible, etc.                      │
│                                                                              │
│  GOOD PROMPT PATTERNS:                                                       │
│  ✓ "Build a [thing] with [stack] that does [features]"                      │
│  ✓ "Create a [component] with [props] that [behavior]"                      │
│  ✓ "Implement [feature] using [pattern] for [use case]"                     │
│  ✓ "Add [functionality] to [existing code] with [constraints]"              │
│                                                                              │
│  AVOID:                                                                      │
│  ✗ Vague requests ("make it better")                                        │
│  ✗ Multiple unrelated features in one prompt                                │
│  ✗ Missing stack/technology specifications                                  │
│  ✗ No constraints or requirements                                           │
│                                                                              │
│  ITERATIVE APPROACH:                                                         │
│  1. Start with basic structure                                              │
│  2. Add features one at a time                                              │
│  3. Refine styling and UX                                                   │
│  4. Add edge cases and error handling                                       │
│  5. Optimize performance                                                    │
│  6. Add tests                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CONCLUSION

This comprehensive prompt library provides production-ready templates for every aspect of modern full-stack development. Use these prompts as starting points and customize them for your specific needs.

**Key Principles:**
1. Be specific about your technology stack
2. Define clear requirements and constraints
3. Break complex features into smaller prompts
4. Iterate and refine based on results
5. Test and validate generated code

**Remember:** The quality of AI output directly correlates with the quality of your prompts. Invest time in crafting clear, detailed prompts for better results.

---

*Section 21: The Complete Prompt Library 50X - Complete*
*Part of THE ULTIMATE DEVELOPER GUIDE - OLYMPUS EDITION*
