import React from "react";

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="dropdown-menu">{children}</div>
);
export const DropdownMenuTrigger = ({ children, ...props }: any) => (
  <button data-testid="dropdown-trigger" {...props}>
    {children}
  </button>
);
export const DropdownMenuContent = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div data-testid="dropdown-content" role="menu">
    {children}
  </div>
);
export const DropdownMenuItem = ({ children, onClick, className }: any) => (
  <button
    data-testid="dropdown-item"
    className={className}
    onClick={onClick}
    role="menuitem"
  >
    {children}
  </button>
);
export const DropdownMenuLabel = ({
  children,
}: {
  children: React.ReactNode;
}) => <div data-testid="dropdown-label">{children}</div>;
export const DropdownMenuSeparator = () => (
  <hr data-testid="dropdown-separator" />
);
