export const OBEDIENCE_CATALOG = [
  {
    id: "commandes_base",
    theme: "Commandes de base",
    emoji: "🎯",
    color: "teal",
    badge: "🏅 Maître des bases",
    orders: [
      {
        id: "assis", name: "Assis", badge: "🐾 Assis Expert",
        levels: [
          { level: 1, objective: "S'assoit avec aide gestuelle", criteria: "Le chien s'assoit quand on pointe vers le sol", xp: 10 },
          { level: 2, objective: "S'assoit sans aide", criteria: "Répond à la commande vocale seule, 3 fois de suite", xp: 15 },
          { level: 3, objective: "Maintien 5s avec distractions faibles", criteria: "Reste assis 5 secondes même si quelqu'un marche à côté", xp: 20 },
          { level: 4, objective: "Maintien 15s avec distractions modérées", criteria: "Reste assis 15s avec ballon ou bruit ambiant", xp: 25 },
          { level: 5, objective: "Maintien 1 minute malgré distractions fortes", criteria: "Reste assis 1 minute avec un autre chien visible", xp: 30 }
        ]
      },
      {
        id: "couche", name: "Couché", badge: "💤 Couché Expert",
        levels: [
          { level: 1, objective: "Se couche avec geste guidé", criteria: "Se couche en suivant la friandise vers le sol", xp: 10 },
          { level: 2, objective: "Se couche sur commande vocale", criteria: "Répond à 'couché' sans geste, 3 fois de suite", xp: 15 },
          { level: 3, objective: "Maintien 10s dans position basse", criteria: "Reste couché 10 secondes avant récompense", xp: 20 },
          { level: 4, objective: "Couché à distance de 2m", criteria: "Obéit depuis 2 mètres sans s'approcher", xp: 25 },
          { level: 5, objective: "Couché et maintien 1 minute avec distractions", criteria: "Reste couché 1 minute même si on s'éloigne de 5m", xp: 30 }
        ]
      },
      {
        id: "pas_bouger", name: "Pas bouger", badge: "🗿 Statue Expert",
        levels: [
          { level: 1, objective: "Reste immobile 3 secondes", criteria: "Ne bouge pas pendant que le maître recule d'un pas", xp: 10 },
          { level: 2, objective: "Reste immobile 10 secondes", criteria: "Maintien 10s, maître à 1m", xp: 15 },
          { level: 3, objective: "Reste immobile 30s maître hors de vue", criteria: "Le maître disparaît 30s derrière un obstacle", xp: 20 },
          { level: 4, objective: "Reste immobile avec passage d'un inconnu", criteria: "Un tiers passe à 2m sans que le chien bouge", xp: 25 },
          { level: 5, objective: "Reste immobile 2 minutes en milieu animé", criteria: "Maintien 2 minutes dans un parc avec activité autour", xp: 30 }
        ]
      },
      {
        id: "viens", name: "Viens (rappel)", badge: "🏃 Rappel Expert",
        levels: [
          { level: 1, objective: "Vient quand appelé à 1m", criteria: "Rappel immédiat dans une pièce calme", xp: 10 },
          { level: 2, objective: "Vient de 5m en extérieur", criteria: "Rappel en jardin ou espace ouvert calme", xp: 15 },
          { level: 3, objective: "Vient malgré une distraction légère", criteria: "Rappel pendant qu'il renifle le sol", xp: 20 },
          { level: 4, objective: "Vient en laissant un autre chien", criteria: "Rappel alors qu'il interagit avec un congénère", xp: 25 },
          { level: 5, objective: "Rappel fiable dans tout contexte", criteria: "3 rappels réussis en environnements variés le même jour", xp: 30 }
        ]
      },
      {
        id: "lache_donne", name: "Lâche / Donne", badge: "🎁 Partage Expert",
        levels: [
          { level: 1, objective: "Lâche un jouet en échange d'une friandise", criteria: "Ouvre la gueule quand on propose une friandise", xp: 10 },
          { level: 2, objective: "Lâche sur commande verbale", criteria: "Répond à 'donne' sans friandise visible", xp: 15 },
          { level: 3, objective: "Lâche un objet à haute valeur", criteria: "Lâche sa balle préférée sur commande", xp: 20 },
          { level: 4, objective: "Lâche immédiatement, sans délai", criteria: "Réaction dans la seconde, 3 fois de suite", xp: 25 },
          { level: 5, objective: "Lâche n'importe quel objet en toute situation", criteria: "Réussite même si excité ou en mouvement", xp: 30 }
        ]
      },
      {
        id: "debout", name: "Debout", badge: "🧍 Debout Expert",
        levels: [
          { level: 1, objective: "Se lève depuis assis avec aide gestuelle", criteria: "Se lève en suivant la main vers le haut", xp: 10 },
          { level: 2, objective: "Se lève sur commande vocale seule", criteria: "Répond à 'debout' sans geste, 3 fois", xp: 15 },
          { level: 3, objective: "Debout depuis couché directement", criteria: "Passe du couché au debout sans intermédiaire", xp: 20 },
          { level: 4, objective: "Maintien debout 15s", criteria: "Reste debout sans bouger pendant 15 secondes", xp: 25 },
          { level: 5, objective: "Transitions assis/couché/debout à la chaîne", criteria: "Enchaîne les 3 positions sur commande en moins de 10s", xp: 30 }
        ]
      },
      {
        id: "au_pied", name: "Au pied", badge: "🦶 Au Pied Expert",
        levels: [
          { level: 1, objective: "Se positionne à gauche du maître", criteria: "Vient se placer côté jambe gauche sur invitation", xp: 10 },
          { level: 2, objective: "Reste au pied sur 5m", criteria: "Marche collé sans tirer sur 5 mètres", xp: 15 },
          { level: 3, objective: "Au pied avec changement de direction", criteria: "Suit les virages gauche/droite sans perdre la position", xp: 20 },
          { level: 4, objective: "Au pied avec arrêts et reprises", criteria: "S'assoit à chaque arrêt du maître automatiquement", xp: 25 },
          { level: 5, objective: "Au pied parfait 50m en milieu urbain", criteria: "Laisse détendue, position tenue 50m avec trafic", xp: 30 }
        ]
      },
      {
        id: "tourne", name: "Tourne / Spin", badge: "🌀 Spin Expert",
        levels: [
          { level: 1, objective: "Tourne sur lui-même avec guidage", criteria: "Suit la friandise en cercle complet", xp: 10 },
          { level: 2, objective: "Tourne sur commande vocale", criteria: "Tourne à droite ou gauche sur signal", xp: 15 },
          { level: 3, objective: "Tourne 2 fois de suite", criteria: "Enchaîne 2 rotations sans arrêt", xp: 20 },
          { level: 4, objective: "Tourne dans les deux sens sur commande", criteria: "Droite sur 'tourne', gauche sur 'spin'", xp: 25 },
          { level: 5, objective: "Série de 3 tours rapides avec fluidité", criteria: "3 tours enchaînés sans hésitation ni perte d'équilibre", xp: 30 }
        ]
      },
      {
        id: "recule", name: "Recule", badge: "↩️ Reculade Expert",
        levels: [
          { level: 1, objective: "Recule d'un pas sur invitation", criteria: "Un pas arrière quand le maître avance vers lui", xp: 10 },
          { level: 2, objective: "Recule de 3 pas en ligne droite", criteria: "3 pas droits sans dévier", xp: 15 },
          { level: 3, objective: "Recule sur commande verbale seule", criteria: "Répond à 'recule' sans geste, 3 fois", xp: 20 },
          { level: 4, objective: "Recule jusqu'à un point cible", criteria: "Recule jusqu'à toucher un obstacle ou tapis", xp: 25 },
          { level: 5, objective: "Recule 5 pas avec distractions", criteria: "Recule droit malgré bruit ou mouvement autour", xp: 30 }
        ]
      },
      {
        id: "salue", name: "Salue", badge: "🤝 Salut Expert",
        levels: [
          { level: 1, objective: "Lève une patte sur invitation", criteria: "Pose la patte dans la main tendue", xp: 10 },
          { level: 2, objective: "Salue sur commande verbale", criteria: "Répond à 'salut' ou 'patte' sans geste", xp: 15 },
          { level: 3, objective: "Salue un inconnu sur instruction du maître", criteria: "Donne la patte à une tierce personne", xp: 20 },
          { level: 4, objective: "Salue les deux pattes alternativement", criteria: "Patte droite puis gauche sur commande", xp: 25 },
          { level: 5, objective: "Salue de façon fiable en toute situation", criteria: "Réussite à 5 personnes différentes en une séance", xp: 30 }
        ]
      }
    ]
  },
  {
    id: "controle_impulsion",
    theme: "Contrôle et impulsion",
    emoji: "🧠",
    color: "indigo",
    badge: "🏅 Maître du contrôle",
    orders: [
      {
        id: "ignore_nourriture", name: "Ignore nourriture au sol", badge: "🙈 Sage Estomac",
        levels: [
          { level: 1, objective: "Ignore friandise posée devant lui", criteria: "Ne se précipite pas sur la friandise à 50cm", xp: 10 },
          { level: 2, objective: "Ignore friandise 5 secondes", criteria: "Maintient la tête levée pendant 5s", xp: 15 },
          { level: 3, objective: "Ignore friandise 15s sans commande répétée", criteria: "Une seule commande, maintien 15s", xp: 20 },
          { level: 4, objective: "Ignore nourriture tombée par accident", criteria: "Ne réagit pas à une friandise tombée au sol", xp: 25 },
          { level: 5, objective: "Ignore nourriture en extérieur", criteria: "Passe devant un morceau de pain sur le trottoir sans y toucher", xp: 30 }
        ]
      },
      {
        id: "stop_attends", name: "Stop / Attends", badge: "✋ Patience Expert",
        levels: [
          { level: 1, objective: "S'arrête au signal de la main", criteria: "Stop immédiat à 1m", xp: 10 },
          { level: 2, objective: "Attends avant de franchir une porte", criteria: "Ne sort pas avant l'autorisation", xp: 15 },
          { level: 3, objective: "Stop en mouvement rapide", criteria: "Arrêt pendant un trot léger", xp: 20 },
          { level: 4, objective: "Stop en présence d'un autre chien", criteria: "S'immobilise même si un congénère approche", xp: 25 },
          { level: 5, objective: "Stop à distance de 5m sur commande seule", criteria: "Commande verbale à 5m, sans geste", xp: 30 }
        ]
      },
      {
        id: "marche_laisse", name: "Marche en laisse", badge: "🦮 Marcheur Zen",
        levels: [
          { level: 1, objective: "Marche sans tirer sur 10m", criteria: "Laisse détendue sur 10m en ligne droite", xp: 10 },
          { level: 2, objective: "S'assoit quand le maître s'arrête", criteria: "Assoit ou immobilise automatiquement à l'arrêt", xp: 15 },
          { level: 3, objective: "Marche sans tirer 50m avec croisements", criteria: "Reste calme au croisement de piétons", xp: 20 },
          { level: 4, objective: "Marche proprement avec un chien visible", criteria: "Laisse détendue en passant à 5m d'un autre chien", xp: 25 },
          { level: 5, objective: "Marche urbaine de 10 minutes sans traction", criteria: "Balade de 10 min en ville avec trafic", xp: 30 }
        ]
      },
      {
        id: "gestion_excitation", name: "Gestion de l'excitation", badge: "😌 Calme Absolu",
        levels: [
          { level: 1, objective: "S'assoit avant d'être caressé", criteria: "Pas de saut, attend l'autorisation", xp: 10 },
          { level: 2, objective: "Se calme en 30s après jeu intense", criteria: "Redescend en moins de 30s après arrêt du jeu", xp: 15 },
          { level: 3, objective: "Reste calme quand la laisse est attachée", criteria: "Pas d'agitation lors de l'équipement", xp: 20 },
          { level: 4, objective: "Se calme sur commande en plein jeu", criteria: "Répond à 'calme' même très excité", xp: 25 },
          { level: 5, objective: "Calme spontané en toute situation", criteria: "Retrouve le calme en 10s sans commande", xp: 30 }
        ]
      },
      {
        id: "interaction_sociale", name: "Interaction sociale contrôlée", badge: "🤝 Diplomate Canin",
        levels: [
          { level: 1, objective: "Approche un inconnu sans sauter", criteria: "Renifle la main calmement sans jump", xp: 10 },
          { level: 2, objective: "Ignore un inconnu qui ne l'invite pas", criteria: "Ne cherche pas le contact si l'inconnu l'ignore", xp: 15 },
          { level: 3, objective: "Reste calme avec groupe de 3+ personnes", criteria: "Pas d'aboiement ni de saut dans un groupe", xp: 20 },
          { level: 4, objective: "Interagit calmement avec enfant inconnu", criteria: "Comportement doux et prévisible avec enfant", xp: 25 },
          { level: 5, objective: "Parfaite maîtrise sociale en foule", criteria: "Zen lors d'un événement public animé", xp: 30 }
        ]
      },
      {
        id: "porte_attente", name: "Attente à la porte", badge: "🚪 Gardien Patient",
        levels: [
          { level: 1, objective: "S'assoit devant la porte sur commande", criteria: "Assoit avant que la porte s'ouvre", xp: 10 },
          { level: 2, objective: "Attend que la porte soit ouverte sans bouger", criteria: "Reste en place porte grande ouverte 5s", xp: 15 },
          { level: 3, objective: "Sort seulement sur signal d'autorisation", criteria: "Attend le signal avant de franchir le seuil", xp: 20 },
          { level: 4, objective: "Attente même si quelqu'un passe", criteria: "Reste en place malgré personne qui entre/sort", xp: 25 },
          { level: 5, objective: "Attente fiable en toute situation de porte", criteria: "Réussite portail, voiture, ascenseur", xp: 30 }
        ]
      },
      {
        id: "resistance_tirage", name: "Résistance au tirage", badge: "⚓ Ancre Solide",
        levels: [
          { level: 1, objective: "Ne tire pas vers un objet attrayant à 1m", criteria: "Reste en place face à un jouet visible", xp: 10 },
          { level: 2, objective: "Ne tire pas vers un autre chien à 5m", criteria: "Continue à marcher calmement à 5m d'un congénère", xp: 15 },
          { level: 3, objective: "Ignore une invitation à courir", criteria: "Ne réagit pas si quelqu'un court à côté", xp: 20 },
          { level: 4, objective: "Ne tire pas vers nourriture visible", criteria: "Laisse détendue devant une terrasse de café", xp: 25 },
          { level: 5, objective: "Zéro tirage quelle que soit la stimulation", criteria: "Laisse détendue dans une situation à haute stimulation", xp: 30 }
        ]
      },
      {
        id: "calme_voiture", name: "Calme en voiture", badge: "🚗 Passager Zen",
        levels: [
          { level: 1, objective: "Monte en voiture sans excitation excessive", criteria: "Monte calmement sur commande", xp: 10 },
          { level: 2, objective: "Reste calme au démarrage", criteria: "Pas de gémissement ou agitation au départ", xp: 15 },
          { level: 3, objective: "Reste à sa place pendant le trajet", criteria: "Ne change pas de place pendant 10 min de trajet", xp: 20 },
          { level: 4, objective: "Attend avant de descendre", criteria: "Reste en place jusqu'au signal d'autorisation", xp: 25 },
          { level: 5, objective: "Calme parfait trajet 30 min+", criteria: "Voyage de 30 min sans stress ni agitation", xp: 30 }
        ]
      },
      {
        id: "gestion_frustration", name: "Gestion de la frustration", badge: "🧘 Zen Master",
        levels: [
          { level: 1, objective: "Attend 5s avant d'accéder à sa gamelle", criteria: "Pas de ruée sur la nourriture après 5s", xp: 10 },
          { level: 2, objective: "Supporte 30s d'attente pour récompense visible", criteria: "La friandise est là mais il attend le signal", xp: 15 },
          { level: 3, objective: "Supporte l'arrêt du jeu sans réaction", criteria: "Fin de jeu sans aboiement ni insistance", xp: 20 },
          { level: 4, objective: "Accepte de ne pas recevoir une friandise en vue", criteria: "Friandise présentée puis retirée : calme total", xp: 25 },
          { level: 5, objective: "Gestion totale de la frustration en public", criteria: "File d'attente de 2 min sans agitation", xp: 30 }
        ]
      },
      {
        id: "aboiement_controle", name: "Aboiement contrôlé", badge: "🔕 Silence Expert",
        levels: [
          { level: 1, objective: "S'arrête d'aboyer sur commande en intérieur", criteria: "Cesse d'aboyer dans les 5s sur 'silence'", xp: 10 },
          { level: 2, objective: "S'arrête d'aboyer en extérieur calme", criteria: "Répond à 'silence' en jardin", xp: 15 },
          { level: 3, objective: "Aboie sur commande, puis s'arrête", criteria: "Aboie sur 'parle', s'arrête sur 'silence'", xp: 20 },
          { level: 4, objective: "N'aboie pas à la sonnette si on lui demande", criteria: "Reste silencieux malgré sonnette si commandé avant", xp: 25 },
          { level: 5, objective: "Contrôle complet des aboiements en toute situation", criteria: "Silence garanti en présence d'autres chiens ou inconnus", xp: 30 }
        ]
      }
    ]
  },
  {
    id: "exploration_autonomie",
    theme: "Exploration et autonomie",
    emoji: "🌿",
    color: "green",
    badge: "🏅 Explorateur Canin",
    orders: [
      {
        id: "suivi_visuel", name: "Suivi visuel", badge: "👁️ Oeil de Lynx",
        levels: [
          { level: 1, objective: "Suit le regard du maître vers un objet", criteria: "Tourne la tête dans la direction indiquée", xp: 10 },
          { level: 2, objective: "Suit un geste pointé à 2m", criteria: "Se dirige vers l'objet pointé à 2m", xp: 15 },
          { level: 3, objective: "Suivi visuel en mouvement", criteria: "Suit la direction pendant la marche", xp: 20 },
          { level: 4, objective: "Localise un objet caché par suivi visuel", criteria: "Retrouve un jouet dissimulé grâce au geste", xp: 25 },
          { level: 5, objective: "Suivi visuel fiable sur commande à 5m", criteria: "Répond au geste depuis 5m dans des conditions variées", xp: 30 }
        ]
      },
      {
        id: "exploration_guidee", name: "Exploration guidée", badge: "🗺️ Cartographe",
        levels: [
          { level: 1, objective: "Explore un nouvel espace sur invitation", criteria: "S'approche d'un objet inconnu encouragé", xp: 10 },
          { level: 2, objective: "Explore et revient spontanément", criteria: "Part renifler puis revient vérifier le maître", xp: 15 },
          { level: 3, objective: "Explorer un espace inconnu sans anxiété", criteria: "Pas de gel ni fuite dans un lieu nouveau", xp: 20 },
          { level: 4, objective: "Exploration autonome avec rappel fiable", criteria: "Explore librement mais revient au rappel", xp: 25 },
          { level: 5, objective: "Exploration sereine en milieu complexe", criteria: "Forêt, marché, ou zone urbaine dense sans stress", xp: 30 }
        ]
      },
      {
        id: "recherche_olfactive", name: "Recherche olfactive", badge: "👃 Nez d'Or",
        levels: [
          { level: 1, objective: "Trouve une friandise cachée sous un tissu", criteria: "Localise en moins de 30s", xp: 10 },
          { level: 2, objective: "Trouve 1 objet caché parmi 3", criteria: "Distingue l'objet cible des autres", xp: 15 },
          { level: 3, objective: "Piste à 5m avec 3 changements de direction", criteria: "Suit la piste dans la bonne direction", xp: 20 },
          { level: 4, objective: "Trouve objet caché hors de vue", criteria: "Cherche dans une zone délimitée sans indices visuels", xp: 25 },
          { level: 5, objective: "Piste de 10m en extérieur terrain varié", criteria: "Réussite sur herbe, béton, graviers", xp: 30 }
        ]
      },
      {
        id: "passage_obstacles", name: "Passage d'obstacles", badge: "🏆 Obstacle Master",
        levels: [
          { level: 1, objective: "Passe par-dessus un obstacle bas (10cm)", criteria: "Franchit sans hésitation avec encouragement", xp: 10 },
          { level: 2, objective: "Passe dans un tunnel court", criteria: "Traverse un tunnel de 1m sans peur", xp: 15 },
          { level: 3, objective: "Slalom entre 3 cônes", criteria: "Passe entre les cônes à vitesse modérée", xp: 20 },
          { level: 4, objective: "Enchaîne 2 obstacles différents", criteria: "Sauts + slalom à la suite", xp: 25 },
          { level: 5, objective: "Parcours de 5 obstacles enchaînés", criteria: "Termine le parcours avec fluidité", xp: 30 }
        ]
      },
      {
        id: "initiative_controlee", name: "Initiative contrôlée", badge: "💡 Penseur Canin",
        levels: [
          { level: 1, objective: "Propose un comportement pour obtenir récompense", criteria: "Tente une action seul face à un jouet inaccessible", xp: 10 },
          { level: 2, objective: "Résout un puzzle simple (friandise sous bol)", criteria: "Soulève le bol ou le contourne", xp: 15 },
          { level: 3, objective: "Choisit entre 2 stratégies", criteria: "Adapte sa méthode après 1 échec", xp: 20 },
          { level: 4, objective: "Résout un puzzle à 2 étapes", criteria: "Enchaîne deux actions pour obtenir la récompense", xp: 25 },
          { level: 5, objective: "Innovation : invente un comportement nouveau", criteria: "Propose une action jamais apprise lors du shaping", xp: 30 }
        ]
      },
      {
        id: "adaptation_terrain", name: "Adaptation au terrain", badge: "🌍 Tout-Terrain",
        levels: [
          { level: 1, objective: "Marche sur sol instable sans panique", criteria: "Traverse un tapis mouvant ou surface inégale", xp: 10 },
          { level: 2, objective: "Monte et descend un escalier calmement", criteria: "Escalier de 5 marches sans traction", xp: 15 },
          { level: 3, objective: "Marche sur surfaces différentes", criteria: "Herbe, béton, sable, cailloux en une sortie", xp: 20 },
          { level: 4, objective: "Traverse un sol glissant sans anxiété", criteria: "Carrelage ou sol mouillé : aucune hésitation", xp: 25 },
          { level: 5, objective: "S'adapte spontanément à tout terrain", criteria: "5 surfaces différentes en une balade sans aide", xp: 30 }
        ]
      },
      {
        id: "seul_a_la_maison", name: "Seul à la maison", badge: "🏠 Autonome Paisible",
        levels: [
          { level: 1, objective: "Reste seul 5 minutes sans détresse", criteria: "Pas de vocalisation ni destruction en 5 min", xp: 10 },
          { level: 2, objective: "Reste seul 20 minutes", criteria: "20 min seul sans incident observable", xp: 15 },
          { level: 3, objective: "Reste seul 1 heure", criteria: "1h seul, maison intacte, chien calme au retour", xp: 20 },
          { level: 4, objective: "Reste seul 3 heures sans stress", criteria: "Pas de signe de stress au retour du maître", xp: 25 },
          { level: 5, objective: "Reste seul toute une demi-journée", criteria: "4h+ seul sans incident et accueil serein", xp: 30 }
        ]
      },
      {
        id: "decouverte_eau", name: "Découverte de l'eau", badge: "💧 Hydrochien",
        levels: [
          { level: 1, objective: "S'approche d'une flaque sans anxiété", criteria: "Renifle l'eau sans fuite", xp: 10 },
          { level: 2, objective: "Pose les pattes avant dans l'eau", criteria: "Entre dans 2cm d'eau sur invitation", xp: 15 },
          { level: 3, objective: "Traverse un cours d'eau peu profond", criteria: "Moins de 20cm de profondeur, traverse seul", xp: 20 },
          { level: 4, objective: "Entre volontairement dans l'eau plus profonde", criteria: "Ventre mouillé, reste calme", xp: 25 },
          { level: 5, objective: "Nage ou joue dans l'eau avec confiance", criteria: "Nage quelques mètres ou joue dans l'eau librement", xp: 30 }
        ]
      },
      {
        id: "confiance_hauteur", name: "Confiance en hauteur", badge: "🦅 Vaillant",
        levels: [
          { level: 1, objective: "Monte sur une plateforme basse (10cm)", criteria: "Monte et reste dessus 5s", xp: 10 },
          { level: 2, objective: "Monte sur plateforme 30cm", criteria: "Monte sans aide sur 30cm", xp: 15 },
          { level: 3, objective: "Monte et descend une rampe inclinée", criteria: "Rampe à 30° sans hésitation", xp: 20 },
          { level: 4, objective: "Reste sur plateforme haute malgré distractions", criteria: "Reste sur surface élevée 15s avec bruit ambiant", xp: 25 },
          { level: 5, objective: "Confiance totale sur surfaces en hauteur", criteria: "Passerelle, talus, podium : aucune hésitation", xp: 30 }
        ]
      },
      {
        id: "jeu_independant", name: "Jeu indépendant", badge: "🎠 Joueur Autonome",
        levels: [
          { level: 1, objective: "S'occupe seul 2 minutes avec un jouet", criteria: "Joue seul avec un Kong ou jouet pendant 2 min", xp: 10 },
          { level: 2, objective: "S'occupe seul 10 minutes", criteria: "10 min d'activité autonome sans solliciter le maître", xp: 15 },
          { level: 3, objective: "Alterne jeu et repos spontanément", criteria: "Joue puis se couche seul sans commande", xp: 20 },
          { level: 4, objective: "Joue seul dans une pièce différente", criteria: "S'occupe seul hors de vue du maître pendant 10 min", xp: 25 },
          { level: 5, objective: "Activité mentale autonome régulière", criteria: "Résout régulièrement un puzzle seul sur invitation", xp: 30 }
        ]
      }
    ]
  },
  {
    id: "resistance_stimulations",
    theme: "Résistance aux stimulations",
    emoji: "🛡️",
    color: "amber",
    badge: "🏅 Bouclier d'Acier",
    orders: [
      {
        id: "bruit_soudain", name: "Bruit soudain", badge: "🔇 Sourd aux Peurs",
        levels: [
          { level: 1, objective: "Ne sursaute pas à un claquement de mains", criteria: "Réaction minimale à 2m", xp: 10 },
          { level: 2, objective: "Se remet rapidement après un bruit fort", criteria: "Retrouve le calme en 20s", xp: 15 },
          { level: 3, objective: "Ignore des bruits répétés", criteria: "Désensibilisation après 5 répétitions", xp: 20 },
          { level: 4, objective: "Calme lors de bruit de circulation", criteria: "Pas de réaction aux voitures ou motos proches", xp: 25 },
          { level: 5, objective: "Aucune réaction aux bruits forts inattendus", criteria: "Claquement fort, sifflet, cri : zéro réaction", xp: 30 }
        ]
      },
      {
        id: "chien_proche", name: "Chien proche", badge: "🐕 Frère de Meute",
        levels: [
          { level: 1, objective: "Reste calme quand un chien passe à 10m", criteria: "Pas d'aboiement ni de traction", xp: 10 },
          { level: 2, objective: "Reste calme à 5m d'un chien inconnu", criteria: "Regarde mais reste neutre", xp: 15 },
          { level: 3, objective: "Croise un chien à 2m sans réaction", criteria: "Continue à marcher calmement", xp: 20 },
          { level: 4, objective: "Sniffe un chien inconnu calmement", criteria: "Rencontre de 10s sans tension", xp: 25 },
          { level: 5, objective: "Joue brièvement avec un chien inconnu", criteria: "Jeu de 1 minute encadré sans conflit", xp: 30 }
        ]
      },
      {
        id: "humain_inconnu", name: "Humain inconnu", badge: "🧑‍🤝‍🧑 Ami des Hommes",
        levels: [
          { level: 1, objective: "Ne recule pas quand un inconnu s'approche", criteria: "Reste en place, aucune fuite", xp: 10 },
          { level: 2, objective: "Accepte d'être touché par un inconnu sur le dos", criteria: "Pas de grognement ni d'évitement", xp: 15 },
          { level: 3, objective: "Interagit positivement avec 3 inconnus", criteria: "Cherche le contact de façon détendue", xp: 20 },
          { level: 4, objective: "Accepte inconnu avec accessoire inhabituel", criteria: "Chapeau, vélo, manteau : reste calme", xp: 25 },
          { level: 5, objective: "Parfaitement à l'aise avec tout type de personne", criteria: "Pas de réaction à personne âgée, fauteuil roulant, enfant agité", xp: 30 }
        ]
      },
      {
        id: "objets_imprevus", name: "Objets imprévus", badge: "🎒 Monde Bizarre",
        levels: [
          { level: 1, objective: "S'approche d'un objet inconnu sur invitation", criteria: "Renifle un objet nouveau posé au sol", xp: 10 },
          { level: 2, objective: "Ne réagit pas à un objet en mouvement lent", criteria: "Ballon qui roule : observation sans panique", xp: 15 },
          { level: 3, objective: "Passe près d'un objet bruyant", criteria: "Sac plastique dans le vent : continue sa marche", xp: 20 },
          { level: 4, objective: "Ignore objets imprévus en balade", criteria: "Parapluie ouvert, poussette, skateboard : zéro réaction", xp: 25 },
          { level: 5, objective: "Parfaitement adaptatif en environnement imprévisible", criteria: "Reste zen dans une situation totalement nouvelle", xp: 30 }
        ]
      },
      {
        id: "manipulation_corps", name: "Manipulation du corps", badge: "🩺 Coopérateur Médical",
        levels: [
          { level: 1, objective: "Accepte qu'on lui touche les pattes", criteria: "Pas de retrait ni grognement aux 4 pattes", xp: 10 },
          { level: 2, objective: "Accepte qu'on lui examine les oreilles", criteria: "Reste immobile pendant l'inspection des 2 oreilles", xp: 15 },
          { level: 3, objective: "Accepte le brossage complet", criteria: "Tout le corps brossé sans résistance", xp: 20 },
          { level: 4, objective: "Accepte l'inspection des dents", criteria: "Lèvres relevées, dents vérifiées sans réaction", xp: 25 },
          { level: 5, objective: "Comportement vet parfait", criteria: "Manipulation complète par une personne inconnue en calme total", xp: 30 }
        ]
      },
      {
        id: "contact_enfant", name: "Contact avec enfant", badge: "👶 Gardien Doux",
        levels: [
          { level: 1, objective: "Reste calme face à un enfant qui crie", criteria: "Pas de réaction de peur ou d'excitation", xp: 10 },
          { level: 2, objective: "Accepte d'être touché par un enfant", criteria: "Reste zen lors d'une caresse enfantine", xp: 15 },
          { level: 3, objective: "Joue doucement avec un enfant de 8 ans+", criteria: "Pas de saut ni de morsure accidentelle", xp: 20 },
          { level: 4, objective: "Ignore les gestes brusques d'un enfant", criteria: "Pas de réaction à une gesticulation imprévue", xp: 25 },
          { level: 5, objective: "Comportement irréprochable avec tout enfant", criteria: "Validé avec 3 enfants d'âges différents", xp: 30 }
        ]
      },
      {
        id: "pluie_meteo", name: "Pluie et météo adverse", badge: "☔ Tout-Temps",
        levels: [
          { level: 1, objective: "Ne refuse pas de sortir sous légère pluie", criteria: "Sort sans résistance par temps pluvieux léger", xp: 10 },
          { level: 2, objective: "Marche calmement sous la pluie", criteria: "5 min de marche sans agitation sous la pluie", xp: 15 },
          { level: 3, objective: "Tolère le vent fort sans panique", criteria: "Marche calme par vent fort", xp: 20 },
          { level: 4, objective: "Reste calme sous orage éloigné", criteria: "Tonnerre lointain : pas de panique", xp: 25 },
          { level: 5, objective: "Indifférent à toute condition météo", criteria: "Pluie, vent, froid : sorties normales en toute condition", xp: 30 }
        ]
      },
      {
        id: "foule_bruyante", name: "Foule et milieu bruyant", badge: "🎪 Citadin Accompli",
        levels: [
          { level: 1, objective: "Traverse un couloir avec 3 personnes", criteria: "Pas d'esquive ni d'anxiété dans couloir animé", xp: 10 },
          { level: 2, objective: "Marche dans une rue commerçante", criteria: "5 min dans rue animée sans traction", xp: 15 },
          { level: 3, objective: "Reste calme sur un marché", criteria: "10 min de marché sans stress visible", xp: 20 },
          { level: 4, objective: "Traverse un espace public très fréquenté", criteria: "Gare, centre commercial : traverse sans panique", xp: 25 },
          { level: 5, objective: "Zen lors d'un événement extérieur animé", criteria: "Fête de village, foire : 20 min sans incident", xp: 30 }
        ]
      },
      {
        id: "cyclistes_joggers", name: "Cyclistes et joggers", badge: "🚴 Indifférent au Mouvement",
        levels: [
          { level: 1, objective: "Ne réagit pas à un cycliste à 10m", criteria: "Pas de traction ni d'aboiement", xp: 10 },
          { level: 2, objective: "Reste calme quand un jogger passe à 3m", criteria: "Observe sans réagir", xp: 15 },
          { level: 3, objective: "Ignore un cycliste qui passe à 1m", criteria: "Continue à marcher sans déviation", xp: 20 },
          { level: 4, objective: "Reste calme avec plusieurs cyclistes", criteria: "Groupe de 3 cyclistes : zéro réaction", xp: 25 },
          { level: 5, objective: "Indifférent à tout mouvement rapide", criteria: "Trottinette, skateboard, rollers : aucune réaction", xp: 30 }
        ]
      },
      {
        id: "animaux_autres", name: "Autres animaux", badge: "🐾 Pacifiste Animal",
        levels: [
          { level: 1, objective: "Observe un chat sans se précipiter", criteria: "Regarde un chat à 5m sans traction", xp: 10 },
          { level: 2, objective: "Ignore un chat qui passe à 2m", criteria: "Continue sa marche sans réagir", xp: 15 },
          { level: 3, objective: "Reste calme près d'un cheval ou animal de ferme", criteria: "Pas de panique ou d'excitation à 5m", xp: 20 },
          { level: 4, objective: "Passe près d'animaux de ferme sans réaction", criteria: "Vaches, moutons, poules : aucune réaction excessive", xp: 25 },
          { level: 5, objective: "Indifférence totale aux animaux non-canins", criteria: "Chat, cheval, oiseau : comportement neutre constant", xp: 30 }
        ]
      }
    ]
  },
  {
    id: "jeux_cooperation",
    theme: "Jeux et coopération",
    emoji: "🎮",
    color: "purple",
    badge: "🏅 Coéquipier Parfait",
    orders: [
      {
        id: "rapport_objet", name: "Rapport d'objet", badge: "🎾 Rapporteur Pro",
        levels: [
          { level: 1, objective: "Ramène un objet jeté à 1m", criteria: "Revient avec l'objet dans la gueule", xp: 10 },
          { level: 2, objective: "Ramène et dépose dans la main", criteria: "Lâche dans la main et non au sol", xp: 15 },
          { level: 3, objective: "Rapport à 5m sans hésitation", criteria: "Retour immédiat après lancer", xp: 20 },
          { level: 4, objective: "Rapport d'un objet spécifique parmi 2", criteria: "Choisit le bon objet sur désignation", xp: 25 },
          { level: 5, objective: "Rapport fiable en environnement animé", criteria: "Ramène même avec distractions autour", xp: 30 }
        ]
      },
      {
        id: "jeu_dirige", name: "Jeu dirigé", badge: "🎲 Joueur Discipliné",
        levels: [
          { level: 1, objective: "Commence et arrête le jeu sur signal", criteria: "Démarre au 'go', arrête au 'stop'", xp: 10 },
          { level: 2, objective: "Joue sans mordre les mains", criteria: "Inhibition de morsure parfaite en jeu", xp: 15 },
          { level: 3, objective: "Alterne excitation et calme dans le jeu", criteria: "3 cycles excitation/calme sur commande", xp: 20 },
          { level: 4, objective: "Joue avec un inconnu sur invitation du maître", criteria: "Transfert du jeu à une tierce personne", xp: 25 },
          { level: 5, objective: "Participe à un jeu collectif structuré", criteria: "Jeu à 2 personnes et 1 chien sans débordement", xp: 30 }
        ]
      },
      {
        id: "shaping_volontaire", name: "Shaping volontaire", badge: "🔬 Génie en Herbe",
        levels: [
          { level: 1, objective: "Pose une patte sur un objet au sol", criteria: "Touche la cible avec la patte avant", xp: 10 },
          { level: 2, objective: "Reproduit un comportement capté en shaping", criteria: "Renouvelle l'action après récompense", xp: 15 },
          { level: 3, objective: "Chaîne 2 comportements en shaping", criteria: "Cible + s'asseoir à la suite", xp: 20 },
          { level: 4, objective: "Apprend un nouveau geste en 3 sessions", criteria: "Comportement stable après 3 courtes sessions", xp: 25 },
          { level: 5, objective: "Propose des variations créatives", criteria: "Innove dans l'approche de la cible", xp: 30 }
        ]
      },
      {
        id: "competences_combinees", name: "Compétences combinées", badge: "🌟 Champion Polyvalent",
        levels: [
          { level: 1, objective: "Enchaîne assis + couché sur commande", criteria: "Deux ordres de suite sans pause", xp: 10 },
          { level: 2, objective: "Assis + pas bouger + viens", criteria: "Séquence de 3 sans erreur", xp: 15 },
          { level: 3, objective: "Séquence de 4 ordres différents", criteria: "Enchaîne 4 commandes connues à la suite", xp: 20 },
          { level: 4, objective: "Séquence de 5 ordres avec distractions légères", criteria: "5 ordres en extérieur calme", xp: 25 },
          { level: 5, objective: "Démonstration publique de 5 ordres", criteria: "Réussite complète devant 3 personnes en parc", xp: 30 }
        ]
      },
      {
        id: "cooperation_duo", name: "Coopération en duo", badge: "👥 Équipe Parfaite",
        levels: [
          { level: 1, objective: "Obéit à une deuxième personne connue", criteria: "Répond aux commandes de base d'un familier", xp: 10 },
          { level: 2, objective: "Obéit à une personne inconnue encadrée", criteria: "Répond à 'assis' donné par un inconnu présenté", xp: 15 },
          { level: 3, objective: "Marche en laisse avec une autre personne", criteria: "Laisse détendue avec le maître secondaire 50m", xp: 20 },
          { level: 4, objective: "Rappel fiable lancé par une autre personne", criteria: "Revient à l'appel d'un tiers en extérieur", xp: 25 },
          { level: 5, objective: "Coopération parfaite avec 3 personnes différentes", criteria: "3 personnes différentes peuvent le gérer en sécurité", xp: 30 }
        ]
      },
      {
        id: "tricks_avances", name: "Tricks avancés", badge: "🎩 Artiste Canin",
        levels: [
          { level: 1, objective: "Fait le beau (assis sur pattes arrières)", criteria: "Tient la position 2s", xp: 10 },
          { level: 2, objective: "Fait semblant de dormir sur commande", criteria: "Se couche sur le flanc sur signal", xp: 15 },
          { level: 3, objective: "Rampe au sol", criteria: "Avance couché sans se lever sur 1m", xp: 20 },
          { level: 4, objective: "Enchaîne 2 tricks à la suite", criteria: "Beau + tourne ou couché sur flanc + rampe", xp: 25 },
          { level: 5, objective: "Mini numéro de 3 tricks enchaînés", criteria: "3 tricks fluides sans pause ni confusion", xp: 30 }
        ]
      },
      {
        id: "jeu_olfactif", name: "Jeu olfactif structuré", badge: "🧩 Détective Canin",
        levels: [
          { level: 1, objective: "Choisit le bon pot parmi 2", criteria: "Indique le pot contenant la friandise", xp: 10 },
          { level: 2, objective: "Choisit parmi 3 pots", criteria: "3 pots, 1 friandise : bonne désignation", xp: 15 },
          { level: 3, objective: "Retrouve l'odeur d'un objet parmi 3", criteria: "Désigne l'objet ayant l'odeur du maître", xp: 20 },
          { level: 4, objective: "Pistage d'odeur sur 5m linéaire", criteria: "Suit une trace olfactive simple", xp: 25 },
          { level: 5, objective: "Jeu olfactif complexe à 5 étapes", criteria: "Enchaîne 5 désignations consécutives sans erreur", xp: 30 }
        ]
      },
      {
        id: "tug_controle", name: "Tug contrôlé", badge: "⚖️ Tug Maître",
        levels: [
          { level: 1, objective: "Tire sur la corde sur invitation", criteria: "Commence le tug au signal du maître", xp: 10 },
          { level: 2, objective: "Lâche la corde sur commande", criteria: "Lâche instantanément sur 'lâche' en jeu", xp: 15 },
          { level: 3, objective: "Alterne tug et pause 3 fois", criteria: "3 cycles tug/lâche/reprise sans excès", xp: 20 },
          { level: 4, objective: "Tug sans accidentellement toucher la main", criteria: "5 tirages sans contact peau/dents", xp: 25 },
          { level: 5, objective: "Tug maîtrisé avec une autre personne", criteria: "Joue au tug avec un tiers en sécurité totale", xp: 30 }
        ]
      },
      {
        id: "jeu_calme", name: "Retour au calme après jeu", badge: "🌙 Transition Zen",
        levels: [
          { level: 1, objective: "S'allonge sur invitation après jeu", criteria: "Se couche sur tapis à la fin du jeu", xp: 10 },
          { level: 2, objective: "Retour au calme en moins de 1 minute", criteria: "Moins de 60s entre fin de jeu et position calme", xp: 15 },
          { level: 3, objective: "S'endort ou somnole après jeu intense", criteria: "Reste allongé 5+ min après séance de jeu", xp: 20 },
          { level: 4, objective: "Retour au calme même en présence d'un autre chien", criteria: "Se calme malgré un congénère encore actif", xp: 25 },
          { level: 5, objective: "Transition jeu/calme en toute situation", criteria: "Retour calme fiable en 30s quelle que soit la situation", xp: 30 }
        ]
      },
      {
        id: "apprentissage_nom_objets", name: "Apprentissage du nom des objets", badge: "📚 Lexique Canin",
        levels: [
          { level: 1, objective: "Reconnaît son jouet préféré par son nom", criteria: "Va chercher 'balle' parmi 2 objets", xp: 10 },
          { level: 2, objective: "Reconnaît 2 objets distincts", criteria: "Désigne 'balle' ou 'corde' selon la commande", xp: 15 },
          { level: 3, objective: "Reconnaît 3 objets distincts", criteria: "3 noms = 3 objets identifiés sans erreur", xp: 20 },
          { level: 4, objective: "Rapporte l'objet nommé parmi 4", criteria: "4 objets posés, ramène le bon à chaque fois", xp: 25 },
          { level: 5, objective: "Vocabulaire de 5 objets nommés", criteria: "5 objets maîtrisés avec 90% de réussite", xp: 30 }
        ]
      }
    ]
  }
];

export const XP_THRESHOLDS = [
  { level: 1, min: 0,    label: "Chiot en apprentissage",  emoji: "🐣" },
  { level: 2, min: 150,  label: "Compagnon attentif",       emoji: "🐾" },
  { level: 3, min: 400,  label: "Camarade fiable",          emoji: "🦴" },
  { level: 4, min: 800,  label: "Partenaire accompli",      emoji: "🎖️" },
  { level: 5, min: 1400, label: "Champion canin",           emoji: "🏆" },
  { level: 6, min: 2000, label: "Légende Canine",           emoji: "⭐" },
];

export function getDogLevel(xpTotal) {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xpTotal >= XP_THRESHOLDS[i].min) return XP_THRESHOLDS[i];
  }
  return XP_THRESHOLDS[0];
}

export function computeProgress(journal) {
  const progress = journal?.progress || {};
  let xpTotal = 0;
  const badges = [];

  for (const theme of OBEDIENCE_CATALOG) {
    let themeComplete = true;
    for (const order of theme.orders) {
      const lvl = progress[order.id] || 0;
      for (let i = 0; i < lvl; i++) {
        xpTotal += order.levels[i].xp;
      }
      if (lvl >= 5) badges.push(order.badge);
      else themeComplete = false;
    }
    if (themeComplete) badges.push(theme.badge);
  }

  return { xpTotal, badges, dogLevel: getDogLevel(xpTotal) };
}

export function getTotalPossibleXP() {
  return OBEDIENCE_CATALOG.reduce((total, theme) =>
    total + theme.orders.reduce((t, order) =>
      t + order.levels.reduce((s, l) => s + l.xp, 0), 0), 0);
}