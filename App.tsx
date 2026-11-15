import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Board3D,
  GameModeSelection,
  ScoreBoard,
  GameControls,
  GameOverModal,
  NoticeModal,
  PromotionModal,
  HintBanner,
} from './src/components';
import type { Board3DHandle } from './src/components/Board3D';
import {
  createInitialState,
  getValidMoves,
  makeMove,
  applyMoveToBoard,
  getGameStatus,
  getPieceColor,
  getPieceType,
  searchMoveForLevel,
  searchHint,
  isGameOver,
  opponentOf,
  shouldAcceptDraw,
} from './src/utils/chessUtils';
import {
  initSounds,
  playSelectSound,
  playMoveSound,
  playKillSound,
  playErrorSound,
  releaseSounds,
} from './src/utils/soundUtils';
import { initAds, showRewardedAd } from './src/lib/ads';
import type { Notice } from './src/components/NoticeModal';
import type {
  Board,
  Color,
  GameMode,
  GameState,
  GameStatus,
  MachineLevel,
  Move,
  Piece,
  PieceType,
  SquarePosition,
} from './src/types/chess';

interface MovingPiece {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isCapture: boolean;
}

interface PendingPromotion {
  from: SquarePosition;
  to: SquarePosition;
  color: Color;
  previewBoard: Board;
}

// A hint being worked out for one position, while the player watches the ad.
interface HintSearch {
  game: GameState;
  best: Move | null; // Deepest move found so far.
  rewarded: boolean; // The ad finished, so the hint can be shown.
  stop: () => void;
}

interface MoveSnapshot {
  game: GameState;
  capturedWhite: Piece[];
  capturedBlack: Piece[];
}

const MOVE_ANIMATION_MS = 200;
const MACHINE_DELAY_MS = 600;
const UNDO_NOTICES = {
  cancelled: {
    icon: 'cancel',
    title: 'Ad cancelled',
    message:
      'You closed the ad before it finished, so your move cannot be undone.',
  },
  failed: {
    icon: 'error-outline',
    title: 'Ad failed',
    message:
      'The ad could not be played, so your move was not undone. Please try again.',
  },
  offline: {
    icon: 'wifi-off',
    title: 'No internet',
    message:
      'Please connect to the internet to watch an ad and undo your move.',
  },
  unavailable: {
    icon: 'hourglass-empty',
    title: 'No ad available',
    message: 'No ad is available right now. Please try again shortly.',
  },
} satisfies Record<string, Notice>;

const HINT_NOTICES = {
  cancelled: {
    icon: 'cancel',
    title: 'Ad cancelled',
    message: 'You closed the ad before it finished, so no hint is shown.',
  },
  failed: {
    icon: 'error-outline',
    title: 'Ad failed',
    message:
      'The ad could not be played, so no hint is shown. Please try again.',
  },
  offline: {
    icon: 'wifi-off',
    title: 'No internet',
    message: 'Please connect to the internet to watch an ad and get a hint.',
  },
  unavailable: UNDO_NOTICES.unavailable,
} satisfies Record<string, Notice>;

const capitalize = (color: Color): string =>
  color.charAt(0).toUpperCase() + color.slice(1);

const App = () => {
  useEffect(() => {
    initSounds();
    const stopAds = initAds();
    return () => {
      stopAds();
      releaseSounds();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <ChessGame />
    </SafeAreaProvider>
  );
};

const ChessGame = () => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [machineLevel, setMachineLevel] = useState<MachineLevel>('medium');
  const [game, setGame] = useState<GameState>(createInitialState);
  const [selectedSquare, setSelectedSquare] = useState<SquarePosition | null>(
    null,
  );
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    status: 'playing',
    currentTurn: 'white',
  });
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] =
    useState<PendingPromotion | null>(null);
  // One snapshot per committed move, taken just before the move was played.
  const [history, setHistory] = useState<MoveSnapshot[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  // The suggested move shown on the board, until the position changes.
  const [hint, setHint] = useState<{
    from: SquarePosition;
    to: SquarePosition;
    piece: Piece;
    promotion: Piece | null;
  } | null>(null);
  // Whether the banner is asking the player to let the game play the hint.
  const [hintAsking, setHintAsking] = useState(false);
  const board3dRef = useRef<Board3DHandle>(null);
  // From tapping Hint until the hint is shown (or the ad fails): the game is
  // paused, so the position can't change under the hint being worked out.
  const [hintBusy, setHintBusy] = useState(false);
  const hintSearchRef = useRef<HintSearch | null>(null);

  const timeoutsRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const lastBackPressRef = useRef<number | null>(null);

  const gameOver = isGameOver(gameStatus.status);
  const isMachineTurn = gameMode === 'PvM' && game.turn === 'black';
  // In PvM, undo takes back the machine's reply and the player's move, so it is
  // the player's turn again.
  const movesToUndo = gameMode === 'PvM' ? 2 : 1;
  const canUndo =
    !gameOver &&
    !isMachineTurn &&
    !movingPiece &&
    !pendingPromotion &&
    !hintBusy &&
    history.length >= movesToUndo;
  const canHint =
    !gameOver &&
    !isMachineTurn &&
    !movingPiece &&
    !pendingPromotion &&
    !hintBusy;

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const clearScheduled = useCallback(() => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current.clear();
  }, []);

  useEffect(() => clearScheduled, [clearScheduled]);

  const stopHintSearch = useCallback(() => {
    hintSearchRef.current?.stop();
    hintSearchRef.current = null;
    setHintBusy(false);
  }, []);

  // A hint belongs to one position: any move, undo or restart clears it.
  useEffect(() => {
    setHint(null);
    stopHintSearch();
  }, [game, stopHintSearch]);
  useEffect(() => stopHintSearch, [stopHintSearch]);

  const handleBackPress = useCallback(() => {
    if (
      lastBackPressRef.current &&
      Date.now() - lastBackPressRef.current < 1000
    ) {
      BackHandler.exitApp();
      return true;
    }
    lastBackPressRef.current = Date.now();
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true;
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const finishGame = useCallback(
    (newStatus: GameStatus) => {
      setGameStatus(newStatus);
      setSelectedSquare(null);
      setValidMoves([]);
      schedule(() => setShowGameOverModal(true), 500);
    },
    [schedule],
  );

  // Single entry point for every move (human or machine).
  const commitMove = useCallback(
    (from: SquarePosition, to: SquarePosition, promotionType?: PieceType) => {
      const result = makeMove(game, from, to, promotionType);
      setMovingPiece(null);
      if (!result) {
        playErrorSound();
        return;
      }

      const { state: nextGame, move } = result;
      setHistory(prev => [...prev, { game, capturedWhite, capturedBlack }]);
      if (move.captured) {
        if (getPieceColor(move.captured) === 'white') {
          setCapturedWhite(prev => [...prev, move.captured]);
        } else {
          setCapturedBlack(prev => [...prev, move.captured]);
        }
        playKillSound();
      }
      playMoveSound();

      setGame(nextGame);
      const newStatus = getGameStatus(nextGame);
      if (newStatus.status === 'check' || newStatus.status === 'checkmate') {
        playErrorSound();
      }
      if (isGameOver(newStatus.status)) {
        finishGame(newStatus);
      } else {
        setGameStatus(newStatus);
      }
    },
    [game, capturedWhite, capturedBlack, finishGame],
  );

  // Machine plays black in PvM. It waits while a modal is open, so the game can't
  // change behind a question such as "really want to resign?".
  const isNoticeOpen = notice !== null;
  useEffect(() => {
    if (!isMachineTurn || gameOver || isNoticeOpen) return;
    let cancelSearch: (() => void) | undefined;
    const thinkId = setTimeout(() => {
      cancelSearch = searchMoveForLevel(game, machineLevel, move => {
        if (!move) return;
        setMovingPiece({
          fromRow: move.from.row,
          fromCol: move.from.col,
          toRow: move.to.row,
          toCol: move.to.col,
          isCapture: !!move.captured,
        });
        schedule(
          () =>
            commitMove(
              move.from,
              move.to,
              (move.promotion && getPieceType(move.promotion)) || undefined,
            ),
          MOVE_ANIMATION_MS,
        );
      });
    }, MACHINE_DELAY_MS);
    return () => {
      clearTimeout(thinkId);
      cancelSearch?.();
    };
  }, [
    isMachineTurn,
    gameOver,
    isNoticeOpen,
    game,
    machineLevel,
    commitMove,
    schedule,
  ]);

  const resetGame = useCallback(() => {
    clearScheduled();
    setGame(createInitialState());
    setSelectedSquare(null);
    setValidMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameStatus({ status: 'playing', currentTurn: 'white' });
    setMovingPiece(null);
    setShowGameOverModal(false);
    setPendingPromotion(null);
    setHistory([]);
  }, [clearScheduled]);

  const handlePromotionSelect = useCallback(
    (promotionType: PieceType) => {
      if (!pendingPromotion) return;
      setPendingPromotion(null);
      commitMove(pendingPromotion.from, pendingPromotion.to, promotionType);
    },
    [pendingPromotion, commitMove],
  );

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
  }, []);

  const handleSelectMode = useCallback(
    (mode: GameMode, level: MachineLevel = 'medium') => {
      setGameMode(mode);
      setMachineLevel(level);
      resetGame();
    },
    [resetGame],
  );

  const handleBackToMenu = useCallback(() => {
    setGameMode(null);
    resetGame();
  }, [resetGame]);

  const handleResign = useCallback(() => {
    if (gameOver || movingPiece || hintBusy) return;
    const resigning = gameMode === 'PvM' ? 'white' : game.turn;
    const label =
      gameMode === 'PvM' ? 'Do you' : `${capitalize(resigning)}, do you`;
    setNotice({
      icon: 'flag',
      title: 'Resign',
      message: `${label} really want to resign?`,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Resign',
          variant: 'danger',
          onPress: () => {
            clearScheduled();
            setMovingPiece(null);
            setPendingPromotion(null);
            finishGame({
              status: 'resigned',
              winner: opponentOf(resigning),
              loser: resigning,
              currentTurn: game.turn,
            });
          },
        },
      ],
    });
  }, [
    gameOver,
    movingPiece,
    hintBusy,
    gameMode,
    game,
    clearScheduled,
    finishGame,
  ]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const result = showRewardedAd({
      onReward: () => {
        const snapshot = history[history.length - movesToUndo];
        setHistory(history.slice(0, -movesToUndo));
        setGame(snapshot.game);
        setCapturedWhite(snapshot.capturedWhite);
        setCapturedBlack(snapshot.capturedBlack);
        setGameStatus(getGameStatus(snapshot.game));
        setSelectedSquare(null);
        setValidMoves([]);
      },
      onCancel: () => {
        setNotice(UNDO_NOTICES.cancelled);
      },
      onError: () => {
        setNotice(UNDO_NOTICES.failed);
      },
    });
    if (result === 'offline') {
      setNotice(UNDO_NOTICES.offline);
    } else if (result === 'unavailable') {
      setNotice(UNDO_NOTICES.unavailable);
    }
  }, [canUndo, history, movesToUndo]);

  // The hint is worked out while the ad plays, and shown once it has finished.
  const handleHint = useCallback(() => {
    if (!canHint) return;
    stopHintSearch();
    setHint(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setHintBusy(true);
    const search: HintSearch = {
      game,
      best: null,
      rewarded: false,
      stop: () => {},
    };
    const reveal = () => {
      if (hintSearchRef.current !== search || !search.best) return;
      const { from, to, promotion } = search.best;
      setHint({
        from,
        to,
        piece: search.game.board[from.row][from.col],
        promotion: promotion ?? null,
      });
      setHintAsking(true);
      stopHintSearch();
    };
    hintSearchRef.current = search;
    const onDepth = (move: Move | null, depth: number) => {
      if (hintSearchRef.current !== search) return;
      if (depth < 0) {
        // The 3D board's search was lost (crash or reload): search here instead.
        search.stop = searchHint(search.game, onDepth);
        return;
      }
      if (move) search.best = move;
      if (search.rewarded) reveal();
    };
    // Searched in the 3D board's page when it's running, as that keeps going
    // while the ad covers the app; otherwise here, which waits for the ad to close.
    search.stop =
      board3dRef.current?.findHint(game, onDepth) ?? searchHint(game, onDepth);
    const fail = (failure: Notice) => {
      if (hintSearchRef.current === search) stopHintSearch();
      setNotice(failure);
    };

    const result = showRewardedAd({
      onReward: () => {
        if (hintSearchRef.current !== search) return;
        search.rewarded = true;
        // Show the deepest move found so far; if none yet, the first one found.
        if (search.best) reveal();
      },
      onCancel: () => fail(HINT_NOTICES.cancelled),
      onError: () => fail(HINT_NOTICES.failed),
    });
    if (result === 'offline') fail(HINT_NOTICES.offline);
    else if (result === 'unavailable') fail(HINT_NOTICES.unavailable);
  }, [canHint, game, stopHintSearch]);

  // Plays the suggested move for the player, if they agree to it.
  const handlePlayHint = useCallback(() => {
    if (!hint || gameOver || isMachineTurn || movingPiece || pendingPromotion)
      return;
    const { from, to, promotion } = hint;
    setHintAsking(false);
    setSelectedSquare(null);
    setValidMoves([]);
    playSelectSound();
    setMovingPiece({
      fromRow: from.row,
      fromCol: from.col,
      toRow: to.row,
      toCol: to.col,
      isCapture: !!game.board[to.row][to.col],
    });
    schedule(
      () =>
        commitMove(
          from,
          to,
          (promotion && getPieceType(promotion)) || undefined,
        ),
      MOVE_ANIMATION_MS,
    );
  }, [
    hint,
    gameOver,
    isMachineTurn,
    movingPiece,
    pendingPromotion,
    game,
    schedule,
    commitMove,
  ]);

  const handleOfferDraw = useCallback(() => {
    if (gameOver || isMachineTurn || movingPiece || hintBusy) return;
    const drawStatus: GameStatus = {
      status: 'draw',
      reason: 'agreement',
      currentTurn: game.turn,
    };

    if (gameMode === 'PvM') {
      if (shouldAcceptDraw(game, 'black')) {
        setNotice({
          icon: 'handshake',
          title: 'Draw offer',
          message: 'The machine accepts your draw offer.',
        });
        finishGame(drawStatus);
      } else {
        setNotice({
          icon: 'handshake',
          title: 'Draw offer',
          message: 'The machine declines your draw offer.',
        });
      }
      return;
    }

    const offering = game.turn;
    const responding = opponentOf(offering);
    setNotice({
      icon: 'handshake',
      title: 'Draw offer',
      message: `${capitalize(offering)} offers a draw. ${capitalize(
        responding,
      )}, do you accept?`,
      actions: [
        { label: 'Decline', variant: 'secondary' },
        { label: 'Accept', onPress: () => finishGame(drawStatus) },
      ],
    });
  }, [
    gameOver,
    isMachineTurn,
    movingPiece,
    hintBusy,
    gameMode,
    game,
    finishGame,
  ]);

  const handleSquarePress = useCallback(
    (row: number, col: number) => {
      if (
        isMachineTurn ||
        gameOver ||
        movingPiece ||
        pendingPromotion ||
        hintBusy
      )
        return;

      const piece = game.board[row][col];

      if (selectedSquare) {
        const matching = validMoves.filter(
          m => m.to.row === row && m.to.col === col,
        );

        if (matching.length > 0) {
          const move = matching[0];
          const from = { ...selectedSquare };
          const to = { row, col };
          setSelectedSquare(null);
          setValidMoves([]);
          setMovingPiece({
            fromRow: from.row,
            fromCol: from.col,
            toRow: row,
            toCol: col,
            isCapture: !!move.captured,
          });

          schedule(() => {
            if (move.promotion) {
              setMovingPiece(null);
              setPendingPromotion({
                from,
                to,
                color: game.turn,
                previewBoard: applyMoveToBoard(game.board, {
                  ...move,
                  promotion: null,
                }),
              });
            } else {
              commitMove(from, to);
            }
          }, MOVE_ANIMATION_MS);
          return;
        }

        if (
          (selectedSquare.row !== row || selectedSquare.col !== col) &&
          !piece
        ) {
          playErrorSound();
          return;
        }
      }

      if (piece && getPieceColor(piece) === game.turn) {
        playSelectSound();
        setSelectedSquare({ row, col });
        setValidMoves(getValidMoves(game, row, col));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [
      game,
      selectedSquare,
      validMoves,
      isMachineTurn,
      gameOver,
      movingPiece,
      pendingPromotion,
      hintBusy,
      schedule,
      commitMove,
    ],
  );

  // The 3D board stays mounted behind the menu, hidden, so it has finished
  // loading by the time a game starts instead of appearing late.
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGradient}>
        <View
          style={[styles.content, !gameMode && styles.hidden]}
          pointerEvents={gameMode ? 'auto' : 'none'}
        >
          <View style={styles.boardSection}>
            <Board3D
              ref={board3dRef}
              board={
                pendingPromotion ? pendingPromotion.previewBoard : game.board
              }
              selectedSquare={selectedSquare}
              validMoves={validMoves.map(m => m.to)}
              onSquarePress={handleSquarePress}
              movingPiece={movingPiece}
              gameStatus={gameStatus}
              hint={hint}
            />
          </View>

          {gameMode && (
            <View style={styles.infoSection}>
              <ScoreBoard
                currentTurn={game.turn}
                gameMode={gameMode}
                machineLevel={machineLevel}
                capturedWhite={capturedWhite}
                capturedBlack={capturedBlack}
                gameStatus={gameStatus}
                isThinking={isMachineTurn && !gameOver}
              />
              {(hintBusy || hint) && (
                <View style={styles.hintBanner} pointerEvents="box-none">
                  <HintBanner
                    color={game.turn}
                    move={hint}
                    asking={hintAsking && !movingPiece}
                    onPlay={handlePlayHint}
                    onDismiss={() => {
                      // Turning the hint down removes it from the board too.
                      setHintAsking(false);
                      setHint(null);
                    }}
                  />
                </View>
              )}

              <GameControls
                gameStatus={gameStatus}
                onReset={resetGame}
                onBack={handleBackToMenu}
                onResign={handleResign}
                onOfferDraw={handleOfferDraw}
                canOfferDraw={!isMachineTurn && !hintBusy}
                onUndo={handleUndo}
                canUndo={canUndo}
                onHint={handleHint}
                canHint={canHint}
              />
            </View>
          )}
        </View>

        {!gameMode && (
          <View style={styles.menu}>
            <GameModeSelection onSelectMode={handleSelectMode} />
          </View>
        )}
      </View>

      {gameMode && (
        <>
          <GameOverModal
            visible={showGameOverModal && !notice}
            gameStatus={gameStatus}
            capturedWhite={capturedWhite}
            capturedBlack={capturedBlack}
            onClose={() => {
              setShowGameOverModal(false);
              resetGame();
            }}
          />

          <NoticeModal notice={notice} onClose={() => setNotice(null)} />

          <PromotionModal
            visible={!!pendingPromotion}
            color={pendingPromotion?.color}
            onSelect={handlePromotionSelect}
            onCancel={handlePromotionCancel}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  content: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  boardSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  // Shown over the score panel, so it never covers the board or the arrow.
  hintBanner: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1,
  },
  infoSection: {
    paddingBottom: 10,
  },
});

export default App;
