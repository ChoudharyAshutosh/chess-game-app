import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {
  ChessBoard,
  GameModeSelection,
  ScoreBoard,
  GameControls,
  GameOverModal,
  PromotionModal,
} from './src/components';
import {
  createInitialState,
  getValidMoves,
  makeMove,
  applyMoveToBoard,
  getGameStatus,
  getPieceColor,
  getPieceType,
  getBestMove,
  isGameOver,
  opponentOf,
  shouldAcceptDraw,
} from './src/utils/chessUtils';
import {initSounds, playSelectSound, playMoveSound, playKillSound, playErrorSound, releaseSounds} from './src/utils/soundUtils';

const MOVE_ANIMATION_MS = 200;
const MACHINE_DELAY_MS = 600;
const capitalize = color => color.charAt(0).toUpperCase() + color.slice(1);

const App = () => {
  useEffect(() => {
    initSounds();
    return () => releaseSounds();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />
      <ChessGame />
    </SafeAreaProvider>
  );
};

const ChessGame = () => {
  const [gameMode, setGameMode] = useState(null);
  const [game, setGame] = useState(createInitialState);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [gameStatus, setGameStatus] = useState({status: 'playing', currentTurn: 'white'});
  const [movingPiece, setMovingPiece] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  const timeoutsRef = useRef(new Set());
  const lastBackPressRef = useRef(null);

  const gameOver = isGameOver(gameStatus.status);
  const isMachineTurn = gameMode === 'PvM' && game.turn === 'black';

  const schedule = useCallback((fn, ms) => {
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

  const handleBackPress = useCallback(() => {
    if (lastBackPressRef.current && Date.now() - lastBackPressRef.current < 1000) {
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
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  const finishGame = useCallback(newStatus => {
    setGameStatus(newStatus);
    setSelectedSquare(null);
    setValidMoves([]);
    schedule(() => setShowGameOverModal(true), 500);
  }, [schedule]);

  // Single entry point for every move (human or machine).
  const commitMove = useCallback((from, to, promotionType) => {
    const result = makeMove(game, from, to, promotionType);
    setMovingPiece(null);
    if (!result) {
      playErrorSound();
      return;
    }

    const {state: nextGame, move} = result;
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
  }, [game, finishGame]);

  // Machine plays black in PvM.
  useEffect(() => {
    if (!isMachineTurn || gameOver) return;
    const thinkId = setTimeout(() => {
      const move = getBestMove(game, 3);
      if (!move) return;
      setMovingPiece({
        fromRow: move.from.row,
        fromCol: move.from.col,
        toRow: move.to.row,
        toCol: move.to.col,
        isCapture: !!move.captured,
      });
      schedule(
        () => commitMove(move.from, move.to, move.promotion ? getPieceType(move.promotion) : undefined),
        MOVE_ANIMATION_MS,
      );
    }, MACHINE_DELAY_MS);
    return () => clearTimeout(thinkId);
  }, [isMachineTurn, gameOver, game, commitMove, schedule]);

  const resetGame = useCallback(() => {
    clearScheduled();
    setGame(createInitialState());
    setSelectedSquare(null);
    setValidMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameStatus({status: 'playing', currentTurn: 'white'});
    setMovingPiece(null);
    setShowGameOverModal(false);
    setPendingPromotion(null);
  }, [clearScheduled]);

  const handlePromotionSelect = useCallback(promotionType => {
    if (!pendingPromotion) return;
    setPendingPromotion(null);
    commitMove(pendingPromotion.from, pendingPromotion.to, promotionType);
  }, [pendingPromotion, commitMove]);

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
  }, []);

  const handleSelectMode = useCallback(mode => {
    setGameMode(mode);
    resetGame();
  }, [resetGame]);

  const handleBackToMenu = useCallback(() => {
    setGameMode(null);
    resetGame();
  }, [resetGame]);

  const handleResign = useCallback(() => {
    if (gameOver) return;
    const resigning = gameMode === 'PvM' ? 'white' : game.turn;
    const label = gameMode === 'PvM' ? 'Do you' : `${capitalize(resigning)}, do you`;
    Alert.alert('Resign', `${label} really want to resign?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Resign',
        style: 'destructive',
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
    ]);
  }, [gameOver, gameMode, game, clearScheduled, finishGame]);

  const handleOfferDraw = useCallback(() => {
    if (gameOver || isMachineTurn || movingPiece) return;
    const drawStatus = {status: 'draw', reason: 'agreement', currentTurn: game.turn};

    if (gameMode === 'PvM') {
      if (shouldAcceptDraw(game, 'black')) {
        Alert.alert('Draw offer', 'The machine accepts your draw offer.');
        finishGame(drawStatus);
      } else {
        Alert.alert('Draw offer', 'The machine declines your draw offer.');
      }
      return;
    }

    const offering = game.turn;
    const responding = opponentOf(offering);
    Alert.alert(
      'Draw offer',
      `${capitalize(offering)} offers a draw. ${capitalize(responding)}, do you accept?`,
      [
        {text: 'Decline', style: 'cancel'},
        {text: 'Accept', onPress: () => finishGame(drawStatus)},
      ],
    );
  }, [gameOver, isMachineTurn, movingPiece, gameMode, game, finishGame]);

  const handleSquarePress = useCallback(
    (row, col) => {
      if (isMachineTurn || gameOver || movingPiece || pendingPromotion) return;

      const piece = game.board[row][col];

      if (selectedSquare) {
        const matching = validMoves.filter(m => m.to.row === row && m.to.col === col);

        if (matching.length > 0) {
          const move = matching[0];
          const from = {...selectedSquare};
          const to = {row, col};
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
                previewBoard: applyMoveToBoard(game.board, {...move, promotion: null}),
              });
            } else {
              commitMove(from, to);
            }
          }, MOVE_ANIMATION_MS);
          return;
        }

        if ((selectedSquare.row !== row || selectedSquare.col !== col) && !piece) {
          playErrorSound();
          return;
        }
      }

      if (piece && getPieceColor(piece) === game.turn) {
        playSelectSound();
        setSelectedSquare({row, col});
        setValidMoves(getValidMoves(game, row, col));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [game, selectedSquare, validMoves, isMachineTurn, gameOver, movingPiece, pendingPromotion, schedule, commitMove],
  );

  if (!gameMode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backgroundGradient}>
          <GameModeSelection onSelectMode={handleSelectMode} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGradient}>
        <View style={styles.content}>
          <View style={styles.boardSection}>
            <ChessBoard
              board={pendingPromotion ? pendingPromotion.previewBoard : game.board}
              selectedSquare={selectedSquare}
              validMoves={validMoves.map(m => m.to)}
              onSquarePress={handleSquarePress}
              movingPiece={movingPiece}
              gameStatus={gameStatus}
            />
          </View>

          <View style={styles.infoSection}>
            <ScoreBoard
              currentTurn={game.turn}
              gameMode={gameMode}
              capturedWhite={capturedWhite}
              capturedBlack={capturedBlack}
              gameStatus={gameStatus}
            />

            <GameControls
              gameStatus={gameStatus}
              onReset={resetGame}
              onBack={handleBackToMenu}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              canOfferDraw={!isMachineTurn}
            />
          </View>
        </View>
      </View>

      <GameOverModal
        visible={showGameOverModal}
        gameStatus={gameStatus}
        capturedWhite={capturedWhite}
        capturedBlack={capturedBlack}
        onClose={() => {
          setShowGameOverModal(false);
          resetGame();
        }}
      />

      <PromotionModal
        visible={!!pendingPromotion}
        color={pendingPromotion?.color}
        onSelect={handlePromotionSelect}
        onCancel={handlePromotionCancel}
      />
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
  boardSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoSection: {
    paddingBottom: 10,
  },
});

export default App;
