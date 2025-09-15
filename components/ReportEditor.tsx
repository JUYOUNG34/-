import React, { useState, useMemo, useCallback } from 'react';
import ReportDashboard from './ReportDashboard';
import type { EvaluationResult, QuestionKey, ActivityExample } from '../types';
import { QUESTION_MAP } from '../constants';

interface ReportEditorProps {
    originalData: EvaluationResult;
    onSaveAndClose: (updatedData: EvaluationResult) => void;
}

const fivePointItems: QuestionKey[] = ['A4_MajorSubjects', 'A8_CommunicationSkills', 'A19_ZScore', 'C3_ClassParticipation', 'C7_ResourceUtilization'];

const ReportEditor = ({ originalData, onSaveAndClose }: ReportEditorProps) => {
    const [editedData, setEditedData] = useState(originalData);

    const handleScoreChange = useCallback((key: QuestionKey, value: string) => {
        const newScore = parseInt(value, 10);
        const isFivePoint = fivePointItems.includes(key);
        const min = isFivePoint ? 1 : 4;
        const max = isFivePoint ? 5 : 7;
        
        if (isNaN(newScore) || newScore < min || newScore > max) return;

        setEditedData(prevData => ({
            ...prevData,
            scores: {
                ...prevData.scores,
                [key]: {
                    ...prevData.scores[key],
                    score: newScore
                }
            }
        }));
    }, []);

    const handleTextChange = useCallback((field: keyof EvaluationResult, value: string) => {
        setEditedData(prevData => ({
            ...prevData,
            [field]: value
        }));
    }, []);
    
    const handleGoodExampleChange = useCallback((index: number, field: keyof ActivityExample, value: string) => {
        setEditedData(prevData => {
            const newGoodExamples = [...prevData.goodExamples];
            newGoodExamples[index] = { ...newGoodExamples[index], [field]: value };
            return { ...prevData, goodExamples: newGoodExamples };
        });
    }, []);
    
    const handleImprovementExampleChange = useCallback((field: keyof ActivityExample, value: string) => {
        setEditedData(prevData => ({
            ...prevData,
            improvementNeededExample: {
                ...prevData.improvementNeededExample,
                [field]: value
            }
        }));
    }, []);


    const scoreCategories = useMemo(() => {
         const categories: Record<string, {name: string, items: QuestionKey[]}> = {
            'A': { name: 'A. 학업성취도', items: [] },
            'B': { name: 'B. 자기주도성', items: [] },
            'C': { name: 'C. 학업태도', items: [] },
        };
        (Object.keys(originalData.scores) as QuestionKey[]).sort().forEach(key => {
            const categoryKey = key.charAt(0);
            if (categories[categoryKey]) {
                categories[categoryKey].items.push(key);
            }
        });
        return Object.values(categories);
    }, [originalData.scores]);


    return (
        <div className="max-w-full mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-gray-800">학업역량 점수 및 내용 수정</h1>
                 <button
                    onClick={() => onSaveAndClose(editedData)}
                    className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
                >
                    수정 완료 및 돌아가기
                </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 bg-white p-4 rounded-2xl shadow-lg h-[90vh] overflow-y-auto">
                   <div className="space-y-6">
                       {scoreCategories.map(category => (
                           <div key={category.name}>
                               <h3 className="text-xl font-bold text-gray-700 mb-3 sticky top-0 bg-white py-2 border-b">{category.name}</h3>
                               <div className="space-y-3">
                                   {category.items.map(key => {
                                       const isFivePoint = fivePointItems.includes(key);
                                       const min = isFivePoint ? 1 : 4;
                                       const max = isFivePoint ? 5 : 7;
                                       
                                       return (
                                           <div key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100">
                                               <label htmlFor={key} className="text-sm text-gray-600 flex-1">{QUESTION_MAP[key as keyof typeof QUESTION_MAP]}</label>
                                               <input
                                                   type="number"
                                                   id={key}
                                                   min={min}
                                                   max={max}
                                                   value={editedData.scores[key].score}
                                                   onChange={(e) => handleScoreChange(key, e.target.value)}
                                                   className={`w-16 text-center font-bold text-lg border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:border-indigo-500 ${isFivePoint ? 'text-amber-600 focus:ring-amber-500' : 'text-indigo-600 focus:ring-indigo-500'}`}
                                               />
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       ))}
                       
                        {/* Text Editing Section */}
                        <div>
                           <h3 className="text-xl font-bold text-gray-700 mb-3 sticky top-0 bg-white py-2 border-b">총평 수정</h3>
                           <div className="space-y-4 p-2">
                                <div>
                                    <label className="font-semibold text-gray-600">태그라인</label>
                                    <textarea value={editedData.tagline} onChange={(e) => handleTextChange('tagline', e.target.value)} className="w-full h-20 p-2 mt-1 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-600">학업 강점 분석</label>
                                    <textarea value={editedData.academicStrengthAnalysis} onChange={(e) => handleTextChange('academicStrengthAnalysis', e.target.value)} className="w-full h-24 p-2 mt-1 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-600">성적 추이 분석</label>
                                    <textarea value={editedData.gradeTrendAnalysis} onChange={(e) => handleTextChange('gradeTrendAnalysis', e.target.value)} className="w-full h-24 p-2 mt-1 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-600">핵심 역량</label>
                                    <textarea value={editedData.coreCompetency} onChange={(e) => handleTextChange('coreCompetency', e.target.value)} className="w-full h-24 p-2 mt-1 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-600">주요 강점</label>
                                    <textarea value={editedData.keyStrengths} onChange={(e) => handleTextChange('keyStrengths', e.target.value)} className="w-full h-24 p-2 mt-1 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-600">보완점 및 제언</label>
                                    <textarea value={editedData.suggestions} onChange={(e) => handleTextChange('suggestions', e.target.value)} className="w-full h-24 p-2 mt-1 border rounded-md"/>
                                </div>
                           </div>
                        </div>

                        {/* Example Editing Section */}
                        <div>
                           <h3 className="text-xl font-bold text-gray-700 mb-3 sticky top-0 bg-white py-2 border-b">학업역량 분석 예시 수정</h3>
                           <div className="space-y-4 p-2">
                                <div>
                                    <label className="font-semibold text-blue-800">우수 사례</label>
                                    {editedData.goodExamples.map((example, index) => (
                                        <div key={index} className="mt-2 p-2 border rounded-md">
                                            <input
                                                type="text"
                                                value={example.title}
                                                onChange={(e) => handleGoodExampleChange(index, 'title', e.target.value)}
                                                className="w-full p-1 mb-1 border rounded-md"
                                                placeholder={`우수 사례 ${index + 1} 제목`}
                                            />
                                            <input
                                                type="text"
                                                value={example.categoryTag || ''}
                                                onChange={(e) => handleGoodExampleChange(index, 'categoryTag', e.target.value)}
                                                className="w-full p-1 mb-1 border rounded-md"
                                                placeholder={`우수 사례 ${index + 1} 태그`}
                                            />
                                            <textarea
                                                value={example.description}
                                                onChange={(e) => handleGoodExampleChange(index, 'description', e.target.value)}
                                                className="w-full h-20 p-1 border rounded-md"
                                                placeholder={`우수 사례 ${index + 1} 설명`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {editedData.improvementNeededExample && (
                                    <div>
                                    <label className="font-semibold text-red-800">보완 필요 사례</label>
                                    <div className="mt-2 p-2 border rounded-md">
                                            <input
                                                type="text"
                                                value={editedData.improvementNeededExample.title}
                                                onChange={(e) => handleImprovementExampleChange('title', e.target.value)}
                                                className="w-full p-1 mb-1 border rounded-md"
                                                placeholder="보완 필요 사례 제목"
                                            />
                                            <input
                                                type="text"
                                                value={editedData.improvementNeededExample.categoryTag || ''}
                                                onChange={(e) => handleImprovementExampleChange('categoryTag', e.target.value)}
                                                className="w-full p-1 mb-1 border rounded-md"
                                                placeholder="보완 필요 사례 태그"
                                            />
                                            <textarea
                                                value={editedData.improvementNeededExample.description}
                                                onChange={(e) => handleImprovementExampleChange('description', e.target.value)}
                                                className="w-full h-20 p-1 border rounded-md"
                                                placeholder="보완 필요 사례 설명"
                                            />
                                    </div>
                                    </div>
                                )}
                           </div>
                        </div>

                   </div>
                </div>
                
                <div className="xl:col-span-2 h-[90vh] overflow-y-auto bg-gray-100 rounded-2xl p-4">
                    <ReportDashboard 
                        data={editedData} 
                        onGoToEditor={() => {}}
                        onGoToEvaluator={() => {}}
                        onReset={() => {}}
                        showActions={false}
                    />
                </div>
            </div>
           
        </div>
    );
};

export default ReportEditor;