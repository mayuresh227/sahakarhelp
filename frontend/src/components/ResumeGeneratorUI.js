'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import { API_BASE_URL } from '../services/toolService';

const ResumeGeneratorUI = ({ config, onSubmit }) => {
    const { register, control, handleSubmit, formState: { errors } } = useForm();
    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({
        control,
        name: 'experience'
    });

    const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
        control,
        name: 'education'
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFormSubmit = async (data) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post(`${API_BASE_URL}/${config.slug}`, data);
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Resume generation failed');
        } finally {
            setLoading(false);
        }
    };

    const downloadResume = () => {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${result.resumePdf}`;
        link.download = 'my-resume.pdf';
        link.click();
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                        </label>
                        <input
                            type="text"
                            {...register('firstName', { required: true })}
                            className={`w-full px-3 py-2 border rounded-md ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.firstName && <p className="text-red-500 text-sm mt-1">First name is required</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                        </label>
                        <input
                            type="text"
                            {...register('lastName', { required: true })}
                            className={`w-full px-3 py-2 border rounded-md ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.lastName && <p className="text-red-500 text-sm mt-1">Last name is required</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            {...register('email', { required: true })}
                            className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">Email is required</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                        </label>
                        <input
                            type="tel"
                            {...register('phone', { required: true })}
                            className={`w-full px-3 py-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">Phone is required</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Professional Summary
                    </label>
                    <textarea
                        {...register('summary')}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium">Work Experience</h3>
                        <button
                            type="button"
                            onClick={() => appendExperience({ position: '', company: '', startDate: '', endDate: '', description: '' })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                            + Add Experience
                        </button>
                    </div>

                    {experienceFields.map((field, index) => (
                        <div key={field.id} className="mb-4 p-4 border border-gray-200 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Position</label>
                                    <input
                                        type="text"
                                        {...register(`experience.${index}.position`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Company</label>
                                    <input
                                        type="text"
                                        {...register(`experience.${index}.company`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        {...register(`experience.${index}.startDate`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        {...register(`experience.${index}.endDate`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm text-gray-600 mb-1">Description</label>
                                <textarea
                                    {...register(`experience.${index}.description`)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium">Education</h3>
                        <button
                            type="button"
                            onClick={() => appendEducation({ degree: '', institution: '', year: '' })}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                            + Add Education
                        </button>
                    </div>

                    {educationFields.map((field, index) => (
                        <div key={field.id} className="mb-4 p-4 border border-gray-200 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Degree</label>
                                    <input
                                        type="text"
                                        {...register(`education.${index}.degree`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Institution</label>
                                    <input
                                        type="text"
                                        {...register(`education.${index}.institution`)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-sm text-gray-600 mb-1">Year</label>
                                <input
                                    type="number"
                                    {...register(`education.${index}.year`)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => removeEducation(index)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Generating Resume...' : 'Generate Resume'}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Your Resume is Ready!</h3>
                        <button
                            onClick={downloadResume}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Download Resume
                        </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                        Successfully generated your professional resume
                    </p>
                </div>
            )}
        </div>
    );
};

export default ResumeGeneratorUI;
