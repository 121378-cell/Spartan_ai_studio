import React, { useState } from 'react';
import FormAnalysisModal from './FormAnalysis/FormAnalysisModal';

const FormAnalysisDemo: React.FC = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">Phase 7 - Video Form Analysis Demo</h1>
                
                <div className="bg-gray-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Current Status</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="text-green-400 font-medium">✅ Completed</h3>
                            <ul className="text-gray-300 text-sm mt-2 space-y-1">
                                <li>• MediaPipe Pose integration</li>
                                <li>• Form analysis engine</li>
                                <li>• Exercise analyzers (Squat, Deadlift, etc.)</li>
                                <li>• Real-time pose detection</li>
                                <li>• Video capture component</li>
                                <li>• Form scoring algorithms</li>
                            </ul>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="text-yellow-400 font-medium">🔄 In Progress</h3>
                            <ul className="text-gray-300 text-sm mt-2 space-y-1">
                                <li>• Backend API integration</li>
                                <li>• Database schema</li>
                                <li>• Advanced metrics visualization</li>
                                <li>• Mobile optimization</li>
                                <li>• Performance tuning</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Try the Form Analysis</h2>
                    <p className="text-gray-300 mb-6">
                        Click the button below to open the form analysis modal. You'll need to allow camera access 
                        to test the real-time pose detection and form analysis features.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Open Form Analysis
                    </button>
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                            <FormAnalysisModal 
                                onClose={() => setShowModal(false)} 
                                initialExercise="squat"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormAnalysisDemo;