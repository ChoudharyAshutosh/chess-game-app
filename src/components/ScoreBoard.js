import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, View, Text, StyleSheet} from 'react-native';
import ThinkingIndicator from './ThinkingIndicator';

const LEVEL_NAMES = {easy: 'Easy', medium: 'Medium', hard: 'Hard'};
// The taken-pieces row: the panel's colour with a light tint, made solid.
const STRIP_COLOR = '#151424';

// Every taken piece in one swipeable row of a fixed height, so the panel never
// grows and pushes the board up. It scrolls to show the newest capture, and a
// small arrow on either side shows that more pieces are hidden that way.
const CapturedPieces = ({pieces}) => {
  const scrollRef = useRef(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  // Show the newest capture. Android ignores a scroll asked for before the row
  // is laid out, so it's asked for again once both sizes are known.
  useEffect(() => {
    if (!viewWidth || !contentWidth) return;
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 30);
    return () => clearTimeout(id);
  }, [pieces.length, viewWidth, contentWidth]);
  if (pieces.length === 0) {
    return (
      <View style={styles.noCapturesBox}>
        <Text style={styles.noCaptures}>-</Text>
      </View>
    );
  }

  const hiddenLeft = offset > 2;
  const hiddenRight = contentWidth - viewWidth - offset > 2;
  return (
    <View style={styles.capturedBox}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.capturedRow}
        onLayout={e => setViewWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={width => setContentWidth(width)}
        onScroll={e => setOffset(e.nativeEvent.contentOffset.x)}
        onMomentumScrollEnd={e => setOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
        testID="captured-pieces">
        {pieces.map((piece, index) => (
          <Text key={index} style={styles.capturedPiece}>
            {piece}
          </Text>
        ))}
      </ScrollView>
      {hiddenLeft && (
        <View style={[styles.moreHint, styles.moreLeft]} pointerEvents="none">
          <Text style={styles.moreText}>‹</Text>
        </View>
      )}
      {hiddenRight && (
        <View style={[styles.moreHint, styles.moreRight]} pointerEvents="none">
          <Text style={styles.moreText}>›</Text>
        </View>
      )}
    </View>
  );
};

const ScoreBoard = ({
  currentTurn,
  gameMode,
  machineLevel,
  capturedWhite,
  capturedBlack,
  gameStatus,
  isThinking,
}) => {
  const getStatusText = () => {
    if (gameStatus.status === 'check') {
      return 'CHECK';
    }
    if (gameStatus.status === 'checkmate') {
      return 'CHECKMATE';
    }
    if (gameStatus.status === 'stalemate' || gameStatus.status === 'draw') {
      return 'DRAW';
    }
    if (gameStatus.status === 'resigned') {
      return 'RESIGNED';
    }
    return '';
  };

  const statusText = getStatusText();
  const isCheckOrMate = gameStatus.status === 'check' || gameStatus.status === 'checkmate';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
      <View style={styles.playerCard}>
        <View style={[styles.indicator, currentTurn === 'white' && styles.activeIndicator]} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            White
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Taken</Text>
          <Text style={styles.score}>{capturedBlack.length}</Text>
        </View>
      </View>

      <View style={styles.centerSection}>
        {statusText ? (
          <View style={[styles.statusBadge, isCheckOrMate && styles.statusBadgeAlert]}>
            <Text style={[styles.statusText, isCheckOrMate && styles.statusTextAlert]}>
              {statusText}
            </Text>
          </View>
        ) : null}
        {isThinking ? (
          <ThinkingIndicator />
        ) : (
          <Text
            style={styles.turnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {gameMode === 'PvM'
              ? (currentTurn === 'white' ? "Your Turn" : "Machine")
              : (currentTurn === 'white' ? "White's Turn" : "Black's Turn")
            }
          </Text>
        )}
      </View>

      <View style={[styles.playerCard, styles.playerCardRight]}>
        <View style={[styles.indicator, currentTurn === 'black' && styles.activeIndicator]} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {gameMode === 'PvM' ? `Machine (${LEVEL_NAMES[machineLevel]})` : 'Black'}
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Taken</Text>
          <Text style={styles.score}>{capturedWhite.length}</Text>
        </View>
      </View>
      </View>

      {/* What each side has taken, under its card, in rows of a fixed height. */}
      <View style={styles.capturedStrip}>
        <View style={styles.capturedHalf}>
          <CapturedPieces pieces={capturedBlack} />
        </View>
        <View style={styles.capturedDivider} />
        <View style={styles.capturedHalf}>
          <CapturedPieces pieces={capturedWhite} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topRow: {
    flexDirection: 'row',
  },
  // Opaque, so the arrows can match it exactly; the rounded corners clip them.
  capturedStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 8,
    height: 30,
    backgroundColor: STRIP_COLOR,
    borderRadius: 10,
    overflow: 'hidden',
  },
  capturedHalf: {
    flex: 1,
    justifyContent: 'center',
  },
  capturedDivider: {
    width: 1,
    marginVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  playerCardRight: {
    flexDirection: 'row-reverse',
  },
  indicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeIndicator: {
    backgroundColor: '#4CAF50',
  },
  playerInfo: {
    flex: 1,
  },
  playerLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  capturedBox: {
    flex: 1,
    justifyContent: 'center',
  },
  capturedRow: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  capturedPiece: {
    fontSize: 18,
    lineHeight: 24,
    marginRight: 3,
    color: '#fff',
  },
  // Covers the edge pieces like a fade, with an arrow, where more are hidden.
  moreHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: STRIP_COLOR,
  },
  moreLeft: {
    left: 0,
  },
  moreRight: {
    right: 0,
  },
  moreText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  noCapturesBox: {
    paddingHorizontal: 8,
  },
  noCaptures: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 40,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  score: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerSection: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeAlert: {
    backgroundColor: 'rgba(255, 82, 82, 0.3)',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusTextAlert: {
    color: '#FF5252',
  },
  turnText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ScoreBoard;
