# Storybook & UI Primitives Guide

This document explains how to use the Storybook setup and UI primitive components for developing, prototyping, and iterating on the Cloud Backup App's interface.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [UI Primitives Reference](#ui-primitives-reference)
4. [Using the Controls Panel](#using-the-controls-panel)
5. [Prototyping Workflows](#prototyping-workflows)
6. [Writing New Stories](#writing-new-stories)
7. [Adding a New Primitive](#adding-a-new-primitive)
8. [Refactoring Pages to Use Primitives](#refactoring-pages-to-use-primitives)
9. [Storybook Configuration](#storybook-configuration)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Start Storybook dev server
npm run storybook
# Opens http://localhost:6006

# Build static Storybook (for sharing/deployment)
npm run build-storybook
# Output: storybook-static/
```

The sidebar organizes stories into two groups:

- **Primitives/** — Small, reusable UI building blocks (Button, Card, Modal, etc.)
- **Components/** — Full page components (Dashboard, Settings, CloudBrowser, etc.)

---

## Project Structure

```
src/components/ui/
  index.ts                  # Barrel re-export (import { Button, Card } from './ui')
  Button.tsx                # Button + IconButton
  Button.stories.tsx        # Interactive stories
  Card.tsx                  # Card + CardHeader + CardContent
  Card.stories.tsx
  FormGroup.tsx             # FormGroup + FormRow
  FormGroup.stories.tsx
  Modal.tsx                 # Modal + ModalHeader + ModalContent + ModalActions
  Modal.stories.tsx
  EmptyState.tsx
  EmptyState.stories.tsx
  AlertBox.tsx
  AlertBox.stories.tsx
  LoadingSpinner.tsx        # LoadingSpinner + LoadingState
  LoadingSpinner.stories.tsx
  StatusBadge.tsx
  StatusBadge.stories.tsx
  Badge.tsx
  Badge.stories.tsx
  FileInput.tsx
  FileInput.stories.tsx
```

Every primitive:
- Wraps existing CSS classes from `App.css` (no new CSS)
- Uses `clsx` for conditional class composition
- Forwards `ref` and spreads `...rest` for native HTML attributes
- Exports a TypeScript interface for its props

---

## UI Primitives Reference

### Button

```tsx
import { Button, IconButton } from './ui';

<Button variant="primary" size="large" disabled={false}>
  Run Backup Now
</Button>

<IconButton as="btn-icon" variant="danger">
  <Trash2 size={16} />
</IconButton>
```

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `variant` | string | `'primary'` | `'primary'`, `'secondary'`, `'danger'` |
| `size` | string | `'default'` | `'default'`, `'large'`, `'small'` |
| `disabled` | boolean | `false` | — |

**IconButton** additional props:

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `as` | string | `'btn-icon'` | `'btn-icon'`, `'icon-button'` |
| `variant` | string | `'default'` | `'default'`, `'danger'` |

### Card

```tsx
import { Card, CardHeader, CardContent } from './ui';

<Card fullWidth>
  <CardHeader title="Recent Logs" action={<IconButton>...</IconButton>} />
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fullWidth` | boolean | `false` | Span full grid width |

**CardHeader** props: `title` (string), `action` (ReactNode).
**CardContent** is a plain wrapper.

### FormGroup

```tsx
import { FormGroup, FormRow } from './ui';

<FormRow>
  <FormGroup label="Remote" htmlFor="remote" error="" helpText="">
    <input id="remote" type="text" />
  </FormGroup>
</FormRow>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | — | Rendered as `<label>` |
| `htmlFor` | string | — | Links label to input |
| `error` | string | — | Red error message below input |
| `helpText` | string | — | Muted help text below input |

**FormRow** wraps children in a responsive grid row.

### Modal

```tsx
import { Modal, ModalHeader, ModalContent, ModalActions } from './ui';

<Modal open={showModal} onClose={() => setShowModal(false)}>
  <ModalHeader title="Confirm" onClose={() => setShowModal(false)} />
  <ModalContent>
    <p>Are you sure?</p>
  </ModalContent>
  <ModalActions>
    <Button variant="secondary" onClick={cancel}>Cancel</Button>
    <Button variant="danger" onClick={confirm}>Delete</Button>
  </ModalActions>
</Modal>
```

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Controls visibility |
| `onClose` | function | Called on overlay click |

Clicking the overlay calls `onClose`. The inner modal stops propagation so clicks inside don't close it.

### EmptyState

```tsx
import { EmptyState } from './ui';

<EmptyState
  size="small"
  icon={<Clock size={24} />}
  title="No backups yet"
  description="Run your first backup to see results."
>
  <Button variant="primary">Backup Now</Button>
</EmptyState>
```

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `size` | string | `'default'` | `'default'`, `'small'` |
| `icon` | ReactNode | — | Any Lucide icon |
| `title` | string | — | Heading text |
| `description` | string | — | Paragraph text |

`size="default"` renders the title as `<h2>`, `size="small"` renders it as `<p>`.

### AlertBox

```tsx
import { AlertBox } from './ui';

<AlertBox variant="warning" icon={<AlertTriangle size={16} />}>
  <div><strong>Warning:</strong> This will delete 5 files.</div>
</AlertBox>
```

| Prop | Type | Default | CSS class applied |
|------|------|---------|-------------------|
| `variant` | string | `'info'` | `info` → `.info-box`, `warning` → `.warning-box`, `success` → `.success-message`, `error` → `.error-message` |

### LoadingSpinner / LoadingState

```tsx
import { LoadingSpinner, LoadingState } from './ui';

// Inline spinner (e.g. inside a button)
<LoadingSpinner size="small" />

// Full loading state (centered with text)
<LoadingState text="Loading files..." />
```

### StatusBadge

```tsx
import { StatusBadge } from './ui';

<StatusBadge status="completed" icon={<CheckCircle size={20} />}>
  Completed
</StatusBadge>
```

| `status` | CSS class |
|-----------|-----------|
| `'completed'` | `.status-indicator.completed` |
| `'failed'` | `.status-indicator.failed` |
| `'running'` | `.status-indicator.running` |

### Badge

```tsx
import { Badge } from './ui';

<Badge>(Admin View - All Users)</Badge>
```

Renders a `<span>` with `.admin-badge`.

### FileInput

```tsx
import { FileInput } from './ui';

<FileInput
  actions={
    <>
      <IconButton onClick={openDialog}><Folder size={16} /></IconButton>
      <Button variant="secondary" onClick={autoSetup}>Auto-Setup</Button>
    </>
  }
>
  <input type="text" value={path} onChange={...} />
</FileInput>
```

Wraps an `<input>` and action buttons in a `.file-input` flex container.

---

## Using the Controls Panel

Every primitive has a **Playground** story. When you open one in Storybook, the **Controls** panel at the bottom of the canvas lets you change props in real time:

| Control type | What it does | Example |
|---|---|---|
| **Inline radio** | Switch between a small set of values | `variant`: primary / secondary / danger |
| **Select dropdown** | Pick from a list of options | Icon picker: Play, Save, Folder, etc. |
| **Text input** | Edit strings live | Title, description, error message |
| **Boolean toggle** | Flip on/off | `disabled`, `fullWidth`, `showAction` |

Changes render immediately — no code editing, no reload, no build step.

### Tips

- **Reset controls**: Click the "Reset controls" button (undo icon) in the Controls toolbar to restore defaults.
- **URL sharing**: The Storybook URL encodes the current story and args, so you can share a link to a specific configuration.
- **Actions tab**: When you click a Button, the Actions tab logs the event — useful for verifying callbacks fire.
- **Accessibility tab**: The a11y addon shows WCAG violations for the current render (enabled via `@storybook/addon-a11y`).

---

## Prototyping Workflows

### 1. Tweaking a single component

Open `Primitives/Button > Playground`. Use Controls to try every combination of `variant` + `size` + `disabled`. When you find the right look, copy the prop values directly into code:

```tsx
// What you configured in Storybook:
<Button variant="danger" size="large" disabled={false}>
  Delete All
</Button>
```

### 2. Comparing variants side-by-side

Stories like `AllVariants`, `AllSizes`, and `AllStatuses` render every option next to each other so you can compare without clicking through controls.

### 3. Composing a new layout prototype

Create a new story file under `src/components/ui/` (or a dedicated `src/prototypes/` folder):

```tsx
// src/components/ui/Prototype.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card, CardHeader, CardContent,
  Button, EmptyState, AlertBox,
} from './index';
import { Folder, AlertCircle } from 'lucide-react';

const meta = {
  title: 'Prototypes/UploadFeature',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const Draft: StoryObj = {
  render: () => (
    <Card>
      <CardHeader title="Upload Documents" />
      <CardContent>
        <AlertBox variant="info" icon={<AlertCircle size={14} />}>
          <p style={{ margin: 0 }}>Supported formats: PDF, DOCX, TXT</p>
        </AlertBox>
        <EmptyState
          icon={<Folder size={48} />}
          title="No documents yet"
          description="Drag files here or click upload."
        >
          <Button variant="primary">Upload</Button>
        </EmptyState>
      </CardContent>
    </Card>
  ),
};
```

This shows up instantly under `Prototypes/UploadFeature` — no app, no backend, no routing.

### 4. Iterating with a designer

Share Storybook via:
- **Local network**: `npm run storybook` and share the URL
- **Static build**: `npm run build-storybook` and host `storybook-static/` anywhere (S3, Netlify, etc.)

The designer can:
1. Open any Playground story
2. Adjust text, variants, icons from Controls
3. Say "I want the error AlertBox with the AlertTriangle icon and this message"
4. You copy the exact props into the real component — no guesswork

### 5. Testing page components in isolation

The `Components/` section has stories for full page components (Dashboard, Settings, etc.). These use mock data from `src/__mocks__/mockData.ts` and Tauri API mocks, so they render in the browser without the Rust backend.

Useful for:
- Verifying layout after refactoring
- Testing different data states (empty profile, failed backup, etc.)
- QA on different screen sizes (use the Storybook viewport addon)

---

## Writing New Stories

### Conventions

- **Title prefix**: `'Primitives/'` for UI primitives, `'Components/'` for page components, `'Prototypes/'` for layout experiments
- **Format**: CSF3 (Component Story Format 3) with TypeScript
- **Callbacks**: Use `fn()` from `storybook/test` for mock functions
- **JSDoc comments**: Above each export for story descriptions in the sidebar

### Template

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Primitives/MyComponent',
  component: MyComponent,
  args: {
    onClick: fn(),
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['a', 'b', 'c'],
      description: 'Visual variant',
    },
    label: {
      control: 'text',
      description: 'Display text',
    },
    disabled: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',  // or 'padded', 'fullscreen'
  },
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fully interactive playground */
export const Playground: Story = {
  args: {
    variant: 'a',
    label: 'Hello',
    disabled: false,
  },
};

/** Side-by-side comparison */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <MyComponent variant="a" label="A" />
      <MyComponent variant="b" label="B" />
      <MyComponent variant="c" label="C" />
    </div>
  ),
};
```

### argTypes Control Types

| Control | Use for | Example |
|---------|---------|---------|
| `'text'` | Free-form strings | Labels, messages, descriptions |
| `'boolean'` | Toggles | `disabled`, `fullWidth` |
| `'inline-radio'` | Small set (2-4 options) | `variant`, `size` |
| `'radio'` | Medium set (4-8 options) | Layout modes |
| `'select'` | Large set / mapped values | Icon pickers |
| `'number'` | Numeric values | `count`, `maxItems` |
| `'range'` | Numeric with slider | Sizes, spacing |
| `'color'` | Color pickers | Background, border |

For icon pickers, use `options` + `mapping`:

```tsx
const iconMap = {
  Play: <Play size={16} />,
  Save: <Save size={16} />,
  none: null,
};

argTypes: {
  icon: {
    control: 'select',
    options: Object.keys(iconMap),
    mapping: iconMap,
  },
}
```

---

## Adding a New Primitive

1. **Create the component** in `src/components/ui/NewComponent.tsx`:
   - Wrap existing CSS classes from `App.css`
   - Use `forwardRef` and spread `...rest`
   - Export a props interface

2. **Export from barrel** — add to `src/components/ui/index.ts`:
   ```ts
   export { NewComponent } from './NewComponent';
   export type { NewComponentProps } from './NewComponent';
   ```

3. **Write stories** in `src/components/ui/NewComponent.stories.tsx`:
   - Add `argTypes` for every meaningful prop
   - Include a `Playground` story
   - Include an `AllVariants` or comparison story

4. **Verify** — `npm run build-storybook` should compile without errors

---

## Refactoring Pages to Use Primitives

When replacing raw HTML with primitives in page components:

### Before
```tsx
<div className="form-group">
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />
  <div className="error-message">Email is required</div>
</div>
```

### After
```tsx
<FormGroup label="Email" htmlFor="email" error="Email is required">
  <input id="email" type="email" />
</FormGroup>
```

### Before
```tsx
<button className="btn btn-primary btn-large" onClick={run} disabled={loading}>
  <Play size={20} />
  Run Backup
</button>
```

### After
```tsx
<Button variant="primary" size="large" onClick={run} disabled={loading}>
  <Play size={20} />
  Run Backup
</Button>
```

### Checklist

- Import primitives from `'./ui'` (relative) or `'../components/ui'`
- Remove the raw CSS class strings that the primitive now handles
- Keep any inline `style` props — primitives forward them via `...rest`
- Keep any `className` additions — primitives merge them via `clsx`
- Test in Storybook by checking the page component's story renders identically

### Currently refactored pages

| Component | Primitives used |
|---|---|
| LanguageSwitcher | `FormGroup` |
| Sidebar | `Button`, `IconButton`, `EmptyState` |
| CloudBrowser | `Button`, `IconButton`, `EmptyState`, `LoadingState`, `Badge` |
| CognitoLogin | `Button`, `FormGroup`, `AlertBox`, `LoadingSpinner` |
| Settings | `Button`, `IconButton`, `FormGroup`, `FormRow`, `FileInput`, `EmptyState` |
| Dashboard | `Card`, `CardHeader`, `CardContent`, `Button`, `IconButton`, `Modal`, `ModalHeader`, `ModalContent`, `ModalActions`, `EmptyState`, `StatusBadge`, `AlertBox` |

Pages **not yet refactored** (can adopt primitives later): Onboarding, AdminSetup, UserSetup, UserManagement.

---

## Storybook Configuration

### Key files

| File | Purpose |
|------|---------|
| `.storybook/main.ts` | Story globs, addons, Vite aliases for Tauri mocks |
| `.storybook/preview.ts` | Global decorators (MemoryRouter, i18n), CSS import, control matchers |
| `src/__mocks__/tauri.ts` | Mock for `@tauri-apps/api/core` (`invoke`) |
| `src/__mocks__/tauriDialog.ts` | Mock for `@tauri-apps/plugin-dialog` (`open`) |
| `src/__mocks__/mockData.ts` | Shared mock profiles, sessions, backups, files, schedules |

### Addons

| Addon | What it provides |
|-------|------------------|
| `@storybook/addon-docs` | Auto-generated docs from props/JSDoc |
| `@storybook/addon-a11y` | Accessibility audit panel |
| `@storybook/addon-vitest` | Test integration |
| `@chromatic-com/storybook` | Visual regression testing (optional) |

### Tauri API mocking

Storybook runs in the browser, not inside Tauri. The Vite config in `.storybook/main.ts` aliases Tauri imports to mock files:

```ts
'@tauri-apps/api/core' → 'src/__mocks__/tauri.ts'
'@tauri-apps/plugin-dialog' → 'src/__mocks__/tauriDialog.ts'
```

To customize mock behavior for a specific story, update the mock files or override `invoke` responses per-story.

---

## Troubleshooting

### Story doesn't render

- Check the browser console for errors
- Verify the component is exported from `src/components/ui/index.ts`
- Make sure `import '../src/App.css'` is in `.storybook/preview.ts` (already configured)

### Controls panel is empty

- Add `argTypes` to the story's meta object
- Make sure prop names in `argTypes` match the component's TypeScript interface
- Use `args` to set default values — controls won't appear for props without defaults

### Tauri `invoke` error in Storybook

- The mock in `src/__mocks__/tauri.ts` may not handle the command being called
- Add the missing command to the mock's switch statement with appropriate test data

### CSS doesn't match the real app

- All primitives use the same CSS classes as the real app
- Storybook imports `App.css` globally in `.storybook/preview.ts`
- If styles look different, check that the CSS class mapping in the primitive matches `App.css`

### Build fails

```bash
npm run build-storybook
```

Common issues:
- Missing imports — ensure all Lucide icons and primitives are imported
- TypeScript errors — `satisfies Meta<typeof Component>` requires correct prop types
- Circular imports — primitives should not import from page components
