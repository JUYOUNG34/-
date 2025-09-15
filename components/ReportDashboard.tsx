import React, { useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { EvaluationResult, CategoryScores, QuestionKey } from '../types';
import { QUESTION_MAP } from '../constants';
import { BarChartIcon, TrendingUpIcon, CheckCircleIcon, AlertTriangleIcon } from './icons';

interface ReportDashboardProps {
    data: EvaluationResult;
    onGoToEditor: () => void;
    onGoToEvaluator: () => void;
    onReset: () => void;
    showActions?: boolean;
}

const colorSchemes = {
    'A': { excellent: '#1e3a8a', strong: '#1d4ed8', medium: '#3b82f6', light: '#93c5fd', weak: '#dbeafe' }, // Blues
    'B': { excellent: '#4c1d95', strong: '#5b21b6', medium: '#7c3aed', light: '#a78bfa', weak: '#ddd6fe' }, // Purples
    'C': { excellent: '#047857', strong: '#059669', medium: '#10b981', light: '#6ee7b7', weak: '#a7f3d0' }, // Teals
};

const fivePointColorScheme = { excellent: '#d97706', strong: '#f59e0b', medium: '#fcd34d', weak: '#fef3c7' }; // Amber/Orange

const fivePointItems: QuestionKey[] = ['A4_MajorSubjects', 'A8_CommunicationSkills', 'A19_ZScore', 'C3_ClassParticipation', 'C7_ResourceUtilization'];

const DetailedChart = ({ categoryData, colorScheme, scale }: { categoryData: CategoryScores, colorScheme: typeof colorSchemes['A'], scale: number }) => {
    const getBarColor = (score: number) => {
        const scheme = scale === 5 ? fivePointColorScheme : colorScheme;
        if (scale === 5) {
            if (score >= 5) return scheme.excellent;
            if (score >= 4) return scheme.strong;
            if (score >= 3) return scheme.medium;
            return scheme.weak;
        } else { // scale === 7
            if (score >= 7) return scheme.excellent;
            if (score >= 6) return scheme.strong;
            if (score >= 5) return scheme.medium;
            return scheme.weak; // Score of 4
        }
    };
    
    const domain: [number, number] = scale === 5 ? [0, 5] : [3, 7];
    const ticks = scale === 5 ? [1, 2, 3, 4, 5] : [3, 4, 5, 6, 7];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData.items} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" domain={domain} ticks={ticks} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={125} tick={{ fontSize: 12 }} interval={0} axisLine={false} tickLine={false}/>
                <Tooltip
                    cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                    formatter={(value: number, name, props) => [`${value}점`, props.payload.justification]}
                    labelFormatter={(label) => label}
                    contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        backdropFilter: 'blur(4px)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        maxWidth: '300px',
                        whiteSpace: 'normal',
                     }}
                />
                <Bar dataKey="score" background={{ fill: '#f3f4f6', radius: 4 }} radius={[0, 4, 4, 0]}>
                    {categoryData.items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};


const ReportDashboard = ({ data, onGoToEditor, onGoToEvaluator, onReset, showActions = true }: ReportDashboardProps) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    const { categoryData, totalAverage, totalScore, maxScore } = useMemo(() => {
        const categories: Record<string, CategoryScores> = {
            'A': { key: 'A', name: '학업성취도', average: 0, totalScore: 0, maxScore: 0, items: [] },
            'B': { key: 'B', name: '자기주도성', average: 0, totalScore: 0, maxScore: 0, items: [] },
            'C': { key: 'C', name: '학업태도', average: 0, totalScore: 0, maxScore: 0, items: [] },
        };
        
        let grandTotalScore = 0;
        let grandMaxScore = 0;

        for (const key in data.scores) {
            const qKey = key as QuestionKey;
            const categoryKey = qKey.charAt(0);
            if (categories[categoryKey]) {
                const scoreItem = data.scores[qKey];
                categories[categoryKey].items.push({
                    id: qKey,
                    label: QUESTION_MAP[qKey] || 'Unknown',
                    score: scoreItem.score,
                    justification: scoreItem.justification,
                });
                categories[categoryKey].totalScore += scoreItem.score;
                const maxForItem = fivePointItems.includes(qKey) ? 5 : 7;
                categories[categoryKey].maxScore += maxForItem;
            }
        }
        
        Object.values(categories).forEach(cat => {
            cat.average = cat.items.length > 0 ? (cat.totalScore / cat.maxScore) * 100 : 0;
            grandTotalScore += cat.totalScore;
            grandMaxScore += cat.maxScore;
        });

        const totalAverage = grandMaxScore > 0 ? (grandTotalScore / grandMaxScore) * 100 : 0;

        return { categoryData: Object.values(categories), totalAverage, totalScore: grandTotalScore, maxScore: grandMaxScore };
    }, [data]);

    const orderedCategoryData = useMemo(() => {
        const catA = categoryData.find(c => c.key === 'A');
        const catB = categoryData.find(c => c.key === 'B');
        const catC = categoryData.find(c => c.key === 'C');
        // Card order: 학업성취도(A), 자기주도성(B), 학업태도(C)
        if (catA && catB && catC) {
            return [catA, catB, catC];
        }
        return categoryData;
    }, [categoryData]);

    const mainChartData = categoryData.map(c => ({ name: c.name, '역량 평균 점수': c.average }));
    const MAIN_CHART_COLORS = [colorSchemes['A'].strong, colorSchemes['B'].strong, colorSchemes['C'].strong];

    const handleExportPDF = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;
        
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#f9fafb'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            let imgHeightOnPdf = pdfWidth / ratio;
            let heightLeft = imgHeightOnPdf;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
                position = -heightLeft;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightOnPdf);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }

            pdf.save(`${data.studentName}_학업역량_보고서.pdf`);

        } catch (error) {
            console.error("Error exporting to PDF", error);
        } finally {
            setIsExporting(false);
        }
    };


    return (
      <>
        <div className="container mx-auto p-4" ref={reportRef}>
            {/* Header */}
            <header className="text-center mb-12 p-8 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-400 shadow-md">
                <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.2)'}}>학업역량 평가</h1>
                <p className="mt-4 text-lg text-white/90 max-w-3xl mx-auto">{data.tagline}</p>
            </header>

            {/* 종합 평가 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">핵심 역량 분석</h2>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mainChartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 14 }} />
                                <YAxis domain={[0, 100]} tickCount={6} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                                    formatter={(value) => [`${(value as number).toFixed(1)}점`, '평균 점수']}
                                />
                                <Bar dataKey="역량 평균 점수" radius={[4, 4, 0, 0]} barSize={60}>
                                    {mainChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={MAIN_CHART_COLORS[index % MAIN_CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-center items-center text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">종합 평균 점수</h2>
                    <div className="relative w-48 h-48">
                         <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                 <Pie
                                     data={[{ value: totalAverage }, { value: 100 - totalAverage }]}
                                     dataKey="value"
                                     cx="50%"
                                     cy="50%"
                                     innerRadius="80%"
                                     outerRadius="100%"
                                     startAngle={90}
                                     endAngle={450}
                                     paddingAngle={0}
                                     stroke="none"
                                 >
                                     <Cell fill="#4f46e5" />
                                     <Cell fill="#e5e7eb" />
                                 </Pie>
                             </PieChart>
                         </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-indigo-600">{totalAverage.toFixed(1)}</span>
                            <span className="text-gray-500">/ 100 점</span>
                        </div>
                    </div>
                    <p className="mt-4 text-gray-600">원점수 총합: {totalScore} / {maxScore}</p>
                </div>
            </div>

            {/* 학업성취도 분석 */}
            {(data.academicStrengthAnalysis || data.gradeTrendAnalysis) && (
                 <div className="my-12">
                     <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">학업성취도 분석</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                                    <BarChartIcon />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">학업 강점 분석</h3>
                            </div>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">{data.academicStrengthAnalysis}</p>
                        </div>
                         <div className="bg-white rounded-2xl shadow-lg p-8">
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                                    <TrendingUpIcon />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">성적 추이 분석</h3>
                            </div>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">{data.gradeTrendAnalysis}</p>
                        </div>
                    </div>
                 </div>
            )}

            {/* 세부 역량 분석 */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">세부 역량 분석</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {orderedCategoryData.map(cat => {
                        const sevenPointItems = cat.items.filter(item => !fivePointItems.includes(item.id as QuestionKey));
                        const fivePointItemsData = cat.items.filter(item => fivePointItems.includes(item.id as QuestionKey));
                        
                        const sevenPointCatData = { ...cat, items: sevenPointItems };
                        const fivePointCatData = { ...cat, items: fivePointItemsData };

                        return (
                            <div key={cat.key} className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-800 text-center">
                                   {cat.name}
                                </h3>
                                <hr className="my-4 border-gray-200" />
                                <div className="min-h-[450px]">
                                    {sevenPointItems.length > 0 && (
                                        <>
                                            <h4 className="text-sm font-semibold text-gray-500 mt-4 mb-2 text-center">7점 만점 항목</h4>
                                            <div style={{ height: `${sevenPointItems.length * 45}px` }}>
                                                <DetailedChart categoryData={sevenPointCatData} colorScheme={colorSchemes[cat.key]} scale={7} />
                                            </div>
                                        </>
                                    )}
                                    {fivePointItemsData.length > 0 && (
                                         <>
                                            <h4 className="text-sm font-semibold text-amber-700 mt-6 mb-2 text-center">5점 만점 항목</h4>
                                            <div style={{ height: `${fivePointItemsData.length * 45}px` }}>
                                                <DetailedChart categoryData={fivePointCatData} colorScheme={colorSchemes[cat.key]} scale={5} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 학업역량 분석 예시 */}
            {(data.goodExamples?.length > 0 || data.improvementNeededExample?.title) && (
                 <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">학업역량 분석 예시</h2>
                    <div className="space-y-4">
                        {/* 우수 사례 */}
                        {data.goodExamples?.map((example, index) => (
                            <div key={`good-${index}`} className="rounded-lg border border-blue-300 overflow-hidden shadow-sm">
                                <div className="bg-blue-50 p-3 px-4 border-b border-blue-200 flex justify-between items-center">
                                    <h3 className="text-base font-bold text-gray-800">
                                        <span className="text-blue-700">{`[우수 사례 ${index + 1}]`}</span>
                                        {` ${example.title}`}
                                    </h3>
                                    {example.categoryTag && (
                                        <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2.5 py-0.5 rounded-full">{example.categoryTag}</span>
                                    )}
                                </div>
                                <div className="p-4 bg-white">
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{example.description}</p>
                                </div>
                            </div>
                        ))}

                        {/* 보완 필요 사례 */}
                        {data.improvementNeededExample?.title && (
                             <div className="rounded-lg border border-red-400 overflow-hidden shadow-sm">
                                <div className="bg-red-50 p-3 px-4 border-b border-red-300 flex justify-between items-center">
                                     <h3 className="text-base font-bold text-gray-800">
                                        <span className="text-red-700">{`[보완 필요 사례]`}</span>
                                        {` ${data.improvementNeededExample.title}`}
                                    </h3>
                                    {data.improvementNeededExample.categoryTag && (
                                         <span className="text-xs bg-red-100 text-red-800 font-medium px-2.5 py-0.5 rounded-full">{data.improvementNeededExample.categoryTag}</span>
                                    )}
                                </div>
                                <div className="p-4 bg-white">
                                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{data.improvementNeededExample.description}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* 학업역량 총평 */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mt-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">학업역량 총평</h2>
                <div className="text-gray-700 space-y-4 leading-relaxed text-base">
                    <p>
                        <span className="font-semibold text-indigo-600">[핵심 역량]</span>
                        {' '}{data.coreCompetency}
                    </p>
                    <p>
                        <span className="font-semibold text-indigo-600">[주요 강점]</span>
                        {' '}{data.keyStrengths}
                    </p>
                    <p>
                        <span className="font-semibold text-indigo-600">[보완점 및 제언]</span>
                        {' '}{data.suggestions}
                    </p>
                </div>
            </div>
        </div>

        {showActions && (
            <div className="text-center mt-12 space-x-2 sm:space-x-4">
                <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="px-4 sm:px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 disabled:bg-gray-400"
                >
                    {isExporting ? 'PDF 생성 중...' : 'PDF로 내보내기'}
                </button>
                <button
                   onClick={onGoToEvaluator}
                   className="px-4 sm:px-6 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-300"
               >
                   평가자용 상세 보기
               </button>
                <button
                   onClick={onGoToEditor}
                   className="px-4 sm:px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
               >
                   점수 및 내용 수정하기
               </button>
               <button
                   onClick={onReset}
                   className="px-4 sm:px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-300"
               >
                   새 분석 시작
               </button>
           </div>
        )}
      </>
    );
};

export default ReportDashboard;