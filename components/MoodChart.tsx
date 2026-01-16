"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MoodData {
  date: string;
  moodScore: number;
  moodLabel: string;
}

const MOOD_HISTORY_QUERY = `
  query GetCurrentUserMoodHistory {
    getCurrentUserMoodHistory {
      id
      moodLabel
      moodScore
      moodCategory
      createdAt
    }
  }
`;

export default function MoodChart() {
  const [chartData, setChartData] = useState<MoodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMoodRecords = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: MOOD_HISTORY_QUERY,
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message || "Failed to fetch mood records");
        }

        const data = result.data.getCurrentUserMoodHistory;
        
        // Transform data for chart
        const transformed = data.map((record: any) => ({
          date: new Date(record.createdAt).toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric" 
          }),
          moodScore: record.moodScore || 0,
          moodLabel: record.moodLabel,
          fullDate: new Date(record.createdAt).getTime()
        }));

        // Sort by date
        transformed.sort((a: any, b: any) => a.fullDate - b.fullDate);
        
        // Remove fullDate and keep last 30 records
        const final = transformed.slice(-30).map(({ fullDate, ...rest }: any) => rest);
        setChartData(final);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load mood data");
      } finally {
        setLoading(false);
      }
    };

    fetchMoodRecords();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mood Trends</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mood Trends</h2>
        <p className="text-red-600">Error loading mood data: {error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mood Trends</h2>
        <p className="text-gray-600">No mood records yet. Create journal entries to track your mood!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Mood Trends</h2>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              domain={[0, 10]}
              label={{ value: "Mood Score", angle: -90, position: "insideLeft" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "8px"
              }}
              formatter={(value: any) => [value.toFixed(1), "Mood Score"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="moodScore" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 5 }}
              activeDot={{ r: 7 }}
              isAnimationActive={true}
              name="Mood Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Displaying last {chartData.length} mood records
      </p>
    </div>
  );
}
