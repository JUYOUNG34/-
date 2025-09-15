import { QUESTION_MAP } from './constants';

export interface ScoreItem {
  score: number;
  justification: string;
}

export type QuestionKey = keyof typeof QUESTION_MAP;

export type Scores = Record<QuestionKey, ScoreItem>;

export interface ActivityExample {
    title: string;
    description: string;
    categoryTag: string;
}

export interface EvaluationResult {
  scores: Scores;
  studentName: string;
  tagline: string;
  academicStrengthAnalysis: string;
  gradeTrendAnalysis: string;
  coreCompetency: string;
  keyStrengths: string;
  suggestions: string;
  goodExamples: ActivityExample[];
  improvementNeededExample: ActivityExample;
}

export interface CategoryScores {
  key: 'A' | 'B' | 'C';
  name: string;
  average: number;
  totalScore: number;
  maxScore: number;
  items: {
    id: string;
    label: string;
    score: number;
    justification: string;
  }[];
}