import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { Paper, Typography, Box, FormControlLabel, Switch, useMediaQuery } from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import "../style/assets.css";
import "../style/modern.css";

// Custom theme to match the color scheme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#1d4ed8',
    },
  },
});

// Maximum number of points to display at once
const MAX_DISPLAY_POINTS = 15;

const LossGraph = ({ lossData }) => {
  // State to control whether to show all points or just the most recent ones
  const [showAllPoints, setShowAllPoints] = React.useState(true); // Default to true
  const isSmallScreen = useMediaQuery('(max-width:600px)');
  
  // Process data to limit the number of points if needed
  const processedData = useMemo(() => {
    if (!lossData || lossData.length === 0) return [];
    
    let dataToUse = lossData;
    
    // If we have more than MAX_DISPLAY_POINTS and not showing all
    if (!showAllPoints && lossData.length > MAX_DISPLAY_POINTS) {
      // Only take the most recent points
      dataToUse = lossData.slice(lossData.length - MAX_DISPLAY_POINTS);
    } 
    // If showing all but we have a very large dataset, sample it
    else if (showAllPoints && lossData.length > 100) {
      // Sample the data to avoid overloading the chart
      const samplingRate = Math.ceil(lossData.length / 100);
      dataToUse = lossData.filter((_, index) => index % samplingRate === 0);
      // Always include the most recent 5 points for accuracy
      const recentPoints = lossData.slice(Math.max(0, lossData.length - 5));
      // Combine sampled points with recent points, avoiding duplicates
      const recentIndices = recentPoints.map(point => lossData.indexOf(point));
      dataToUse = [
        ...dataToUse.filter((_, index) => !recentIndices.includes(lossData.indexOf(dataToUse[index]))),
        ...recentPoints
      ];
    }
    
    return dataToUse;
  }, [lossData, showAllPoints]);
  
  // Generate simplified time labels (e.g., "0s", "10s", "20s" instead of full timestamps)
  const epochLabels = useMemo(() => {
    if (!processedData.length) return [];
    
    // For shorter datasets, use the last part of the timestamp (e.g., ":45" from "12:30:45")
    if (processedData.length < 20) {
      return processedData.map((d, i) => {
        const epochLabels = d.current_epoch;
        return epochLabels;
      });
    }
    
    // For larger datasets, use point numbers
    return processedData.map((_, i) => `#${i+1}`);
  }, [processedData]);

  const customOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 20,
        top: 20,
        bottom: 10
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          },
          boxWidth: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1e293b',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        titleFont: {
          size: 16,
          weight: 'bold'
        },
        bodyFont: {
          size: 14
        },
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          title: function(context) {
            // Show the actual time in the tooltip
            const dataIndex = context[0].dataIndex;
            return `Time: ${processedData[dataIndex]?.time || ''}`;
          },
          label: function(context) {
            return `Loss: ${context.raw.toFixed(6)}`;
          }
        }
      }
    },
    scales: {
      x: { 
        title: { 
          display: true, 
          text: "Epochs",
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: isSmallScreen ? 10 : 12
          },
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: isSmallScreen ? 5 : 10,
          autoSkip: true,
          callback: function(value, index) {
            // Only show a subset of labels to prevent overcrowding
            if (processedData.length <= 10 || index % Math.ceil(processedData.length / 10) === 0) {
              return epochLabels[index];
            }
            return '';
          }
        }
      },
      y: { 
        title: { 
          display: true, 
          text: "Loss",
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 12
          },
          callback: function(value) {
            return value.toFixed(4);
          }
        }
      }
    },
    animation: {
      duration: 300, // Even faster animation
      easing: 'easeOutQuart'
    }
  };

  const chartData = useMemo(() => ({
    // Use simple labels for x-axis to save space
    labels: epochLabels,
    datasets: [
      {
        label: "Training Loss",
        data: processedData.map((d) => d.loss),
        borderColor: "var(--primary-color)", // Blue to match theme
        backgroundColor: "rgba(98, 0, 238, 0.1)",
        borderWidth: 3,
        pointRadius: Math.min(4, Math.max(2, 8 - Math.floor(processedData.length / 10))), // Smaller points for more data
        pointBackgroundColor: "var(--primary-color)",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "var(--primary-color)",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 2,
        fill: true,
        tension: 0.3,
      },
    ],
  }), [processedData, epochLabels]);

  return (
    <ThemeProvider theme={theme}>
      <div>
        <div className="modern-card-header">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <Typography className="modern-card-title">Real-Time Loss Graph</Typography>
              <Typography className="modern-card-subtitle">
                Monitor your model's training progress
              </Typography>
            </div>
            
            {lossData.length > MAX_DISPLAY_POINTS && (
              <FormControlLabel
                control={
                  <Switch 
                    checked={showAllPoints}
                    onChange={(e) => setShowAllPoints(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: 'var(--primary-color)',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'var(--primary-color)',
                      },
                    }}
                    size={isSmallScreen ? "small" : "medium"}
                  />
                }
                label={
                  <Typography className={isSmallScreen ? "modern-text-sm" : "modern-text"}>
                    {showAllPoints ? "All points" : `Last ${MAX_DISPLAY_POINTS}`}
                  </Typography>
                }
              />
            )}
          </Box>
        </div>
        
        {!lossData || lossData.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 4,
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            minHeight: '300px'
          }}>
            <InfoIcon sx={{ marginRight: 1, color: 'var(--text-muted)' }} />
            <Typography className="modern-text modern-text-muted">
              Loss data will appear here during fine-tuning
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            height: '400px', 
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <Line data={chartData} options={customOptions} redraw />
            
            <Typography className="modern-text-sm modern-text-muted text-center mt-sm">
              {processedData.length < lossData.length ? 
                `Displaying ${processedData.length} of ${lossData.length} total data points` : 
                `Total data points: ${lossData.length}`}
            </Typography>
          </Box>
        )}
      </div>
    </ThemeProvider>
  );
};

export default LossGraph;
