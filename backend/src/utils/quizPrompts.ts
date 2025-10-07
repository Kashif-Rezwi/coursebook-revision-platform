export const buildMCQGenerationPrompt = (pdfContent: string, count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string => {
  return `Generate multiple-choice questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} multiple-choice questions
- Each question should have 4 options (A, B, C, D)
- Only one option should be correct
- Include plausible distractors (incorrect but believable options)
- Questions should test understanding, not memorization
- Difficulty level: ${difficulty}
- Questions should be clear and unambiguous

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option B",
    "explanation": "Explanation of why this is correct",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

export const buildSAQGenerationPrompt = (pdfContent: string, count: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string => {
  return `Generate short answer questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} short answer questions
- Questions should require 2-4 sentence answers
- Test conceptual understanding and application
- Difficulty level: ${difficulty}
- Questions should be specific and focused

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "correctAnswer": "Expected answer in 2-4 sentences",
    "explanation": "Additional context or key points to cover",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

export const buildLAQGenerationPrompt = (pdfContent: string, count: number, difficulty: 'easy' | 'medium' | 'hard' = 'hard'): string => {
  return `Generate long answer questions from the provided text.

Text:
${pdfContent}

Requirements:
- Generate exactly ${count} long answer questions
- Questions should require detailed, multi-paragraph answers
- Test deep understanding and ability to explain complex concepts
- Difficulty level: ${difficulty}
- Questions should encourage critical thinking

Return ONLY a valid JSON array with this exact structure (no additional text):
[
  {
    "question": "Question text here?",
    "correctAnswer": "Comprehensive answer with multiple paragraphs covering key concepts",
    "explanation": "Key points that should be covered in a complete answer",
    "topic": "Main topic of the question",
    "difficulty": "${difficulty}"
  }
]`;
};

export const buildAnswerEvaluationPrompt = (
  question: string,
  correctAnswer: string,
  studentAnswer: string,
  maxPoints: number
): string => {
  return `Evaluate the student's answer to the question.

Question: ${question}

Expected/Correct Answer:
${correctAnswer}

Student's Answer:
${studentAnswer}

Evaluate based on:
1. Accuracy of information provided
2. Completeness of the answer
3. Depth of understanding demonstrated
4. Relevance to the question asked

Maximum points possible: ${maxPoints}

Provide a fair and constructive evaluation. Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "score": number (0 to ${maxPoints}),
  "isCorrect": boolean (true if score >= ${maxPoints * 0.6}),
  "feedback": "Detailed, constructive feedback explaining the score",
  "keyPointsCovered": ["key point 1 that was addressed", "key point 2 that was addressed"],
  "keyPointsMissed": ["key point that was missing or incorrect"]
}`;
};

export default {
  buildMCQGenerationPrompt,
  buildSAQGenerationPrompt,
  buildLAQGenerationPrompt,
  buildAnswerEvaluationPrompt
};
