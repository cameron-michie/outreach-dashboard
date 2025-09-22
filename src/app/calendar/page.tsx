"use client";

import { useState, useEffect } from "react";
import { Button, Loading } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ScheduledEmail {
  _id: string;
  campaignId: string;
  companyName: string;
  contactName: string;
  emailNumber: number;
  subject: string;
  scheduledDate: string;
  status: string;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const fetchScheduledEmails = async () => {
    try {
      setLoading(true);

      // Get start and end dates for the current view
      const startDate = new Date(currentDate);
      startDate.setDate(1); // Start of month
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // End of month

      const response = await fetch(`/api/emails/scheduled?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      const data = await response.json();

      if (data.emails) {
        setScheduledEmails(data.emails);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledEmails();
  }, [currentDate]);

  const getEmailsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return scheduledEmails.filter(email =>
      new Date(email.scheduledDate).toDateString() === dateStr
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Email Calendar</h1>
                <p className="text-gray-600">View and manage scheduled email campaigns</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setViewMode('day')}>
                  Day
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('week')}>
                  Week
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('month')}>
                  Month
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Controls */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => navigateMonth('prev')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatMonthYear(currentDate)}
                </h2>
                <Button variant="outline" onClick={() => navigateMonth('next')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" onClick={fetchScheduledEmails}>
                  Refresh
                </Button>
                <Link href="/campaigns/new">
                  <Button>
                    Schedule Email
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : (
              <>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 p-4 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Body */}
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="bg-white min-h-32"></div>;
                    }

                    const emailsForDay = getEmailsForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                      <div key={index} className="bg-white min-h-32 p-2">
                        <div className={`text-sm font-medium mb-2 ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {day.getDate()}
                        </div>

                        <div className="space-y-1">
                          {emailsForDay.slice(0, 3).map(email => (
                            <div
                              key={email._id}
                              className={`text-xs p-1 rounded truncate ${getStatusColor(email.status)}`}
                              title={`${email.companyName} - Email ${email.emailNumber}: ${email.subject}`}
                            >
                              <div className="font-medium">{email.companyName}</div>
                              <div>Email {email.emailNumber}</div>
                            </div>
                          ))}
                          {emailsForDay.length > 3 && (
                            <div className="text-xs text-gray-500 p-1">
                              +{emailsForDay.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Legend</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-blue-100 mr-2"></div>
                <span className="text-sm text-gray-600">Scheduled</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-yellow-100 mr-2"></div>
                <span className="text-sm text-gray-600">Pending Approval</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-green-100 mr-2"></div>
                <span className="text-sm text-gray-600">Approved</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-gray-100 mr-2"></div>
                <span className="text-sm text-gray-600">Sent</span>
              </div>
            </div>
          </div>

          {/* Upcoming Emails */}
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Emails</h3>
            </div>
            <div className="p-6">
              {scheduledEmails.filter(email => new Date(email.scheduledDate) >= new Date()).length > 0 ? (
                <div className="space-y-4">
                  {scheduledEmails
                    .filter(email => new Date(email.scheduledDate) >= new Date())
                    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                    .slice(0, 5)
                    .map(email => (
                      <div key={email._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {email.companyName} - Email {email.emailNumber}
                          </div>
                          <div className="text-sm text-gray-500">{email.subject}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(email.scheduledDate).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(email.status)}`}>
                            {email.status.replace('_', ' ')}
                          </span>
                          <Link href={`/campaigns/${email.campaignId}`}>
                            <Button size="sm" variant="outline">
                              View Campaign
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No upcoming emails scheduled.</p>
                  <Link href="/campaigns/new" className="mt-4 inline-block">
                    <Button>Schedule Your First Email</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}