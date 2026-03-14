import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  ToastAndroid,
  Platform,
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
  INITIAL_BOARD,
  getValidMoves,
  movePiece,
  getGameStatus,
  getPieceColor,
  getBestMove,
} from './src/utils/chessUtils';
import {initSounds, playSelectSound, playMoveSound, playKillSound, playErrorSound, releaseSounds} from './src/utils/soundUtils';

const applyPromotion = (board, row, col, newPiece) => {
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = newPiece;
  return newBoard;
};

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
  const [board, setBoard] = useState(INITIAL_BOARD.map(row => [...row]));
  const [currentTurn, setCurrentTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [gameStatus, setGameStatus] = useState({status: 'playing'});
  const [isMachineThinking, setIsMachineThinking] = useState(false);
  const [movingPiece, setMovingPiece] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  
  const machineMoveTimeoutRef = useRef(null);
  const lastBackPressRef = useRef(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [gameMode]);

  useEffect(() => {
    if (gameMode === 'PvM' && currentTurn === 'black' && !isMachineThinking && (gameStatus.status === 'playing' || gameStatus.status === 'check')) {
      setIsMachineThinking(true);
      machineMoveTimeoutRef.current = setTimeout(() => {
        makeMachineMove();
      }, 1000);
    }
    
    return () => {
      if (machineMoveTimeoutRef.current) {
        clearTimeout(machineMoveTimeoutRef.current);
      }
    };
  }, [currentTurn, gameMode, gameStatus.status]);

  const handleBackPress = useCallback(() => {
    if (gameMode === null) {
      if (lastBackPressRef.current && Date.now() - lastBackPressRef.current < 1000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = Date.now();
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    }
    
    if (lastBackPressRef.current && Date.now() - lastBackPressRef.current < 1000) {
      BackHandler.exitApp();
      return true;
    }
    lastBackPressRef.current = Date.now();
    
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true;
  }, [gameMode]);

  const makeMachineMove = useCallback(() => {
    const move = getBestMove(board, 'black', 3);
    
    if (move) {
      setMovingPiece({
        fromRow: move.from.row,
        fromCol: move.from.col,
        toRow: move.to.row,
        toCol: move.to.col,
        isCapture: board[move.to.row][move.to.col] !== '',
      });
      
      setTimeout(() => {
        const {newBoard, capturedPiece, isPromotion} = movePiece(
          board,
          move.from.row,
          move.from.col,
          move.to.row,
          move.to.col,
        );

        if (isPromotion) {
          const promotedBoard = applyPromotion(newBoard, move.to.row, move.to.col, '♛');
          
          if (capturedPiece) {
            if (getPieceColor(capturedPiece) === 'white') {
              setCapturedWhite(prev => [...prev, capturedPiece]);
            } else {
              setCapturedBlack(prev => [...prev, capturedPiece]);
            }
            playKillSound();
          }

          setBoard(promotedBoard);
          playMoveSound();
          setCurrentTurn('white');
          const newStatus = getGameStatus(promotedBoard, 'white');
          setGameStatus(newStatus);
          if (newStatus.status === 'check' || newStatus.status === 'checkmate') {
            playErrorSound();
          }
          if (newStatus.status === 'checkmate' || newStatus.status === 'stalemate') {
            setTimeout(() => setShowGameOverModal(true), 500);
          }

          setTimeout(() => {
            setMovingPiece(null);
          }, 100);
          setIsMachineThinking(false);
          return;
        }

        if (capturedPiece) {
          if (getPieceColor(capturedPiece) === 'white') {
            setCapturedWhite(prev => [...prev, capturedPiece]);
          } else {
            setCapturedBlack(prev => [...prev, capturedPiece]);
          }
          playKillSound();
        }

        setBoard(newBoard);
        playMoveSound();
        setCurrentTurn('white');
        const newStatus = getGameStatus(newBoard, 'white');
        setGameStatus(newStatus);
        if (newStatus.status === 'check' || newStatus.status === 'checkmate') {
          playErrorSound();
        }
        if (newStatus.status === 'checkmate' || newStatus.status === 'stalemate') {
          setTimeout(() => setShowGameOverModal(true), 500);
        }
        
        setTimeout(() => {
          setMovingPiece(null);
          setIsMachineThinking(false);
        }, 100);
      }, 200);
    } else {
      setIsMachineThinking(false);
    }
  }, [board]);

  const resetGame = useCallback(() => {
    setBoard(INITIAL_BOARD.map(row => [...row]));
    setCurrentTurn('white');
    setSelectedSquare(null);
    setValidMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameStatus({status: 'playing'});
    setIsMachineThinking(false);
    setMovingPiece(null);
    setShowGameOverModal(false);
    setShowPromotionModal(false);
    setPendingPromotion(null);
  }, []);

  const handlePromotionComplete = useCallback((promotedBoard, capturedPiece) => {
    if (capturedPiece) {
      if (getPieceColor(capturedPiece) === 'white') {
        setCapturedWhite(prev => [...prev, capturedPiece]);
      } else {
        setCapturedBlack(prev => [...prev, capturedPiece]);
      }
      playKillSound();
    }

    setBoard(promotedBoard);
    playMoveSound();
    const nextTurn = currentTurn === 'white' ? 'black' : 'white';
    setCurrentTurn(nextTurn);
    const newStatus = getGameStatus(promotedBoard, nextTurn);
    setGameStatus(newStatus);
    if (newStatus.status === 'check' || newStatus.status === 'checkmate') {
      playErrorSound();
    }
    if (newStatus.status === 'checkmate' || newStatus.status === 'stalemate') {
      setTimeout(() => setShowGameOverModal(true), 500);
    }

    setTimeout(() => {
      setMovingPiece(null);
    }, 100);
  }, [currentTurn]);

  const handlePromotionSelect = useCallback((selectedPiece) => {
    if (!pendingPromotion) return;

    const promotedBoard = applyPromotion(
      board,
      pendingPromotion.toRow,
      pendingPromotion.toCol,
      selectedPiece
    );

    setShowPromotionModal(false);
    handlePromotionComplete(promotedBoard, pendingPromotion.capturedPiece);
  }, [pendingPromotion, board, handlePromotionComplete]);

  const handleSelectMode = useCallback((mode) => {
    setGameMode(mode);
    resetGame();
  }, [resetGame]);

  const handleBackToMenu = useCallback(() => {
    setGameMode(null);
    resetGame();
  }, [resetGame]);

  const handleSquarePress = useCallback(
    (row, col) => {
      if (gameMode === 'PvM' && currentTurn === 'black') return;
      if (isMachineThinking) return;
      if (gameStatus.status === 'checkmate' || gameStatus.status === 'stalemate') return;

      const piece = board[row][col];
      const pieceColor = getPieceColor(piece);

      if (selectedSquare) {
        const isValidMove = validMoves.some(
          m => m.row === row && m.col === col,
        );

        if (isValidMove) {
          const isCapture = board[row][col] !== '';
          
          setMovingPiece({
            fromRow: selectedSquare.row,
            fromCol: selectedSquare.col,
            toRow: row,
            toCol: col,
            isCapture,
          });

          setTimeout(() => {
            const {newBoard, capturedPiece, isPromotion} = movePiece(
              board,
              selectedSquare.row,
              selectedSquare.col,
              row,
              col,
            );

            if (isPromotion) {
              setMovingPiece({
                fromRow: selectedSquare.row,
                fromCol: selectedSquare.col,
                toRow: row,
                toCol: col,
                isCapture: isCapture,
              });

              setTimeout(() => {
                setBoard(newBoard);
                setMovingPiece(null);
                
                setPendingPromotion({
                  fromRow: selectedSquare.row,
                  fromCol: selectedSquare.col,
                  toRow: row,
                  toCol: col,
                  color: currentTurn,
                  isCapture,
                  capturedPiece,
                });
                setSelectedSquare(null);
                setValidMoves([]);
                
                if (gameMode === 'PvM') {
                  const promotedBoard = applyPromotion(newBoard, row, col, currentTurn === 'white' ? '♕' : '♛');
                  handlePromotionComplete(promotedBoard, capturedPiece);
                } else {
                  setShowPromotionModal(true);
                }
              }, 200);
              return;
            }

            if (capturedPiece) {
              if (getPieceColor(capturedPiece) === 'white') {
                setCapturedWhite(prev => [...prev, capturedPiece]);
              } else {
                setCapturedBlack(prev => [...prev, capturedPiece]);
              }
              playKillSound();
            }

            setBoard(newBoard);
            playMoveSound();
            const nextTurn = currentTurn === 'white' ? 'black' : 'white';
            setCurrentTurn(nextTurn);
            const newStatus = getGameStatus(newBoard, nextTurn);
            setGameStatus(newStatus);
            if (newStatus.status === 'check' || newStatus.status === 'checkmate') {
              playErrorSound();
            }
            if (newStatus.status === 'checkmate' || newStatus.status === 'stalemate') {
              setTimeout(() => setShowGameOverModal(true), 500);
            }

            setTimeout(() => {
              setMovingPiece(null);
            }, 100);
          }, 200);

          setSelectedSquare(null);
          setValidMoves([]);
          return;
        } else if (selectedSquare && (selectedSquare.row !== row || selectedSquare.col !== col) && !piece) {
          playErrorSound();
          return;
        }
      }

      if (piece && pieceColor === currentTurn) {
        playSelectSound();
        setSelectedSquare({row, col});
        setValidMoves(getValidMoves(board, row, col));
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [board, selectedSquare, validMoves, currentTurn, gameMode, isMachineThinking, gameStatus.status],
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
              board={board}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              onSquarePress={handleSquarePress}
              movingPiece={movingPiece}
              gameStatus={gameStatus}
            />
          </View>

          <View style={styles.infoSection}>
            <ScoreBoard
              currentTurn={currentTurn}
              gameMode={gameMode}
              capturedWhite={capturedWhite}
              capturedBlack={capturedBlack}
              gameStatus={gameStatus}
            />
            
            <GameControls
              gameStatus={gameStatus}
              onReset={resetGame}
              onBack={handleBackToMenu}
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
        visible={showPromotionModal}
        color={pendingPromotion?.color}
        onSelect={handlePromotionSelect}
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
