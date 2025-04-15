
import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ForecastData {
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  recommendations: string[];
  riskFactors: string[];
  categoryForecasts: Record<string, number>;
}

export function PropertyForecast({ propertyId }: { propertyId: number }) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      const response = await fetch(`/api/properties/${propertyId}/forecast`);
      const data = await response.json();
      setForecast(data);
      setLoading(false);
    }
    fetchForecast();
  }, [propertyId]);

  if (loading) return <div>Loading forecast...</div>;
  if (!forecast) return null;

  const chartData = [
    { name: 'Projected', income: forecast.monthlyIncome, expenses: forecast.monthlyExpenses }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-4">Financial Forecast</h3>
        
        <div className="mb-4">
          <LineChart width={400} height={200} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#4CAF50" />
            <Line type="monotone" dataKey="expenses" stroke="#f44336" />
          </LineChart>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="font-medium">Monthly Income</p>
            <p className="text-2xl">${forecast.monthlyIncome}</p>
          </div>
          <div>
            <p className="font-medium">Monthly Expenses</p>
            <p className="text-2xl">${forecast.monthlyExpenses}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Recommendations</h4>
          <ul className="list-disc pl-4">
            {forecast.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>

          <h4 className="font-medium mt-4">Risk Factors</h4>
          <ul className="list-disc pl-4">
            {forecast.riskFactors.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>

          <h4 className="font-medium mt-4">Missing Expense Categories</h4>
          <div className="bg-yellow-50 p-3 rounded-md">
            {forecast.missingExpenses?.length > 0 ? (
              <ul className="list-disc pl-4">
                {forecast.missingExpenses.map((expense, i) => (
                  <li key={i} className="text-yellow-800">{expense}</li>
                ))}
              </ul>
            ) : (
              <p className="text-green-700">All expected expense categories are tracked</p>
            )}
          </div>

          <h4 className="font-medium mt-4">Profitability Recommendations</h4>
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="mb-2">
              <span className="font-medium">Target Monthly Revenue: </span>
              <span className="text-green-700">${forecast.targetRevenue}</span>
            </div>
            <div className="mb-2">
              <span className="font-medium">Recommended Cost Reductions: </span>
              <span className="text-red-700">${forecast.recommendedCostReductions}</span>
            </div>
            <ul className="list-disc pl-4 mt-2">
              {forecast.profitabilityRecommendations?.map((rec, i) => (
                <li key={i} className="text-blue-800">{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
