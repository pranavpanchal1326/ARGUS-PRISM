import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Customized 
} from 'recharts';
import ThresholdAnnotations from './ThresholdAnnotations';

const CustomSignalDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload.signal_fired) return null;
  return (
    <rect
      x={cx - 3}
      y={cy - 3}
      width={6}
      height={6}
      fill="var(--void)"
      stroke="var(--phosphor)"
      strokeWidth={1}
    />
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'var(--void)',
        border: '1px solid var(--instrument-dark)',
        padding: '12px',
        fontFamily: 'var(--font-data)',
        fontSize: '11px',
        color: 'var(--instrument-white)'
      }}>
        <p className="font-ui" style={{ 
          color: 'var(--instrument-grey)', 
          fontSize: '9px', 
          marginBottom: '4px' 
        }}>
          HOUR {String(label).padStart(2, '0')}
        </p>
        <p style={{ color: 'var(--phosphor)', marginBottom: data.signal_fired ? '8px' : '0' }}>
          WARMTHSCORE · {payload[0].value.toFixed(1)}
        </p>
        {data.signal_fired && (
          <div style={{ borderTop: '1px solid var(--instrument-dark)', paddingTop: '8px' }}>
            <p className="font-ui" style={{ color: 'var(--phosphor)', fontSize: '9px' }}>
              S{data.signal_number} · {data.signal_fired}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--instrument-grey)', marginTop: '2px' }}>
              {data.event_detail}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const WarmthChart = ({ data, isReplaying, onChartReady }) => {
  const [lineKey, setLineKey] = useState(0);
  const [hoverData, setHoverData] = useState(null);

  useEffect(() => {
    if (isReplaying) {
      setLineKey(prev => prev + 1);
    }
  }, [isReplaying]);

  const handleMouseMove = (state) => {
    if (state && state.activePayload) {
      setHoverData({
        x: state.activeLabel,
        y: state.activePayload[0].value,
        pixelX: state.chartX,
        pixelY: state.chartY
      });
    } else {
      setHoverData(null);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={360}>
        <AreaChart 
          data={data} 
          margin={{ top: 24, right: 120, bottom: 48, left: 48 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
        >
          <defs>
            <linearGradient id="warmthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--phosphor)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--phosphor)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid 
            stroke="var(--instrument-ghost)" 
            strokeWidth={1} 
            horizontal={true} 
            vertical={true} 
            strokeDasharray="none" 
          />

          <XAxis 
            dataKey="hour" 
            type="number" 
            domain={[0, 72]} 
            tickCount={13}
            tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#7A7868' }}
            axisLine={{ stroke: '#3A3A30' }}
            tickLine={{ stroke: '#3A3A30' }}
            label={{ 
              value: 'HOURS SINCE ACCOUNT CREATION', 
              position: 'bottom', 
              offset: 20,
              fontFamily: 'Inter', 
              fontSize: 9, 
              fill: '#7A7868',
              textTransform: 'uppercase', 
              letterSpacing: '0.08em' 
            }}
          />

          <YAxis 
            domain={[0, 100]} 
            ticks={[0, 25, 40, 60, 75, 85, 100]}
            tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#7A7868' }}
            axisLine={{ stroke: '#3A3A30' }}
            tickLine={{ stroke: '#3A3A30' }}
            label={{ 
              value: 'WARMTHSCORE', 
              angle: -90, 
              position: 'left',
              offset: 10,
              fontFamily: 'Inter', 
              fontSize: 9, 
              fill: '#7A7868',
              textTransform: 'uppercase', 
              letterSpacing: '0.08em' 
            }}
          />

          <Tooltip content={<CustomTooltip />} cursor={false} />

          <ReferenceLine 
            y={75} 
            stroke="var(--instrument-white)" 
            strokeDasharray="4 2" 
            content={<ThresholdAnnotations value={75} />} 
          />
          <ReferenceLine 
            y={85} 
            stroke="var(--phosphor)" 
            strokeDasharray="4 2" 
            content={<ThresholdAnnotations value={85} />} 
          />

          <Area
            key={lineKey}
            type="monotone"
            dataKey="score"
            stroke="var(--phosphor)"
            strokeWidth={1.5}
            fill="url(#warmthGradient)"
            fillOpacity={1}
            dot={<CustomSignalDot />}
            activeDot={{ r: 3, fill: 'var(--phosphor)', stroke: 'var(--void)', strokeWidth: 1 }}
            animationDuration={2000}
            animationEasing="ease-out"
          />

          <Customized component={(props) => {
            const { viewBox } = props;
            if (viewBox && onChartReady) {
              setTimeout(() => onChartReady(viewBox), 0);
            }
            return null;
          }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Deep Enhancement: Interactive Crosshairs */}
      {hoverData && (
        <div className="chart-crosshair-overlay">
          <div 
            className="crosshair-v" 
            style={{ left: `${hoverData.pixelX}px` }} 
          />
          <div 
            className="crosshair-h" 
            style={{ top: `${hoverData.pixelY}px` }} 
          />
          <div 
            className="crosshair-readout font-data phosphor-text"
            style={{ left: `${hoverData.pixelX + 8}px`, top: `${hoverData.pixelY - 24}px` }}
          >
            H:{hoverData.x.toFixed(0)} S:{hoverData.y.toFixed(1)}
          </div>
        </div>
      )}

      {/* Replay Scanline */}
      {isReplaying && (
        <div className="replay-scanline" />
      )}

      <style jsx="true">{`
        .chart-crosshair-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 50;
        }

        .crosshair-v {
          position: absolute;
          top: 24px;
          bottom: 72px; /* Axis height */
          width: 1px;
          background-color: rgba(184, 255, 107, 0.2);
        }

        .crosshair-h {
          position: absolute;
          left: 48px;
          right: 120px; /* Reference line space */
          height: 1px;
          background-color: rgba(184, 255, 107, 0.2);
        }

        .crosshair-readout {
          position: absolute;
          font-size: 9px;
          background-color: var(--void);
          padding: 2px 4px;
          border: 1px solid var(--phosphor);
          white-space: nowrap;
        }

        .replay-scanline {
          position: absolute;
          top: 24px;
          bottom: 72px;
          width: 2px;
          background-color: var(--phosphor);
          box-shadow: 0 0 12px var(--phosphor);
          animation: scanChart 2000ms ease-out forwards;
          z-index: 40;
        }

        @keyframes scanChart {
          from { left: 48px; opacity: 1; }
          to { left: calc(100% - 120px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WarmthChart;
