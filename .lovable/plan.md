

# Site de Paiement - Formation en Ligne 🎓

## Vue d'ensemble
Un site web minimaliste et élégant permettant à vos clients de choisir une offre de formation, payer via MTN Mobile Money ou Orange Money, puis recevoir une facture et un lien WhatsApp.

## Passerelle de paiement recommandée : **NotchPay**
NotchPay est une passerelle camerounaise qui supporte MTN MoMo et Orange Money avec une intégration simple. Vous devrez créer un compte sur [notchpay.co](https://notchpay.co) et obtenir votre clé API.

---

## Pages & Fonctionnalités

### 1. Page d'accueil / Landing
- Titre accrocheur sur la formation
- Brève description de ce que le client va obtenir
- Bouton d'appel à l'action vers les offres

### 2. Section Offres (2-3 formules)
- Cartes de prix comparatives (ex: Basique, Premium, VIP)
- Chaque carte affiche : nom, prix en FCFA, avantages inclus
- Bouton "Payer maintenant" sur chaque carte

### 3. Page de Paiement
- Formulaire avec : Nom, Numéro de téléphone, Email
- Choix du mode de paiement : MTN Mobile Money ou Orange Money
- Récapitulatif de la commande (offre choisie + montant)
- Intégration NotchPay pour traiter le paiement mobile money
- Redirection après paiement

### 4. Page de Confirmation (après paiement réussi)
- Message de confirmation du paiement
- **Facture** générée automatiquement (téléchargeable en PDF ou affichée à l'écran) avec : nom, date, montant, référence de transaction
- **Lien du groupe WhatsApp** affiché clairement avec bouton pour rejoindre

---

## Backend (Supabase Cloud)
- **Edge Function** pour initialiser le paiement via l'API NotchPay
- **Edge Function** webhook pour recevoir la confirmation de paiement de NotchPay
- Stockage des transactions (référence, statut, nom, email, offre choisie)
- Génération de la facture côté serveur

## Design
- Interface minimaliste, moderne, mobile-first
- Couleurs sobres avec accents verts (rappelant le mobile money)
- Responsive pour mobile (la majorité de vos clients paieront depuis leur téléphone)

