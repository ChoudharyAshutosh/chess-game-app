import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import ChessBoard from './ChessBoard';
import boardHtml from '../board3d/boardHtml.generated';
import type {BoardEvent, BoardState} from '../board3d/protocol';
import type {Board, GameStatus, SquarePosition} from '../types/chess';

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
}

const KING_OF: Record<string, string> = {white: '♔', black: '♚'};

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

// The package types WebView without its ref, though it does forward one.
const WebViewWithRef = WebView as unknown as React.ComponentType<
  React.ComponentProps<typeof WebView> & {ref?: React.Ref<WebViewHandle>}
>;

const findCheckedKing = (board: Board, gameStatus: GameStatus): SquarePosition | null => {
  if (gameStatus.status !== 'check' && gameStatus.status !== 'checkmate') return null;
  const king = KING_OF[gameStatus.currentTurn];
  for (let row = 0; row < 8; row++) {
    const col = board[row].indexOf(king);
    if (col !== -1) return {row, col};
  }
  return null;
};

// Draws the board in 3D (three.js inside a WebView). The flat 2D board is shown
// while the 3D board loads, and stays if the phone can't draw 3D graphics.
const Board3D = (props: Board3DProps) => {
  const {
    board,
    selectedSquare,
    validMoves,
    onSquarePress,
    movingPiece,
    gameStatus,
  } = props;
  const webViewRef = useRef<WebViewHandle>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSentRef = useRef('');

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
    };
    return JSON.stringify(state);
  }, [board, selectedSquare, validMoves, movingPiece, gameStatus]);

  const sendState = useCallback((json: string) => {
    lastSentRef.current = json;
    webViewRef.current?.injectJavaScript(
      `window.board3d && window.board3d.receive(${json}); true;`,
    );
  }, []);

  const stateJsonRef = useRef(stateJson);
  useEffect(() => {
    stateJsonRef.current = stateJson;
    if (ready && !failed && stateJson !== lastSentRef.current) sendState(stateJson);
  }, [ready, failed, stateJson, sendState]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let message: BoardEvent;
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'ready') {
      // Also sent again if the page reloads, which loses the position.
      sendState(stateJsonRef.current);
      setReady(true);
    } else if (message.type === 'unsupported') {
      console.warn('3D board unavailable, using the 2D board:', message.reason);
      setFailed(true);
    } else if (message.type === 'press') {
      onSquarePressRef.current(message.row, message.col);
    }
  }, [sendState]);

  const fail = useCallback(() => setFailed(true), []);

  const flatBoard = <ChessBoard {...props} />;
  if (failed) return <View style={styles.container}>{flatBoard}</View>;

  return (
    <View style={styles.container}>
      <WebViewWithRef
        ref={webViewRef}
        // Any https address works; it stops the WebView failing to read cookies for about:blank.
        source={{html: boardHtml, baseUrl: 'https://board3d.local/'}}
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
        androidLayerType="hardware"
        webviewDebuggingEnabled={__DEV__}
      />
      {!ready && <View style={styles.loadingBoard}>{flatBoard}</View>}
    </View>
  );
};

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
  loadingBoard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Board3D;
