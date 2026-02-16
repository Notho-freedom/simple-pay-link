export interface Offer {
  id: string;
  name: string;
  price: number;
  currency: string;
  popular?: boolean;
  features: string[];
}

export const offers: Offer[] = [
  {
    id: "basique",
    name: "Basique",
    price: 15000,
    currency: "XAF",
    features: [
      "Accès aux modules de base",
      "Support par email",
      "Certificat de participation",
      "Accès pendant 3 mois",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 35000,
    currency: "XAF",
    popular: true,
    features: [
      "Accès à tous les modules",
      "Support prioritaire WhatsApp",
      "Certificat de réussite",
      "Accès illimité",
      "Ressources téléchargeables",
      "Groupe privé d'entraide",
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: 60000,
    currency: "XAF",
    features: [
      "Tout le contenu Premium",
      "Coaching individuel (2 sessions)",
      "Mentorat personnalisé",
      "Accès à vie",
      "Mises à jour gratuites",
      "Certificat VIP personnalisé",
      "Accès anticipé aux nouveautés",
    ],
  },
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-CM").format(price);
}
