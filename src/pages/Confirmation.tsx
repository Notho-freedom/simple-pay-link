import { useSearchParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offers, formatPrice } from "@/lib/offers";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/VOTRE_LIEN_ICI";

const Confirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const offerId = searchParams.get("offre");
  const ref = searchParams.get("ref") || "N/A";
  const name = searchParams.get("name") || "";
  const email = searchParams.get("email") || "";
  const offer = useMemo(() => offers.find((o) => o.id === offerId), [offerId]);
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Page introuvable</h1>
          <Button onClick={() => navigate("/")} className="mt-4" variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="container mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Paiement confirmé !</h1>
          <p className="mt-1 text-muted-foreground">
            Merci pour votre achat. Voici votre facture.
          </p>
        </motion.div>

        {/* Invoice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-8 rounded-2xl border bg-card p-6"
          id="invoice"
        >
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Facture</h2>
              <p className="text-sm text-muted-foreground">{date}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Payé
            </span>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence</span>
              <span className="font-mono font-medium">{ref}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{decodeURIComponent(name)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{decodeURIComponent(email)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formule</span>
              <span className="font-medium">{offer.name}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total payé</span>
              <span className="font-display text-lg font-bold text-primary">
                {formatPrice(offer.price)} FCFA
              </span>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 space-y-3"
        >
          <Button
            asChild
            size="lg"
            className="w-full gap-2"
          >
            <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> Rejoindre le groupe WhatsApp
            </a>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" /> Télécharger la facture
          </Button>

          <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Confirmation;
