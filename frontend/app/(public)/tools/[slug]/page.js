import ToolLoader from '@/components/ToolLoader';

export default function ToolPage({ params }) {
    return <ToolLoader slug={params.slug} />;
}