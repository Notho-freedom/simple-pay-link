import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const methods = [
  { id: "mtn", label: "MTN Mobile Money", color: "bg-yellow-400" },
  { id: "orange", label: "Orange Money", color: "bg-orange-500" },
];

const PaymentMethodSelector = ({ value, onChange }: PaymentMethodSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onChange(method.id)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
            value === method.id
              ? "border-primary bg-accent"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", method.color)}>
            <Smartphone className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-medium">{method.label}</span>
        </button>
      ))}
    </div>
  );
};

export default PaymentMethodSelector;
