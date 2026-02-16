import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import OfferCard from "@/components/OfferCard";
import { offers } from "@/lib/offers";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 md:pt-32">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              🎓 Formation en ligne
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-6xl">
              Développez vos compétences,{" "}
              <span className="text-primary">transformez votre avenir</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Rejoignez des centaines d'apprenants et accédez à une formation complète. 
              Paiement simple et sécurisé via Mobile Money.
            </p>
            <Button
              size="lg"
              className="mt-8 gap-2"
              onClick={() => document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" })}
            >
              Voir les offres <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-y bg-muted/50 py-10">
        <div className="container mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Contenu de qualité", desc: "Modules structurés par des experts" },
            { icon: Shield, title: "Paiement sécurisé", desc: "MTN MoMo & Orange Money" },
            { icon: Users, title: "Communauté active", desc: "Groupe WhatsApp d'entraide" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-3 text-left"
            >
              <div className="rounded-lg bg-primary/10 p-2.5">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section id="offres" className="px-4 py-16 md:py-24">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Choisissez votre formule</h2>
            <p className="mt-2 text-muted-foreground">
              Trouvez l'offre qui correspond à vos objectifs
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {offers.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          © {new Date().getFullYear()} Formation en ligne. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

export default Index;
