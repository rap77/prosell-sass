import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChildrenProps {
  children?: ReactNode;
}

interface TriggerProps extends ChildrenProps {
  asChild?: boolean;
}

interface ItemProps extends ChildrenProps {
  onClick?: () => void;
  className?: string;
}

interface CheckboxItemProps extends ChildrenProps {
  checked?: boolean;
  onSelect?: (event: Event) => void;
  "data-testid"?: string;
}

export const DropdownMenu = ({ children }: ChildrenProps) => (
  <div data-testid="dropdown-menu">{children}</div>
);
export const DropdownMenuTrigger = ({
  children,
  asChild: _asChild,
  ...props
}: TriggerProps & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button data-testid="dropdown-trigger" {...props}>
    {children}
  </button>
);
export const DropdownMenuContent = ({ children }: ChildrenProps) => (
  <div data-testid="dropdown-content" role="menu">
    {children}
  </div>
);
export const DropdownMenuItem = ({
  children,
  onClick,
  className,
}: ItemProps) => (
  <button
    data-testid="dropdown-item"
    className={className}
    onClick={onClick}
    role="menuitem"
  >
    {children}
  </button>
);
export const DropdownMenuCheckboxItem = ({
  children,
  checked,
  onSelect,
  "data-testid": dataTestId,
}: CheckboxItemProps) => (
  <button
    data-testid={dataTestId ?? "dropdown-checkbox-item"}
    role="menuitemcheckbox"
    aria-checked={!!checked}
    onClick={(event) => onSelect?.(event.nativeEvent)}
  >
    {children}
  </button>
);
export const DropdownMenuLabel = ({ children }: ChildrenProps) => (
  <div data-testid="dropdown-label">{children}</div>
);
export const DropdownMenuSeparator = () => (
  <hr data-testid="dropdown-separator" />
);
