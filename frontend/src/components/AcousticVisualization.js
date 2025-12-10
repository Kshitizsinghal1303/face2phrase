import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BarChart3, TrendingUp, Volume2, Zap, Download } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AcousticVisualization = ({ data, questionIndex }) => {
  const [activeFeature, setActiveFeature] = useState('pitch');
  const [showSummary, setShowSummary] = useState(true);

  if (!data || !data.features) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: '#666',
        textAlign: 'center'
      }}>
        <BarChart3 size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p style={{ fontSize: '16px', margin: 0 }}>
          No acoustic data available
        </p>
      </div>
    );
  }

  const { features, summary } = data;

  const getChartData = () => {
    switch (activeFeature) {
      case 'pitch':
        if (!features.pitch || !features.pitch.values) return null;
        return {
          labels: features.pitch.time?.map((t, i) => i % 10 === 0 ? `${t.toFixed(1)}s` : '') || [],
          datasets: [{
            label: 'Pitch (Hz)',
            data: features.pitch.values.map(v => v > 0 ? v : null),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
          }]
        };

      case 'energy':
        if (!features.energy || !features.energy.rms) return null;
        return {
          labels: features.energy.time?.map((t, i) => i % 10 === 0 ? `${t.toFixed(1)}s` : '') || [],
          datasets: [{
            label: 'RMS Energy',
            data: features.energy.rms,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4
          }]
        };

      case 'spectral':
        if (!features.spectral) return null;
        return {
          labels: features.spectral.time?.map((t, i) => i % 10 === 0 ? `${t.toFixed(1)}s` : '') || [],
          datasets: [
            {
              label: 'Spectral Centroid (Hz)',
              data: features.spectral.centroid,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4
            },
            {
              label: 'Zero Crossing Rate',
              data: features.spectral.zcr?.map(v => v * 1000) || [], // Scale for visibility
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: false,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              yAxisID: 'y1'
            }
          ]
        };

      case 'waveform':
        if (!features.time_series) return null;
        return {
          labels: features.time_series.time?.map((t, i) => i % 50 === 0 ? `${t.toFixed(2)}s` : '') || [],
          datasets: [{
            label: 'Amplitude',
            data: features.time_series.amplitude,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 2
          }]
        };

      default:
        return null;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#667eea',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel()
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      ...(activeFeature === 'spectral' && {
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'ZCR (×1000)'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      })
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  function getYAxisLabel() {
    switch (activeFeature) {
      case 'pitch': return 'Frequency (Hz)';
      case 'energy': return 'RMS Energy';
      case 'spectral': return 'Frequency (Hz)';
      case 'waveform': return 'Amplitude';
      default: return 'Value';
    }
  }

  const features_tabs = [
    { id: 'pitch', name: 'Pitch', icon: TrendingUp, color: '#667eea' },
    { id: 'energy', name: 'Energy', icon: Zap, color: '#10b981' },
    { id: 'spectral', name: 'Spectral', icon: BarChart3, color: '#f59e0b' },
    { id: 'waveform', name: 'Waveform', icon: Volume2, color: '#8b5cf6' }
  ];

  const chartData = getChartData();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Feature Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {features_tabs.map((feature) => {
          const Icon = feature.icon;
          const isActive = activeFeature === feature.id;
          
          return (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              style={{
                padding: '8px 16px',
                border: `2px solid ${isActive ? feature.color : '#e2e8f0'}`,
                background: isActive ? feature.color : 'white',
                color: isActive ? 'white' : feature.color,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={16} />
              {feature.name}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{
        flex: 1,
        minHeight: '300px',
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        {chartData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#666'
          }}>
            <p>No data available for {activeFeature}</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {showSummary && summary && (
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: 0 }}>
              Analysis Summary
            </h4>
            <button
              onClick={() => setShowSummary(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Hide
            </button>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {summary.pitch_stats && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                  {summary.pitch_stats.mean_pitch?.toFixed(1) || 'N/A'}Hz
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Pitch</div>
              </div>
            )}
            
            {summary.energy_stats && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                  {summary.energy_stats.mean_energy?.toFixed(3) || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Avg Energy</div>
              </div>
            )}
            
            {summary.duration && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {summary.duration.toFixed(1)}s
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Duration</div>
              </div>
            )}
            
            {summary.voice_quality && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {summary.voice_quality.pitch_stability || 'N/A'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Pitch Stability</div>
              </div>
            )}
          </div>
        </div>
      )}

      {!showSummary && (
        <button
          onClick={() => setShowSummary(true)}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Show Summary
        </button>
      )}
    </div>
  );
};

export default AcousticVisualization;