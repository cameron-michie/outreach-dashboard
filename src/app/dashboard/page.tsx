import { Button } from "@/components/ui";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Outreach Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Campaigns</h2>
          <p className="text-gray-600">0 campaigns running</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
          <p className="text-gray-600">0 emails pending</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Emails Sent Today</h2>
          <p className="text-gray-600">0 emails sent</p>
        </div>
      </div>
      <div className="mt-8">
        <Button>Create New Campaign</Button>
      </div>
    </div>
  );
}