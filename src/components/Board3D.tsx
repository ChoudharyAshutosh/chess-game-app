import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import ChessBoard from './ChessBoard';
import boardHtml from '../board3d/boardHtml.generated';
import type { BoardEvent, BoardState } from '../board3d/protocol';
import type { GameState, Move } from '../types/chess';
import type { Board, GameStatus, SquarePosition } from '../types/chess';

interface MovingPiece {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  isCapture: boolean;
}

interface Board3DProps {
  board: Board;
  selectedSquare: SquarePosition | null;
  validMoves: SquarePosition[];
  onSquarePress: (row: number, col: number) => void;
  movingPiece: MovingPiece | null;
  gameStatus: GameStatus;
  hint?: { from: SquarePosition; to: SquarePosition } | null;
}

const KING_OF: Record<string, string> = { white: '♔', black: '♚' };

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

// The package types WebView without its ref, though it does forward one.
const WebViewWithRef = WebView as unknown as React.ComponentType<
  React.ComponentProps<typeof WebView> & { ref?: React.Ref<WebViewHandle> }
>;

const findCheckedKing = (
  board: Board,
  gameStatus: GameStatus,
): SquarePosition | null => {
  if (gameStatus.status !== 'check' && gameStatus.status !== 'checkmate')
    return null;
  const king = KING_OF[gameStatus.currentTurn];
  for (let row = 0; row < 8; row++) {
    const col = board[row].indexOf(king);
    if (col !== -1) return { row, col };
  }
  return null;
};

// Called with the best move after each finished depth of a hint search. A
// depth of -1 means the search was lost (the 3D page crashed or reloaded).
export type HintListener = (move: Move | null, depth: number) => void;

export interface Board3DHandle {
  // Searches for a hint inside the 3D board's page, which keeps running while
  // an ad covers the app. Returns a function that stops the search, or null
  // when the 3D board isn't running, so the caller searches by itself.
  findHint: (state: GameState, onDepth: HintListener) => (() => void) | null;
}

// Draws the board in 3D (three.js inside a WebView). It fades in once loaded,
// with a spinner until then. The flat 2D board is used only if the phone can't
// draw 3D graphics.
const Board3D = forwardRef<Board3DHandle, Board3DProps>((props, ref) => {
  const {
    board,
    selectedSquare,
    validMoves,
    onSquarePress,
    movingPiece,
    gameStatus,
    hint = null,
  } = props;
  const webViewRef = useRef<WebViewHandle>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSentRef = useRef('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const hintListenersRef = useRef(new Map<number, HintListener>());
  const nextHintIdRef = useRef(1);
  const runningRef = useRef(false);
  runningRef.current = ready && !failed;

  // Searches cut off by a crash or reload never finish; tell their callers.
  const loseHintSearches = useCallback(() => {
    const listeners = [...hintListenersRef.current.values()];
    hintListenersRef.current.clear();
    listeners.forEach(listener => listener(null, -1));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      findHint: (state, onDepth) => {
        if (!runningRef.current) return null;
        const id = nextHintIdRef.current++;
        hintListenersRef.current.set(id, onDepth);
        webViewRef.current?.injectJavaScript(
          `window.board3d && window.board3d.findHint(${id}, ${JSON.stringify(
            state,
          )}); true;`,
        );
        return () => {
          if (!hintListenersRef.current.delete(id)) return;
          webViewRef.current?.injectJavaScript(
            'window.board3d && window.board3d.stopHint(); true;',
          );
        };
      },
    }),
    [],
  );

  const onSquarePressRef = useRef(onSquarePress);
  useEffect(() => {
    onSquarePressRef.current = onSquarePress;
  }, [onSquarePress]);

  const stateJson = useMemo(() => {
    const state: BoardState = {
      board,
      selected: selectedSquare,
      validMoves,
      checkedKing: findCheckedKing(board, gameStatus),
      moving: movingPiece
        ? {
            fromRow: movingPiece.fromRow,
            fromCol: movingPiece.fromCol,
            toRow: movingPiece.toRow,
            toCol: movingPiece.toCol,
          }
        : null,
      hint: hint ? { from: hint.from, to: hint.to } : null,
    };
    return JSON.stringify(state);
  }, [board, selectedSquare, validMoves, movingPiece, gameStatus, hint]);

  const sendState = useCallback((json: string) => {
    lastSentRef.current = json;
    webViewRef.current?.injectJavaScript(
      `window.board3d && window.board3d.receive(${json}); true;`,
    );
  }, []);

  const stateJsonRef = useRef(stateJson);
  useEffect(() => {
    stateJsonRef.current = stateJson;
    if (ready && !failed && stateJson !== lastSentRef.current)
      sendState(stateJson);
  }, [ready, failed, stateJson, sendState]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: BoardEvent;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.type === 'ready') {
        // Also sent again if the page reloads, which loses the position.
        sendState(stateJsonRef.current);
        loseHintSearches();
        setReady(true);
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      } else if (message.type === 'unsupported') {
        console.warn(
          '3D board unavailable, using the 2D board:',
          message.reason,
        );
        setFailed(true);
      } else if (message.type === 'press') {
        onSquarePressRef.current(message.row, message.col);
      } else if (message.type === 'hint') {
        hintListenersRef.current.get(message.id)?.(
          message.move as Move | null,
          message.depth,
        );
      }
    },
    [sendState, fadeIn, loseHintSearches],
  );

  const fail = useCallback(() => setFailed(true), []);
  useEffect(() => {
    if (failed) loseHintSearches();
  }, [failed, loseHintSearches]);

  if (failed) {
    return (
      <View style={styles.container}>
        <ChessBoard {...props} hint={hint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.webView, { opacity: fadeIn }]}>
        <WebViewWithRef
          ref={webViewRef}
          // Any https address works; it stops the WebView failing to read cookies for about:blank.
          source={{ html: boardHtml, baseUrl: 'https://board3d.local/' }}
          originWhitelist={['*']}
          style={styles.webView}
          containerStyle={styles.webView}
          onMessage={handleMessage}
          onError={fail}
          onRenderProcessGone={fail}
          onContentProcessDidTerminate={fail}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          textZoom={100}
          webviewDebuggingEnabled={__DEV__}
        />
      </Animated.View>
      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator
            size="large"
            color="#FFD700"
            testID="board3d-loading"
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

Board3D.displayName = 'Board3D';

export default Board3D;
