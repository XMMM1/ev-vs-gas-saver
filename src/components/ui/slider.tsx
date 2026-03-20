import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const variantStyles = {
  default: {
    range: "bg-primary",
    thumb: "border-primary focus-visible:ring-ring",
  },
  ev: {
    range: "bg-ev",
    thumb: "border-ev focus-visible:ring-ev",
  },
  gas: {
    range: "bg-gas",
    thumb: "border-gas focus-visible:ring-gas",
  },
  solar: {
    range: "bg-solar",
    thumb: "border-solar focus-visible:ring-solar",
  },
};

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  variant?: keyof typeof variantStyles;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant = "default", ...props }, ref) => {
  const styles = variantStyles[variant];
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className={cn("absolute h-full", styles.range)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn("block h-5 w-5 rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", styles.thumb)} />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
