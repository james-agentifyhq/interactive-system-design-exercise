# Component API Design

**What**: Patterns for designing flexible, reusable component interfaces that balance ease of use with customization power.

**When to use**: Building design systems, component libraries, or any shared UI components used across a codebase.

**Tradeoffs**: Simple APIs (props only) are easy to use but inflexible; complex APIs (render props, slots) are powerful but harder to learn and type.

## How It Works

**Three levels of customization:**

**Level 1: Theming object (easy, rigid)**
```jsx
// Simple but limited to predefined styles
<Button variant="primary" size="large">
  Click me
</Button>

// Implementation
const variants = {
  primary: 'bg-blue-500 text-white',
  secondary: 'bg-gray-200 text-black'
};
const Button = ({ variant, size, children }) => (
  <button className={`${variants[variant]} ${sizes[size]}`}>
    {children}
  </button>
);
```

**Level 2: Class names (moderate flexibility)**
```jsx
// User provides custom classes
<Button className="bg-gradient-to-r from-purple-500 to-pink-500">
  Custom styled
</Button>

// Implementation with class merging
import { clsx } from 'clsx';

const Button = ({ variant = 'primary', className, children }) => (
  <button className={clsx(baseStyles, variants[variant], className)}>
    {children}
  </button>
);
```

**Level 3: Render callbacks / slots (maximum flexibility)**
```jsx
// Full control over rendering
<Dropdown
  trigger={({ open, toggle }) => (
    <button onClick={toggle}>
      {open ? '▲' : '▼'} Custom Trigger
    </button>
  )}
  content={({ close }) => (
    <div>
      <button onClick={() => { handleAction(); close(); }}>
        Custom Action
      </button>
    </div>
  )}
/>

// Implementation
const Dropdown = ({ trigger, content }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && content({ close: () => setOpen(false) })}
    </div>
  );
};
```

**Inversion of Control:**
```jsx
// Traditional: component controls logic
<Autocomplete onChange={handleChange} />

// Inverted: consumer controls logic (headless)
const { inputProps, listboxProps, options } = useAutocomplete({
  items: myItems,
  onSelect: handleSelect
});

return (
  <div>
    <input {...inputProps} className="my-custom-input" />
    <ul {...listboxProps} className="my-custom-listbox">
      {options.map(opt => (
        <li key={opt.id} {...opt.props}>{opt.label}</li>
      ))}
    </ul>
  </div>
);
```

**Compound components pattern:**
```jsx
// Components work together via shared context
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>

// Implementation
const TabsContext = createContext();

const Tabs = ({ defaultValue, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.Trigger = ({ value, children }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  return (
    <button
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};
```

**Headless components (behavior only, no styling):**
```jsx
// Radix UI example: provides behavior + accessibility
import * as Select from '@radix-ui/react-select';

<Select.Root>
  <Select.Trigger className="my-trigger">
    <Select.Value />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content className="my-content">
      <Select.Item value="1" className="my-item">Option 1</Select.Item>
    </Select.Content>
  </Select.Portal>
</Select.Root>

// Library handles: ARIA, focus, keyboard nav, positioning
// You control: styling, layout, animation
```

**API decision matrix:**
```
Use case                    → Recommended pattern
────────────────────────────────────────────────────
Internal app components     → Props + className
Design system (consistent)  → Theming + variants
Design system (flexible)    → Compound components
Library (max flexibility)   → Headless + render props
Complex interactions        → Hooks (inversion of control)
```

## Complexity / Performance

**Developer experience:**
- Simple props: Easy to learn, autocomplete works well
- Render props: Requires understanding callbacks, harder to type
- Compound components: Intuitive API, but magic context can confuse

**TypeScript complexity:**
- Props: Simple type definitions
- Render props: Generic types for callback parameters
- Polymorphic components (as prop): Advanced TypeScript needed

**Runtime performance:**
- All patterns: Negligible performance difference
- Render props: Slightly more re-renders if not memoized
- Compound components: Extra context provider in tree

## Real-World Examples

**Headless libraries:**
- **Radix UI**: Accessible primitives (Dialog, Dropdown, Tabs)
- **Headless UI**: Tailwind's unstyled components
- **React Aria**: Adobe's hooks for accessibility
- **Ariakit**: Toolkit with composable hooks
- **Downshift**: Autocomplete/select primitives

**Opinionated libraries (styled):**
- **Material UI**: Comprehensive theming system
- **Chakra UI**: Style props + theming
- **shadcn/ui**: Copy-paste components (Radix + Tailwind)
- **Ant Design**: Enterprise design system

**Pattern usage:**
```jsx
// Chakra UI: style props
<Box bg="blue.500" p={4} borderRadius="md">...</Box>

// shadcn/ui: className override
<Button variant="outline" className="w-full">...</Button>

// Radix UI: compound + headless
<Dialog.Root>
  <Dialog.Trigger>...</Dialog.Trigger>
  <Dialog.Content>...</Dialog.Content>
</Dialog.Root>

// React Hook Form: hooks + render props
const { register, handleSubmit } = useForm();
<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register("email")} />
</form>
```

**Polymorphic component (as prop):**
```tsx
// Component can render as any element
<Button as="a" href="/link">Link Button</Button>
<Button as={NextLink} href="/next">Next.js Link</Button>

// Implementation
type ButtonProps<C extends React.ElementType> = {
  as?: C;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<C>;

function Button<C extends React.ElementType = 'button'>({
  as,
  ...props
}: ButtonProps<C>) {
  const Component = as || 'button';
  return <Component {...props} />;
}
```

## Related Concepts

- `./accessibility-aria.md` — Headless components handle ARIA automatically
- `./state-management.md` — Context API used in compound components
- `../backend/api-design.md` — Similar tradeoffs in API flexibility
