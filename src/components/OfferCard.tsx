import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Offer, formatPrice } from "@/lib/offers";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  offer: Offer;
  index: number;
}

const OfferCard = ({ offer, index }: OfferCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg",
        offer.popular && "border-primary shadow-md ring-2 ring-primary/20"
      )}
    >
      {offer.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
          Populaire
        </span>
      )}

      <h3 className="font-display text-xl font-bold">{offer.name}</h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">{formatPrice(offer.price)}</span>
        <span className="text-sm text-muted-foreground">FCFA</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {offer.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => navigate(`/paiement?offre=${offer.id}`)}
        className={cn(
          "mt-6 w-full",
          offer.popular ? "" : "variant-outline"
        )}
        variant={offer.popular ? "default" : "outline"}
        size="lg"
      >
        Choisir {offer.name}
      </Button>
    </motion.div>
  );
};

export default OfferCard;
