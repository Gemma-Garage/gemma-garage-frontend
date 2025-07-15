import React from "react";
import { 
  TextField, 
  Box, 
  Typography, 
  Paper,
  FormControl,
  FormLabel,
  Slider,
  InputAdornment,
  MenuItem,
  Select as MuiSelect
} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Select from "react-select";
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

// Custom styles for react-select
const selectStyles = {
  control: (provided) => ({
    ...provided,
    borderRadius: "8px",
    borderColor: "var(--border-color)",
    boxShadow: "none",
    "&:hover": {
      borderColor: "var(--primary-color)"
    },
    padding: "4px",
    minHeight: "48px",
    fontSize: "1rem"
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? "var(--primary-color)" : state.isFocused ? "var(--bg-tertiary)" : null,
    color: state.isSelected ? "white" : "var(--text-primary)",
    "&:hover": {
      backgroundColor: state.isSelected ? "var(--primary-color)" : "var(--bg-tertiary)"
    }
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "8px",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--border-color)"
  })
};

const modelOptions = [
  {value:"google/gemma-3-1b-pt", label:"google/gemma-3-1b-pt"},
  {value:"google/gemma-3-1b-it", label:"google/gemma-3-1b-it"},
  {value:"google/gemma-3-4b-pt", label:"google/gemma-3-4b-pt"},
  {value:"google/gemma-3-4b-it", label:"google/gemma-3-4b-it"},
  { value: "google/gemma-2b", label: "google/gemma-2b" },
  //{ value: "princeton-nlp/Sheared-LLaMA-1.3B", label: "princeton-nlp/Sheared-LLaMA-1.3B" },
    { value: "google/gemma-3n-E2B-it", label: "google/gemma-3n-E2B-it" },
  { value: "google/gemma-3n-E4B-it", label: "google/gemma-3n-E4B-it" },
  { value: "google/gemma-3n-E2B", label: "google/gemma-3n-E2B" },
  { value: "google/gemma-3n-E4B", label: "google/gemma-3n-E4B" },
];

// LoRA rank options
const loraRankOptions = [
  { value: 4, label: "4 (Default - Lower memory usage)" },
  { value: 8, label: "8" },
  { value: 16, label: "16" },
  { value: 32, label: "32 (Higher quality, more memory)" }
];

const TrainingParameters = ({
  modelName,
  epochs,
  learningRate,
  loraRank,
  onModelNameChange, // Changed from setModelName
  onEpochsChange,    // Changed from setEpochs
  onLearningRateChange, // Changed from setLearningRate
  onLoraRankChange,  // Changed from setLoraRank
  disabled
}) => {
  // Find the selected option from the modelOptions array
  const selectedOption = modelOptions.find(option => option.value === modelName);
  
  // Find the selected LoRA rank option
  const selectedLoraRankOption = loraRankOptions.find(option => option.value === loraRank);

  const handleLearningRateTextChange = (event) => {
    // Parse to float, or keep as is if App.js handles it robustly
    // For consistency and safety, parsing here is good.
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      onLearningRateChange(value);
    } else if (event.target.value === "") {
      // Allow clearing the field, App.js might have a default or handle empty string
      onLearningRateChange(event.target.value); 
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="modern-card-header">
        <Typography className="modern-card-title">Training Parameters</Typography>
        <Typography className="modern-card-subtitle">
          Configure your model and training settings for optimal performance
        </Typography>
      </div>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div className="modern-form-group">
          <label className="modern-form-label">
            Model Name
          </label>
          <Select
            inputId="model-select"
            value={selectedOption}
            onChange={(option) => onModelNameChange(option.value)} // Changed to onModelNameChange
            options={modelOptions}
            styles={selectStyles}
            isClearable={false}
            isSearchable={true}
            isDisabled={disabled}
          />
        </div>

        <div className="modern-form-group">
          <label className="modern-form-label">
            LoRA Rank (Parameter Efficiency)
          </label>
          <Select
            inputId="lora-rank-select"
            value={selectedLoraRankOption}
            onChange={(option) => onLoraRankChange(option.value)} // Changed to onLoraRankChange
            options={loraRankOptions}
            styles={selectStyles}
            isClearable={false}
            isSearchable={false}
            isDisabled={disabled}
          />
          <Typography className="modern-text-sm modern-text-muted mt-sm">
            Lower rank = faster training but less expressive. Higher rank = better quality but more memory.
          </Typography>
        </div>

        <div className="modern-form-group">
          <label className="modern-form-label">
            Epochs
          </label>
          <input
            className="modern-input"
            type="number"
            value={epochs}
            onChange={(e) => {
              // Pass the raw string value. This allows the field to be empty.
              // App.js will handle parsing and defaulting when the value is used.
              onEpochsChange(e.target.value);
            }}
            min="1"
            disabled={disabled}
          />
        </div>

        <div className="modern-form-group">
          <label className="modern-form-label">
            Learning Rate: {learningRate}
          </label>
          <input
            className="modern-input"
            type="number"
            step="0.0001"
            value={learningRate}
            onChange={handleLearningRateTextChange} // Changed to use new handler
            min="0.0001"
            max="0.1"
            disabled={disabled}
          />
          <Slider 
            value={parseFloat(learningRate) || 0} // Ensure value is a number for slider
            min={0.0001}
            max={0.01}
            step={0.0001}
            onChange={(_, value) => onLearningRateChange(value)} // Changed to onLearningRateChange
            sx={{ 
              mt: 2,
              color: 'var(--primary-color)',
              '& .MuiSlider-thumb': {
                backgroundColor: 'var(--primary-color)',
              },
              '& .MuiSlider-track': {
                backgroundColor: 'var(--primary-color)',
              },
              '& .MuiSlider-rail': {
                backgroundColor: 'var(--border-color)',
              }
            }}
            disabled={disabled}
          />
        </div>
      </Box>
    </ThemeProvider>
  );
};

export default TrainingParameters;
