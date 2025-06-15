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

// Custom theme to match the color scheme
const theme = createTheme({
  palette: {
    primary: {
      main: '#6200ee',
    },
    secondary: {
      main: '#3700b3',
    },
  },
});

// Custom styles for react-select
const selectStyles = {
  control: (provided) => ({
    ...provided,
    borderRadius: "4px",
    borderColor: "#ccc",
    boxShadow: "none",
    "&:hover": {
      borderColor: "#6200ee"
    },
    padding: "2px",
    minHeight: "56px"
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#6200ee" : state.isFocused ? "#f0e6ff" : null,
    color: state.isSelected ? "white" : "#333",
    "&:hover": {
      backgroundColor: state.isSelected ? "#6200ee" : "#f0e6ff"
    }
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "4px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
  })
};

const modelOptions = [
  {value:"google/gemma-3-1b-pt", label:"google/gemma-3-1b-pt"},
  {value:"google/gemma-3-1b-it", label:"google/gemma-3-1b-it"},
  {value:"google/gemma-3-4b-pt", label:"google/gemma-3-4b-pt"},
  {value:"google/gemma-3-4b-it", label:"google/gemma-3-4b-it"},
  { value: "google/gemma-2b", label: "google/gemma-2b" },
  //{ value: "princeton-nlp/Sheared-LLaMA-1.3B", label: "princeton-nlp/Sheared-LLaMA-1.3B" },
  { value: "google/gemma-2-2b-it", label: "google/gemma-2-2b-it" }
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
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 2, backgroundColor: "#f9f9f9", borderRadius: "16px", boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.1)' }}>
      <Typography variant="h5" gutterBottom className="sessionName">
        Set Training Parameters
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <FormControl fullWidth>
          <FormLabel id="model-select-label" sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
            Model Name
          </FormLabel>
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
        </FormControl>

        <FormControl fullWidth>
          <FormLabel id="lora-rank-label" sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
            LoRA Rank (Parameter Efficiency)
          </FormLabel>
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
          <Typography variant="caption" sx={{ mt: 1, color: "text.secondary" }}>
            Lower rank = faster training but less expressive. Higher rank = better quality but more memory.
          </Typography>
        </FormControl>

        <FormControl fullWidth>
          <FormLabel id="epochs-label" sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
            Epochs
          </FormLabel>
          <TextField
            id="epochs-input"
            type="number"
            value={epochs}
            onChange={(e) => {
              // Pass the raw string value. This allows the field to be empty.
              // App.js will handle parsing and defaulting when the value is used.
              onEpochsChange(e.target.value);
            }}
            variant="outlined"
            InputProps={{
              inputProps: { min: 1 } // HTML5 validation hint
            }}
            fullWidth
            disabled={disabled}
          />
        </FormControl>

        <FormControl fullWidth>
          <FormLabel id="learning-rate-label" sx={{ marginBottom: 1, color: "text.primary", fontWeight: "medium" }}>
            Learning Rate: {learningRate}
          </FormLabel>
          <TextField
            id="learning-rate-input"
            type="number"
            step="0.0001"
            value={learningRate}
            onChange={handleLearningRateTextChange} // Changed to use new handler
            variant="outlined"
            InputProps={{
              inputProps: { min: 0.0001, max: 0.1, step: 0.0001 },
              startAdornment: <InputAdornment position="start">λ</InputAdornment>,
            }}
            fullWidth
            disabled={disabled}
          />
          <Slider 
            value={parseFloat(learningRate) || 0} // Ensure value is a number for slider
            min={0.0001}
            max={0.01}
            step={0.0001}
            onChange={(_, value) => onLearningRateChange(value)} // Changed to onLearningRateChange
            sx={{ mt: 2 }}
            disabled={disabled}
          />
        </FormControl>
      </Box>
    </Paper>
  );
};

export default TrainingParameters;
