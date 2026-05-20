# OpenFrontIO Mod v6.0

Un Userscript complet pour le jeu de stratégie web [OpenFront.io](https://openfront.io).

## Fonctionnalités 🚀

- 📡 **Radar Absolu (Nuke Detector)** : Lit directement la mémoire du jeu (WebGL `GameView` et `TransformHandler`) pour afficher la position **exacte** et le rayon d'impact des bombes nucléaires ennemies en temps réel, même si elles sont hors de votre champ de vision, avec une alerte clignotante.
- 🤝 **Auto-Diplomate** : Accepte automatiquement les demandes d'alliance provenant du Top 5 du classement, et rejette automatiquement les requêtes des autres joueurs.
- 💥 **Nuke Spammer** : Visez n'importe quelle case de la carte, appuyez sur **[N]**, et le mod envoie instantanément 20 requêtes de missiles nucléaires (Atom Bomb) sur la cible !
- 📈 **Auto-Expand (Spirale)** : Spamme automatiquement des attaques toutes les 5 secondes pour conquérir le territoire neutre (idéal pour le début de partie).
- 📍 **Marqueurs Personnalisés** : Appuyez sur **[M]** pour placer des marqueurs sur la carte et **[L]** pour les effacer. 

## Installation 🛠️

1. Installez l'extension **Tampermonkey** sur votre navigateur.
2. Cliquez sur l'icône de Tampermonkey et choisissez "Créer un nouveau script...".
3. Copiez l'intégralité du code du fichier `openfront_mod.user.js`.
4. Collez le code dans l'éditeur Tampermonkey et sauvegardez (Ctrl+S).
5. Ouvrez [OpenFront.io](https://openfront.io) et le mod s'activera automatiquement (un panneau de contrôle apparaîtra en haut à gauche).

## Raccourcis Clavier ⌨️
- **[K]** : Activer / Désactiver le mod et le radar.
- **[M]** : Poser un marqueur sur votre position de souris.
- **[L]** : Effacer tous vos marqueurs.
- **[N]** : Lancer un déluge de 20 bombes atomiques sur la position de votre souris.

## Mises à jour
- **v6.0** : Correction majeure des transformations de coordonnées (worldToScreen). Le radar est maintenant 100% synchronisé au pixel près avec le zoom de la caméra du joueur !

---
*Avertissement : L'utilisation de ce script peut enfreindre les conditions d'utilisation du jeu. À utiliser à vos risques et périls.*
