'use client';

import { useForm } from 'react-hook-form';

const CalculatorUI = ({ config, onSubmit, result }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {config.inputs.map((input) => (
                    <div key={input.name}>
                        <label className="block text-sm font-medium text-gray-700">
                            {input.label}
                        </label>
                        <input
                            type={input.type}
                            {...register(input.name, { required: input.required })}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md ${errors[input.name] ? 'border-red-500' : 'border-gray-300'}`}
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
                    Calculate
                </button>
            </form>

            {result && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Results</h2>
                    <div className="space-y-2">
                        {config.outputs.map((output) => (
                            <div key={output.name} className="flex justify-between">
                                <span className="font-medium">{output.label}:</span>
                                <span>{result[output.name]}</span>
                            </div>
                        ))}
                    </div>

                    {result.amortization && (
                        <div className="mt-6">
                            <h3 className="text-lg font-medium mb-2">Amortization Schedule</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Month</th>
                                            <th className="px-4 py-2 text-left">EMI</th>
                                            <th className="px-4 py-2 text-left">Principal</th>
                                            <th className="px-4 py-2 text-left">Interest</th>
                                            <th className="px-4 py-2 text-left">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {result.amortization.map((row) => (
                                            <tr key={row.month}>
                                                <td className="px-4 py-2">{row.month}</td>
                                                <td className="px-4 py-2">{row.emi}</td>
                                                <td className="px-4 py-2">{row.principal}</td>
                                                <td className="px-4 py-2">{row.interest}</td>
                                                <td className="px-4 py-2">{row.balance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalculatorUI;
