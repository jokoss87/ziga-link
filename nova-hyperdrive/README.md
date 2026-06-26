# NOVA // HYPERDRIVE 🚀

Jeu d'arcade **futuriste type "crash"** (le multiplicateur monte, tu encaisses avant l'explosion).
Néon synthwave, animations canvas maison, son synthétisé en temps réel. **Un seul fichier, zéro
dépendance, zéro asset** → ça tourne partout et c'est parfait pour filmer des clips verticaux 9:16.

> ⚠️ **Jetons virtuels uniquement. Aucun argent réel.** C'est un jeu pour le fun et pour la démo
> marketing. La mécanique "crash" est volontairement la plus lisible et la plus partageable en 5 s.

## ▶️ Lancer
Ouvre `index.html` dans un navigateur. C'est tout.
Commandes : **clic/tap** sur le gros bouton, ou **Espace** au clavier (pratique pour enregistrer).

---

## 🎬 Pourquoi cette mécanique cartonne en pub (analyse rétention)

J'ai conçu le jeu autour des leviers qui marchent réellement sur TikTok / Reels / Shorts :

| Levier | Comment c'est implémenté ici | Effet recherché |
|---|---|---|
| **Lisibilité 5 s** | Un seul chiffre géant qui monte → explose. On comprend l'enjeu sans son. | Rétention du *scroll* (le viewer s'arrête) |
| **Tension / quasi-échec** | ~3 % de crash instantané + courbe exponentielle qui s'emballe. | Pic d'adrénaline, "encore une" |
| **Récompense variable** | Crash point aléatoire à queue lourde (jusqu'à 120×). | Boucle de dopamine type machine à sous |
| **Moment "clip-able"** | Flash + screen-shake + glitch + confettis sur gros gain. | Le viewer veut **partager** son gros multiplo |
| **Progression visible** | XP, niveaux, rangs (Pilote → Singularité), barre qui se remplit. | Sentiment d'évolution → on revient |
| **Habitude J+1** | Bonus quotidien + **série de connexion** (streak) + caisses à choisir. | Rétention day-1 / day-7 |
| **Auto-pilote** | Auto-encaissement réglable → sessions longues "idle". | Temps passé ↑ |
| **Anti-frustration** | Recharge offerte si solde trop bas → jamais de game-over sec. | On ne quitte pas l'app |
| **Preuve sociale** | Ticker des derniers multiplos (rouge/cyan/or). | "les autres jouent" |

## 📈 Angles de pub prêts à tourner (mes idées)

1. **"Le moment 100×"** — clip de 6 s : multiplicateur qui s'emballe, le viewer crie *"ENCAISSE !!"*,
   explosion d'or. CTA : *"Tu aurais cashé quand ?"* → commentaires = engagement gratuit.
2. **POV near-miss** — tu encaisses à 1.97× → crash à 1.98×. Frustration partageable (duos/stitch).
3. **Streak flex** — montrer la série de connexion J+30 et le rang "LÉGENDE". Aspiration.
4. **Hook sonore** — les bips qui montent crescendo créent une attente, même son coupé l'image suffit.
5. **Format** : natif vertical 9:16, premier multiplo dans la **première seconde**, pas d'intro.

> Astuce capture : ouvre le jeu, presse **Espace** pour lancer, filme l'écran. La courbe est
> exponentielle donc tu as toujours un beau "build-up" en moins de 8 secondes.

## 🧩 Idées d'évolution (si tu veux pousser plus loin)
- **Mode multijoueur fantôme** : un "ghost" qui encaisse en même temps que toi (FOMO).
- **Skins de comet** débloqués par niveau (collection = rétention long terme).
- **Quêtes du jour** ("encaisse 3× à +5×") avec récompense.
- **Tableau des scores** hebdo avec reset (raison de revenir chaque semaine).
- **Partage en 1 tap** : bouton qui génère une image du gros multiplo prête à poster.

## 🛠️ Technique
- **Rendu** : Canvas 2D pur (particules, grille perspective, comet + trail, glitch, screen-shake).
- **Audio** : WebAudio synthétisé (aucun fichier son), démarre au premier tap (politique navigateurs).
- **Sauvegarde** : `localStorage` (solde, XP, niveau, série, historique).
- **Responsive** : cadre 9:16 centré, pensé mobile-first.

## 🧾 Éthique
Conçu en **monnaie fictive**, sans achat, sans argent réel, sans incitation au dépôt.
C'est une démo de *game-feel* et de mécaniques de rétention pour la création de contenu —
pas un produit de jeu d'argent. Si tu veux en faire un vrai produit monétisé, il faut un cadre
légal (licences jeux d'argent, vérification d'âge, jeu responsable) : on en parle avant.
