// Full component code here...
'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '../src/lib/utils';
import { Chart } from 'chart.js';

interface AnalyticsChartsProps {
  data: {
    bar: number[];
    line: number[];
    pie: number[];
  };
  onDataPointHover?: (dataPoint: any) => void;
}

const AnalyticsCharts = React.forwardRef<HTMLDivElement, AnalyticsChartsProps>(({ data, onDataPointHover }, ref) => {
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (barChartRef.current) {
      new Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: data.bar.map((_, index) => `Label ${index + 1}`),
          datasets: [{
            label: 'Bar Dataset',
            data: data.bar,
            backgroundColor: '#7c3aed',
            hoverBackgroundColor: '#9f7aea',
          }],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (onDataPointHover) onDataPointHover(context.raw);
                  return `Value: ${context.raw}`;
                }
              }
            }
          }
        }
      });
    }

    if (lineChartRef.current) {
      new Chart(lineChartRef.current, {
        type: 'line',
        data: {
          labels: data.line.map((_, index) => `Label ${index + 1}`),
          datasets: [{
            label: 'Line Dataset',
            data: data.line,
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124, 58, 237, 0.2)',
            hoverBorderColor: '#9f7aea',
          }],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (onDataPointHover) onDataPointHover(context.raw);
                  return `Value: ${context.raw}`;
                }
              }
            }
          }
        }
      });
    }

    if (pieChartRef.current) {
      new Chart(pieChartRef.current, {
        type: 'pie',
        data: {
          labels: data.pie.map((_, index) => `Label ${index + 1}`),
          datasets: [{
            label: 'Pie Dataset',
            data: data.pie,
            backgroundColor: ['#7c3aed', '#9f7aea', '#c4b5fd'],
            hoverBackgroundColor: ['#9f7aea', '#c4b5fd', '#d8b4fe'],
          }],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (onDataPointHover) onDataPointHover(context.raw);
                  return `Value: ${context.raw}`;
                }
              }
            }
          }
        }
      });
    }
  }, [data, onDataPointHover]);

  return (
    <div
      ref={ref}
      className={cn(
        'bg-[#0a0a0a] text-white font-sans p-6 rounded-lg shadow-[0_0_30px_rgba(124,58,237,0.2)]',
        'bg-white/[0.03] backdrop-blur-xl'
      )}
    >
      <h2 className="text-4xl mb-4">Act Now to Transform Your Analytics!</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-lg shadow-md hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200">
          <canvas ref={barChartRef} aria-label="Bar Chart" role="img"></canvas>
        </div>
        <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-lg shadow-md hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200">
          <canvas ref={lineChartRef} aria-label="Line Chart" role="img"></canvas>
        </div>
        <div className="p-4 bg-white/[0.03] backdrop-blur-xl rounded-lg shadow-md hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-200">
          <canvas ref={pieChartRef} aria-label="Pie Chart" role="img"></canvas>
        </div>
      </div>
    </div>
  );
});

AnalyticsCharts.displayName = 'AnalyticsCharts';

export { AnalyticsCharts };
export type { AnalyticsChartsProps };