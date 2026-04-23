import Link from 'next/link';

const ToolCard = ({ tool }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{tool.name}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {tool.categories.map(category => (
            <span key={category} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {category}
            </span>
          ))}
        </div>
        <p className="text-gray-600 mb-4">{tool.description || 'No description available'}</p>
        <Link href={`/tools/${tool.slug}`} className="inline-block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-300">
          Use Tool
        </Link>
      </div>
    </div>
  );
};

export default ToolCard;