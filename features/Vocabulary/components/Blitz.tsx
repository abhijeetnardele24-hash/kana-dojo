'use client';

import React from 'react';
import useVocabStore, {
  type IVocabObj,
} from '@/features/Vocabulary/store/useVocabStore';
import { useStatsStore } from '@/features/Progress';
import Blitz, { type BlitzConfig } from '@/shared/ui-composite/Blitz';
import FuriganaText from '@/shared/ui-composite/text/FuriganaText';
import { getSelectionLabels } from '@/shared/utils/selectionFormatting';
import { shuffle, pickOne } from '@/shared/utils/shuffle';
import { isVocabularyMeaningAnswerCorrect } from '@/features/Vocabulary/lib/isVocabularyMeaningAnswerCorrect';

export default function BlitzVocab() {
  const selectedVocabObjs = useVocabStore(state => state.selectedVocabObjs);
  const selectedVocabSets = useVocabStore(state => state.selectedVocabSets);
  const selectedGameModeVocab = useVocabStore(
    state => state.selectedGameModeVocab,
  );

  const {
    timedVocabCorrectAnswers,
    timedVocabWrongAnswers,
    timedVocabStreak,
    timedVocabBestStreak,
    incrementTimedVocabCorrectAnswers,
    incrementTimedVocabWrongAnswers,
    resetTimedVocabStats,
  } = useStatsStore();

  const formattedSets = React.useMemo(() => {
    return getSelectionLabels('vocabulary', selectedVocabSets).full.split(', ');
  }, [selectedVocabSets]);

  const config: BlitzConfig<IVocabObj> = {
    dojoType: 'vocabulary',
    dojoLabel: 'Vocabulary',
    localStorageKey: 'blitzVocabDuration',
    goalTimerContext: 'Vocabulary Blitz',
    initialGameMode: selectedGameModeVocab === 'Type' ? 'Type' : 'Pick',
    items: selectedVocabObjs,
    selectedSets: formattedSets,
    generateQuestion: items => pickOne(items)!,
    // Reverse mode: show meaning, answer is Japanese word
    // Normal mode: show Japanese word, answer is meaning
    renderQuestion: (question, isReverse) =>
      isReverse ? (
        question.meanings[0]
      ) : (
        <FuriganaText text={question.word} reading={question.reading} />
      ),
    inputPlaceholder: 'Type the meaning...',
    modeDescription: 'Mode: Type (See Japanese word → Type meaning)',
    checkAnswer: (question, answer, isReverse) => {
      if (isReverse) {
        // Accept any vocabulary item that shares a meaning with the current question
        return selectedVocabObjs.some(
          item =>
            item.meanings.some(m => question.meanings.includes(m)) &&
            isVocabularyMeaningAnswerCorrect(item, answer, isReverse),
        );
      }
      return isVocabularyMeaningAnswerCorrect(question, answer, isReverse);
    },
    getCorrectAnswer: (question, isReverse) =>
      isReverse ? question.word : question.meanings[0],
    // Pick mode support with reverse mode
    generateOptions: (question, items, count, isReverse) => {
      if (isReverse) {
        // Reverse: options are Japanese words
        const correctAnswer = question.word;
        const incorrectOptions = shuffle(
          items.filter(item => item.word !== question.word),
        )
          .filter(item => {
            // Prevent options that share a meaning with the correct answer
            if (item.meanings.some(m => question.meanings.includes(m)))
              return false;
            return true;
          })
          .slice(0, count - 1)
          .map(item => item.word);
        return [correctAnswer, ...incorrectOptions];
      }
      // Normal: options are meanings
      const correctAnswer = question.meanings[0];
      const seen = new Set([correctAnswer]);
      const incorrectOptions = shuffle(
        items.filter(item => item.word !== question.word),
      )
        .filter(item => {
          const meaning = item.meanings[0];
          if (seen.has(meaning)) return false;
          // Prevent options that have the same primary meaning as the correct answer
          if (question.meanings.includes(meaning)) return false;
          seen.add(meaning);
          return true;
        })
        .slice(0, count - 1)
        .map(item => item.meanings[0]);
      return [correctAnswer, ...incorrectOptions];
    },
    getCorrectOption: (question, isReverse) =>
      isReverse ? question.word : question.meanings[0],
    supportsReverseMode: true,
    stats: {
      correct: timedVocabCorrectAnswers,
      wrong: timedVocabWrongAnswers,
      streak: timedVocabStreak,
      bestStreak: timedVocabBestStreak,
      incrementCorrect: incrementTimedVocabCorrectAnswers,
      incrementWrong: incrementTimedVocabWrongAnswers,
      reset: resetTimedVocabStats,
    },
  };

  return <Blitz config={config} />;
}
