import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { offers, formatPrice } from "@/lib/offers";
import { toast } from "@/hooks/use-toast";

const paymentSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Adresse email invalide").max(255),
  phone: z.string().trim().regex(/^6[0-9]{8}$/, "Numéro de téléphone camerounais invalide (ex: 6XXXXXXXX)"),
  method: z.enum(["mtn", "orange"], { required_error: "Choisissez un mode de paiement" }),
});

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const offerId = searchParams.get("offre");
  const offer = useMemo(() => offers.find((o) => o.id === offerId), [offerId]);

  const [form, setForm] = useState({ name: "", email: "", phone: "", method: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Offre introuvable</h1>
          <p className="mt-2 text-muted-foreground">L'offre sélectionnée n'existe pas.</p>
          <Button onClick={() => navigate("/")} className="mt-4" variant="outline">
            Retour aux offres
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = paymentSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    // TODO: Call NotchPay edge function here
    // For now, simulate a payment flow
    setTimeout(() => {
      setLoading(false);
      navigate(`/confirmation?offre=${offer.id}&ref=TXN${Date.now()}&name=${encodeURIComponent(form.name)}&email=${encodeURIComponent(form.email)}`);
    }, 2000);
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-lg">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6 gap-2 px-0">
          <ArrowLeft className="h-4 w-4" /> Retour aux offres
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Order summary */}
          <div className="mb-6 rounded-xl border bg-card p-4">
            <h2 className="font-display text-sm font-semibold text-muted-foreground">Récapitulatif</h2>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Formule {offer.name}</span>
              <span className="font-display text-xl font-bold text-primary">
                {formatPrice(offer.price)} FCFA
              </span>
            </div>
          </div>

          {/* Payment form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <h1 className="font-display text-2xl font-bold">Paiement</h1>

            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                placeholder="Jean Dupont"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                maxLength={100}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@exemple.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                maxLength={255}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="flex gap-2">
                <span className="flex items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
                  +237
                </span>
                <Input
                  id="phone"
                  placeholder="6XXXXXXXX"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 9))}
                  maxLength={9}
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <PaymentMethodSelector value={form.method} onChange={(v) => updateField("method", v)} />
              {errors.method && <p className="text-sm text-destructive">{errors.method}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Traitement en cours...
                </>
              ) : (
                `Payer ${formatPrice(offer.price)} FCFA`
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Paiement sécurisé via NotchPay. Vous recevrez une demande de confirmation sur votre téléphone.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;
