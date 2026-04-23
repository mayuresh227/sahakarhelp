'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SatbaraHelperUI = ({ config, onSubmit, result }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [language, setLanguage] = useState('marathi'); // 'marathi' or 'english'
    const [currentStep, setCurrentStep] = useState(1); // 1: Input, 2: Validation, 3: Guidance, 4: Help, 5: Error Helper

    const steps = [
        { id: 1, title: language === 'marathi' ? 'माहिती प्रविष्ट करा' : 'Enter Details' },
        { id: 2, title: language === 'marathi' ? 'प्रमाणीकरण' : 'Validation' },
        { id: 3, title: language === 'marathi' ? 'मार्गदर्शन' : 'Guidance' },
        { id: 4, title: language === 'marathi' ? 'स्मार्ट मदत' : 'Smart Help' },
        { id: 5, title: language === 'marathi' ? 'त्रुटी मदत' : 'Error Helper' },
    ];

    const handleFormSubmit = (data) => {
        onSubmit(data);
        setCurrentStep(2); // Move to validation step after submission
    };

    const toggleLanguage = () => {
        setLanguage(language === 'marathi' ? 'english' : 'marathi');
    };

    const nextStep = () => {
        if (currentStep < steps.length) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    // Translations
    const t = {
        marathi: {
            district: 'जिल्हा',
            taluka: 'तालुका',
            village: 'गाव',
            surveyNumber: 'सर्वे नंबर',
            groupNumber: 'गट नंबर (वैकल्पिक)',
            ownerName: 'मालकाचे नाव (वैकल्पिक)',
            submit: 'सत्यापित करा आणि मार्गदर्शन मिळवा',
            validation: 'प्रमाणीकरण',
            guidance: 'मार्गदर्शन',
            help: 'स्मार्ट मदत',
            errorHelp: 'त्रुटी मदत',
            openOfficialSite: 'अधिकृत ७/१२ वेबसाइट उघडा',
            importantNote: 'ही साधन सरकारी डेटा थेट फेच करत नाही. ती केवळ वापरकर्त्यांना मदत करते.',
            step: 'पायरी',
            next: 'पुढे',
            previous: 'मागे',
            toggleLang: 'English मध्ये बदला',
            validationResults: 'प्रमाणीकरण परिणाम',
            guidanceSteps: 'मार्गदर्शन पायऱ्या',
            smartHelp: 'स्मार्ट मदत',
            errorHelper: 'त्रुटी मदतकारी',
        },
        english: {
            district: 'District',
            taluka: 'Taluka',
            village: 'Village',
            surveyNumber: 'Survey Number',
            groupNumber: 'Group Number (Optional)',
            ownerName: 'Owner Name (Optional)',
            submit: 'Validate and Get Guidance',
            validation: 'Validation',
            guidance: 'Guidance',
            help: 'Smart Help',
            errorHelp: 'Error Helper',
            openOfficialSite: 'Open Official 7/12 Website',
            importantNote: 'This tool does not fetch government data directly. It only helps users.',
            step: 'Step',
            next: 'Next',
            previous: 'Previous',
            toggleLang: 'मराठी मध्ये बदला',
            validationResults: 'Validation Results',
            guidanceSteps: 'Guidance Steps',
            smartHelp: 'Smart Help',
            errorHelper: 'Error Helper',
        }
    };

    const text = t[language];

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            {/* Language Toggle */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={toggleLanguage}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                >
                    {text.toggleLang}
                </button>
            </div>

            {/* Step Indicator */}
            <div className="flex justify-between mb-8">
                {steps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {step.id}
                        </div>
                        <span className="mt-2 text-sm text-center">{step.title}</span>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="mb-8">
                {currentStep === 1 && (
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                        {config.inputs.map((input) => (
                            <div key={input.name}>
                                <label className="block text-sm font-medium text-gray-700">
                                    {text[input.name] || input.label}
                                </label>
                                <input
                                    type={input.type}
                                    {...register(input.name, { required: input.required })}
                                    className={`mt-1 block w-full px-3 py-2 border rounded-md ${errors[input.name] ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder={input.placeholder}
                                />
                                {errors[input.name] && (
                                    <p className="mt-1 text-sm text-red-500">This field is required</p>
                                )}
                            </div>
                        ))}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                        >
                            {text.submit}
                        </button>
                    </form>
                )}

                {currentStep === 2 && result && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">{text.validationResults}</h3>
                        <div className="space-y-2">
                            <p><strong>Survey Number Valid:</strong> {result.validation?.isValidSurveyNumber ? 'Yes' : 'No'}</p>
                            <p><strong>Group Number Valid:</strong> {result.validation?.isValidGroupNumber ? 'Yes' : 'No'}</p>
                            {result.validation?.errors && result.validation.errors.length > 0 && (
                                <div className="bg-red-50 p-3 rounded">
                                    <h4 className="font-medium text-red-800">Errors:</h4>
                                    <ul className="list-disc pl-5 text-red-700">
                                        {result.validation.errors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={nextStep}
                                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                            >
                                {text.next} ({text.guidance})
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 3 && result && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">{text.guidanceSteps}</h3>
                        <div className="space-y-4">
                            {result.guidance?.map((step) => (
                                <div key={step.step} className="border-l-4 border-blue-500 pl-4 py-2">
                                    <h4 className="font-medium">{step.step}. {step.title}</h4>
                                    <p className="text-gray-600">{step.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={prevStep}
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
                            >
                                {text.previous}
                            </button>
                            <button
                                onClick={nextStep}
                                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                            >
                                {text.next} ({text.help})
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 4 && result && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">{text.smartHelp}</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium">गट नंबर म्हणजे काय</h4>
                                <p className="text-gray-600">{result.help?.groupNumberMeaning}</p>
                            </div>
                            <div>
                                <h4 className="font-medium">सर्वे नंबर म्हणजे काय</h4>
                                <p className="text-gray-600">{result.help?.surveyNumberMeaning}</p>
                            </div>
                            <div>
                                <h4 className="font-medium">7/12 मधील कॉलम</h4>
                                <ul className="list-disc pl-5 text-gray-600">
                                    {result.help?.columnsIn712?.map((col, idx) => (
                                        <li key={idx}>{col}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={prevStep}
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
                            >
                                {text.previous}
                            </button>
                            <button
                                onClick={nextStep}
                                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                            >
                                {text.next} ({text.errorHelper})
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 5 && result && (
                    <div>
                        <h3 className="text-xl font-semibold mb-4">{text.errorHelper}</h3>
                        <div className="space-y-4">
                            {Object.entries(result.errorHelp || {}).map(([key, value]) => (
                                <div key={key} className="border-l-4 border-red-500 pl-4 py-2">
                                    <h4 className="font-medium">{key}</h4>
                                    <ul className="list-disc pl-5 text-gray-600">
                                        {value.map((line, idx) => (
                                            <li key={idx}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={prevStep}
                                className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
                            >
                                {text.previous}
                            </button>
                            <a
                                href="https://bhulekh.mahabhumi.gov.in/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                            >
                                {text.openOfficialSite}
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Important Note */}
            <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-yellow-700">{text.importantNote}</p>
            </div>

            {/* If no result yet, show step navigation */}
            {!result && currentStep > 1 && (
                <div className="mt-6 flex justify-between">
                    <button
                        onClick={prevStep}
                        className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400"
                    >
                        {text.previous}
                    </button>
                    <button
                        onClick={nextStep}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                        {text.next}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SatbaraHelperUI;