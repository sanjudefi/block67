// Project dashboard — contract metrics, actions, deployments list
// Route: /projects/:slug  (also served at slug.block67.app)
export default function ProjectDashboardPage({ params }: { params: { slug: string } }) {
  return <div>Project Dashboard: {params.slug} — TODO</div>;
}
