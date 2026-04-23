"use client";

import { useState, useEffect } from 'react';
import { getActiveTools } from '@/services/toolService';
import ToolCard from '@/components/ToolCard';
import Link from 'next/link';

const HomePage = () => {
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchTools = async () => {
      const data = await getActiveTools();
      setTools(data);
      setFilteredTools(data);
    };

    fetchTools();
  }, []);

  useEffect(() => {
    let result = tools;

    // Apply search filter
    if (searchQuery) {
      result = result.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(tool =>
        tool.categories.includes(selectedCategory)
      );
    }

    setFilteredTools(result);
  }, [searchQuery, selectedCategory, tools]);

  // Get unique categories
  const categories = ['all', ...new Set(tools.flatMap(tool => tool.categories))];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "SahakarHelp",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "AI-powered tools for cooperative societies: PDF processing, financial calculations, document management.",
            "url": "https://sahakarhelp.com",
            "publisher": {
              "@type": "Organization",
              "name": "SahakarHelp",
              "url": "https://sahakarhelp.com"
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Free Plan",
                "price": "0",
                "priceCurrency": "INR"
              },
              {
                "@type": "Offer",
                "name": "Pro Monthly",
                "price": "299",
                "priceCurrency": "INR"
              },
              {
                "@type": "Offer",
                "name": "Pro Yearly",
                "price": "2999",
                "priceCurrency": "INR"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "124"
            },
            "featureList": [
              "PDF Merge/Split/Compress",
              "GST Invoice Generator",
              "Financial Calculators",
              "CSC Form Filling",
              "Image Processing",
              "Document Conversion"
            ]
          })
        }}
      />
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Empower Your Cooperative Society</h1>
        <p className="text-gray-600 text-xl max-w-3xl mx-auto mb-10">
          A comprehensive suite of <span className="font-semibold text-blue-600">AI-powered tools</span> for PDF processing, financial calculations, and document management. Boost productivity with our free plan or unlock unlimited access with Pro.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            href="/auth/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
          >
            View Pricing
          </Link>
          <Link
            href="/tools/calculator"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
          >
            Try a Tool
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <div className="text-blue-600 text-3xl font-bold mb-2">100+</div>
            <div className="text-gray-800 font-medium">Tools Available</div>
            <p className="text-gray-600 text-sm mt-2">PDF, CSC, Financial, and more</p>
          </div>
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <div className="text-green-600 text-3xl font-bold mb-2">24/7</div>
            <div className="text-gray-800 font-medium">Uptime & Support</div>
            <p className="text-gray-600 text-sm mt-2">Reliable infrastructure with priority support</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
            <div className="text-purple-600 text-3xl font-bold mb-2">10K+</div>
            <div className="text-gray-800 font-medium">Users Trusted</div>
            <p className="text-gray-600 text-sm mt-2">Cooperatives across India</p>
          </div>
        </div>
      </div>

      {/* Tool Categories */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Tool Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-red-600 text-2xl font-bold">PDF</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">PDF Tools</h3>
            <p className="text-gray-600 mb-6">Merge, split, compress, and convert PDFs. Extract text, images, and manage documents effortlessly.</p>
            <Link href="/tools?category=pdf" className="text-blue-600 font-semibold hover:text-blue-800">
              Explore PDF tools →
            </Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-blue-600 text-2xl font-bold">CSC</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">CSC Tools</h3>
            <p className="text-gray-600 mb-6">Specialized tools for Common Service Centres: form filling, certificate generation, and government services.</p>
            <Link href="/tools?category=csc" className="text-blue-600 font-semibold hover:text-blue-800">
              Explore CSC tools →
            </Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-green-600 text-2xl font-bold">₹</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Financial Tools</h3>
            <p className="text-gray-600 mb-6">GST calculators, loan EMI, investment planning, invoice generation, and financial reporting.</p>
            <Link href="/tools?category=financial" className="text-blue-600 font-semibold hover:text-blue-800">
              Explore Financial tools →
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white mb-16">
        <h2 className="text-4xl font-bold mb-6">Ready to Scale Your Operations?</h2>
        <p className="text-xl mb-10 max-w-2xl mx-auto">Upgrade to Pro for unlimited tool usage, priority support, and advanced features.</p>
        <div className="flex flex-wrap justify-center gap-6">
          <Link
            href="/pricing"
            className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-2xl"
          >
            Upgrade to Pro
          </Link>
          <Link
            href="/auth/signin"
            className="bg-transparent border-2 border-white hover:bg-white/10 px-10 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Tools</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tools by name or description..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full md:w-64">
            <select
              className="w-full p-3 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.length > 0 ? (
          filteredTools.map(tool => (
            <ToolCard key={tool.slug} tool={tool} />
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <div className="bg-gray-50 rounded-xl p-8 max-w-2xl mx-auto">
              <p className="text-gray-500 text-lg mb-4">No tools found matching your criteria</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-16 pt-8 border-t border-gray-200">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Need Help?</h3>
          <p className="text-gray-600 mb-6">
            Check the <Link href="/test" className="text-blue-600 hover:text-blue-800 font-medium">API Test page</Link> to verify backend connectivity,
            or explore the available tools above.
          </p>
          <div className="bg-blue-50 rounded-xl p-6 max-w-3xl mx-auto">
            <h4 className="font-bold text-blue-800 mb-2">Deployment Status</h4>
            <p className="text-blue-700">
              Frontend: <span className="font-semibold">Vercel</span> •
              Backend: <span className="font-semibold">Railway</span> •
              Database: <span className="font-semibold">MongoDB Atlas</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;