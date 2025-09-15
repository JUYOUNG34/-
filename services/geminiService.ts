import { GoogleGenAI, Type } from "@google/genai";
import { EVALUATION_PROMPT, QUESTION_MAP } from '../constants';
import type { EvaluationResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const scoreItemSchema = {
    type: Type.OBJECT,
    properties: {
        score: { 
            type: Type.INTEGER, 
            description: "Score based on the provided rubric. For most items, this is 4-7. For 5 specific items (A4, A8, A19, C3, C7), the scale is 1-5."
        },
        justification: { 
            type: Type.STRING, 
            description: "Meticulous, evidence-based justification for the score, citing specific examples from the report. Must be in a declarative style (음슴체). (Korean)"
        }
    },
    required: ['score', 'justification']
};

const activityExampleSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, impactful title for the activity example. Must be in a declarative style (음슴체). (Korean)"
        },
        description: {
            type: Type.STRING,
            description: "A concise description explaining the activity's significance or potential for improvement. Must be in a declarative style (음슴체). (Korean)"
        },
        categoryTag: {
            type: Type.STRING,
            description: "A short tag for the activity's context, like '2학년 자율활동' or '1학년 진로활동'. (Korean)"
        }
    },
    required: ['title', 'description', 'categoryTag']
};

const scoresProperties = Object.keys(QUESTION_MAP).reduce((acc: Record<string, object>, key) => {
    acc[key] = scoreItemSchema;
    return acc;
}, {});

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        scores: {
            type: Type.OBJECT,
            properties: scoresProperties,
            required: Object.keys(QUESTION_MAP)
        },
        studentName: {
            type: Type.STRING,
            description: "The name of the student found in the report. If not found, use '학생'."
        },
        tagline: {
            type: Type.STRING,
            description: "A short, catchy tagline summarizing the student's core academic identity. Must be in a declarative style (음슴체). e.g., '꾸준한 성실성과 지적 호기심으로 학업의 깊이를 더하는 인재임'. (Korean)"
        },
        academicStrengthAnalysis: {
            type: Type.STRING,
            description: "An analysis of academic strengths based on Category A items. Summarize the student's overall grade level, performance in key/major subjects, achievement in career-track courses, and qualitative indicators like raw scores and Z-scores. Must be in a declarative style (음슴체). (Korean)"
        },
        gradeTrendAnalysis: {
            type: Type.STRING,
            description: "An analysis of grade trends based on Category A items. Describe the trajectory of grades (upward, downward, consistent), the presence of any 'peak' semesters, and the overall consistency of academic performance. Must be in a declarative style (음슴체). (Korean)"
        },
        coreCompetency: {
            type: Type.STRING,
            description: "A detailed paragraph for the '[핵심 역량]' section. Summarize the student's core academic competency, placing the greatest emphasis on academic achievement (grades, trends, subject strengths). Briefly mention self-directedness and attitude as supporting factors. Must be in a declarative style (음슴체). Do not start with the student's name. (Korean)"
        },
        keyStrengths: {
            type: Type.STRING,
            description: "A detailed paragraph for the '[주요 강점]' section. Describe the student's key strengths, focusing primarily on strengths in academic achievement. Mention high-scoring items from category A, such as excellent grades in core subjects, positive grade trends, or strong performance in challenging courses. Support these with secondary strengths from categories B and C where relevant. Must be in a declarative style (음슴체). (Korean)"
        },
        suggestions: {
            type: Type.STRING,
            description: "A detailed paragraph for the '[보완점 및 제언]' section. Provide constructive feedback, concentrating on areas for improvement in academic achievement. Address low-scoring items from category A, such as inconsistent grades or underperformance in key subjects. Suggest how improvements in attitude or self-directedness could help. Must be in a declarative style (음슴체). (Korean)"
        },
        goodExamples: {
            type: Type.ARRAY,
            description: "An array of 4 excellent activity examples demonstrating self-directedness or academic attitude.",
            items: activityExampleSchema
        },
        improvementNeededExample: {
            type: Type.OBJECT,
            description: "An example of an activity with potential for growth.",
            properties: activityExampleSchema.properties,
            required: activityExampleSchema.required
        },
    },
    required: ['scores', 'studentName', 'tagline', 'academicStrengthAnalysis', 'gradeTrendAnalysis', 'coreCompetency', 'keyStrengths', 'suggestions', 'goodExamples', 'improvementNeededExample']
};


export const analyzeStudentReport = async (reportText: string): Promise<EvaluationResult> => {
    const fullPrompt = `${EVALUATION_PROMPT}\n\n--- Student Report ---\n${reportText}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.1,
            }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as EvaluationResult;

        if (!result.scores || !result.studentName || !result.tagline || !result.academicStrengthAnalysis || !result.gradeTrendAnalysis || !result.coreCompetency || !result.keyStrengths || !result.suggestions || !result.goodExamples || !result.improvementNeededExample) {
            throw new Error("Invalid JSON structure received from API.");
        }
        
        return result;

    } catch (error) {
        console.error("Error analyzing report with Gemini API:", error);
        if (error instanceof Error) {
             throw new Error(`Failed to analyze report: ${error.message}`);
        }
        throw new Error("An unknown error occurred during analysis.");
    }
};