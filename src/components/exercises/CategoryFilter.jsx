import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Dumbbell, 
  Target, 
  Activity, 
  Heart, 
  Users,
  LayoutGrid
} from "lucide-react";

const categories = [
  { value: "all", label: "All", icon: LayoutGrid },
  { value: "upper_body", label: "Upper", icon: Target },
  { value: "lower_body", label: "Lower", icon: Activity },
  { value: "core", label: "Core", icon: Users },
  { value: "cardio", label: "Cardio", icon: Heart },
  { value: "full_body", label: "Full Body", icon: Dumbbell }
];

export default function CategoryFilter({ selected, onSelect }) {
  return (
    <div className="flex gap-2">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Button
            key={category.value}
            variant={selected === category.value ? "default" : "outline"}
            onClick={() => onSelect(category.value)}
            className={`whitespace-nowrap flex-shrink-0 touch-manipulation text-sm px-3 py-2 h-9 ${
              selected === category.value 
                ? 'gradient-bg hover:opacity-90 text-white' 
                : 'bg-card border-border hover:bg-gray-800 hover:border-brand-blue hover:text-brand'
            }`}
            size="sm"
          >
            <Icon className="w-4 h-4 mr-2" />
            {category.label}
          </Button>
        );
      })}
    </div>
  );
}