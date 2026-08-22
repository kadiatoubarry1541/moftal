import express from 'express';
import multer from 'multer';
import { Op } from 'sequelize';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Game, GamePlayer, GameQuestion, GameAnswer, GameDeposit, GameTransaction, User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { initGameModels } from '../models/initGameModels.js';
import { uploadToR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

// Upload en mémoire pour les médias — jamais sur le disque du serveur
// (effacé à chaque redémarrage/redéploiement), envoyé ensuite vers le cloud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers vidéo et audio sont autorisés'), false);
    }
  }
});

// Initialiser les modèles Game
initGameModels();

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== GESTION DU JEU ==========

// @route   POST /api/defi-educatif/games
// @desc    Créer un nouveau jeu
// @access  Authentifié
router.post('/games', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { juryNumeroH } = req.body;
    
    // Vérifier que l'utilisateur est bien authentifié
    if (!req.user || !req.user.numeroH) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // L'admin principal (G7...) bypass toutes les vérifications
    const isSuperMasterAdmin = req.user.numeroH === 'G7C7P7R7E7F7 7';
    
    const createdBy = req.user.numeroH;

    // L'admin principal (G7...) bypass toutes les vérifications
    if (!isSuperMasterAdmin) {
      // Vérifier que les modèles sont initialisés - sinon les initialiser
      if (!Game || !GameDeposit || !GamePlayer) {
        try {
          initGameModels();
          // Attendre un peu pour que les modèles soient prêts
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (initError) {
          console.error('Erreur lors de l\'initialisation des modèles:', initError);
        }
      }
      
      // Si toujours pas initialisés après tentative, retourner erreur
      if (!Game || !GameDeposit || !GamePlayer) {
        await transaction.rollback();
        console.error('Les modèles Game ne sont pas initialisés');
        return res.status(500).json({
          success: false,
          message: 'Les modèles de base de données ne sont pas initialisés. Veuillez redémarrer le serveur.'
        });
      }

      // Vérifier si le jury existe
      if (juryNumeroH) {
        const jury = await User.findByNumeroH(juryNumeroH);
        if (!jury) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'Jury non trouvé'
          });
        }
      }
    }

    // Créer le jeu
    const game = await Game.create({
      status: 'waiting',
      depositAmount: 50000.00,
      juryNumeroH: juryNumeroH || null,
      createdBy,
      currentCycle: 1
    }, { transaction });

    // Créer le total de points
    const deposit = await GameDeposit.create({
      gameId: game.id,
      initialAmount: 50000.00,
      currentAmount: 50000.00,
      totalGainsPaid: 0.00,
      totalPenaltiesReceived: 0.00
    }, { transaction });

    // Ajouter le créateur comme Player 1
    const player1 = await GamePlayer.create({
      gameId: game.id,
      numeroH: createdBy,
      role: 'player1',
      balance: 0.00,
      debtCount: 0,
      isActive: true
    }, { transaction });

    await transaction.commit();

    // Charger le jeu complet avec les relations
    let gameWithRelations;
    try {
      gameWithRelations = await Game.findByPk(game.id, {
        include: [
          { model: GameDeposit, as: 'deposit' },
          { model: GamePlayer, as: 'players' },
          { model: GameQuestion, as: 'questions', include: [{ model: GameAnswer, as: 'answers' }] }
        ]
      });
    } catch (includeError) {
      console.warn('Erreur lors du chargement des relations, utilisation des données de base:', includeError.message);
      // Si les relations échouent, utiliser les données de base
      gameWithRelations = null;
    }

    // Construire la réponse avec les données disponibles
    const gameData = gameWithRelations ? gameWithRelations.toJSON() : {
      ...game.toJSON(),
      deposit: deposit ? deposit.toJSON() : null,
      players: [player1.toJSON()]
    };

    res.json({
      success: true,
      message: 'Jeu créé avec succès',
      game: gameData
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la création du jeu:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la création du jeu',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/defi-educatif/games/:id
// @desc    Récupérer les détails d'un jeu
// @access  Authentifié
router.get('/games/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findByPk(id, {
      include: [
        {
          model: GamePlayer,
          as: 'players',
          include: [{
            model: User,
            as: 'player',
            attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
          }]
        },
        {
          model: GameQuestion,
          as: 'questions',
          include: [{
            model: GameAnswer,
            as: 'answers',
            include: [{
              model: User,
              as: 'answerer',
              attributes: ['numeroH', 'prenom', 'nomFamille']
            }]
          }]
        },
        {
          model: GameDeposit,
          as: 'deposit'
        },
        {
          model: User,
          as: 'jury',
          attributes: ['numeroH', 'prenom', 'nomFamille']
        }
      ],
      order: [
        [{ model: GameQuestion, as: 'questions' }, 'createdAt', 'DESC'],
        [{ model: GameQuestion, as: 'questions' }, { model: GameAnswer, as: 'answers' }, 'createdAt', 'ASC']
      ]
    });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du jeu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du jeu'
    });
  }
});

// @route   POST /api/defi-educatif/games/:id/join
// @desc    Rejoindre un jeu (comme Player 2 ou invité)
// @access  Authentifié
router.post('/games/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const numeroH = req.user.numeroH;

    const game = await Game.findByPk(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    // Vérifier si le joueur est déjà dans le jeu
    const existingPlayer = await GamePlayer.findOne({
      where: { gameId: id, numeroH }
    });

    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà dans ce jeu'
      });
    }

    // Déterminer le rôle
    const players = await GamePlayer.findAll({
      where: { gameId: id }
    });

    let role = 'guest';
    if (players.length === 1) {
      role = 'player2';
    }

    // Créer le joueur
    const player = await GamePlayer.create({
      gameId: id,
      numeroH,
      role,
      balance: 0.00,
      debtCount: 0,
      isActive: true
    });

    res.json({
      success: true,
      message: 'Joueur ajouté au jeu',
      player
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du joueur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'ajout du joueur'
    });
  }
});

// @route   POST /api/defi-educatif/games/:id/start
// @desc    Démarrer un jeu
// @access  Authentifié (créateur ou jury)
router.post('/games/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const numeroH = req.user.numeroH;

    const game = await Game.findByPk(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    // Vérifier les permissions
    if (game.createdBy !== numeroH && game.juryNumeroH !== numeroH) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de démarrer ce jeu'
      });
    }

    // Vérifier qu'il y a au moins 2 joueurs
    const players = await GamePlayer.findAll({
      where: { gameId: id, isActive: true }
    });

    if (players.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Il faut au moins 2 joueurs pour démarrer'
      });
    }

    // Déterminer le premier joueur
    const firstPlayer = players.find(p => p.role === 'player1') || players[0];

    // Mettre à jour le jeu
    await game.update({
      status: 'active',
      currentPlayerTurn: firstPlayer.numeroH
    });

    res.json({
      success: true,
      message: 'Jeu démarré',
      game
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du jeu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du démarrage du jeu'
    });
  }
});

// ========== GESTION DES QUESTIONS ==========

// @route   POST /api/defi-educatif/games/:id/questions
// @desc    Poser une question
// @access  Authentifié
router.post('/games/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const numeroH = req.user.numeroH;
    const { questionContent, questionType, questionMediaUrl } = req.body;

    const game = await Game.findByPk(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Le jeu n\'est pas actif'
      });
    }

    // Vérifier que c'est le tour du joueur
    if (game.currentPlayerTurn !== numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Ce n\'est pas votre tour de poser une question'
      });
    }

    // Vérifier qu'il n'y a pas déjà une question en attente
    const pendingQuestion = await GameQuestion.findOne({
      where: {
        gameId: id,
        status: { [Op.in]: ['pending', 'answered'] }
      }
    });

    if (pendingQuestion) {
      return res.status(400).json({
        success: false,
        message: 'Il y a déjà une question en attente de validation'
      });
    }

    // Créer la question
    const question = await GameQuestion.create({
      gameId: id,
      askedBy: numeroH,
      questionType: questionType || 'text',
      questionContent,
      questionMediaUrl: questionMediaUrl || null,
      cycleNumber: game.currentCycle,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Question posée avec succès',
      question
    });
  } catch (error) {
    console.error('Erreur lors de la création de la question:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la question'
    });
  }
});

// ========== GESTION DES RÉPONSES ==========

// @route   POST /api/defi-educatif/games/:id/answers
// @desc    Répondre à une question ou refuser volontairement
// @access  Authentifié
router.post('/games/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;
    const numeroH = req.user.numeroH;
    const { questionId, answerContent, answerType, answerMediaUrl, isVoluntaryRefusal } = req.body;

    const game = await Game.findByPk(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    // Vérifier que le joueur est dans le jeu
    const player = await GamePlayer.findOne({
      where: { gameId: id, numeroH, isActive: true }
    });

    if (!player) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas dans ce jeu'
      });
    }

    // Vérifier que la question existe et est en attente
    const question = await GameQuestion.findByPk(questionId);
    if (!question || question.gameId !== parseInt(id)) {
      return res.status(404).json({
        success: false,
        message: 'Question non trouvée'
      });
    }

    if (question.status === 'validated' || question.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cette question est déjà validée'
      });
    }

    // Vérifier que le joueur n'a pas déjà répondu
    const existingAnswer = await GameAnswer.findOne({
      where: {
        questionId,
        playerId: player.id
      }
    });

    if (existingAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà répondu à cette question'
      });
    }

    // Créer la réponse
    const answer = await GameAnswer.create({
      gameId: id,
      questionId,
      playerId: player.id,
      numeroH,
      answerContent: isVoluntaryRefusal ? null : answerContent,
      answerType: isVoluntaryRefusal ? null : (answerType || 'text'),
      answerMediaUrl: isVoluntaryRefusal ? null : answerMediaUrl,
      isVoluntaryRefusal: isVoluntaryRefusal || false,
      status: 'pending',
      pointsEarned: 0.00
    });

    // Si refus volontaire, appliquer immédiatement la pénalité
    if (isVoluntaryRefusal) {
      await applyVoluntaryRefusalPenalty(game.id, player.id, answer.id, numeroH);
    }

    res.json({
      success: true,
      message: isVoluntaryRefusal ? 'Refus enregistré' : 'Réponse envoyée',
      answer
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réponse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la réponse'
    });
  }
});

// ========== VALIDATION PAR LE JURY ==========

// @route   POST /api/defi-educatif/games/:id/validate-answer
// @desc    Valider une réponse (jury uniquement)
// @access  Jury uniquement
router.post('/games/:id/validate-answer', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const juryNumeroH = req.user.numeroH;
    const { answerId, validation } = req.body; // 'correct', 'wrong', 'refuse'

    const game = await Game.findByPk(id);
    if (!game) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le jury
    if (game.juryNumeroH !== juryNumeroH) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Seul le jury peut valider les réponses'
      });
    }

    // Récupérer la réponse
    const answer = await GameAnswer.findByPk(answerId, {
      include: [
        { model: GamePlayer, as: 'player' },
        { model: GameQuestion, as: 'question' }
      ],
      transaction
    });

    if (!answer || answer.gameId !== parseInt(id)) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Réponse non trouvée'
      });
    }

    if (answer.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cette réponse a déjà été validée'
      });
    }

    // Appliquer la validation
    let points = 0;
    let status = 'pending';

    if (validation === 'correct') {
      points = 10000;
      status = 'validated_correct';
    } else if (validation === 'wrong') {
      points = -5000;
      status = 'validated_wrong';
    } else if (validation === 'refuse') {
      points = -5000;
      status = 'refused';
    }

    // Mettre à jour la réponse
    await answer.update({
      status,
      pointsEarned: points,
      validatedAt: new Date(),
      validatedBy: juryNumeroH
    }, { transaction });

    // Appliquer les transactions financières
    if (points !== 0) {
      await applyFinancialTransaction(
        game.id,
        answer.playerId,
        answer.id,
        points,
        juryNumeroH,
        transaction
      );
    }

    // Vérifier si toutes les réponses sont validées pour cette question
    const question = answer.question;
    
    // Récupérer tous les joueurs actifs (sauf celui qui a posé la question)
    const allPlayers = await GamePlayer.findAll({
      where: {
        gameId: game.id,
        isActive: true,
        numeroH: { [Op.ne]: question.askedBy } // Exclure celui qui a posé la question
      },
      transaction
    });

    const allAnswers = await GameAnswer.findAll({
      where: {
        questionId: question.id,
        gameId: game.id
      },
      transaction
    });

    // Vérifier si toutes les réponses sont validées (pas en pending)
    const allAnswered = allAnswers.every(a => a.status !== 'pending');
    // Vérifier que tous les joueurs ont répondu (sauf celui qui pose la question)
    const allPlayersAnswered = allAnswers.length >= allPlayers.length;

    // Si toutes les réponses sont validées, marquer la question comme validée
    if (allAnswered && allPlayersAnswered) {
      await question.update({
        status: 'validated'
      }, { transaction });

      // Passer au joueur suivant dans le cycle
      await moveToNextPlayer(game.id, transaction);
    } else {
      // Sinon, marquer la question comme "answered" si au moins une réponse est validée
      const hasValidatedAnswers = allAnswers.some(a => a.status !== 'pending');
      if (hasValidatedAnswers && question.status === 'pending') {
        await question.update({
          status: 'answered'
        }, { transaction });
      }
    }

    await transaction.commit();

    // Recharger le jeu pour avoir les données à jour
    const updatedGame = await Game.findByPk(game.id, {
      include: [
        {
          model: GamePlayer,
          as: 'players',
          include: [{
            model: User,
            as: 'player',
            attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
          }]
        },
        {
          model: GameQuestion,
          as: 'questions',
          include: [{
            model: GameAnswer,
            as: 'answers',
            include: [{
              model: User,
              as: 'answerer',
              attributes: ['numeroH', 'prenom', 'nomFamille']
            }]
          }]
        },
        {
          model: GameDeposit,
          as: 'deposit'
        }
      ],
      order: [
        [{ model: GameQuestion, as: 'questions' }, 'createdAt', 'DESC'],
        [{ model: GameQuestion, as: 'questions' }, { model: GameAnswer, as: 'answers' }, 'createdAt', 'ASC']
      ]
    });

    res.json({
      success: true,
      message: 'Réponse validée',
      answer,
      game: updatedGame,
      allAnswersValidated: allAnswered && allPlayersAnswered
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la validation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de la validation'
    });
  }
});

// ========== FONCTIONS HELPER ==========

// Fonction pour passer au joueur suivant dans le cycle
async function moveToNextPlayer(gameId, transaction) {
  const game = await Game.findByPk(gameId, { transaction });
  const players = await GamePlayer.findAll({
    where: {
      gameId,
      isActive: true
    },
    order: [['joinedAt', 'ASC']],
    transaction
  });

  if (players.length === 0) return;

  // Trouver l'index du joueur actuel
  const currentIndex = players.findIndex(p => p.numeroH === game.currentPlayerTurn);
  
  // Calculer le prochain joueur (en boucle)
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % players.length;
  const nextPlayer = players[nextIndex];

  // Si on revient au premier joueur, incrémenter le cycle
  const newCycle = nextIndex === 0 && currentIndex !== -1 ? game.currentCycle + 1 : game.currentCycle;

  // Mettre à jour le jeu
  await game.update({
    currentPlayerTurn: nextPlayer.numeroH,
    currentCycle: newCycle
  }, { transaction });
}

// Fonction pour appliquer une pénalité de refus volontaire
async function applyVoluntaryRefusalPenalty(gameId, playerId, answerId, numeroH) {
  const transaction = await sequelize.transaction();
  try {
    const player = await GamePlayer.findByPk(playerId, { transaction });
    const game = await Game.findByPk(gameId, { transaction });
    const deposit = await GameDeposit.findOne({ where: { gameId }, transaction });

    const penaltyAmount = -10000;
    const balanceBefore = parseFloat(player.balance);
    const newBalance = balanceBefore + penaltyAmount;

    // Vérifier les points négatifs (max 2 fois)
    // Si le joueur n'a pas assez de points et a déjà 2 fois des points négatifs, refuser
    if (balanceBefore < Math.abs(penaltyAmount)) {
      if (player.debtCount >= 2) {
        await transaction.rollback();
        throw new Error('Le joueur a atteint la limite de points négatifs (2 fois maximum). Le refus volontaire ne peut pas être appliqué.');
      }
      // Vérifier si cette pénalité va créer de nouveaux points négatifs
      const willCreateNewDebt = balanceBefore >= 0 && newBalance < 0;
      if (willCreateNewDebt && player.debtCount >= 2) {
        await transaction.rollback();
        throw new Error('Le joueur a atteint la limite de points négatifs (2 fois maximum). Le refus volontaire ne peut pas être appliqué.');
      }
    }

    // Calculer si on passe à de nouveaux points négatifs
    const isNewDebt = balanceBefore >= 0 && newBalance < 0;
    const newDebtCount = isNewDebt ? player.debtCount + 1 : player.debtCount;

    // Mettre à jour le joueur
    await player.update({
      balance: newBalance,
      debtCount: newDebtCount
    }, { transaction });

    // Mettre à jour le total de points
    // IMPORTANT: Le total de points ne doit jamais dépasser initialAmount (50 000 points)
    const depositBefore = parseFloat(deposit.currentAmount);
    const maxDeposit = parseFloat(deposit.initialAmount);
    const newDepositAmount = Math.min(maxDeposit, depositBefore + Math.abs(penaltyAmount));
    
    await deposit.update({
      currentAmount: newDepositAmount,
      totalPenaltiesReceived: parseFloat(deposit.totalPenaltiesReceived) + Math.abs(penaltyAmount)
    }, { transaction });

    // Créer la transaction
    await GameTransaction.create({
      gameId,
      playerId,
      answerId,
      transactionType: 'voluntary_refusal',
      amount: penaltyAmount,
      playerBalanceBefore: balanceBefore,
      playerBalanceAfter: newBalance,
      depositAmountBefore: depositBefore,
      depositAmountAfter: newDepositAmount,
      description: 'Refus volontaire de répondre (pénalité de points)',
      validatedBy: numeroH
    }, { transaction });

    // Mettre à jour la réponse
    const answer = await GameAnswer.findByPk(answerId, { transaction });
    await answer.update({
      status: 'validated_wrong',
      pointsEarned: penaltyAmount,
      validatedAt: new Date(),
      validatedBy: numeroH
    }, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// Fonction pour appliquer une transaction financière
async function applyFinancialTransaction(gameId, playerId, answerId, points, validatedBy, transaction) {
  const player = await GamePlayer.findByPk(playerId, { transaction });
  const game = await Game.findByPk(gameId, { transaction });
  const deposit = await GameDeposit.findOne({ where: { gameId }, transaction });

  const balanceBefore = parseFloat(player.balance);
  let newBalance = balanceBefore + points;

  // Vérifier les points négatifs (max 2 fois)
  // Si pénalité et points insuffisants, vérifier si on peut avoir des points négatifs
  if (points < 0 && balanceBefore < Math.abs(points)) {
    // Si c'est déjà la 3ème fois avec points négatifs ou plus, refuser
    if (player.debtCount >= 2) {
      throw new Error('Le joueur a atteint la limite de points négatifs (2 fois maximum). Cette pénalité ne peut pas être appliquée.');
    }
    // Calculer si cette pénalité va créer de nouveaux points négatifs
    const willCreateNewDebt = balanceBefore >= 0 && newBalance < 0;
    if (willCreateNewDebt && player.debtCount >= 2) {
      throw new Error('Le joueur a atteint la limite de points négatifs (2 fois maximum). Cette pénalité ne peut pas être appliquée.');
    }
    newBalance = balanceBefore + points; // Peut être négatif
  }

  // Calculer si on passe à de nouveaux points négatifs
  const isNewDebt = balanceBefore >= 0 && newBalance < 0;
  const newDebtCount = isNewDebt ? player.debtCount + 1 : player.debtCount;

  // Mettre à jour le joueur
  await player.update({
    balance: newBalance,
    debtCount: newDebtCount
  }, { transaction });

  // Mettre à jour le total de points
  const depositBefore = parseFloat(deposit.currentAmount);
  let newDepositAmount = depositBefore;
  
  if (points > 0) {
    // Gain : déduire du total de points (mais jamais en dessous de 0)
    newDepositAmount = Math.max(0, depositBefore - points);
    await deposit.update({
      currentAmount: newDepositAmount,
      totalGainsPaid: parseFloat(deposit.totalGainsPaid) + points
    }, { transaction });
  } else {
    // Pénalité : ajouter au total de points
    // IMPORTANT: Le total de points ne doit jamais dépasser initialAmount (50 000 points)
    // sauf si recharge explicite autorisée
    const maxDeposit = parseFloat(deposit.initialAmount);
    newDepositAmount = Math.min(maxDeposit, depositBefore + Math.abs(points));
    await deposit.update({
      currentAmount: newDepositAmount,
      totalPenaltiesReceived: parseFloat(deposit.totalPenaltiesReceived) + Math.abs(points)
    }, { transaction });
  }

  // Créer la transaction
  await GameTransaction.create({
    gameId,
    playerId,
    answerId,
    transactionType: points > 0 ? 'gain' : 'penalty',
    amount: points,
    playerBalanceBefore: balanceBefore,
    playerBalanceAfter: newBalance,
    depositAmountBefore: depositBefore,
    depositAmountAfter: newDepositAmount,
    description: points > 0 ? 'Points gagnés pour bonne réponse' : 'Points de pénalité pour mauvaise réponse',
    validatedBy
  }, { transaction });
}

// ========== RECHARGE DES POINTS ==========

// @route   POST /api/defi-educatif/games/:id/recharge-points
// @desc    Recharger les points (une seule personne)
// @access  Admin ou créateur
router.post('/games/:id/recharge-points', requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const rechargerNumeroH = req.user.numeroH;

    const deposit = await GameDeposit.findOne({ where: { gameId: id }, transaction });
    if (!deposit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Total de points non trouvé'
      });
    }

    const rechargeAmount = parseFloat(amount) || 0;
    if (rechargeAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Le nombre de points à recharger doit être positif'
      });
    }

    // Mettre à jour le total de points
    // IMPORTANT: Selon le cahier des charges, les points peuvent être rechargés
    // mais on doit s'assurer de la cohérence avec les règles du jeu
    const newAmount = parseFloat(deposit.currentAmount) + rechargeAmount;
    
    // Mettre à jour l'initialAmount si on recharge au-delà de l'initial
    const newInitialAmount = newAmount > parseFloat(deposit.initialAmount) 
      ? newAmount 
      : parseFloat(deposit.initialAmount);
    
    await deposit.update({
      currentAmount: newAmount,
      initialAmount: newInitialAmount, // Mettre à jour l'initial si recharge
      lastRechargeBy: rechargerNumeroH,
      lastRechargeDate: new Date(),
      lastRechargeAmount: rechargeAmount
    }, { transaction });

    // Créer la transaction
    await GameTransaction.create({
      gameId: id,
      transactionType: 'deposit_recharge',
      amount: rechargeAmount,
      depositAmountBefore: parseFloat(deposit.currentAmount),
      depositAmountAfter: newAmount,
      description: `Recharge de ${rechargeAmount} points`,
      validatedBy: rechargerNumeroH
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Points rechargés avec succès',
      deposit
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la recharge:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recharge'
    });
  }
});

// ========== ROUTES POUR LE JURY ==========

// @route   GET /api/defi-educatif/games/:id/pending-answers
// @desc    Récupérer toutes les réponses en attente de validation (jury uniquement)
// @access  Jury uniquement
router.get('/games/:id/pending-answers', async (req, res) => {
  try {
    const { id } = req.params;
    const juryNumeroH = req.user.numeroH;

    const game = await Game.findByPk(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Jeu non trouvé'
      });
    }

    // Vérifier que l'utilisateur est le jury
    if (game.juryNumeroH !== juryNumeroH) {
      return res.status(403).json({
        success: false,
        message: 'Seul le jury peut accéder à cette ressource'
      });
    }

    // Récupérer toutes les questions avec des réponses en attente
    const questions = await GameQuestion.findAll({
      where: {
        gameId: id,
        status: { [Op.in]: ['pending', 'answered'] }
      },
      include: [{
        model: GameAnswer,
        as: 'answers',
        where: {
          status: 'pending'
        },
        required: true,
        include: [{
          model: GamePlayer,
          as: 'player',
          include: [{
            model: User,
            as: 'player',
            attributes: ['numeroH', 'prenom', 'nomFamille', 'photo']
          }]
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses en attente:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des réponses en attente'
    });
  }
});

// ========== RÉCUPÉRATION DES TRANSACTIONS ==========

// @route   GET /api/defi-educatif/games/:id/transactions
// @desc    Récupérer l'historique des transactions
// @access  Authentifié
router.get('/games/:id/transactions', async (req, res) => {
  try {
    const { id } = req.params;

    const transactions = await GameTransaction.findAll({
      where: { gameId: id },
      include: [
        {
          model: GamePlayer,
          as: 'player',
          include: [{
            model: User,
            as: 'player',
            attributes: ['numeroH', 'prenom', 'nomFamille']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des transactions'
    });
  }
});

// ========== UPLOAD MÉDIA ==========

// @route   POST /api/defi-educatif/upload-media
// @desc    Uploader un fichier audio ou vidéo
// @access  Authentifié
router.post('/upload-media', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const mediaUrl = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype, 'defi-educatif');
    uploadToIDrive(req.file.buffer, req.file.originalname, req.file.mimetype, 'defi-educatif').catch(() => {});

    res.json({
      success: true,
      message: 'Média uploadé avec succès',
      url: mediaUrl,
      mediaUrl: mediaUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du média:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur lors de l\'upload du média'
    });
  }
});

export default router;

