"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { cn } from "@/lib/utils"

const MobileSelectContext = React.createContext(null);

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function Select(allProps) {
  const { children, value, onValueChange, defaultValue, ...selectRootProps } = allProps;
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  if (!isMobile) {
    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        {...selectRootProps}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }

  return (
    <MobileSelectContext.Provider value={{ value, onValueChange, drawerOpen, setDrawerOpen }}>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        {...selectRootProps}
      >
        {children}
      </SelectPrimitive.Root>
    </MobileSelectContext.Provider>
  );
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(function SelectTriggerInner(allProps, ref) {
  const { className, children, ...triggerProps } = allProps;
  const mobileCtx = React.useContext(MobileSelectContext);

  if (mobileCtx) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => mobileCtx.setDrawerOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...triggerProps}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </button>
    );
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...triggerProps}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef(function SelectScrollUpInner(allProps, ref) {
  const { className, ...scrollProps } = allProps;
  return (
    <SelectPrimitive.ScrollUpButton
      ref={ref}
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...scrollProps}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
})
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(function SelectScrollDownInner(allProps, ref) {
  const { className, ...scrollProps } = allProps;
  return (
    <SelectPrimitive.ScrollDownButton
      ref={ref}
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...scrollProps}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
})
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(function SelectContentInner(allProps, ref) {
  const { className, children, position = "popper", label, ...contentProps } = allProps;
  const mobileCtx = React.useContext(MobileSelectContext);

  if (mobileCtx) {
    return (
      <Drawer open={mobileCtx.drawerOpen} onOpenChange={mobileCtx.setDrawerOpen}>
        <DrawerContent className="bg-gray-900 border-gray-700">
          {label && (
            <DrawerHeader className="border-b border-gray-700">
              <DrawerTitle className="text-white">{label}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="max-h-[60vh] overflow-y-auto py-2">
            <MobileSelectItemsRenderer
              ctx={mobileCtx}
              children={children}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...contentProps}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

function MobileSelectItemsRenderer(allProps) {
  const { ctx, children } = allProps;
  const renderChild = (child) => {
    if (!React.isValidElement(child)) return null;

    if (child.type === SelectItem || child.type?.displayName === "SelectItem") {
      const { value, children: label, disabled } = child.props;
      const isSelected = ctx.value === value;
      return (
        <button
          key={value}
          onClick={() => {
            if (!disabled) {
              ctx.onValueChange?.(value);
              ctx.setDrawerOpen(false);
            }
          }}
          disabled={disabled}
          className="w-full px-6 py-4 text-left flex items-center justify-between border-b border-gray-800 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <span className="text-white font-medium">{label}</span>
          {isSelected && <Check className="w-5 h-5 text-[#00a9ff] flex-shrink-0" />}
        </button>
      );
    }

    if (child.props?.children) {
      return React.Children.map(child.props.children, renderChild);
    }

    return null;
  };

  return <>{React.Children.map(children, renderChild)}</>;
}

const SelectLabel = React.forwardRef(function SelectLabelInner(allProps, ref) {
  const { className, ...labelProps } = allProps;
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...labelProps}
    />
  );
})
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(function SelectItemInner(allProps, ref) {
  const { className, children, ...itemProps } = allProps;
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...itemProps}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(function SelectSeparatorInner(allProps, ref) {
  const { className, ...sepProps } = allProps;
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...sepProps}
    />
  );
})
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}