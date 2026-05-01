'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  costSavings: number;
  byProvider: Record<string, number>;
  byAction: Record<string, number>;
  dailyCost: Record<string, number>;
  recentCalls: Array<{
    id: string;
    action: string;
    provider: string;
    model: string;
    tokens: number;
    cost: string;
    ms: number;
    date: string;
  }>;
  documentStats: Record<string, number>;
}

export default function AIAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorDesc, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(JSON.stringify(result));
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError(String(error));
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to reset stats:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (errorDesc) {
    return <div className="p-8 text-red-500">Failed to load: {errorDesc}</div>;
  }

  if (!analytics) {
    return <div className="p-8">No analytics data available</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Multi-Provider AI Performance & Cost Tracking</p>
        </div>
        <Button onClick={resetStats} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
            <CardDescription>All AI API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics.totalCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Tokens</CardTitle>
            <CardDescription>Consumed tokens</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold">{analytics.totalTokens.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
            <CardDescription>Estimated spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${analytics.totalCost.toFixed(3)}</div>
            <p className="text-sm text-green-600 mt-2">
              💰 Saved approx ${analytics.costSavings.toFixed(3)} 
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Usage (Tokens)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(analytics.byProvider || {}).map(([provider, tokens]) => (
                <div key={provider} className="flex justify-between items-center">
                    <span className="capitalize">{provider}</span>
                    <span className="font-semibold">{tokens.toLocaleString()}</span>
                </div>
            ))}
            {Object.keys(analytics.byProvider || {}).length === 0 && <span className="text-gray-500">No data available yet</span>}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent AI API Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {analytics.recentCalls?.slice(0, 10).map((call, i) => (
                <div key={i} className="flex justify-between text-sm border-b pb-2">
                    <div>
                        <span className="font-semibold capitalize">{call.provider}</span> ({call.model})
                    </div>
                    <div>
                        {call.tokens} tokens - {call.cost}
                    </div>
                </div>
             ))}
             {(!analytics.recentCalls || analytics.recentCalls.length === 0) && <span className="text-gray-500">No data available yet</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AnalyticsData {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  costSavings: number;
  byProvider: Record<string, number>;
  byAction: Record<string, number>;
  dailyCost: Record<string, number>;
  recentCalls: Array<{
    id: string;
    action: string;
    provider: string;
    model: string;
    tokens: number;
    cost: string;
    ms: number;
    date: string;
  }>;
  documentStats: Record<string, number>;
}

export default function AIAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to reset stats:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-8">No analytics data available</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Multi-Provider AI Performance & Cost Tracking</p>
        </div>
        <Button onClick={resetStats} variant="outline">
          Reset Statistics
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
            <CardDescription>All AI API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics.total.requests}</div>
            <p className="text-sm text-gray-500 mt-2">
              OpenAI: {analytics.openai.requests} | Claude: {analytics.anthropic.requests}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Cost</CardTitle>
            <CardDescription>Estimated spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${analytics.total.cost.toFixed(2)}</div>
            <p className="text-sm text-green-600 mt-2">
              💰 {analytics.insights.costSavings}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Efficiency Score</CardTitle>
            <CardDescription>Request/cost ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{analytics.insights.efficiency}%</div>
            <Badge className="mt-2" variant="secondary">
              {analytics.insights.recommendedProvider}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>OpenAI (GPT-4o)</CardTitle>
            <CardDescription>Fast, balanced, cost-effective</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Requests</span>
                  <span className="font-semibold">{analytics.openai.requests}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(analytics.openai.requests / analytics.total.requests) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Tokens</span>
                  <span className="font-semibold">{analytics.openai.tokens.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Cost</span>
                  <span className="font-semibold">${analytics.openai.cost.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.breakdown.openaiPercentage.toFixed(1)}% of total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anthropic (Claude)</CardTitle>
            <CardDescription>Superior document understanding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Requests</span>
                  <span className="font-semibold">{analytics.anthropic.requests}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${(analytics.anthropic.requests / analytics.total.requests) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Tokens</span>
                  <span className="font-semibold">{analytics.anthropic.tokens.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Cost</span>
                  <span className="font-semibold">${analytics.anthropic.cost.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.breakdown.anthropicPercentage.toFixed(1)}% of total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Smart Routing Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              ✅ <strong>Cost Optimization:</strong> {analytics.insights.costSavings}
            </p>
            <p className="text-sm">
              🚀 <strong>Recommended Provider:</strong> {analytics.insights.recommendedProvider}
            </p>
            <p className="text-sm">
              📊 <strong>Provider Split:</strong> {analytics.breakdown.openaiPercentage.toFixed(0)}% OpenAI,{' '}
              {analytics.breakdown.anthropicPercentage.toFixed(0)}% Claude
            </p>
            <p className="text-sm text-gray-600 mt-4">
              The system automatically routes requests to the optimal AI provider based on document
              complexity, task type, and cost considerations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
