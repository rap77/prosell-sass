import {
  cloneElement,
  createElement,
  isValidElement,
  type HTMLAttributes,
  type JSX,
  type ReactNode,
} from "react";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

interface ChildrenProps {
  children?: ReactNode;
}

interface TriggerProps extends ChildrenProps {
  asChild?: boolean;
  [key: string]: unknown;
}

interface DropdownMenuItemProps extends ChildrenProps {
  onClick?: () => void;
  className?: string;
}

interface SelectProps extends ChildrenProps {
  value?: string;
  disabled?: boolean;
}

interface SelectTriggerProps extends ChildrenProps {
  [key: string]: unknown;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectItemProps extends ChildrenProps {
  value: string;
  onClick?: () => void;
}

interface CommandDialogProps extends ChildrenProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface CommandInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  [key: string]: unknown;
}

interface CommandGroupProps extends ChildrenProps {
  heading?: string;
}

interface CommandItemProps extends ChildrenProps {
  onSelect?: () => void;
  [key: string]: unknown;
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "";
  readonly thresholds = [0];

  disconnect(): void {}

  observe(_target: Element): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(_target: Element): void {}
}

class MockResizeObserver implements ResizeObserver {
  disconnect(): void {}

  observe(_target: Element, _options?: ResizeObserverOptions): void {}

  unobserve(_target: Element): void {}
}

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Radix UI DropdownMenu components globally
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild,
    ...props
  }: TriggerProps): JSX.Element => {
    // When asChild=true, Radix merges the trigger element with the child (no wrapper)
    // When asChild=false, it wraps children in a button
    if (asChild && isValidElement<{ "data-testid"?: string }>(children)) {
      // Clone child and add data-testid for testing
      return cloneElement(children, {
        "data-testid": "dropdown-trigger",
      });
    }
    return (
      <button data-testid="dropdown-trigger" {...props}>
        {children}
      </button>
    );
  },
  DropdownMenuContent: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="dropdown-content" role="menu">
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: DropdownMenuItemProps): JSX.Element => (
    <button
      data-testid="dropdown-item"
      className={className}
      onClick={onClick}
      role="menuitem"
    >
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: (): JSX.Element => (
    <hr data-testid="dropdown-separator" />
  ),
}));

// Mock Radix UI Select components globally to fix hasPointerCapture error
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, disabled }: SelectProps): JSX.Element => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: SelectTriggerProps): JSX.Element => (
    <button data-testid="select-trigger" type="button" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: SelectValueProps): JSX.Element => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="select-content" role="listbox">
      {children}
    </div>
  ),
  SelectItem: ({ children, value, onClick }: SelectItemProps): JSX.Element => (
    <div
      data-testid="select-item"
      data-value={value}
      role="option"
      aria-selected={false}
      onClick={() => onClick?.()}
    >
      {children}
    </div>
  ),
}));

// Mock cmdk (Command Palette) components globally
vi.mock("cmdk", () => ({
  CommandDialog: ({
    children,
    open,
    onOpenChange,
  }: CommandDialogProps): JSX.Element => (
    <div
      data-testid="command-dialog"
      data-open={open}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  CommandInput: ({
    value,
    onValueChange,
    ...props
  }: CommandInputProps): JSX.Element => {
    const { onChange: _onChange, ...rest } = props;
    return (
      <input
        data-testid="command-input"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...rest}
      />
    );
  },
  CommandList: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: ChildrenProps): JSX.Element => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children, heading }: CommandGroupProps): JSX.Element => (
    <div data-testid="command-group">
      {heading && <div data-testid="command-group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({
    children,
    onSelect,
    ...props
  }: CommandItemProps): JSX.Element => (
    <div data-testid="command-item" onClick={onSelect} {...props}>
      {children}
    </div>
  ),
}));

// Mock IntersectionObserver
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollIntoView for Radix UI Select
Element.prototype.scrollIntoView = vi.fn(() => {});

// Mock next-intl for i18n tests
vi.mock("next-intl", () => ({
  useLocale: () => "es",
  useTranslations: () => (key: string) => key,
  NextIntlClientProvider: ({ children }: ChildrenProps) => <>{children}</>,
}));

interface MotionTestProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "onDrag" | "onDragEnd"
> {
  animate?: unknown;
  drag?: unknown;
  dragConstraints?: unknown;
  dragElastic?: unknown;
  dragMomentum?: unknown;
  exit?: unknown;
  initial?: unknown;
  layout?: unknown;
  onDrag?: unknown;
  onDragEnd?: unknown;
  transition?: unknown;
  variants?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
}

// Replace motion elements in tests without leaking motion-only props into the DOM.
vi.mock("framer-motion", () => {
  const createMotionComponent = (element: string) => {
    const Component = ({
      animate: _animate,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      dragMomentum: _dragMomentum,
      exit: _exit,
      initial: _initial,
      layout: _layout,
      onDrag: _onDrag,
      onDragEnd: _onDragEnd,
      transition: _transition,
      variants: _variants,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: MotionTestProps) => createElement(element, props, props.children);
    Component.displayName = `Motion${element.charAt(0).toUpperCase()}${element.slice(1)}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent("div"),
      aside: createMotionComponent("aside"),
      nav: createMotionComponent("nav"),
      button: createMotionComponent("button"),
      span: createMotionComponent("span"),
      ul: createMotionComponent("ul"),
      li: createMotionComponent("li"),
    },
    AnimatePresence: ({ children }: ChildrenProps) => <>{children}</>,
  };
});
