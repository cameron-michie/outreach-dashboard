"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Loading, Modal } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";

interface CampaignForm {
  companyName: string;
  contactEmail: string;
  contactName: string;
  useCase: string;
  requiresApproval: boolean;
}

interface GeneratedEmails {
  customerSnapshot: string;
  businessHypothesis: string;
  emails: Array<{
    emailNumber: number;
    subject: string;
    content: string;
    scheduledDate: string;
  }>;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [step, setStep] = useState(1); // 1: Form, 2: Review, 3: Success
  const [loading, setLoading] = useState(false);
  const [generateEmailsLoading, setGenerateEmailsLoading] = useState(false);
  const [form, setForm] = useState<CampaignForm>({
    companyName: searchParams?.get('company') || '',
    contactEmail: searchParams?.get('email') || '',
    contactName: '',
    useCase: '',
    requiresApproval: true,
  });
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmails | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEmailIndex, setPreviewEmailIndex] = useState(0);

  const handleInputChange = (key: keyof CampaignForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const generateEmails = async () => {
    try {
      setGenerateEmailsLoading(true);

      const response = await fetch('/api/claude/generate-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: form.companyName,
          contactEmail: form.contactEmail,
          contactName: form.contactName,
          useCase: form.useCase,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate emails');
      }

      const data = await response.json();
      setGeneratedEmails(data);
      setStep(2);
    } catch (error) {
      console.error('Failed to generate emails:', error);
      alert('Failed to generate emails. Please try again.');
    } finally {
      setGenerateEmailsLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!generatedEmails) return;

    try {
      setLoading(true);

      const response = await fetch('/api/emails/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: form.companyName,
          contactEmail: form.contactEmail,
          contactName: form.contactName,
          customerSnapshot: generatedEmails.customerSnapshot,
          businessHypothesis: generatedEmails.businessHypothesis,
          emails: generatedEmails.emails,
          requiresApproval: form.requiresApproval,
          status: 'draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const campaign = await response.json();
      setStep(3);

      // Redirect to campaigns list after 3 seconds
      setTimeout(() => {
        router.push('/campaigns');
      }, 3000);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = form.companyName && form.contactEmail && form.contactName;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
            <p className="text-gray-600">Generate a personalized email outreach campaign</p>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    1
                  </div>
                  <span className="ml-2 font-medium">Company Details</span>
                </div>
                <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    2
                  </div>
                  <span className="ml-2 font-medium">Review Emails</span>
                </div>
                <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}>
                    3
                  </div>
                  <span className="ml-2 font-medium">Complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Form */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Campaign Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="Acme Corporation"
                    value={form.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="john@acme.com"
                    value={form.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="John Smith"
                    value={form.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Case (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Real-time notifications, chat, etc."
                    value={form.useCase}
                    onChange={(e) => handleInputChange('useCase', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={form.requiresApproval}
                    onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Require approval before sending emails
                  </span>
                </label>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <Button variant="outline" onClick={() => router.push('/campaigns')}>
                  Cancel
                </Button>
                <Button
                  onClick={generateEmails}
                  disabled={!isFormValid || generateEmailsLoading}
                  loading={generateEmailsLoading}
                >
                  {generateEmailsLoading ? 'Generating Emails...' : 'Generate Emails'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && generatedEmails && (
            <div className="space-y-6">
              {/* Research Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Research Summary</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Customer Snapshot</h3>
                    <p className="text-sm text-gray-600">{generatedEmails.customerSnapshot}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Business Hypothesis</h3>
                    <p className="text-sm text-gray-600">{generatedEmails.businessHypothesis}</p>
                  </div>
                </div>
              </div>

              {/* Email Sequence */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Sequence</h2>

                <div className="space-y-4">
                  {generatedEmails.emails.map((email, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-900">
                          Email {email.emailNumber}: {email.subject}
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPreviewEmailIndex(index);
                            setShowPreview(true);
                          }}
                        >
                          Preview
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Scheduled: {new Date(email.scheduledDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {email.content.substring(0, 200)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back to Edit
                </Button>
                <Button onClick={createCampaign} disabled={loading} loading={loading}>
                  {loading ? 'Creating Campaign...' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Campaign Created!</h2>
              <p className="text-gray-600 mb-6">
                Your email campaign for {form.companyName} has been created successfully.
                {form.requiresApproval && ' The emails are pending approval before sending.'}
              </p>
              <Button onClick={() => router.push('/campaigns')}>
                View All Campaigns
              </Button>
            </div>
          )}

          {/* Email Preview Modal */}
          {showPreview && generatedEmails && (
            <Modal
              isOpen={showPreview}
              onClose={() => setShowPreview(false)}
              title={`Email ${generatedEmails.emails[previewEmailIndex]?.emailNumber}: ${generatedEmails.emails[previewEmailIndex]?.subject}`}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <p className="text-sm text-gray-900">{generatedEmails.emails[previewEmailIndex]?.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900">
                      {generatedEmails.emails[previewEmailIndex]?.content}
                    </pre>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(generatedEmails.emails[previewEmailIndex]?.scheduledDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}