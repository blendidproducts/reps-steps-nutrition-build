import React from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ChevronDown, Check } from "lucide-react";

export default function MobileDrawerSelect({ value, onValueChange, options, placeholder, label, triggerClassName }) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between bg-background border-border text-left font-normal ${triggerClassName || ''}`}
        >
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-gray-900 border-gray-700">
        <DrawerHeader className="border-b border-gray-700">
          <DrawerTitle className="text-white">{label || placeholder}</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full px-6 py-4 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="text-white font-medium">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-400 mt-1">{option.description}</div>
                )}
              </div>
              {value === option.value && (
                <Check className="w-5 h-5 text-brand-blue flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}