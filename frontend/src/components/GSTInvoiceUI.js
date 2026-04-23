'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';

const GSTInvoiceUI = ({ config, onSubmit, result }) => {
    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            items: [{ itemName: '', quantity: 1, price: 0, taxRate: 18 }]
        }
    });
    
    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
        control,
        name: 'items'
    });

    // Watch fields for live totals calculation
    const watchedItems = watch('items');
    const watchedDiscount = watch('discount');
    const watchedShipping = watch('shipping');

    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        if (watchedItems) {
            watchedItems.forEach(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                const taxRate = parseFloat(item.taxRate) || 0;
                const itemTotal = quantity * price;
                const itemTax = itemTotal * (taxRate / 100);
                subtotal += itemTotal;
                totalTax += itemTax;
            });
        }
        const discount = parseFloat(watchedDiscount) || 0;
        const shipping = parseFloat(watchedShipping) || 0;
        const finalTotal = subtotal + totalTax - discount + shipping;
        return { subtotal, totalTax, discount, shipping, finalTotal };
    }, [watchedItems, watchedDiscount, watchedShipping]);

    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [signaturePreview, setSignaturePreview] = useState(null);

    // Local storage history
    const [localHistory, setLocalHistory] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('gstInvoiceHistory');
        if (saved) {
            try {
                setLocalHistory(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    const addToLocalHistory = (invoiceData) => {
        const saved = localStorage.getItem('gstInvoiceHistory');
        let history = [];
        if (saved) {
            try {
                history = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
        history = [invoiceData, ...history.slice(0, 9)]; // keep last 10
        localStorage.setItem('gstInvoiceHistory', JSON.stringify(history));
        setLocalHistory(history);
    };

    // Effect to add result to local history
    useEffect(() => {
        if (result?.invoiceData) {
            addToLocalHistory(result.invoiceData);
        }
    }, [result]);

    const handleFormSubmit = async (data) => {
        try {
            setLoading(true);

            // Helper to convert File to base64
            const fileToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        // Remove data URL prefix (e.g., "data:image/png;base64,")
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const payload = { ...data };

            // Process logo file
            if (data.logo && data.logo[0]) {
                const base64 = await fileToBase64(data.logo[0]);
                payload.logo = { data: base64 };
            } else {
                delete payload.logo;
            }

            // Process signature file
            if (data.signature && data.signature[0]) {
                const base64 = await fileToBase64(data.signature[0]);
                payload.signature = { data: base64 };
            } else {
                delete payload.signature;
            }

            // Call parent onSubmit (which should call the API)
            await onSubmit(payload);
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignatureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSignaturePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const downloadInvoice = () => {
        if (result?.invoicePdf) {
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${result.invoicePdf}`;
            link.download = `invoice-${result.invoiceData?.invoiceNumber || 'invoice'}.pdf`;
            link.click();
        }
    };

    const saveToHistory = async () => {
        if (!result?.invoiceData) return;
        try {
            await axios.post('/api/invoice', result.invoiceData);
            alert('Invoice saved to history!');
        } catch (error) {
            console.error('Failed to save invoice:', error);
            alert('Failed to save invoice to history');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Seller Details */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Seller Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Name *
                            </label>
                            <input
                                type="text"
                                {...register('businessName', { required: true })}
                                className={`w-full px-3 py-2 border rounded-md ${errors.businessName ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.businessName && <p className="text-red-500 text-sm mt-1">Business name is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                GST Number *
                            </label>
                            <input
                                type="text"
                                {...register('gstNumber', { required: true })}
                                className={`w-full px-3 py-2 border rounded-md ${errors.gstNumber ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.gstNumber && <p className="text-red-500 text-sm mt-1">GST number is required</p>}
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Address *
                        </label>
                        <textarea
                            {...register('businessAddress', { required: true })}
                            rows={2}
                            className={`w-full px-3 py-2 border rounded-md ${errors.businessAddress ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.businessAddress && <p className="text-red-500 text-sm mt-1">Business address is required</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="text"
                                {...register('phone')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                {...register('email')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Customer Details */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Customer Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Name *
                            </label>
                            <input
                                type="text"
                                {...register('customerName', { required: true })}
                                className={`w-full px-3 py-2 border rounded-md ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.customerName && <p className="text-red-500 text-sm mt-1">Customer name is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer GST (Optional)
                            </label>
                            <input
                                type="text"
                                {...register('customerGST')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Address *
                        </label>
                        <textarea
                            {...register('customerAddress', { required: true })}
                            rows={2}
                            className={`w-full px-3 py-2 border rounded-md ${errors.customerAddress ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.customerAddress && <p className="text-red-500 text-sm mt-1">Customer address is required</p>}
                    </div>
                </div>

                {/* Invoice Info */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Invoice Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice Number *
                            </label>
                            <input
                                type="text"
                                {...register('invoiceNumber', { required: true })}
                                className={`w-full px-3 py-2 border rounded-md ${errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.invoiceNumber && <p className="text-red-500 text-sm mt-1">Invoice number is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice Date *
                            </label>
                            <input
                                type="date"
                                {...register('invoiceDate', { required: true })}
                                className={`w-full px-3 py-2 border rounded-md ${errors.invoiceDate ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {errors.invoiceDate && <p className="text-red-500 text-sm mt-1">Invoice date is required</p>}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="border-b pb-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Items</h2>
                        <button
                            type="button"
                            onClick={() => appendItem({ itemName: '', quantity: 1, price: 0, taxRate: 18 })}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                        >
                            + Add Item
                        </button>
                    </div>
                    
                    {itemFields.map((field, index) => (
                        <div key={field.id} className="mb-4 p-4 border border-gray-200 rounded-md">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-medium">Item {index + 1}</h3>
                                {itemFields.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Item Name *</label>
                                    <input
                                        type="text"
                                        {...register(`items.${index}.itemName`, { required: true })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        {...register(`items.${index}.quantity`, { required: true, min: 1 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        {...register(`items.${index}.price`, { required: true, min: 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Tax Rate (%) *</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        {...register(`items.${index}.taxRate`, { required: true, min: 0, max: 100 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Extra Fields */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Extra Fields</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('discount')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Shipping Charges
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('shipping')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Invoice Summary Preview */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Invoice Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Subtotal:</span>
                                <span>₹{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Total Tax:</span>
                                <span>₹{totals.totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Discount:</span>
                                <span>-₹{totals.discount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Shipping:</span>
                                <span>+₹{totals.shipping.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-bold text-lg">
                                <span>Final Total:</span>
                                <span>₹{totals.finalTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600">
                            <p>This is a live preview based on current inputs. The final invoice will be generated with these totals.</p>
                        </div>
                    </div>
                </div>

                {/* Branding */}
                <div className="border-b pb-4">
                    <h2 className="text-xl font-semibold mb-4">Branding (Optional)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Logo
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                {...register('logo')}
                                onChange={handleLogoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            {logoPreview && (
                                <div className="mt-2">
                                    <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Signature
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                {...register('signature')}
                                onChange={handleSignatureChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                            {signaturePreview && (
                                <div className="mt-2">
                                    <img src={signaturePreview} alt="Signature preview" className="h-20 object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                >
                    {loading ? 'Generating Invoice...' : 'Generate Invoice'}
                </button>
            </form>

            {/* Recent Invoices */}
            {localHistory.length > 0 && (
                <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
                    <div className="space-y-3">
                        {localHistory.slice(0, 5).map((invoice, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-md">
                                <div>
                                    <div className="font-medium">#{invoice.invoiceNumber}</div>
                                    <div className="text-sm text-gray-600">{invoice.customerName}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold">₹{invoice.totalAmount?.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">{invoice.invoiceDate}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-4">Stored locally in your browser.</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="mt-8 p-6 border border-green-200 rounded-lg bg-green-50">
                    <h2 className="text-xl font-semibold mb-4">Invoice Generated Successfully!</h2>
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between">
                            <span className="font-medium">Invoice Number:</span>
                            <span>{result.invoiceData?.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Customer:</span>
                            <span>{result.invoiceData?.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Total Amount:</span>
                            <span className="font-bold">₹{result.invoiceData?.totalAmount?.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={downloadInvoice}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Download PDF
                        </button>
                        <button
                            onClick={saveToHistory}
                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            Save to History
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GSTInvoiceUI;