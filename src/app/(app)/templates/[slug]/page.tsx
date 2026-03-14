// Template detail + parameter customization form
// Route: /templates/:slug
export default function TemplateDetailPage({ params }: { params: { slug: string } }) {
  return <div>Template Detail: {params.slug} — TODO</div>;
}
