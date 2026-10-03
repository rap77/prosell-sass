"use client";

import { type ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

type SliderProps = ComponentProps<typeof SliderPrimitive.Root>;

function Slider({
  className,
  value,
  defaultValue,
  ref,
  ...props
}: SliderProps) {
  // One Thumb per value — a single hardcoded Thumb only ever let the first
  // handle of a 2-value range (`value={[lo, hi]}`, e.g. FilterSidebar's
  // attribute range filters) be dragged; the second handle had nothing to
  // grab. Harmless no-op for the single-value case (array of length 1).
  const thumbCount = (value ?? defaultValue)?.length ?? 1;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-ps-elevated">
        <SliderPrimitive.Range className="absolute h-full bg-ps-cyan" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-5 w-5 rounded-full border-2 border-ps-cyan bg-ps-base ring-offset-ps-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
