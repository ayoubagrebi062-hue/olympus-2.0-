# VITO PROJECT - MANDATORY CODE QUALITY RULES

## READ THIS BEFORE WRITING ANY CODE IN THIS PROJECT

**Enforced:** January 22, 2026
**Scope:** ALL agents, ALL code generation in this project
**Violations:** WILL BE REJECTED - No exceptions

---

## 🚀 OLYMPUS UI PROTOCOL (MANDATORY FOR UI WORK)

**BEFORE WORKING ON ANY UI:** Read `OLYMPUS_UI_PROTOCOL.md` in this project root.

### Quick Reference

| File                                                        | Purpose                          |
| ----------------------------------------------------------- | -------------------------------- |
| `OLYMPUS_UI_PROTOCOL.md`                                    | Session protocol, status tracker |
| `C:\Users\SBS\Desktop\ui plan\OLYMPUS_2.0_UI_MASTERPLAN.md` | Full UI specifications           |
| `C:\Users\SBS\Desktop\ui plan\New folder (6)\SECTION_*.md`  | Detailed section guides          |

### Current Phase Status

```
[x] PHASE 0: CLEANUP              - COMPLETED (Jan 26, 2026)
[ ] PHASE 1: FOUNDATION           - Design system + shadcn
[ ] PHASE 2: LANDING PAGE         - Hero + agents + pricing
[ ] PHASE 3: AUTH                 - Login/signup flows
[ ] PHASE 4: DASHBOARD            - Command center
[ ] PHASE 5: FEATURES             - Templates + analytics
[ ] PHASE 6: POLISH               - Animations + a11y
```

### Design System (MEMORIZE)

```
Background:  #0A0A0F (dark base)
Primary:     #3B82F6 (blue)
Secondary:   #8B5CF6 (purple)
Border:      #2D2D3D
Text:        #F8FAFC (primary), #94A3B8 (secondary)
```

### P0 Components to Build

1. AgentCard - Agent visualization
2. AgentGrid - 40-agent interactive grid
3. PhaseProgress - 9-phase indicator
4. LiveCodeStream - Real-time code display
5. BuildProgress - Overall progress bar
6. StatCard - Dashboard metrics
7. QuickBuilder - Prompt input

**ALWAYS follow the masterplan. ALWAYS use dark theme. ALWAYS animate.**

---

## THE 7 UNBREAKABLE RULES

### RULE 1: NO DEAD BUTTONS

```
EVERY <button> MUST have onClick handler
NO EXCEPTIONS. NO "will add later". NO placeholders.
```

```tsx
// BANNED - WILL BE REJECTED
<button className="btn">Click Me</button>

// REQUIRED - ALWAYS
<button onClick={handleClick} className="btn">Click Me</button>
```

---

### RULE 2: NO PLACEHOLDER LINKS

```
href="#" is BANNED FOREVER
href="" is BANNED FOREVER
```

```tsx
// BANNED - WILL BE REJECTED
<a href="#">Learn More</a>
<Link href="#">Contact</Link>

// ALLOWED OPTIONS:
// Option A: Real route
<Link href="/contact">Contact</Link>

// Option B: Button with feedback
<button onClick={() => showToast('Coming soon!')}>Contact</button>

// Option C: External with security
<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>
```

---

### RULE 3: NO MOCK FORM SUBMISSIONS

```
console.log() is NOT a form handler
alert() is BANNED for user feedback
```

```tsx
// BANNED - WILL BE REJECTED
const handleSubmit = () => {
  console.log('submitted');
  alert('Thanks!');
};

// REQUIRED - Proper feedback
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    await submitForm(data);
    showToast('Successfully submitted!');
  } catch (err) {
    showToast('Error occurred. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### RULE 4: ALL ASYNC NEEDS TRY/CATCH

```
navigator.clipboard → MUST have try/catch
fetch() → MUST have try/catch
Any await → MUST have error handling
```

```tsx
// BANNED - WILL BE REJECTED
await navigator.clipboard.writeText(text);

// REQUIRED - ALWAYS
try {
  await navigator.clipboard.writeText(text);
  showToast('Copied!');
} catch (err) {
  showToast('Failed to copy');
}
```

---

### RULE 5: MODALS/DROPDOWNS MUST CLOSE

```
EVERY modal → Escape key closes it
EVERY dropdown → Outside click closes it
```

```tsx
// REQUIRED for ALL modals/dropdowns
useEffect(() => {
  if (!isOpen) return;

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  document.addEventListener('keydown', handleEscape);
  document.addEventListener('mousedown', handleClickOutside);

  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
```

---

### RULE 6: ALL INPUTS MUST BE CONTROLLED

```
EVERY <input> needs value + onChange
EVERY <select> needs value + onChange
```

```tsx
// BANNED - WILL BE REJECTED
<input type="text" placeholder="Email" />
<select><option>Option</option></select>

// REQUIRED - ALWAYS
const [email, setEmail] = useState('');
<input value={email} onChange={(e) => setEmail(e.target.value)} />

const [selected, setSelected] = useState('opt1');
<select value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="opt1">Option 1</option>
</select>
```

---

### RULE 7: LOADING STATES PREVENT DOUBLE-SUBMIT

```
ALL buttons that trigger async operations MUST:
- Show loading state
- Be disabled while loading
```

```tsx
// REQUIRED pattern
const [isLoading, setIsLoading] = useState(false);

<button onClick={handleClick} disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>;
```

---

### RULE 8: NEVER BREAK ASYNC SERVER COMPONENTS

```
NEVER convert async server components to client components
NEVER use 'use client' on pages with async data fetching
NEVER use React's use() hook with params - it expects Promises only
```

```tsx
// BANNED - WILL BREAK THE APP
'use client';
import { use } from 'react';
export default function Page({ params }) {
  const { slug } = use(params); // ERROR: params is NOT a Promise in client components
  // ...
}

// REQUIRED - Keep server components async, extract client code
// page.tsx (SERVER COMPONENT)
export default async function Page({ params }) {
  const { slug } = await params; // CORRECT: await in async server component
  return <ClientComponent slug={slug} />;
}

// client-component.tsx (CLIENT COMPONENT)
('use client');
export function ClientComponent({ slug }) {
  // Interactive code goes here
}
```

**KEY PRINCIPLE:**

- Server Components (default) → Use `async/await` for data
- Client Components ('use client') → Use hooks for state/events
- If a page needs BOTH → Split into server page + client component

---

## STANDARD TOAST PATTERN (USE THIS)

Add to any page that needs user feedback:

```tsx
// Add these to your component
const [toast, setToast] = useState<string | null>(null);

const showToast = (message: string) => {
  setToast(message);
  setTimeout(() => setToast(null), 3000);
};

// Add this to your JSX (before closing </main> or at end)
{
  toast && (
    <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-slate-900 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
      {toast}
    </div>
  );
}
```

---

## PRE-BUILD CHECKLIST

**BEFORE submitting ANY code, verify:**

| #   | Check                                           | Status |
| --- | ----------------------------------------------- | ------ |
| 1   | Every `<button>` has onClick?                   | [ ]    |
| 2   | No `href="#"` anywhere?                         | [ ]    |
| 3   | No `console.log()` in handlers?                 | [ ]    |
| 4   | No `alert()` calls?                             | [ ]    |
| 5   | All async has try/catch?                        | [ ]    |
| 6   | Modals close on Escape?                         | [ ]    |
| 7   | Dropdowns close on outside click?               | [ ]    |
| 8   | All inputs are controlled?                      | [ ]    |
| 9   | Loading states on async buttons?                | [ ]    |
| 10  | No `use()` on non-Promise values?               | [ ]    |
| 11  | Async pages NOT converted to client components? | [ ]    |

**If ANY checkbox is unchecked → FIX BEFORE SUBMITTING**

---

## VALIDATION COMMANDS

Run these to check for violations:

```bash
# Check for placeholder links
grep -rn "href=\"#\"" src/

# Check for buttons without onClick
grep -rn "<button" src/ | grep -v "onClick"

# Check for console.log in handlers
grep -rn "onClick.*console.log" src/

# Check for alert() usage
grep -rn "alert(" src/

# Run full validation
node scripts/validate-ui-quality.js src/
```

---

## AGENT INSTRUCTIONS

When building ANY component in this project:

1. **FUNCTIONALITY FIRST** - onClick handlers BEFORE CSS styling
2. **NO PLACEHOLDERS** - Implement now or remove
3. **USER FEEDBACK** - Every action shows feedback
4. **ERROR HANDLING** - Every async has try/catch
5. **ACCESSIBILITY** - Escape closes, outside click closes

---

## VIOLATION = IMMEDIATE FIX

| Violation               | Action                                 |
| ----------------------- | -------------------------------------- |
| Button without onClick  | STOP. Add handler.                     |
| href="#" found          | STOP. Convert to button or real route. |
| console.log in handler  | STOP. Replace with showToast.          |
| alert() found           | STOP. Replace with toast/modal.        |
| Async without try/catch | STOP. Add error handling.              |

---

**This file is LAW for this project. No exceptions.**

_Created: January 22, 2026_
_Enforced by: OLYMPUS System_
