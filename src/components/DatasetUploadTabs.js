import React, { useState } from "react";
import { 
  Button, 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Link,
  Chip,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DataObjectIcon from "@mui/icons-material/DataObject";
import TableChartIcon from "@mui/icons-material/TableChart";
import DatasetIcon from "@mui/icons-material/Dataset";
import "../style/assets.css";
import "../style/modern.css";

// Styled component for the file input
const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const DatasetUploadTabs = ({ 
  datasetFile, 
  trainableDatasetName, 
  onFileChange, 
  uploadStatus, 
  onUpload,
  onHFDatasetImport 
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [hfDatasetUrl, setHfDatasetUrl] = useState('');
  const [selectedSplit, setSelectedSplit] = useState('train');
  const [hfLoading, setHfLoading] = useState(false);
  const [availableSplits, setAvailableSplits] = useState(['train', 'validation', 'test']);
  
  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file && onFileChange) {
      onFileChange(file);
    }
  };
  
  // Determine file type icon
  const getFileTypeIcon = (fileName) => {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <PictureAsPdfIcon sx={{ color: "#f44336" }} />;
      case 'json':
        return <DataObjectIcon sx={{ color: "#2196f3" }} />;
      case 'csv':
        return <TableChartIcon sx={{ color: "#4caf50" }} />;
      default:
        return null;
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    await onUpload();
    setLoading(false);
  };

  const handleHFDatasetImport = async () => {
    if (!hfDatasetUrl.trim()) {
      alert("Please enter a Hugging Face dataset URL");
      return;
    }

    setHfLoading(true);
    try {
      await onHFDatasetImport(hfDatasetUrl, selectedSplit);
    } catch (error) {
      console.error("Error importing HF dataset:", error);
    } finally {
      setHfLoading(false);
    }
  };

  const displayFileName = datasetFile?.name || (trainableDatasetName ? trainableDatasetName.split('/').pop() : null);
  const displayFileSize = datasetFile?.size;

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div>
      <div className="modern-card-header">
        <Typography className="modern-card-title">Upload Dataset</Typography>
        <Typography className="modern-card-subtitle">
          Upload your training data from a file or import from Hugging Face
        </Typography>
      </div>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: '48px'
            }
          }}
        >
          <Tab 
            icon={<CloudUploadIcon />} 
            label="File Upload" 
            iconPosition="start"
          />
          <Tab 
            icon={<DatasetIcon />} 
            label="Hugging Face Dataset" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* File Upload Tab */}
      {activeTab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
          <Alert severity="info" sx={{ width: "100%", mb: 2 }}>
            <AlertTitle>Supported Formats</AlertTitle>
            Upload your training data in JSON, CSV, PDF, PPT, DOCX, HTML, or TXT format
          </Alert>

          <label 
            className="modern-btn modern-btn-primary"
            style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
          >
            <CloudUploadIcon sx={{ fontSize: 16, mr: 1 }} />
            Select File
            <VisuallyHiddenInput type="file" onChange={handleFileSelect} />
          </label>
          
          {displayFileName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip 
                icon={getFileTypeIcon(displayFileName)} 
                label={displayFileName}
                variant="outlined" 
              />
              {displayFileSize && (
                <Typography variant="caption">
                  {`(${(displayFileSize / 1024).toFixed(2)} KB)`}
                </Typography>
              )}
            </Box>
          )}

          <button
            className={`modern-btn modern-btn-primary ${loading ? 'modern-btn-loading' : ''}`}
            onClick={handleUpload}
            disabled={!datasetFile || loading}
          >
            {loading ? (
              <>
                <CircularProgress size={16} color="inherit" sx={{ marginRight: 1 }} />
                Uploading...
              </>
            ) : (
              "Upload Dataset"
            )}
          </button>
        </Box>
      )}

      {/* Hugging Face Dataset Tab */}
      {activeTab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Alert severity="info" sx={{ width: "100%" }}>
            <AlertTitle>Import from Hugging Face</AlertTitle>
            Enter a Hugging Face dataset URL (e.g., "microsoft/DialoGPT-medium" or "squad") and select a split
          </Alert>

          <TextField
            fullWidth
            label="Hugging Face Dataset URL"
            placeholder="e.g., microsoft/DialoGPT-medium, squad, or custom/dataset-name"
            value={hfDatasetUrl}
            onChange={(e) => setHfDatasetUrl(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Dataset Split</InputLabel>
            <Select
              value={selectedSplit}
              label="Dataset Split"
              onChange={(e) => setSelectedSplit(e.target.value)}
            >
              {availableSplits.map((split) => (
                <MenuItem key={split} value={split}>
                  {split.charAt(0).toUpperCase() + split.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <button
              className={`modern-btn modern-btn-primary ${hfLoading ? 'modern-btn-loading' : ''}`}
              onClick={handleHFDatasetImport}
              disabled={!hfDatasetUrl.trim() || hfLoading}
            >
              {hfLoading ? (
                <>
                  <CircularProgress size={16} color="inherit" sx={{ marginRight: 1 }} />
                  Importing...
                </>
              ) : (
                <>
                  <DatasetIcon sx={{ fontSize: 16, mr: 1 }} />
                  Import Dataset
                </>
              )}
            </button>
          </Box>

          <Alert severity="warning" sx={{ width: "100%" }}>
            <AlertTitle>Note</AlertTitle>
            The dataset will be downloaded and processed on our servers. Large datasets may take some time to import.
          </Alert>
        </Box>
      )}
      
      {/* Status Messages */}
      {uploadStatus && (
        <Box sx={{ mt: 3 }}>
          <div className={`modern-alert ${uploadStatus.toLowerCase().includes("error") ? "modern-alert-error" : "modern-alert-success"}`} style={{ width: "100%" }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
              {uploadStatus.toLowerCase().includes("error") ? "Error" : "Success"}
            </div>
            {uploadStatus}
          </div>
        </Box>
      )}
    </div>
  );
};

export default DatasetUploadTabs; 