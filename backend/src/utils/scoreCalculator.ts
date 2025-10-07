export interface EvaluatedAnswerSummary {
  isCorrect: boolean;
  pointsEarned: number;
}

export interface QuestionSummary {
  points?: number;
  topic?: string;
}

export const calculatePercentage = (score: number, totalPoints: number): number => {
  if (totalPoints === 0) return 0;
  return Math.round((score / totalPoints) * 100);
};

export const determineGrade = (percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

export const calculateQuizScore = (
  answers: EvaluatedAnswerSummary[],
  questions: QuestionSummary[]
): { score: number; totalPoints: number; percentage: number } => {
  let totalScore = 0;
  let totalPoints = 0;

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question) {
      totalPoints += question.points || 1;
      totalScore += answer.pointsEarned || 0;
    }
  });

  return {
    score: totalScore,
    totalPoints,
    percentage: calculatePercentage(totalScore, totalPoints)
  };
};

export const calculateTopicWiseScore = (
  answers: Array<EvaluatedAnswerSummary & { isCorrect: boolean }>,
  questions: Array<QuestionSummary & { topic?: string }>
) => {
  const topicScores: Record<string, {
    topic: string;
    totalQuestions: number;
    correctAnswers: number;
    totalPoints: number;
    earnedPoints: number;
    accuracy?: number;
  }> = {};

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question && question.topic) {
      if (!topicScores[question.topic]) {
        topicScores[question.topic] = {
          topic: question.topic,
          totalQuestions: 0,
          correctAnswers: 0,
          totalPoints: 0,
          earnedPoints: 0
        };
      }

      const topicData = topicScores[question.topic];
      if (topicData) {
        topicData.totalQuestions++;
        topicData.totalPoints += question.points || 1;
        topicData.earnedPoints += answer.pointsEarned || 0;

        if (answer.isCorrect) {
          topicData.correctAnswers++;
        }
      }
    }
  });

  Object.keys(topicScores).forEach(topic => {
    const data = topicScores[topic];
    if (data) {
      data.accuracy = calculatePercentage(data.correctAnswers, data.totalQuestions);
    }
  });

  return Object.values(topicScores);
};

export default {
  calculateQuizScore,
  calculatePercentage,
  determineGrade,
  calculateTopicWiseScore
};